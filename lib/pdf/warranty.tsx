import 'server-only';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';

const s = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', color: '#F2EFE8', backgroundColor: '#15171A' },
  card: { margin: 40, padding: 32, borderWidth: 1, borderColor: '#C9A86A' },
  brand: { fontFamily: 'Times-Roman', fontSize: 26, letterSpacing: 4 },
  eyebrow: { color: '#C9A86A', fontSize: 9, letterSpacing: 2, marginTop: 18 },
  title: { fontFamily: 'Times-Roman', fontSize: 30, marginTop: 6 },
  label: { color: '#C9C4B9', fontSize: 9, marginTop: 14 },
  value: { fontSize: 13, marginTop: 2 },
});

export async function renderWarrantyPdf(registrationId: string): Promise<Buffer> {
  const reg = await db.warrantyRegistration.findUnique({ where: { id: registrationId }, include: { orderItem: { include: { order: true } }, user: true } });
  if (!reg) throw new Error('Warranty registration not found');
  const settings = await getSettings();
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return renderToBuffer(
    <Document title={`Warranty card ${reg.serialNumber}`}>
      <Page size="A5" orientation="landscape" style={s.page}>
        <View style={s.card}>
          <Text style={s.brand}>{settings.brandName}</Text>
          <Text style={s.eyebrow}>DIGITAL WARRANTY CARD</Text>
          <Text style={s.title}>
            {reg.orderItem.brandName} {reg.orderItem.productName}
          </Text>
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <View>
              <Text style={s.label}>Serial number</Text>
              <Text style={s.value}>{reg.serialNumber}</Text>
              <Text style={s.label}>Owner</Text>
              <Text style={s.value}>{reg.user.name ?? `+91 ${reg.user.phone ?? ''}`}</Text>
            </View>
            <View>
              <Text style={s.label}>Order</Text>
              <Text style={s.value}>#{reg.orderItem.order.number}</Text>
              <Text style={s.label}>Valid</Text>
              <Text style={s.value}>
                {fmt(reg.startsAt)} – {fmt(reg.endsAt)}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 8, color: '#C9C4B9', marginTop: 24 }}>
            Covers manufacturing defects in the movement. See {settings.supportEmail} for service. Issued by {settings.legalEntityName}.
          </Text>
        </View>
      </Page>
    </Document>,
  );
}
