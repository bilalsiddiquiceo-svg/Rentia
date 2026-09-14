import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('GMAIL_USER');
    const pass = this.configService.get<string>('GMAIL_PASS');
    this.from = this.configService.get<string>('EMAIL_FROM', 'Rentia <rentia.noreply@gmail.com>');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.logger.log('Gmail SMTP configured — real emails enabled');
    } else {
      this.transporter = null;
      this.logger.warn('Gmail SMTP not configured — emails will not be sent');
    }
  }

  async sendOwnerUpgradeConfirmation(
    email: string,
    name: string,
    confirmationUrl: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('No email transporter — skipping send');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Confirm your Owner account — Rentia',
        html: this.renderOwnerConfirmationEmail(name, confirmationUrl),
      });
      this.logger.log(`Owner confirmation email sent to ${email}`);
      return true;
    } catch (err) {
      this.logger.error(`Email send failed: ${(err as Error).message}`);
      return false;
    }
  }


  async sendPasswordReset(
    email: string,
    resetUrl: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('No email transporter — skipping password reset email');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Reset your password — Rentia',
        html: this.renderPasswordResetEmail(resetUrl),
      });
      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (err) {
      this.logger.error(`Password reset email failed: ${(err as Error).message}`);
      return false;
    }
  }
  private renderOwnerConfirmationEmail(name: string, url: string): string {
    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1C2321; background: #F6F4EF;">
        <h2 style="margin: 0 0 12px;">Confirm your Owner account</h2>
        <p>Hi ${name},</p>
        <p>You asked to become an owner on Rentia. Confirm by clicking the button below. The link expires in 24 hours.</p>
        <a href="${url}" style="display: inline-block; margin: 16px 0; padding: 12px 20px; background: #0F766E; color: #F6F4EF; text-decoration: none; border-radius: 8px; font-weight: 600;">Confirm Owner Upgrade</a>
        <p style="color: #5C6560; font-size: 13px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `;
  }

  private renderPasswordResetEmail(url: string): string {
    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1C2321; background: #F6F4EF;">
        <h2 style="margin: 0 0 12px;">Reset your password</h2>
        <p>Hi,</p>
        <p>You requested a password reset for your Rentia account. Click the button below to set a new password. The link expires in 1 hour.</p>
        <a href="${url}" style="display: inline-block; margin: 16px 0; padding: 12px 20px; background: #0F766E; color: #F6F4EF; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
        <p style="color: #5C6560; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
  }

}
