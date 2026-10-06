import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, withTransaction } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      vendor_id,
      amount,
      payment_date,
      payment_method = 'cash',
      reference_number,
      deduct_from_register = false,
      notes,
      cashier_name = 'Admin',
      user_id,
    } = body;

    if (!vendor_id) {
      return NextResponse.json({ success: false, error: 'Vendor is required.' }, { status: 400 });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Payment amount must be greater than zero.' }, { status: 400 });
    }

    const vendorRes = await dbQuery('SELECT id, name, current_balance FROM vendors WHERE id = $1', [vendor_id]);
    if (vendorRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }
    const vendor = vendorRes[0];

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

    // Check register session if deducting from drawer
    let activeRegister: any = null;
    if (deduct_from_register) {
      const regRes = await dbQuery("SELECT id FROM register_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
      if (regRes.length === 0) {
        return NextResponse.json({ success: false, error: 'Cash register is closed. Cannot deduct payment from drawer.' }, { status: 400 });
      }
      activeRegister = regRes[0];
    }

    const completedPayment = await withTransaction(async (client) => {
      // Generate sequential payment number
      const seqRes = await client.query("SELECT nextval('vendor_pay_seq') AS num");
      const num = seqRes.rows[0].num;
      const fullPaymentNumber = `VPAY-${String(num).padStart(5, '0')}`;

      // Insert Payment
      const payRes = await client.query(
        `INSERT INTO vendor_payments (
          payment_number, vendor_id, amount, payment_date,
          payment_method, reference_number, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          fullPaymentNumber,
          vendor.id,
          payAmount,
          payment_date || new Date().toISOString().slice(0, 10),
          payment_method,
          reference_number ? String(reference_number).trim() : null,
          notes ? String(notes).trim() : null,
          validUserId,
        ]
      );

      // Deduct vendor's current payable balance
      await client.query(
        `UPDATE vendors SET current_balance = current_balance - $1, updated_at = NOW() WHERE id = $2`,
        [payAmount, vendor.id]
      );

      // If deducted from cash drawer, record in register transactions
      if (activeRegister) {
        await client.query(
          `INSERT INTO register_transactions (
            register_session_id, type, amount, reason, note, created_by, user_name_snapshot
          ) VALUES ($1, 'CASH_OUT', $2, 'Vendor Payment', $3, $4, $5)`,
          [
            activeRegister.id,
            payAmount,
            `Paid Rs. ${payAmount} to ${vendor.name} (${fullPaymentNumber})`,
            validUserId,
            cashier_name,
          ]
        );
      }

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, user_name, action, entity_type, entity_id, description, new_values
        ) VALUES ($1, $2, 'VENDOR_PAYMENT', 'vendor_payment', $3, $4, $5)`,
        [
          validUserId,
          cashier_name,
          payRes.rows[0].id,
          `Paid Rs. ${payAmount} to vendor "${vendor.name}" (${payment_method})`,
          JSON.stringify({
            payment_number: fullPaymentNumber,
            vendor: vendor.name,
            amount: payAmount,
            method: payment_method,
            previous_balance: vendor.current_balance,
            new_balance: parseFloat(vendor.current_balance) - payAmount,
          }),
        ]
      );

      return payRes.rows[0];
    });

    return NextResponse.json({
      success: true,
      message: `Payment of Rs. ${payAmount} to "${vendor.name}" recorded successfully.`,
      payment: completedPayment,
    });
  } catch (error: any) {
    console.error('Vendor payment error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record vendor payment', details: error.message }, { status: 500 });
  }
}
