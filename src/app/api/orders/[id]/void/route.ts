import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason, admin_pin, cashier_name = 'Admin', user_id } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Void reason is required.' }, { status: 400 });
    }

    const orderRes = await dbQuery('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 });
    }

    const order = orderRes[0];
    if (order.status === 'voided') {
      return NextResponse.json({ success: false, error: 'Order is already voided.' }, { status: 400 });
    }

    // Check POS settings for void approval
    const posSettingsRes = await dbQuery('SELECT * FROM pos_settings WHERE id = $1', ['default']);
    const posSettings = posSettingsRes[0] || {};

    if (posSettings.require_void_approval) {
      const adminUser = await dbQuery("SELECT pin_code FROM profiles WHERE role = 'admin' AND status = 'active' LIMIT 1");
      const validPin = adminUser[0]?.pin_code || '1234';
      if (admin_pin !== validPin) {
        return NextResponse.json({ success: false, error: 'Void requires a valid supervisor/admin PIN.' }, { status: 403 });
      }
    }

    // Get order payments to check for cash
    const payments = await dbQuery('SELECT * FROM payments WHERE order_id = $1', [order.id]);
    const cashPaid = payments
      .filter((p: any) => p.payment_method_id === 'cash')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

    const activeRegisterRes = await dbQuery("SELECT id FROM register_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
    const activeRegister = activeRegisterRes[0] || null;

    let validUserId: string | null = null;
    if (user_id) {
      try {
        const pCheck = await dbQuery('SELECT id FROM profiles WHERE id = $1', [user_id]);
        if (pCheck.length > 0) validUserId = pCheck[0].id;
      } catch {
        validUserId = null;
      }
    }

    await withTransaction(async (client) => {
      // Update order status
      await client.query(
        `UPDATE orders 
         SET status = 'voided', void_reason = $1, voided_at = NOW(), voided_by = $2 
         WHERE id = $3`,
        [reason.trim(), validUserId, order.id]
      );

      // If cash was involved and register is open, reverse cash in register
      if (cashPaid > 0 && activeRegister) {
        await client.query(
          `INSERT INTO register_transactions (
            register_session_id, type, amount, order_id, reason, note, created_by, user_name_snapshot
          ) VALUES ($1, 'ADJUSTMENT', $2, $3, 'Order Void Reversal', $4, $5, $6)`,
          [
            activeRegister.id,
            -cashPaid, // negative amount to adjust drawer
            order.id,
            `Voided Receipt #${order.receipt_number}: ${reason.trim()}`,
            validUserId,
            cashier_name,
          ]
        );
      }

      // Record immutable audit log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, user_name, action, entity_type, entity_id, description, old_values, new_values
        ) VALUES ($1, $2, 'ORDER_VOIDED', 'order', $3, $4, $5, $6)`,
        [
          validUserId,
          cashier_name,
          order.id,
          `Voided receipt #${order.receipt_number} (Rs. ${order.grand_total}). Reason: ${reason.trim()}`,
          JSON.stringify({ previous_status: order.status }),
          JSON.stringify({ status: 'voided', void_reason: reason.trim(), cash_reversed: cashPaid }),
        ]
      );
    });

    return NextResponse.json({
      success: true,
      message: `Receipt #${order.receipt_number} voided successfully.`,
    });
  } catch (error: any) {
    console.error('Void order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to void order', details: error.message },
      { status: 500 }
    );
  }
}
