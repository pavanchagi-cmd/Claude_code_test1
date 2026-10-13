import { Button, Text } from '@react-email/components';
import { EmailLayout, emailColors } from './layout';

export default function MagicLinkEmail({ url }: { url: string }) {
  return (
    <EmailLayout preview="Your sign-in link">
      <Text style={{ fontSize: 16 }}>Click the button below to sign in. The link expires in 24 hours.</Text>
      <Button href={url} style={{ background: emailColors.ink, color: '#F7F6F3', padding: '14px 24px', fontWeight: 700 }}>
        Sign in
      </Button>
      <Text style={{ fontSize: 13, color: emailColors.muted }}>If you did not request this, you can ignore this email.</Text>
    </EmailLayout>
  );
}
