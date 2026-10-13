import { Text } from '@react-email/components';
import { EmailLayout, emailColors } from './layout';

export default function WarrantyCardEmail({ brandName, productName, serialNumber, endsAt }: { brandName: string; productName: string; serialNumber: string; endsAt: string }) {
  return (
    <EmailLayout preview="Your digital warranty card" brandName={brandName}>
      <Text style={{ fontFamily: 'Georgia, serif', fontSize: 26, margin: '0 0 8px' }}>Your warranty is active</Text>
      <Text style={{ fontSize: 15 }}>
        {productName} · Serial <strong>{serialNumber}</strong>
      </Text>
      <Text style={{ fontSize: 15, color: emailColors.muted }}>Covered until {endsAt}. Your digital warranty card is attached.</Text>
    </EmailLayout>
  );
}
