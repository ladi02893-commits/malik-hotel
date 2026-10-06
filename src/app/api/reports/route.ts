import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';
import { getDateRange } from '@/lib/dates';
import { addMoney, subtractMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today';
    const reportType = searchParams.get('type') || 'summary';

    let startDateStr = '';
    let endDateStr = '';

    if (['today', 'yesterday', 'this_week', 'this_month'].includes(range)) {
      const dr = getDateRange(range as any);
      startDateStr = dr.startDate;
      endDateStr = dr.endDate;
    } else if (searchParams.get('start_date') && searchParams.get('end_date')) {
      startDateStr = searchParams.get('start_date')!;
      endDateStr = searchParams.get('end_date')!;
    } else {
      const dr = getDateRange('today');
      startDateStr = dr.startDate;
      endDateStr = dr.endDate;
    }

    // 1. SALES SUMMARY
    const salesSummaryRes = await dbQuery(
      `SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(service_charge_amount), 0) as total_service_charge,
        COALESCE(SUM(rounding_amount), 0) as total_rounding,
        COALESCE(SUM(grand_total), 0) as total_sales
       FROM orders
       WHERE status IN ('completed', 'partially_refunded', 'refunded')
         AND created_at >= $1 AND created_at <= $2`,
      [startDateStr, endDateStr]
    );

    const refundsSummaryRes = await dbQuery(
      `SELECT 
        COUNT(id) as total_refunds,
        COALESCE(SUM(total_refund_amount), 0) as total_refund_amount
       FROM refunds
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDateStr, endDateStr]
    );

    const grossSales = parseFloat(salesSummaryRes[0]?.gross_sales || '0');
    const totalDiscounts = parseFloat(salesSummaryRes[0]?.total_discounts || '0');
    const totalRefundAmount = parseFloat(refundsSummaryRes[0]?.total_refund_amount || '0');
    const totalTax = parseFloat(salesSummaryRes[0]?.total_tax || '0');
    const totalServiceCharge = parseFloat(salesSummaryRes[0]?.total_service_charge || '0');
    const totalRounding = parseFloat(salesSummaryRes[0]?.total_rounding || '0');
    const grandSales = parseFloat(salesSummaryRes[0]?.total_sales || '0');

    // Net Sales = (Gross Sales - Discounts) - Refunds + Tax + Service Charge + Rounding
    const netSales = subtractMoney(grandSales, totalRefundAmount);

    // 2. PAYMENT METHODS BREAKDOWN
    const paymentsRes = await dbQuery(
      `SELECT 
        p.payment_method_id,
        pm.name as payment_method_name,
        pm.type as payment_method_type,
        COUNT(p.id) as transactions_count,
        COALESCE(SUM(p.amount), 0) as total_amount
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       JOIN payment_methods pm ON p.payment_method_id = pm.id
       WHERE o.status IN ('completed', 'partially_refunded', 'refunded')
         AND o.created_at >= $1 AND o.created_at <= $2
       GROUP BY p.payment_method_id, pm.name, pm.type
       ORDER BY total_amount DESC`,
      [startDateStr, endDateStr]
    );

    // 3. PRODUCT SALES BREAKDOWN
    const productSalesRes = await dbQuery(
      `SELECT 
        oi.product_id,
        oi.product_name_snapshot as product_name,
        c.name as category_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.line_total) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE o.status IN ('completed', 'partially_refunded', 'refunded')
         AND o.created_at >= $1 AND o.created_at <= $2
       GROUP BY oi.product_id, oi.product_name_snapshot, c.name
       ORDER BY quantity_sold DESC
       LIMIT 50`,
      [startDateStr, endDateStr]
    );

    // 4. CATEGORY BREAKDOWN
    const categorySalesRes = await dbQuery(
      `SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        SUM(oi.quantity) as total_items_sold,
        SUM(oi.line_total) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE o.status IN ('completed', 'partially_refunded', 'refunded')
         AND o.created_at >= $1 AND o.created_at <= $2
       GROUP BY c.name
       ORDER BY total_revenue DESC`,
      [startDateStr, endDateStr]
    );

    // 5. REGISTER SESSIONS
    const registerSessionsRes = await dbQuery(
      `SELECT * FROM register_sessions 
       WHERE opened_at >= $1 AND opened_at <= $2
       ORDER BY opened_at DESC`,
      [startDateStr, endDateStr]
    );

    // 6. VOIDED ORDERS
    const voidOrdersRes = await dbQuery(
      `SELECT id, order_number, receipt_number, grand_total, void_reason, cashier_name_snapshot, voided_at
       FROM orders
       WHERE status = 'voided' 
         AND ((voided_at IS NOT NULL AND voided_at >= $1 AND voided_at <= $2)
              OR (voided_at IS NULL AND created_at >= $1 AND created_at <= $2))
       ORDER BY COALESCE(voided_at, created_at) DESC`,
      [startDateStr, endDateStr]
    );

    // 7. HOURLY SALES TREND FOR DASHBOARD
    const hourlyTrendRes = await dbQuery(
      `SELECT 
        EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Karachi') as hour_of_day,
        COUNT(o.id) as orders_count,
        COALESCE(SUM(o.grand_total), 0) as sales
       FROM orders o
       WHERE o.status IN ('completed', 'partially_refunded')
         AND o.created_at >= $1 AND o.created_at <= $2
       GROUP BY hour_of_day
       ORDER BY hour_of_day ASC`,
      [startDateStr, endDateStr]
    );

    return NextResponse.json({
      success: true,
      period: {
        range,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      summary: {
        totalOrders: parseInt(salesSummaryRes[0]?.total_orders || '0', 10),
        grossSales,
        totalDiscounts,
        totalRefundAmount,
        netSales,
        totalTax,
        totalServiceCharge,
        totalRounding,
        grandSales,
        totalRefunds: parseInt(refundsSummaryRes[0]?.total_refunds || '0', 10),
      },
      payments: paymentsRes.map((p: any) => ({
        ...p,
        total_amount: parseFloat(p.total_amount),
        transactions_count: parseInt(p.transactions_count, 10),
      })),
      productSales: productSalesRes.map((ps: any) => ({
        ...ps,
        quantity_sold: parseFloat(ps.quantity_sold) || 0,
        total_revenue: parseFloat(ps.total_revenue) || 0,
      })),
      categorySales: categorySalesRes.map((cs: any) => ({
        ...cs,
        total_items_sold: parseFloat(cs.total_items_sold) || 0,
        total_revenue: parseFloat(cs.total_revenue) || 0,
      })),
      registerSessions: registerSessionsRes.map((rs: any) => ({
        ...rs,
        opening_amount: parseFloat(rs.opening_amount),
        expected_amount: rs.expected_amount ? parseFloat(rs.expected_amount) : null,
        actual_amount: rs.actual_amount ? parseFloat(rs.actual_amount) : null,
        difference: rs.difference ? parseFloat(rs.difference) : null,
      })),
      voidOrders: voidOrdersRes.map((vo: any) => ({
        ...vo,
        grand_total: parseFloat(vo.grand_total),
      })),
      hourlyTrend: hourlyTrendRes.map((ht: any) => ({
        hour: `${String(Math.floor(ht.hour_of_day)).padStart(2, '0')}:00`,
        orders_count: parseInt(ht.orders_count, 10),
        sales: parseFloat(ht.sales),
      })),
    });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate reports', details: error.message }, { status: 500 });
  }
}
