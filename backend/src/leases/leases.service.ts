import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentService } from '../payment/payment.service';
import { LeaseStatus, PropertyStatus } from '@prisma/client';
import { CreateLeaseDto } from './dto/lease.dto';

const DAYS_PER_BLOCK = 30;

@Injectable()
export class LeasesService {
  private readonly logger = new Logger(LeasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly paymentService: PaymentService,
  ) {}

  private readonly leaseInclude = {
    user: { select: { id: true, name: true, email: true } },
    property: {
      select: {
        id: true,
        title: true,
        photos: true,
        address: true,
        city: true,
        monthly_rent: true,
        owner: { select: { id: true, name: true } },
      },
    },
    payments: { orderBy: { period_start: 'asc' } },
  } as const;

  // Light include for list views — no payment history (loaded lazily on expand)
  // and only the property fields the cards need.
  private readonly leaseListInclude = {
    property: { select: { id: true, title: true, photos: true } },
  } as const;

  // ── Create booking ─────────────────────────────────────────

  async create(userId: string, dto: CreateLeaseDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.property_id },
      include: { owner: { select: { id: true, stripe_connect_id: true } } },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.status !== PropertyStatus.active) {
      throw new BadRequestException('This property is not available for booking.');
    }
    if (!property.owner?.stripe_connect_id) {
      throw new BadRequestException('The owner has not connected payouts yet, so this property cannot be booked.');
    }

    const startDate = new Date(`${dto.start_date}T00:00:00.000Z`);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date.');
    }
    if (startDate.getTime() <= Date.now() - 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Start date must be in the future.');
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + dto.months * DAYS_PER_BLOCK);

    const overlap = await this.prisma.lease.findFirst({
      where: {
        property_id: dto.property_id,
        status: { in: [LeaseStatus.active, LeaseStatus.pending_payment] },
        start_date: { lt: endDate },
        end_date: { gt: startDate },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'These dates are already booked. Choose different dates.',
      );
    }

    const lease = await this.prisma.lease.create({
      data: {
        user_id: userId,
        property_id: dto.property_id,
        start_date: startDate,
        end_date: endDate,
        months: dto.months,
        monthly_rent: property.monthly_rent,
        status: LeaseStatus.pending_payment,
      },
    });

    return this.mapLease(lease);
  }

  // ── Listings ───────────────────────────────────────────────

  private readonly LEASE_LIST_LIMIT = 100;

  async listMine(userId: string) {
    const leases = await this.prisma.lease.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: this.leaseListInclude,
      take: this.LEASE_LIST_LIMIT,
    });
    return leases.map((l) => this.mapLeaseSummary(l));
  }

  async listOwnerLeases(ownerId: string) {
    const leases = await this.prisma.lease.findMany({
      where: { property: { owner_id: ownerId } },
      orderBy: { created_at: 'desc' },
      include: this.leaseListInclude,
      take: this.LEASE_LIST_LIMIT,
    });
    return leases.map((l) => this.mapLeaseSummary(l));
  }

  async getLease(userId: string, leaseId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: this.leaseInclude,
    });
    if (!lease) throw new NotFoundException('Lease not found');
    const isOwner = lease.property?.owner?.id === userId;
    if (lease.user_id !== userId && !isOwner) {
      throw new ForbiddenException('You do not have access to this lease.');
    }
    return this.mapLease(lease);
  }

  async getLeasePayments(userId: string, leaseId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      select: { user_id: true },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this lease.');
    }
    const payments = await this.prisma.payment.findMany({
      where: { lease_id: leaseId },
      orderBy: { period_start: 'desc' },
      take: 120,
    });
    return payments
      .sort((a, b) => a.period_start.getTime() - b.period_start.getTime())
      .map((p) => this.mapPayment(p));
  }

  // ── Cancel / Renew ─────────────────────────────────────────

  async cancel(userId: string, leaseId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: { select: { owner_id: true } }, payments: true },
    });
    if (!lease) throw new NotFoundException('Lease not found');

    const canManage =
      lease.user_id === userId || lease.property.owner_id === userId;
    if (!canManage) {
      throw new ForbiddenException('You do not have access to this lease.');
    }
    if (lease.status === LeaseStatus.cancelled || lease.status === LeaseStatus.ended) {
      throw new BadRequestException('This lease is already closed.');
    }

    if (lease.status === LeaseStatus.active) {
      const stripe = this.stripeService.getClient();

      // ── STEP 1: Refund all payments BEFORE cancelling the subscription ──
      // The DB status is only changed to 'cancelled' by the webhook AFTER
      // the subscription is cancelled. By refunding first and aborting if any
      // refund fails, we guarantee: the lease stays 'active' unless every
      // refund is confirmed by Stripe.
      const failedRefunds: { paymentId: string; error: string }[] = [];

      for (const payment of lease.payments) {
        // Skip already-refunded payments
        if (payment.status === 'refunded') continue;
        if (!payment.stripe_charge_id && !payment.stripe_payment_intent_id) continue;

        try {
          let chargeId = payment.stripe_charge_id;

          // Legacy payments created before stripe_charge_id was stored:
          // fall back to retrieving the payment intent's latest charge.
          if (!chargeId && payment.stripe_payment_intent_id) {
            const pi = await stripe.paymentIntents.retrieve(
              payment.stripe_payment_intent_id,
            );
            chargeId =
              typeof pi.latest_charge === 'string'
                ? pi.latest_charge
                : pi.latest_charge?.id;
          }

          if (!chargeId) {
            failedRefunds.push({
              paymentId: payment.id,
              error: 'No charge found for this payment',
            });
            continue;
          }

          // Use the charge ID (universally supported by the Stripe API) and
          // reverse_transfer so any payout to the owner is reversed.
          const refund = await stripe.refunds.create({
            charge: chargeId,
            reverse_transfer: payment.stripe_transfer_id ? true : undefined,
            reason: 'requested_by_customer',
          });

          // The payment status is NOT set here: it only flips to 'refunded'
          // when the charge.refunded webhook confirms the refund (payment.service.ts),
          // so the payment history never claims a refund Stripe hasn't confirmed.
          this.logger.log(
            `Refund created for payment ${payment.id} (charge ${chargeId}, refund ${refund.id})`,
          );
        } catch (e: any) {
          failedRefunds.push({
            paymentId: payment.id,
            error: e?.message ?? String(e),
          });
        }
      }

      // If any refund failed, abort the cancellation. The lease stays
      // 'active' so the user can retry later.
      if (failedRefunds.length > 0) {
        for (const { paymentId, error } of failedRefunds) {
          this.logger.error(`Refund failed for payment ${paymentId}: ${error}`);
        }
        throw new BadRequestException(
          `Cancellation failed: ${failedRefunds.length} payment(s) could not be refunded. ` +
            'The lease remains active. Please contact support.',
        );
      }

      // ── STEP 2: All refunds confirmed — now cancel the subscription ──
      // The customer.subscription.deleted webhook is the source of truth and
      // flips the lease to 'cancelled' (or 'ended' if the term already ran).
      if (lease.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(lease.stripe_subscription_id);
        } catch (e: any) {
          this.logger.warn(
            `Subscription cancel failed for lease ${leaseId}: ${e?.message ?? e}`,
          );
          // Refunds were already confirmed by Stripe. Manually set the lease
          // status so it doesn't stay stuck in 'active' with no future billing.
          await this.prisma.lease.update({
            where: { id: leaseId },
            data: { status: LeaseStatus.cancelled },
          });
        }
      } else {
        // Legacy active lease without a Stripe subscription: no webhook will
        // ever arrive, so update the row directly.
        await this.prisma.lease.update({
          where: { id: leaseId },
          data: { status: LeaseStatus.cancelled },
        });
      }
    } else {
      // Not yet paid (pending_payment): nothing exists in Stripe for this
      // lease, so no webhook will arrive — update the row directly.
      await this.prisma.lease.update({
        where: { id: leaseId },
        data: { status: LeaseStatus.cancelled },
      });
    }

    return { ok: true };
  }

  async renew(userId: string, leaseId: string, months: number) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this lease.');
    }
    if (lease.status !== LeaseStatus.active) {
      throw new BadRequestException('Only active leases can be renewed.');
    }

    // STEP 3: extend the existing subscription (update cancel_at) instead of
    // creating a new one, then update the lease's end date in the DB.
    // Extend from the lease's own end date, not from the last payment's
    // period end (payments are offset from the charge date, not the lease).
    const nextStart = new Date(lease.end_date);
    const endDate = new Date(nextStart);
    endDate.setUTCDate(endDate.getUTCDate() + months * DAYS_PER_BLOCK);

    const overlap = await this.prisma.lease.findFirst({
      where: {
        property_id: lease.property_id,
        id: { not: leaseId },
        status: { in: [LeaseStatus.active, LeaseStatus.pending_payment] },
        start_date: { lt: endDate },
        end_date: { gt: nextStart },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'These dates are already booked. Choose different dates.',
      );
    }

    await this.paymentService.updateSubscriptionOnLeaseExtension(leaseId, endDate, months);

    this.logger.log(`Lease ${leaseId} extended to ${endDate.toISOString()}`);
    return { ok: true, end_date: endDate.toISOString() };
  }

  // ── Helpers ────────────────────────────────────────────────

  // Lean shape for list views (my leases / owner leases) — no payments, no
  // tenant/owner relation, only the fields the lease cards show.
  private mapLeaseSummary(l: any) {
    return {
      id: l.id,
      start_date: l.start_date,
      end_date: l.end_date,
      months: l.months,
      status: l.status,
      monthly_rent: l.monthly_rent,
      created_at: l.created_at,
      property: l.property
        ? { id: l.property.id, title: l.property.title, photos: l.property.photos }
        : undefined,
    };
  }

  private mapLease(l: any) {
    return {
      id: l.id,
      user_id: l.user_id,
      property_id: l.property_id,
      start_date: l.start_date,
      end_date: l.end_date,
      months: l.months,
      status: l.status,
      monthly_rent: l.monthly_rent,
      stripe_subscription_id: l.stripe_subscription_id,
      created_at: l.created_at,
      property: l.property
        ? {
            id: l.property.id,
            title: l.property.title,
            photos: l.property.photos,
            address: l.property.address,
            city: l.property.city,
            monthly_rent: l.property.monthly_rent,
            owner: l.property.owner
              ? { id: l.property.owner.id, name: l.property.owner.name }
              : undefined,
          }
        : undefined,
      tenant: l.user
        ? { id: l.user.id, name: l.user.name, email: l.user.email }
        : undefined,
      payments: l.payments?.map((p: any) => this.mapPayment(p)),
    };
  }

  private mapPayment(p: any) {
    return {
      id: p.id,
      period_start: p.period_start,
      period_end: p.period_end,
      amount: p.amount,
      status: p.status,
      hold_release_at: p.hold_release_at,
      released_at: p.released_at,
      created_at: p.created_at,
    };
  }
}
