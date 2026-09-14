import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentService } from '../payment/payment.service';
import jwt from 'jsonwebtoken';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  async createCheckoutSession(userId: string, leaseId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: { select: { id: true, title: true, photos: true } } },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this lease.');
    }
    if (lease.status !== 'pending_payment') {
      throw new BadRequestException(
        'This booking is not awaiting payment.',
      );
    }

    // Re-use an existing open Checkout Session instead of stacking duplicates.
    if (lease.stripe_checkout_session_id) {
      try {
        const existing = await this.stripeService
          .getClient()
          .checkout.sessions.retrieve(lease.stripe_checkout_session_id);
        if (existing.status === 'open' && existing.url) {
          return { url: existing.url };
        }
        if (existing.status === 'complete') {
          throw new BadRequestException('This booking has already been paid.');
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        // expired / missing — fall through and create a fresh session
      }
    }

    // STEP 1: lazily create the Stripe customer before checkout
    // STEP 2: subscription-mode checkout — Stripe creates the subscription on
    // payment and bills monthly from the first charge. The subscription end
    // (cancel_at) is set to the lease end date once it exists (webhook).
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    try {
      const customerId = await this.paymentService.getOrCreateCustomer(userId);

      const session = await this.stripeService
        .getClient()
        .checkout.sessions.create({
          mode: 'subscription',
          customer: customerId,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                unit_amount: lease.monthly_rent * 100,
                recurring: { interval: 'month' },
                product_data: {
                  name: `${lease.property.title} — rent`,
                  images: lease.property.photos?.length > 0
                    ? [lease.property.photos[0]]
                    : undefined,
                },
              },
              quantity: 1,
            },
          ],
          metadata: { lease_id: leaseId, user_id: userId },
          success_url: `${frontendUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/booking/cancel`,
        });

      // Store the checkout session id so webhooks can correlate (STEP 2)
      await this.prisma.lease.update({
        where: { id: leaseId },
        data: { stripe_checkout_session_id: session.id },
      });

      return { url: session.url };
    } catch (err) {
      // Never leave a dangling "booked" lease when payment setup fails.
      try {
        await this.prisma.lease.delete({ where: { id: leaseId } });
      } catch {
        // already gone or in a state we can't clean up here
      }
      throw err;
    }
  }

  async createConnectLink(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, stripe_connect_id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const clientId = this.configService.get<string>('STRIPE_CONNECT_CLIENT_ID');
    if (!clientId || clientId.includes('paste_your_client_id')) {
      throw new BadRequestException(
        'STRIPE_CONNECT_CLIENT_ID is not configured. Add it to backend/.env.',
      );
    }

    const jwtSecret = this.configService.get<string>('JWT_SECRET', 'dev-secret');
    const state = jwt.sign({ sub: userId, purpose: 'stripe-connect' }, jwtSecret, {
      expiresIn: '15m',
    });

    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:4000');
    const redirectUri = `${backendUrl}/stripe/connect/callback`;

    const url =
      'https://connect.stripe.com/oauth/authorize' +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&scope=read_write` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;

    return { url };
  }

  async exchangeConnectCode(code: string, state: string) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state.');
    }

    const jwtSecret = this.configService.get<string>('JWT_SECRET', 'dev-secret');
    let payload: any;
    try {
      payload = jwt.verify(state, jwtSecret);
    } catch {
      throw new BadRequestException('Invalid or expired state.');
    }
    if (payload.purpose !== 'stripe-connect' || !payload.sub) {
      throw new BadRequestException('Invalid state.');
    }
    const userId = payload.sub;

    const response = await this.stripeService
      .getClient()
      .oauth.token({ grant_type: 'authorization_code', code });
    const accountId = response.stripe_user_id;
    if (!accountId) {
      throw new BadRequestException('Stripe did not return a connected account.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripe_connect_id: accountId },
    });

    await this.ensureManualPayouts(accountId);

    return { connected: true, accountId };
  }

  private async ensureManualPayouts(accountId: string) {
    try {
      await this.stripeService.getClient().accounts.update(accountId, {
        settings: { payouts: { schedule: { interval: 'manual' } } },
      });
    } catch (e: any) {
      this.logger.warn(
        `Could not set manual payout schedule for ${accountId}: ${e?.message ?? e}`,
      );
    }
  }

  async getConnectStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripe_connect_id: true },
    });
    return {
      connected: !!user?.stripe_connect_id,
      accountId: user?.stripe_connect_id ?? null,
    };
  }
}