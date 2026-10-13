import 'server-only';
import { configured } from '@/lib/env';
import { toMsisdn } from '@/lib/integrations/msg91';

export interface WhatsAppProvider {
  readonly mock: boolean;
  sendTemplate(phone: string, template: string, params: string[]): Promise<void>;
}

// WhatsApp Business API through MSG91. Templates must be approved by Meta.
class WhatsAppLive implements WhatsAppProvider {
  readonly mock = false;
  async sendTemplate(phone: string, template: string, params: string[]) {
    const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method: 'POST',
      headers: { authkey: process.env.WHATSAPP_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrated_number: process.env.WHATSAPP_SENDER,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: template,
            language: { code: 'en', policy: 'deterministic' },
            to_and_components: [
              {
                to: [toMsisdn(phone)],
                components: Object.fromEntries(params.map((p, i) => [`body_${i + 1}`, { type: 'text', value: p }])),
              },
            ],
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status}`);
  }
}

class WhatsAppMock implements WhatsAppProvider {
  readonly mock = true;
  async sendTemplate(phone: string, template: string, params: string[]) {
    console.info(`[whatsapp:mock] ${template} to ${toMsisdn(phone)}`, params);
  }
}

export const whatsapp: WhatsAppProvider = configured.whatsapp ? new WhatsAppLive() : new WhatsAppMock();
