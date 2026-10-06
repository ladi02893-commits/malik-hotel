import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const vendorRes = await dbQuery('SELECT * FROM vendors WHERE id = $1', [id]);
    if (vendorRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    const vendor = vendorRes[0];

    // Fetch all purchases for this vendor
    const purchases = await dbQuery(
      `SELECT id, invoice_number, invoice_date, total_amount, paid_amount, balance_amount, payment_method, payment_status, notes, created_at
       FROM purchase_invoices
       WHERE vendor_id = $1
       ORDER BY invoice_date DESC, created_at DESC`,
      [id]
    );

    // Fetch all payments made to this vendor
    const payments = await dbQuery(
      `SELECT id, payment_number, amount, payment_date, payment_method, reference_number, notes, created_at
       FROM vendor_payments
       WHERE vendor_id = $1
       ORDER BY payment_date DESC, created_at DESC`,
      [id]
    );

    // Combine into a chronological ledger
    const ledger = [
      ...purchases.map((p: any) => ({
        id: p.id,
        type: 'PURCHASE',
        date: p.invoice_date,
        created_at: p.created_at,
        ref_number: p.invoice_number,
        description: `Purchase Bill #${p.invoice_number} (${p.payment_status.toUpperCase()})`,
        debit: 0, // payment we made
        credit: parseFloat(p.total_amount) || 0, // amount we owe
        paid: parseFloat(p.paid_amount) || 0,
        balance_change: parseFloat(p.balance_amount) || 0,
        notes: p.notes,
      })),
      ...payments.map((py: any) => ({
        id: py.id,
        type: 'PAYMENT',
        date: py.payment_date,
        created_at: py.created_at,
        ref_number: py.payment_number,
        description: `Payment to Vendor (${py.payment_method})`,
        debit: parseFloat(py.amount) || 0, // reduces our debt
        credit: 0,
        paid: parseFloat(py.amount) || 0,
        balance_change: -(parseFloat(py.amount) || 0),
        notes: py.notes,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      vendor: {
        ...vendor,
        opening_balance: parseFloat(vendor.opening_balance) || 0,
        current_balance: parseFloat(vendor.current_balance) || 0,
      },
      ledger,
      purchasesCount: purchases.length,
      paymentsCount: payments.length,
    });
  } catch (error: any) {
    console.error('Fetch vendor details error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vendor details', details: error.message }, { status: 500 });
  }
}
