import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaseStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!key || key === 'sk_test_...') {
      throw new Error(
        'STRIPE_SECRET_KEY is not configured. Refusing to start a money-moving service without a Stripe key.',
      );
    }
    this.stripe = new Stripe(key, {
      apiVersion: '2023-10-16' as any,
    });
  }

  // ── Step 1: Lazy Stripe Customer creation ──

  async getOrCreateCustomer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripe_customer_id: true, email: true, name: true },
    });

    if (user?.stripe_customer_id) {
      return user.stripe_customer_id;
    }

    const customer = await this.stripe.customers.create({
      email: user?.email,
      name: user?.name,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripe_customer_id: customer.id },
    });

    return customer.id;
  }

  // ── Step 2: Subscription is created automatically when the tenant pays
  // the checkout session (mode: 'subscription', see checkout.service.ts).
  // The subscription id is stored on the Lease in the webhook handler.

  // ── Step 3: Lease extension updates cancel_at ──

  async updateSubscriptionOnLeaseExtension(
    leaseId: string,
    newEndDate: Date,
    additionalMonths?: number,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true },
    });

    if (!lease) throw new NotFoundException('Lease not found');
    if (!lease.stripe_subscription_id) throw new NotFoundException('No subscription found for this lease');

    // Update cancel_at on existing subscription (best-effort: if the sub is
    // already gone, still extend the lease's own dates)
    const newCancelAt = Math.floor(new Date(newEndDate).getTime() / 1000);
    try {
      await this.stripe.subscriptions.update(lease.stripe_subscription_id, {
        cancel_at: newCancelAt,
      });
    } catch (e: any) {
      this.logger.warn(
        `Could not update cancel_at on ${lease.stripe_subscription_id}: ${e?.message ?? e}`,
      );
    }

    // Update lease end date (and the total month count when extending)
    await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        end_date: newEndDate,
        ...(additionalMonths
          ? { months: { increment: additionalMonths } }
          : {}),
      },
    });

    this.logger.log(`Updated subscription cancel_at for lease ${leaseId} to ${newEndDate}`);
    return true;
  }

  // ── Step 4: Webhook endpoint handlers ──

  async handleWebhookRaw(rawBody: Buffer, signature: string) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('Stripe webhook secret not configured.');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
      this.logger.warn(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Webhook signature verification failed.');
    }

    // Atomic idempotency guard: identical deliveries race on the unique
    // stripeEventId — only the first can insert the claim row. If it was
    // already recorded, skip processing entirely.
    const claimed = await this.prisma.webhookEvent.createMany({
      data: [{
        stripeEventId: event.id,
        eventType: event.type,
        processedAt: new Date(),
      }],
      skipDuplicates: true,
    });
    if (claimed.count === 0) {
      this.logger.log(`Webhook event ${event.id} already processed, skipping`);
      return { received: true };
    }

    try {
      // Route to event handlers
      switch (event.type as string) {
        case 'checkout.session.completed': {
          await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        }
        case 'invoice.payment_succeeded': {
          await this.onInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        }
        case 'invoice.payment_failed': {
          await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        }
        case 'customer.subscription.deleted': {
          await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        }
        case 'charge.refunded': {
          await this.onChargeRefunded(event.data.object as Stripe.Charge);
          break;
        }
        case 'charge.dispute.created': {
          await this.onDisputeCreated(event.data.object as Stripe.Dispute);
          break;
        }
        case 'transfer.created':
        case 'transfer.paid':
          await this.onTransferPaid(event.data.object as Stripe.Transfer);
          break;
        case 'transfer.reversed': {
          const tr = event.data.object as Stripe.Transfer;
          await this.prisma.payment.updateMany({
            where: { stripe_transfer_id: tr.id, status: 'held' },
            data: { stripe_transfer_id: null },
          });
          this.logger.warn(`Transfer reversed by Stripe: ${tr.id}, payment cleared for retry`);
          break;
        }
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err: any) {
      // Release the claim so Stripe's retry can reprocess this event —
      // a failed delivery must not be treated as permanently handled.
      await this.prisma.webhookEvent.deleteMany({
        where: { stripeEventId: event.id },
      });
      this.logger.error(`Webhook ${event.type} (${event.id}) failed: ${err?.message ?? err}`);
      throw err;
    }
  }

  // ── Event handlers ──

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    // Agent subscriptions are discriminated from lease subscriptions by
    // metadata.kind === 'agent' — never route them through the lease flow.
    if (session.metadata?.kind === 'agent') {
      await this.onAgentCheckoutCompleted(session);
      return;
    }

    // Match the lease via metadata (same id we stored on the row when the
    // checkout session was created).
    const leaseId = session.metadata?.lease_id;
    if (!leaseId) return;

    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });
    if (!lease) return;

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: 'active',
        ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
      },
    });

    // STEP 2: once the subscription exists, pin its end date to the lease end
    // date (Checkout can't set cancel_at, so we update it here).
    if (subscriptionId) {
      const cancelAt = Math.floor(new Date(lease.end_date).getTime() / 1000);
      try {
        await this.stripe.subscriptions.update(subscriptionId, { cancel_at: cancelAt });
      } catch (e: any) {
        this.logger.warn(`Could not set cancel_at on ${subscriptionId}: ${e.message}`);
      }
    }

    this.logger.log(
      `Lease ${leaseId} activated, subscription ${subscriptionId ?? 'pending'} on checkout.session.completed`,
    );
  }

  private async onAgentCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.user_id;
    if (!userId) return;

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    let currentPeriodEnd: Date | null = null;
    if (subscriptionId) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        const periodEndTs = subscription.items?.data?.[0]?.current_period_end;
        currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;
      } catch (e: any) {
        this.logger.warn(
          `Could not retrieve agent subscription ${subscriptionId}: ${e?.message ?? e}`,
        );
      }
    }

    await this.prisma.agentSubscription.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_checkout_session_id: session.id,
        status: 'active',
        current_period_end: currentPeriodEnd,
      },
      update: {
        stripe_subscription_id: subscriptionId,
        stripe_checkout_session_id: session.id,
        status: 'active',
        current_period_end: currentPeriodEnd,
      },
    });

    this.logger.log(`Agent subscription activated for user ${userId}`);
  }

  private async onInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Find the subscription and the lease it belongs to
    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) return;

    const lease = await this.prisma.lease.findFirst({
      where: { stripe_subscription_id: subscriptionId },
      select: { id: true, start_date: true },
    });
    if (!lease) {
      // Agent subscriptions have no lease row — refresh their period end so
      // /agent/status does not report a stale date after each renewal.
      const agentSub = await this.prisma.agentSubscription.findUnique({
        where: { stripe_subscription_id: subscriptionId },
      });
      if (!agentSub) return;
      const agentPeriodEnd = invoice.lines?.data?.[0]?.period?.end
        ? new Date(invoice.lines.data[0].period.end * 1000)
        : new Date(invoice.created * 1000 + 30 * 24 * 60 * 60 * 1000);
      await this.prisma.agentSubscription.update({
        where: { user_id: agentSub.user_id },
        data: { current_period_end: agentPeriodEnd },
      });
      this.logger.log(`Agent subscription ${subscriptionId} renewed, period end ${agentPeriodEnd.toISOString()}`);
      return;
    }

    // This event fires on EVERY monthly charge. Without a billing anchor the
    // first invoice is generated at checkout; each invoice's period covers one
    // billing cycle.
    const line = invoice.lines?.data?.[0];
    const periodStartTs = (line?.period?.start ?? invoice.created);
    const dayMs = 24 * 60 * 60 * 1000;
    const periodStart = new Date(periodStartTs * 1000);
    const periodEnd = new Date((line?.period?.end ?? periodStartTs + 30 * dayMs) * 1000);

    // Dedupe: checkout.session.completed and the first invoice.payment_succeeded
    // fire together for the first charge, so never create two rows per cycle.
    const existing = await this.prisma.payment.findFirst({
      where: {
        lease_id: lease.id,
        period_start: {
          gte: new Date(periodStart.getTime() - dayMs),
          lte: new Date(periodStart.getTime() + dayMs),
        },
      },
    });
    if (existing) {
      this.logger.log(`Invoice ${invoice.id} already recorded for lease ${lease.id}, skipping`);
      return;
    }

    // Hold policy: the FIRST payment holds 7 days from the move-in date;
    // subsequent monthly charges hold 7 days from that charge's date.
    const isFirst = (await this.prisma.payment.count({
      where: { lease_id: lease.id },
    })) === 0;

    const holdStart = isFirst ? new Date(lease.start_date) : new Date(periodStart);
    const holdReleaseAt = new Date(holdStart);
    holdReleaseAt.setUTCDate(holdReleaseAt.getUTCDate() + 7);

    await this.prisma.payment.create({
      data: {
        lease_id: lease.id,
        period_start: periodStart,
        period_end: periodEnd,
        amount: Math.round(invoice.amount_paid / 100),
        stripe_payment_intent_id: (invoice as any).payment_intent ?? null,
        stripe_charge_id: (invoice as any).charge ?? null,
        stripe_subscription_id: subscriptionId,
        status: 'held',
        hold_release_at: holdReleaseAt,
      },
    });

    await this.prisma.lease.update({
      where: { id: lease.id },
      data: { failed_payment_attempts: 0 },
    });

    this.logger.log(
      `Created held payment for lease ${lease.id}, amount: ${invoice.amount_paid / 100} (invoice ${invoice.id})`,
    );
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) return;

    // Agent subscription failure — notify the owner, access is revoked later
    // by customer.subscription.deleted when Stripe cancels the subscription.
    const agentSub = await this.prisma.agentSubscription.findUnique({
      where: { stripe_subscription_id: subscriptionId },
    });
    if (agentSub) {
      const attemptCount = (invoice as any).attempt_count ?? 1;
      await this.prisma.notification.create({
        data: {
          user_id: agentSub.user_id,
          type: 'agent_payment_failed',
          title: 'Rentia Agent payment failed',
          body:
            `Your Rentia Agent payment could not be processed (attempt ${attemptCount}). ` +
            'If this continues your subscription will be cancelled and the assistant paused.',
          link: '/dashboard/agent',
        },
      });
      this.logger.log(`Agent payment failed for user ${agentSub.user_id}, attempt ${attemptCount}`);
      return;
    }

    const lease = await this.prisma.lease.findFirst({
      where: { stripe_subscription_id: subscriptionId },
      include: { property: { select: { title: true } } },
    });
    if (!lease) return;

    const newAttempts = (lease.failed_payment_attempts ?? 0) + 1;

    await this.prisma.lease.update({
      where: { id: lease.id },
      data: { failed_payment_attempts: newAttempts },
    });

    // Notify the tenant about the failed attempt
    await this.prisma.notification.create({
      data: {
        user_id: lease.user_id,
        type: 'payment_failed',
        title: 'Payment failed',
        body:
          `Your payment for ${lease.property?.title ?? 'your lease'} could not be processed ` +
          `(attempt ${newAttempts} of 3). Your subscription will be cancelled if this continues.`,
        link: '/app/leases',
      },
    });

    this.logger.log(`Payment failed for lease ${lease.id}, attempt ${newAttempts}`);

    // After 3 failures cancel the subscription and notify (plan STEP 4c)
    if (newAttempts >= 3) {
      let stripeCancelled = false;
      try {
        await this.stripe.subscriptions.cancel(subscriptionId);
        stripeCancelled = true;
      } catch (e: any) {
        this.logger.warn(`Could not cancel subscription ${subscriptionId}: ${e?.message ?? e}`);
      }

      // Notify the tenant. The lease status itself is updated ONLY by the
      // customer.subscription.deleted webhook (source of truth) so the DB
      // never claims 'cancelled' while Stripe still shows an active sub.
      await this.prisma.notification.create({
        data: {
          user_id: lease.user_id,
          type: 'payment_failed',
          title: 'Subscription cancelled',
          body: 'Your subscription was cancelled after 3 failed payment attempts.' +
            (stripeCancelled ? '' : ' If this is not resolved, contact support.'),
          link: '/app/leases',
        },
      });

      this.logger.log(`Subscription cancel requested for lease ${lease.id} after ${newAttempts} failed payments (${stripeCancelled ? 'Stripe confirmed' : 'Stripe call failed'})`);
    }
  }

  private async onSubscriptionDeleted(subscription: Stripe.Subscription) {
    const agentSub = await this.prisma.agentSubscription.findUnique({
      where: { stripe_subscription_id: subscription.id },
    });
    if (agentSub) {
      await this.prisma.agentSubscription.update({
        where: { user_id: agentSub.user_id },
        data: { status: 'inactive', current_period_end: null },
      });
      this.logger.log(`Agent subscription deactivated for user ${agentSub.user_id}`);
      return;
    }

    const lease = await this.prisma.lease.findFirst({
      where: { stripe_subscription_id: subscription.id },
    });
    if (!lease) return;

    // Stripe spells the terminal status "canceled" (one l). Distinguish an
    // early (manual) cancellation from a natural end at the lease's end date:
    // if the lease end date is still ahead, the user cancelled early => 'cancelled'.
    const endedBeforeTerm = lease.end_date.getTime() > Date.now();
    const newStatus =
      subscription.status === 'canceled'
        ? endedBeforeTerm
          ? 'cancelled'
          : 'ended'
        : 'ended';

    await this.prisma.lease.update({
      where: { id: lease.id },
      data: { status: newStatus as any },
    });

    this.logger.log(`Lease ${lease.id} status updated to ${newStatus} after subscription deletion`);
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    const chargeId = typeof charge.id === 'string' ? charge.id : undefined;

    // Prefer lookup by charge ID (stored on new payments), fall back to
    // payment intent ID for legacy payments created before charge tracking.
    let payment = chargeId
      ? await this.prisma.payment.findFirst({
          where: { stripe_charge_id: chargeId },
        })
      : null;

    if (!payment) {
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;
      if (!paymentIntentId) return;

      payment = await this.prisma.payment.findFirst({
        where: { stripe_payment_intent_id: paymentIntentId },
      });
    }

    if (!payment) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'refunded' },
    });

    this.logger.log(`Payment ${payment.id} marked refunded via charge.refunded`);
  }

  private async onDisputeCreated(dispute: Stripe.Dispute) {
    // Resolve the charge linked to this dispute
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
    if (!chargeId) return;
    let charge: Stripe.Charge;
    try {
      charge = await this.stripe.charges.retrieve(chargeId);
    } catch (e: any) {
      this.logger.warn(`Could not retrieve charge ${chargeId} for dispute: ${e?.message ?? e}`);
      return;
    }

    // Find the payment associated with this charge
    const payment = await this.prisma.payment.findFirst({
      where: { stripe_payment_intent_id: charge.payment_intent as string },
      include: { lease: true },
    });
    if (!payment) return;

    // Insert into Dispute table
    await this.prisma.dispute.create({
      data: {
        payment_id: payment.id,
        amount: payment.amount,
        reason: dispute.reason,
        status: 'open',
      },
    });

    this.logger.log(`Dispute created for payment ${payment.id}`);
  }

  private async onTransferPaid(transfer: Stripe.Transfer) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        stripe_transfer_id: transfer.id,
        status: 'held',
      },
    });
    if (!payment) return;

    // Update payment status from 'held' to 'released'
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'released',
        released_at: new Date(),
      },
    });

    this.logger.log(`Payment ${payment.id} released via transfer webhook, transfer: ${transfer.id}`);
  }

  // ── Step 5: Daily cron: release held payments to owners ──

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async releaseHeldPayments() {
    const now = new Date();

    // Recovery: a transfer may have been created while the DB write lagged
    // (or the transfer.created webhook arrived before stripe_transfer_id was
    // stored). Resolve those held payments via the Stripe transfer itself so
    // they are not lost — and never re-transferred.
    await this.recoverHeldTransfers();

    const heldPayments = await this.prisma.payment.findMany({
      where: {
        status: 'held',
        stripe_transfer_id: null,
        hold_release_at: { lte: now },
        // Never payout refunded/cancelled leases while the charge.refunded
        // webhook is still pending — the refund may already be with the tenant.
        lease: {
          status: { notIn: [LeaseStatus.cancelled, LeaseStatus.ended] },
        },
      },
      include: {
        lease: {
          include: {
            property: {
              include: { owner: { select: { stripe_connect_id: true } } },
            },
          },
        },
      },
    });

    let released = 0;
    let failed = 0;

    for (const payment of heldPayments) {
      try {
        const owner = payment.lease.property.owner;
        if (!owner?.stripe_connect_id) {
          continue;
        }

        // Create transfer to owner. The idempotency key is derived from the
        // payment id so a retry after a failed DB write cannot create a
        // second transfer for the same payment.
        const transfer = await this.stripe.transfers.create(
          {
            amount: payment.amount * 100,
            currency: 'usd',
            destination: owner.stripe_connect_id,
            description: `Payout payment ${payment.id}`,
          },
          { idempotencyKey: `payout_${payment.id}` },
        );

        // Store the transfer id so the transfer.created webhook can match exactly
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { stripe_transfer_id: transfer.id },
        });

        // Status is released later via the transfer.created webhook
        this.logger.log(`Initiated payout transfer ${transfer.id} for payment ${payment.id}`);

        released++;
      } catch (e: any) {
        this.logger.warn(`Payout failed for payment ${payment.id}: ${e.message}`);
        failed++;
      }
    }

    this.logger.log(`Daily payout: checked ${heldPayments.length}, released attempts: ${released}, failures: ${failed}`);
    return { checked: heldPayments.length, released, failed };
  }

  private async recoverHeldTransfers() {
    const stuck = await this.prisma.payment.findMany({
      where: { status: 'held', stripe_transfer_id: { not: null } },
      select: { id: true, stripe_transfer_id: true },
    });
    for (const p of stuck) {
      try {
        const transfer = await this.stripe.transfers.retrieve(p.stripe_transfer_id!);
        const transferStatus = (transfer as any).status;
        if (transferStatus !== 'failed') {
          await this.prisma.payment.update({
            where: { id: p.id },
            data: { status: 'released', released_at: new Date() },
          });
          this.logger.log(
            `Recovered held payment ${p.id} from transfer ${p.stripe_transfer_id} (${transferStatus})`,
          );
        }
      } catch (e: any) {
        this.logger.warn(
          `Could not verify transfer ${p.stripe_transfer_id} for payment ${p.id}: ${e?.message ?? e}`,
        );
      }
    }
  }
}