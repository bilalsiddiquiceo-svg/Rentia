import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
  ) {}

  @Public()
  @Post('webhooks/stripe')
  async stripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header.');
    }

    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body), 'utf-8');
    try {
      await this.paymentService.handleWebhookRaw(rawBody, signature);
      return { received: true };
    } catch (err: any) {
      this.logger.error(`Webhook error: ${err.message}`);
      throw new BadRequestException(`Webhook handler failed: ${err.message}`);
    }
  }
}