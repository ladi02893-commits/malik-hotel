import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, withTransaction } from '@/lib/insforge/server';
import { getDateRange } from '@/lib/dates';
import { addMoney, multiplyMoney, subtractMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'this_month';
    const vendorId = searchParams.get('vendor_id');
    const paymentStatus = searchParams.get('payment_status');
    const search = searchParams.get('search');
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

    let startDateStr = '';
    let endDateStr = '';

    if (range && range !== 'all') {
      if (['today', 'yesterday', 'this_week', 'this_month'].includes(range)) {
        const dr = getDateRange(range as any);
        startDateStr = dr.startDate.slice(0, 10);
        endDateStr = dr.endDate.slice(0, 10);
      } else if (searchParams.get('start_date') && searchParams.get('end_date')) {
        startDateStr = searchParams.get('start_date')!;
        endDateStr = searchParams.get('end_date')!;
      }
    }

    let query = `
      SELECT pi.*, 
        v.phone as vendor_phone,
        v.category as vendor_category,
        COUNT(pit.id) as items_count
      FROM purchase_invoices pi
      LEFT JOIN vendors v ON pi.vendor_id = v.id
      LEFT JOIN purchase_items pit ON pi.id = pit.invoice_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (startDateStr && endDateStr) {
      query += ` AND pi.invoice_date >= $${idx} AND pi.invoice_date <= $${idx + 1}`;
      params.push(startDateStr, endDateStr);
      idx += 2;
    }

    if (vendorId && vendorId !== 'all') {
      query += ` AND pi.vendor_id = $${idx}`;
      params.push(vendorId);
      idx++;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query += ` AND pi.payment_status = $${idx}`;
      params.push(paymentStatus);
      idx++;
    }

    if (search && search.trim()) {
      query += ` AND (pi.invoice_number ILIKE $${idx} OR pi.vendor_name_snapshot ILIKE $${idx} OR pi.notes ILIKE $${idx})`;
      params.push(`%${search.trim()}%`);
      idx++;
    }

    query += `
      GROUP BY pi.id, v.phone, v.category
      ORDER BY pi.invoice_date DESC, pi.created_at DESC
      LIMIT $${idx}
    `;
    params.push(limit);

    const invoices = await dbQuery(query, params);

    // Fetch items for these invoices
    const invoiceIds = invoices.map((i: any) => i.id);
    let items: any[] = [];
    if (invoiceIds.length > 0) {
      items = await dbQuery(
        `SELECT * FROM purchase_items WHERE invoice_id = ANY($1) ORDER BY created_at ASC`,
        [invoiceIds]
      );
    }

    const formatted = invoices.map((inv: any) => ({
      ...inv,
      subtotal: parseFloat(inv.subtotal) || 0,
      discount_amount: parseFloat(inv.discount_amount) || 0,
      total_amount: parseFloat(inv.total_amount) || 0,
      paid_amount: parseFloat(inv.paid_amount) || 0,
      balance_amount: parseFloat(inv.balance_amount) || 0,
      items_count: parseInt(inv.items_count, 10) || 0,
      items: items
        .filter((item: any) => item.invoice_id === inv.id)
        .map((item: any) => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          line_total: parseFloat(item.line_total) || 0,
        })),
    }));

    // Summary calculations for current filter
    const totalPurchases = formatted.reduce((sum, inv) => addMoney(sum, inv.total_amount), 0);
    const totalPaid = formatted.reduce((sum, inv) => addMoney(sum, inv.paid_amount), 0);
    const totalUnpaid = formatted.reduce((sum, inv) => addMoney(sum, inv.balance_amount), 0);

    return NextResponse.json({
      success: true,
      purchases: formatted,
      summary: {
        totalPurchases,
        totalPaid,
        totalUnpaid,
        invoicesCount: formatted.length,
      },
    });
  } catch (error: any) {
    console.error('Fetch purchases error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve purchases', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      vendor_id,
      vendor_name,
      invoice_date,
      items, // array of { raw_material_id?, item_name, quantity, unit, unit_price }
      discount_amount = 0,
      paid_amount = 0,
      payment_method = 'cash',
      deduct_from_register = false,
      notes,
      cashier_name = 'Admin',
      user_id,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Please add at least one item to purchase.' }, { status: 400 });
    }

    if (!vendor_name || !vendor_name.trim()) {
      return NextResponse.json({ success: false, error: 'Vendor name is required.' }, { status: 400 });
    }

    // Defensive check on user_id against profiles
    let validUserId: string | null = null;
    if (user_id) {
      try {
        const pCheck = await dbQuery('SELECT id FROM profiles WHERE id = $1', [user_id]);
        if (pCheck.length > 0) validUserId = pCheck[0].id;
      } catch {
        validUserId = null;
      }
    }

    // Calculate authoritative totals
    let calculatedSubtotal = 0;
    const validatedItems: any[] = [];

    for (const it of items) {
      const name = String(it.item_name || it.name || '').trim();
      if (!name) continue;

      const qty = Math.max(0.1, parseFloat(it.quantity) || 1);
      const price = Math.max(0, parseFloat(it.unit_price) || 0);
      const lineTotal = multiplyMoney(qty, price);
      calculatedSubtotal = addMoney(calculatedSubtotal, lineTotal);

      validatedItems.push({
        raw_material_id: it.raw_material_id || null,
        item_name_snapshot: name,
        quantity: qty,
        unit: it.unit ? String(it.unit).trim() : 'kg',
        unit_price: price,
        line_total: lineTotal,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid items found in purchase bill.' }, { status: 400 });
    }

    const cleanDiscount = Math.max(0, parseFloat(discount_amount) || 0);
    const cleanTotal = Math.max(0, subtractMoney(calculatedSubtotal, cleanDiscount));
    const cleanPaid = Math.min(cleanTotal, Math.max(0, parseFloat(paid_amount) || 0));
    const cleanBalance = subtractMoney(cleanTotal, cleanPaid);

    let paymentStatus: 'paid' | 'partial' | 'credit' = 'paid';
    if (cleanPaid === 0) {
      paymentStatus = 'credit';
    } else if (cleanPaid < cleanTotal) {
      paymentStatus = 'partial';
    }

    // Check register session if deducting from drawer
    let activeRegister: any = null;
    if (deduct_from_register && cleanPaid > 0) {
      const regRes = await dbQuery("SELECT id FROM register_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
      if (regRes.length === 0) {
        return NextResponse.json({ success: false, error: 'Cash register is closed. Cannot deduct expense from drawer.' }, { status: 400 });
      }
      activeRegister = regRes[0];
    }

    // Atomic execution
    const completedInvoice = await withTransaction(async (client) => {
      // Generate sequential invoice number
      const seqRes = await client.query("SELECT nextval('purchase_seq') AS num");
      const num = seqRes.rows[0].num;
      const fullInvoiceNumber = `PUR-${String(num).padStart(5, '0')}`;

      // Insert Purchase Invoice
      const invRes = await client.query(
        `INSERT INTO purchase_invoices (
          invoice_number, vendor_id, vendor_name_snapshot, invoice_date,
          subtotal, discount_amount, total_amount, paid_amount, balance_amount,
          payment_method, payment_status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          fullInvoiceNumber,
          vendor_id || null,
          vendor_name.trim(),
          invoice_date || new Date().toISOString().slice(0, 10),
          calculatedSubtotal,
          cleanDiscount,
          cleanTotal,
          cleanPaid,
          cleanBalance,
          payment_method,
          paymentStatus,
          notes ? String(notes).trim() : null,
          validUserId,
        ]
      );

      const newInv = invRes.rows[0];

      // Insert line items
      for (const item of validatedItems) {
        await client.query(
          `INSERT INTO purchase_items (
            invoice_id, raw_material_id, item_name_snapshot, quantity, unit, unit_price, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newInv.id,
            item.raw_material_id,
            item.item_name_snapshot,
            item.quantity,
            item.unit,
            item.unit_price,
            item.line_total,
          ]
        );
      }

      // If vendor exists and there is an unpaid balance, update vendor balance (payable)
      if (vendor_id && cleanBalance > 0) {
        await client.query(
          `UPDATE vendors SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2`,
          [cleanBalance, vendor_id]
        );
      }

      // If paid from cash drawer, record in register transactions
      if (activeRegister && cleanPaid > 0) {
        await client.query(
          `INSERT INTO register_transactions (
            register_session_id, type, amount, reason, note, created_by, user_name_snapshot
          ) VALUES ($1, 'CASH_OUT', $2, 'Raw Material Purchase', $3, $4, $5)`,
          [
            activeRegister.id,
            cleanPaid,
            `Bill #${fullInvoiceNumber} (${vendor_name}): ${validatedItems.map(i => i.item_name_snapshot).join(', ')}`,
            validUserId,
            cashier_name,
          ]
        );
      }

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, user_name, action, entity_type, entity_id, description, new_values
        ) VALUES ($1, $2, 'PURCHASE_CREATED', 'purchase_invoice', $3, $4, $5)`,
        [
          validUserId,
          cashier_name,
          newInv.id,
          `Recorded raw material purchase ${fullInvoiceNumber} from "${vendor_name}" for Rs. ${cleanTotal} (${paymentStatus})`,
          JSON.stringify({
            invoice_number: fullInvoiceNumber,
            total_amount: cleanTotal,
            paid_amount: cleanPaid,
            balance: cleanBalance,
            vendor: vendor_name,
            items_count: validatedItems.length,
          }),
        ]
      );

      return {
        ...newInv,
        items: validatedItems,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Purchase invoice ${completedInvoice.invoice_number} recorded successfully.`,
      invoice: completedInvoice,
    });
  } catch (error: any) {
    console.error('Create purchase error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record purchase invoice', details: error.message }, { status: 500 });
  }
}
