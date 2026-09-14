import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly client: Stripe;

  constructor(configService: ConfigService) {
    const key = configService.get<string>('STRIPE_SECRET_KEY');
    if (!key || key === 'sk_test_...') {
      throw new Error(
        'STRIPE_SECRET_KEY is not configured. Refusing to boot the agent subscription/payment service without a Stripe key.',
      );
    }
    this.client = new Stripe(key);
  }

  getClient(): Stripe {
    return this.client;
  }
}
