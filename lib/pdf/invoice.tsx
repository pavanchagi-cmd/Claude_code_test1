import 'server-only';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import { computeGst, type GstLine } from '@/lib/gst';
import { getSettings } from '@/lib/settings';

// GST tax invoice. Have the owner's CA confirm the format, HSN/SAC codes and
// the GST treatment of shipping, gift wrap and COD fees before launch.

const FEE_SAC = '996812'; // courier/handling services
const FEE_GST = 18;

// The built-in PDF fonts have no ₹ glyph, so invoices use "Rs.".
const rs = (paise: number) => `Rs. ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#15171A' },
  h1: { fontSize: 18, fontFamily: 'Times-Roman', letterSpacing: 2 },
  title: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { borderWidth: 1, borderColor: '#CFCBC2', padding: 8, flex: 1 },
  label: { color: '#5C5E63', marginBottom: 2 },
  bold: { fontFamily: 'Helvetica-Bold' },
  th: { fontFamily: 'Helvetica-Bold', backgroundColor: '#EFEDE8', padding: 4, borderRightWidth: 1, borderColor: '#CFCBC2' },
  td: { padding: 4, borderRightWidth: 1, borderColor: '#CFCBC2' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#CFCBC2' },
});

const cols = [
  { key: 'n', label: '#', w: '4%' },
  { key: 'd', label: 'Description', w: '26%' },
  { key: 'h', label: 'HSN/SAC', w: '9%' },
  { key: 'q', label: 'Qty', w: '5%' },
  { key: 't', label: 'Taxable value', w: '13%' },
  { key: 'r', label: 'GST %', w: '7%' },
  { key: 'c', label: 'CGST', w: '9%' },
  { key: 's', label: 'SGST', w: '9%' },
  { key: 'i', label: 'IGST', w: '9%' },
  { key: 'g', label: 'Total', w: '9%' },
] as const;

export async function invoiceData(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, invoice: true } });
  if (!order || !order.invoice) return null;
  const settings = await getSettings();
  const addr = order.shippingAddress as { name: string; phone: string; line1: string; line2?: string; landmark?: string; city: string; state: string; pincode: string };

  // One GST line per order item (qty folded into the value), with the coupon
  // discount apportioned across product lines by value.
  const gross = order.items.reduce((a, i) => a + i.pricePaise * i.qty, 0);
  let remaining = order.discountPaise;
  const lines: GstLine[] = order.items.map((i, idx) => {
    const lineGross = i.pricePaise * i.qty;
    const share = idx === order.items.length - 1 ? remaining : Math.round((order.discountPaise * lineGross) / Math.max(gross, 1));
    remaining -= share;
    return { description: `${i.brandName} ${i.productName} (${i.variantLabel}) · SKU ${i.sku}`, hsnCode: i.hsnCode, qty: 1, unitPricePaise: lineGross - share, gstRate: i.gstRate };
  });
  const fees: [string, number][] = [
    ['Shipping & handling', order.shippingPaise],
    ['Gift wrapping', order.giftWrapPaise],
    ['Cash on delivery fee', order.codFeePaise],
  ];
  for (const [label, paise] of fees) if (paise > 0) lines.push({ description: label, hsnCode: FEE_SAC, qty: 1, unitPricePaise: paise, gstRate: FEE_GST });

  const gst = computeGst(lines, settings.sellerState, addr.state);
  return { order, invoice: order.invoice, settings, addr, gst, units: order.items.map((i) => i.qty) };
}

function InvoiceDoc({ data }: { data: NonNullable<Awaited<ReturnType<typeof invoiceData>>> }) {
  const { order, invoice, settings, addr, gst, units } = data;
  return (
    <Document title={`Tax invoice ${invoice.number}`} author={settings.legalEntityName}>
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View>
            <Text style={s.h1}>{settings.brandName}</Text>
            <Text style={s.title}>TAX INVOICE</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text>
              <Text style={s.bold}>Invoice no: </Text>
              {invoice.number}
            </Text>
            <Text>
              <Text style={s.bold}>Invoice date: </Text>
              {invoice.issuedAt.toLocaleDateString('en-IN')}
            </Text>
            <Text>
              <Text style={s.bold}>Order no: </Text>
              {order.number}
            </Text>
            <Text>
              <Text style={s.bold}>Payment: </Text>
              {order.paymentMethod}
            </Text>
          </View>
        </View>

        <View style={[s.row, { marginTop: 14, gap: 8 }]}>
          <View style={s.box}>
            <Text style={s.label}>Sold by</Text>
            <Text style={s.bold}>{settings.legalEntityName}</Text>
            <Text>{settings.registeredAddress}</Text>
            <Text>State: {settings.sellerState}</Text>
            <Text>GSTIN: {settings.gstin}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Bill to / Ship to</Text>
            <Text style={s.bold}>{order.businessName || addr.name}</Text>
            {order.businessName ? <Text>Attn: {addr.name}</Text> : null}
            <Text>
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ''}
              {addr.landmark ? `, ${addr.landmark}` : ''}
            </Text>
            <Text>
              {addr.city}, {addr.state} {addr.pincode}
            </Text>
            <Text>Phone: +91 {order.contactPhone}</Text>
            {order.gstin ? <Text>GSTIN: {order.gstin}</Text> : null}
            <Text>Place of supply: {addr.state}</Text>
          </View>
        </View>

        <View style={{ marginTop: 14, borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#CFCBC2' }}>
          <View style={s.tr}>
            {cols.map((c) => (
              <Text key={c.key} style={[s.th, { width: c.w }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {gst.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.td, { width: cols[0].w }]}>{i + 1}</Text>
              <Text style={[s.td, { width: cols[1].w }]}>{l.description}</Text>
              <Text style={[s.td, { width: cols[2].w }]}>{l.hsnCode}</Text>
              <Text style={[s.td, { width: cols[3].w }]}>{units[i] ?? 1}</Text>
              <Text style={[s.td, { width: cols[4].w }]}>{rs(l.taxablePaise)}</Text>
              <Text style={[s.td, { width: cols[5].w }]}>{l.gstRate}%</Text>
              <Text style={[s.td, { width: cols[6].w }]}>{l.cgstPaise ? rs(l.cgstPaise) : '-'}</Text>
              <Text style={[s.td, { width: cols[7].w }]}>{l.sgstPaise ? rs(l.sgstPaise) : '-'}</Text>
              <Text style={[s.td, { width: cols[8].w }]}>{l.igstPaise ? rs(l.igstPaise) : '-'}</Text>
              <Text style={[s.td, { width: cols[9].w }]}>{rs(l.grossPaise)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 10, alignSelf: 'flex-end', width: 220 }}>
          <View style={s.between}>
            <Text>Taxable value</Text>
            <Text>{rs(gst.taxablePaise)}</Text>
          </View>
          {gst.intraState ? (
            <>
              <View style={s.between}>
                <Text>CGST</Text>
                <Text>{rs(gst.cgstPaise)}</Text>
              </View>
              <View style={s.between}>
                <Text>SGST</Text>
                <Text>{rs(gst.sgstPaise)}</Text>
              </View>
            </>
          ) : (
            <View style={s.between}>
              <Text>IGST</Text>
              <Text>{rs(gst.igstPaise)}</Text>
            </View>
          )}
          {order.discountPaise > 0 && (
            <View style={s.between}>
              <Text>Discount included above</Text>
              <Text>{rs(order.discountPaise)}</Text>
            </View>
          )}
          <View style={[s.between, { marginTop: 4, borderTopWidth: 1, borderColor: '#15171A', paddingTop: 4 }]}>
            <Text style={s.bold}>Invoice total</Text>
            <Text style={s.bold}>{rs(gst.totalPaise)}</Text>
          </View>
        </View>

        <Text style={{ marginTop: 24, color: '#5C5E63' }}>Prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.</Text>
        <Text style={{ marginTop: 4, color: '#5C5E63' }}>
          {settings.legalEntityName} · {settings.supportEmail} · {settings.supportPhone}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(orderId: string): Promise<Buffer> {
  const data = await invoiceData(orderId);
  if (!data) throw new Error('Invoice not available for this order');
  return renderToBuffer(<InvoiceDoc data={data} />);
}
