import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';
import { getDateRange } from '@/lib/dates';
import { addMoney, subtractMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const targetDate = dateParam || new Date().toISOString().slice(0, 10);

    const [
      salesRes,
      cashSalesRes,
      digitalSalesRes,
      purchasesRes,
      purchaseItemsRes,
      drawerSessionRes,
      totalPayablesRes,
      vendorPaymentsTodayRes,
    ] = await Promise.all([
      // 1. Sales Summary today (in Pakistan Time)
      dbQuery(
        `SELECT 
          COUNT(id) as total_orders,
          COALESCE(SUM(subtotal), 0) as gross_sales,
          COALESCE(SUM(discount_amount), 0) as discounts,
          COALESCE(SUM(grand_total), 0) as net_sales
         FROM orders
         WHERE status IN ('completed', 'partially_refunded', 'refunded')
           AND (created_at AT TIME ZONE 'Asia/Karachi')::date = $1::date`,
        [targetDate]
      ),

      // 2. Cash sales (in Pakistan Time)
      dbQuery(
        `SELECT COALESCE(SUM(p.amount), 0) as total
         FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE o.status IN ('completed', 'partially_refunded', 'refunded')
           AND p.payment_method_id = 'cash'
           AND (o.created_at AT TIME ZONE 'Asia/Karachi')::date = $1::date`,
        [targetDate]
      ),

      // 3. Digital sales (in Pakistan Time)
      dbQuery(
        `SELECT COALESCE(SUM(p.amount), 0) as total
         FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE o.status IN ('completed', 'partially_refunded', 'refunded')
           AND p.payment_method_id != 'cash'
           AND (o.created_at AT TIME ZONE 'Asia/Karachi')::date = $1::date`,
        [targetDate]
      ),

      // 4. Purchases today
      dbQuery(
        `SELECT 
          COUNT(id) as total_invoices,
          COALESCE(SUM(total_amount), 0) as total_purchases,
          COALESCE(SUM(paid_amount), 0) as paid_cash,
          COALESCE(SUM(balance_amount), 0) as unpaid_credit
         FROM purchase_invoices
         WHERE invoice_date = $1`,
        [targetDate]
      ),

      // 5. Top purchased raw materials today
      dbQuery(
        `SELECT 
          pit.item_name_snapshot as name,
          pit.unit,
          SUM(pit.quantity) as quantity,
          SUM(pit.line_total) as total
         FROM purchase_items pit
         JOIN purchase_invoices pi ON pit.invoice_id = pi.id
         WHERE pi.invoice_date = $1
         GROUP BY pit.item_name_snapshot, pit.unit
         ORDER BY total DESC
         LIMIT 10`,
        [targetDate]
      ),

      // 6. Cash register session today
      dbQuery(
        `SELECT * FROM register_sessions
         WHERE (opened_at AT TIME ZONE 'Asia/Karachi')::date = $1::date
         ORDER BY opened_at DESC LIMIT 1`,
        [targetDate]
      ),

      // 7. Total outstanding payables to all vendors
      dbQuery(
        `SELECT COALESCE(SUM(current_balance), 0) as total_payable
         FROM vendors
         WHERE is_active = TRUE AND current_balance > 0`
      ),

      // 8. Vendor payments made today
      dbQuery(
        `SELECT COALESCE(SUM(amount), 0) as total_paid
         FROM vendor_payments
         WHERE payment_date = $1`,
        [targetDate]
      ),
    ]);

    const salesTotalOrders = parseInt(salesRes[0]?.total_orders || '0', 10);
    const salesGross = parseFloat(salesRes[0]?.gross_sales || '0');
    const salesDiscounts = parseFloat(salesRes[0]?.discounts || '0');
    const salesNet = parseFloat(salesRes[0]?.net_sales || '0');
    const cashSales = parseFloat(cashSalesRes[0]?.total || '0');
    const digitalSales = parseFloat(digitalSalesRes[0]?.total || '0');

    const purchasesTotalInvoices = parseInt(purchasesRes[0]?.total_invoices || '0', 10);
    const purchasesTotal = parseFloat(purchasesRes[0]?.total_purchases || '0');
    const purchasesPaid = parseFloat(purchasesRes[0]?.paid_cash || '0');
    const purchasesCredit = parseFloat(purchasesRes[0]?.unpaid_credit || '0');

    // Register drawer breakdown
    let registerSession = drawerSessionRes[0] || null;
    let openingFloat = 0;
    let cashIn = 0;
    let cashOut = 0;
    let cashRefunds = 0;
    let expectedCash = 0;
    let actualCash = registerSession?.actual_amount ? parseFloat(registerSession.actual_amount) : undefined;
    let difference = registerSession?.difference ? parseFloat(registerSession.difference) : undefined;

    if (registerSession) {
      openingFloat = parseFloat(registerSession.opening_amount) || 0;
      const txs = await dbQuery(
        'SELECT type, amount FROM register_transactions WHERE register_session_id = $1',
        [registerSession.id]
      );
      for (const t of txs) {
        const amt = parseFloat(t.amount);
        if (t.type === 'CASH_IN') cashIn = addMoney(cashIn, amt);
        else if (t.type === 'CASH_OUT') cashOut = addMoney(cashOut, amt);
        else if (t.type === 'REFUND') cashRefunds = addMoney(cashRefunds, amt);
      }
      expectedCash = addMoney(openingFloat, cashSales, cashIn, -cashRefunds, -cashOut);
    }

    const totalOutstandingPayable = parseFloat(totalPayablesRes[0]?.total_payable || '0');
    const paymentsMadeToday = parseFloat(vendorPaymentsTodayRes[0]?.total_paid || '0');

    // Operational day gross margin
    const dayGrossMargin = subtractMoney(salesNet, purchasesTotal);
    // Net cash flow in drawer
    const netCashFlow = subtractMoney(addMoney(cashSales, cashIn), addMoney(purchasesPaid, cashOut, cashRefunds));

    return NextResponse.json({
      success: true,
      data: {
        date: targetDate,
        sales: {
          total_orders: salesTotalOrders,
          gross_sales: salesGross,
          discounts: salesDiscounts,
          net_sales: salesNet,
          cash_sales: cashSales,
          digital_sales: digitalSales,
        },
        purchases: {
          total_invoices: purchasesTotalInvoices,
          total_purchases: purchasesTotal,
          paid_cash: purchasesPaid,
          unpaid_credit: purchasesCredit,
          top_items: purchaseItemsRes.map((p: any) => ({
            name: p.name,
            unit: p.unit,
            quantity: parseFloat(p.quantity) || 0,
            total: parseFloat(p.total) || 0,
          })),
        },
        cash_drawer: {
          is_open: registerSession ? registerSession.status === 'open' : false,
          opening_float: openingFloat,
          cash_sales: cashSales,
          cash_in: cashIn,
          cash_out: cashOut,
          cash_refunds: cashRefunds,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          difference,
        },
        vendors: {
          total_outstanding_payable: totalOutstandingPayable,
          payments_made_today: paymentsMadeToday,
        },
        margin: {
          day_gross_margin: dayGrossMargin,
          net_cash_flow: netCashFlow,
        },
      },
    });
  } catch (error: any) {
    console.error('Fetch daily summary error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate daily summary', details: error.message }, { status: 500 });
  }
}
