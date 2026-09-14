import { Controller, Get, Post, Body, Req, Res, Query } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Public } from '../auth/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Controller()
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly configService: ConfigService,
  ) {}

  @Post('checkout')
  createCheckout(@Req() req: any, @Body() dto: { lease_id: string }) {
    return this.checkoutService.createCheckoutSession(req.user.id, dto.lease_id);
  }

  @Post('stripe/connect')
  createConnectLink(@Req() req: any) {
    return this.checkoutService.createConnectLink(req.user.id);
  }

  @Get('stripe/connect/status')
  connectStatus(@Req() req: any) {
    return this.checkoutService.getConnectStatus(req.user.id);
  }

  @Public()
  @Get('stripe/connect/callback')
  async connectCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    if (error) {
      return res.redirect(`${frontendUrl}/dashboard?stripe=error`);
    }
    try {
      await this.checkoutService.exchangeConnectCode(code, state);
      return res.redirect(`${frontendUrl}/dashboard?stripe=done`);
    } catch {
      return res.redirect(`${frontendUrl}/dashboard?stripe=error`);
    }
  }
}
