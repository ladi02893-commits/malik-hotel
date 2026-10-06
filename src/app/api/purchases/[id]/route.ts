import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const invoices = await dbQuery(
      `SELECT pi.*, v.phone as vendor_phone, v.category as vendor_category, v.address as vendor_address
       FROM purchase_invoices pi
       LEFT JOIN vendors v ON pi.vendor_id = v.id
       WHERE pi.id::text = $1 OR pi.invoice_number = $1`,
      [id]
    );

    if (invoices.length === 0) {
      return NextResponse.json({ success: false, error: 'Purchase invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];

    const items = await dbQuery(
      `SELECT * FROM purchase_items WHERE invoice_id = $1 ORDER BY created_at ASC`,
      [invoice.id]
    );

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        subtotal: parseFloat(invoice.subtotal) || 0,
        discount_amount: parseFloat(invoice.discount_amount) || 0,
        total_amount: parseFloat(invoice.total_amount) || 0,
        paid_amount: parseFloat(invoice.paid_amount) || 0,
        balance_amount: parseFloat(invoice.balance_amount) || 0,
        items: items.map((i: any) => ({
          ...i,
          quantity: parseFloat(i.quantity) || 0,
          unit_price: parseFloat(i.unit_price) || 0,
          line_total: parseFloat(i.line_total) || 0,
        })),
      },
    });
  } catch (error: any) {
    console.error('Fetch invoice detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoice details', details: error.message }, { status: 500 });
  }
}
