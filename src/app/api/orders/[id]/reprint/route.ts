import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const cashierName = body.cashier_name || 'Admin';

    const orderRes = await dbQuery('SELECT id, receipt_number, reprint_count FROM orders WHERE id = $1', [id]);
    if (orderRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orderRes[0];
    const newCount = (order.reprint_count || 0) + 1;

    await Promise.all([
      dbQuery('UPDATE orders SET reprint_count = $1 WHERE id = $2', [newCount, order.id]),
      dbQuery(
        `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, new_values)
         VALUES ($1, 'RECEIPT_REPRINT', 'order', $2, $3, $4)`,
        [
          cashierName,
          order.id,
          `Reprinted receipt #${order.receipt_number} (Reprint #${newCount})`,
          JSON.stringify({ reprint_count: newCount, receipt_number: order.receipt_number }),
        ]
      ),
    ]);

    return NextResponse.json({
      success: true,
      reprint_count: newCount,
      message: `Receipt #${order.receipt_number} reprint logged.`,
    });
  } catch (error: any) {
    console.error('Reprint error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record reprint', details: error.message },
      { status: 500 }
    );
  }
}
