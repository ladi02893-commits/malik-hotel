import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const orders = await dbQuery('SELECT * FROM orders WHERE id::text = $1 OR receipt_number = $1', [id]);
    if (orders.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    const [items, addons, payments, refunds] = await Promise.all([
      dbQuery('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC', [order.id]),
      dbQuery(`
        SELECT oia.* 
        FROM order_item_addons oia 
        JOIN order_items oi ON oia.order_item_id = oi.id 
        WHERE oi.order_id = $1
      `, [order.id]),
      dbQuery('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at ASC', [order.id]),
      dbQuery('SELECT * FROM refunds WHERE order_id = $1 ORDER BY created_at DESC', [order.id]),
    ]);

    const formattedItems = items.map((item: any) => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      item_subtotal: parseFloat(item.item_subtotal),
      addons_total: parseFloat(item.addons_total),
      item_discount: parseFloat(item.item_discount),
      line_total: parseFloat(item.line_total),
      addons: addons.filter((a: any) => a.order_item_id === item.id).map((a: any) => ({
        ...a,
        price_snapshot: parseFloat(a.price_snapshot),
        line_total: parseFloat(a.line_total),
      })),
    }));

    const formattedPayments = payments.map((p: any) => ({
      ...p,
      amount: parseFloat(p.amount),
      amount_tendered: p.amount_tendered ? parseFloat(p.amount_tendered) : null,
      change_returned: p.change_returned ? parseFloat(p.change_returned) : null,
    }));

    const formattedRefunds = refunds.map((r: any) => ({
      ...r,
      total_refund_amount: parseFloat(r.total_refund_amount),
    }));

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        subtotal: parseFloat(order.subtotal),
        discount_amount: parseFloat(order.discount_amount),
        tax_amount: parseFloat(order.tax_amount),
        service_charge_amount: parseFloat(order.service_charge_amount),
        rounding_amount: parseFloat(order.rounding_amount),
        grand_total: parseFloat(order.grand_total),
        total_paid: parseFloat(order.total_paid),
        change_returned: parseFloat(order.change_returned),
        items: formattedItems,
        payments: formattedPayments,
        refunds: formattedRefunds,
      },
    });
  } catch (error: any) {
    console.error('Fetch order detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order details', details: error.message },
      { status: 500 }
    );
  }
}
