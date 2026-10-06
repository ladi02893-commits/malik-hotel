import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';
import { getDateRange } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today';
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('payment_method');
    const search = searchParams.get('search');
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    let query = `
      SELECT o.*, 
        COUNT(oi.id) as items_count,
        COALESCE(STRING_AGG(DISTINCT p.payment_method_id, ', '), 'cash') as payment_methods_summary
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Date filtering
    if (range && range !== 'all') {
      let startDateStr = '';
      let endDateStr = '';

      if (['today', 'yesterday', 'this_week', 'this_month'].includes(range)) {
        const dateRange = getDateRange(range as any);
        startDateStr = dateRange.startDate;
        endDateStr = dateRange.endDate;
      } else if (searchParams.get('start_date') && searchParams.get('end_date')) {
        startDateStr = searchParams.get('start_date')!;
        endDateStr = searchParams.get('end_date')!;
      }

      if (startDateStr && endDateStr) {
        query += ` AND o.created_at >= $${paramIndex} AND o.created_at <= $${paramIndex + 1}`;
        params.push(startDateStr, endDateStr);
        paramIndex += 2;
      }
    }

    // Status filtering
    if (status && status !== 'all') {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Payment method filtering
    if (paymentMethod && paymentMethod !== 'all') {
      query += ` AND EXISTS (SELECT 1 FROM payments pm WHERE pm.order_id = o.id AND pm.payment_method_id = $${paramIndex})`;
      params.push(paymentMethod);
      paramIndex++;
    }

    // Search query (receipt number or customer)
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (o.receipt_number ILIKE $${paramIndex} OR o.order_number ILIKE $${paramIndex} OR o.customer_name_snapshot ILIKE $${paramIndex})`;
      params.push(searchTerm);
      paramIndex++;
    }

    query += `
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const orders = await dbQuery(query, params);

    // Format numbers safely
    const formattedOrders = orders.map((o: any) => ({
      ...o,
      subtotal: parseFloat(o.subtotal) || 0,
      discount_amount: parseFloat(o.discount_amount) || 0,
      grand_total: parseFloat(o.grand_total) || 0,
      total_paid: parseFloat(o.total_paid) || 0,
      change_returned: parseFloat(o.change_returned) || 0,
      items_count: parseInt(o.items_count, 10) || 0,
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve orders', details: error.message },
      { status: 500 }
    );
  }
}
