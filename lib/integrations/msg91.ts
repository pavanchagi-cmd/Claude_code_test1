import 'server-only';
import { configured, isProd } from '@/lib/env';

export interface SmsProvider {
  readonly mock: boolean;
  sendOtp(phone: string, code: string): Promise<void>;
  sendTemplate(phone: string, templateId: string, vars: Record<string, string>): Promise<void>;
}

/** Normalise an Indian mobile number to 91XXXXXXXXXX. */
export function toMsisdn(phone: string) {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `91${digits}`;
}

class Msg91Live implements SmsProvider {
  readonly mock = false;
  private async flow(templateId: string, mobile: string, vars: Record<string, string>) {
    const res = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: process.env.MSG91_AUTH_KEY!, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ template_id: templateId, short_url: '0', recipients: [{ mobiles: toMsisdn(mobile), ...vars }] }),
    });
    if (!res.ok) throw new Error(`MSG91 flow failed: ${res.status}`);
  }
  sendOtp(phone: string, code: string) {
    const template = process.env.MSG91_OTP_TEMPLATE_ID;
    if (!template) throw new Error('MSG91_OTP_TEMPLATE_ID is not set');
    return this.flow(template, phone, { otp: code });
  }
  sendTemplate(phone: string, templateId: string, vars: Record<string, string>) {
    return this.flow(templateId, phone, vars);
  }
}

/** Mock: logs OTPs to the server console, but never in production. */
class Msg91Mock implements SmsProvider {
  readonly mock = true;
  async sendOtp(phone: string, code: string) {
    if (isProd) {
      console.error('[msg91:mock] OTP SMS is not configured in production');
      return;
    }
    console.info(`[msg91:mock] OTP for ${toMsisdn(phone)}: ${code}`);
  }
  async sendTemplate(phone: string, templateId: string, vars: Record<string, string>) {
    console.info(`[msg91:mock] SMS ${templateId} to ${toMsisdn(phone)}`, vars);
  }
}

export const sms: SmsProvider = configured.msg91 ? new Msg91Live() : new Msg91Mock();
