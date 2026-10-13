import 'server-only';
import type { ReactElement } from 'react';
import { Resend } from 'resend';
import { configured } from '@/lib/env';

export type EmailAttachment = { filename: string; content: Buffer };
export type EmailMessage = { to: string; subject: string; react: ReactElement; attachments?: EmailAttachment[] };

export interface EmailProvider {
  readonly mock: boolean;
  send(msg: EmailMessage): Promise<{ id: string | null }>;
}

class ResendLive implements EmailProvider {
  readonly mock = false;
  private client = new Resend(process.env.RESEND_API_KEY);
  async send(msg: EmailMessage) {
    const { data, error } = await this.client.emails.send({
      from: process.env.EMAIL_FROM ?? 'orders@example.com',
      to: msg.to,
      subject: msg.subject,
      react: msg.react,
      attachments: msg.attachments,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return { id: data?.id ?? null };
  }
}

class ResendMock implements EmailProvider {
  readonly mock = true;
  async send(msg: EmailMessage) {
    console.info(`[resend:mock] "${msg.subject}" to ${msg.to}${msg.attachments?.length ? ` (+${msg.attachments.length} attachment)` : ''}`);
    return { id: null };
  }
}

export const email: EmailProvider = configured.resend ? new ResendLive() : new ResendMock();
