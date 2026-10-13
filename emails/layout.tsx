import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';

// Email clients need inline styles; values mirror the design tokens.
export const emailColors = {
  ink: '#15171A',
  ground: '#F7F6F3',
  muted: '#5C5E63',
  brass: '#8C6A2F',
  line: '#E4E1DA',
};

export function EmailLayout({ preview, brandName = '[BRAND]', children }: { preview: string; brandName?: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: emailColors.ground, fontFamily: 'Helvetica, Arial, sans-serif', color: emailColors.ink, margin: 0 }}>
        <Container style={{ background: '#ffffff', maxWidth: 560, margin: '24px auto', padding: 32, border: `1px solid ${emailColors.line}` }}>
          <Text style={{ fontFamily: 'Georgia, serif', fontSize: 24, letterSpacing: '0.18em', margin: '0 0 24px' }}>{brandName}</Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: emailColors.line, margin: '32px 0 16px' }} />
          <Text style={{ fontSize: 12, color: emailColors.muted }}>You are receiving this email about your account or order with {brandName}.</Text>
        </Container>
      </Body>
    </Html>
  );
}
