import { Button, Text } from '@react-email/components';
import { EmailLayout, emailColors } from './layout';

export default function AlertEmail({ brandName, title, body, url, cta }: { brandName: string; title: string; body: string; url: string; cta: string }) {
  return (
    <EmailLayout preview={title} brandName={brandName}>
      <Text style={{ fontFamily: 'Georgia, serif', fontSize: 26, margin: '0 0 8px' }}>{title}</Text>
      <Text style={{ fontSize: 15, color: emailColors.muted }}>{body}</Text>
      <Button href={url} style={{ background: emailColors.ink, color: '#F7F6F3', padding: '14px 24px', fontWeight: 700 }}>
        {cta}
      </Button>
    </EmailLayout>
  );
}
