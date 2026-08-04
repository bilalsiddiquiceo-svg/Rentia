import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resendApiKey: string | undefined;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>(
      'RESEND_FROM',
      'Rental <onboarding@resend.dev>',
    );
  }

  async sendOwnerUpgradeConfirmation(
    email: string,
    name: string,
    confirmationUrl: string,
  ): Promise<boolean> {
    if (!this.resendApiKey) {
      this.logger.warn(
        'RESEND_API_KEY not configured — falling back to console log for the confirmation link.',
      );
      return false;
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(this.resendApiKey);
      const { error } = await resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Confirm your Owner account',
        html: this.renderOwnerConfirmationEmail(name, confirmationUrl),
      });

      if (error) {
        this.logger.error(`Resend send failed: ${error.message}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(`Email delivery failed: ${(err as Error).message}`);
      return false;
    }
  }

  private renderOwnerConfirmationEmail(name: string, url: string): string {
    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1C2321; background: #F6F4EF;">
        <h2 style="margin: 0 0 12px;">Confirm your Owner account</h2>
        <p>Hi ${name},</p>
        <p>You asked to become an owner on Rental. Confirm the request by clicking the button below. The link expires in 24 hours.</p>
        <a href="${url}" style="display: inline-block; margin: 16px 0; padding: 12px 20px; background: #B4652B; color: #F6F4EF; text-decoration: none; border-radius: 8px; font-weight: 600;">Confirm Owner Upgrade</a>
        <p style="color: #5C6560; font-size: 13px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `;
  }
}
