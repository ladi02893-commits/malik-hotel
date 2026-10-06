import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, dbQuery } from '@/lib/insforge/server';
import { addMoney, multiplyMoney, subtractMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

    const refunds = await dbQuery(
      `SELECT r.*, o.receipt_number as original_receipt_number, o.order_number as original_order_number
       FROM refunds r
       JOIN orders o ON r.order_id = o.id
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );

    const refundIds = refunds.map((r: any) => r.id);
    let items: any[] = [];
    if (refundIds.length > 0) {
      items = await dbQuery(
        `SELECT * FROM refund_items WHERE refund_id = ANY($1)`,
        [refundIds]
      );
    }

    const formatted = refunds.map((r: any) => ({
      ...r,
      total_refund_amount: parseFloat(r.total_refund_amount),
      items: items.filter((i: any) => i.refund_id === r.id).map((i: any) => ({
        ...i,
        unit_price: parseFloat(i.unit_price),
        refund_amount: parseFloat(i.refund_amount),
      })),
    }));

    return NextResponse.json({ success: true, refunds: formatted });
  } catch (error: any) {
    console.error('Fetch refunds error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve refunds' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resolvedRefundType = body.refund_type || (body.refund_items && body.refund_items.length > 0 ? 'partial' : 'full');
    const {
      order_id,
      refund_items, // array of { order_item_id, quantity, unit_price }
      refund_method, // 'cash' | 'jazzcash' | 'easypaisa' | 'card'
      reason,
      notes,
      admin_pin,
      cashier_name = 'Admin',
      user_id,
    } = body;

    if (!order_id) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Refund reason is mandatory.' }, { status: 400 });
    }

    let validUserId: string | null = null;
    if (user_id) {
      try {
        const pCheck = await dbQuery('SELECT id FROM profiles WHERE id = $1', [user_id]);
        if (pCheck.length > 0) validUserId = pCheck[0].id;
      } catch {
        validUserId = null;
      }
    }

    // Fetch order and order items
    const [orderRows, orderItemRows, posSettingsRows, activeRegisterRows] = await Promise.all([
      dbQuery('SELECT * FROM orders WHERE id = $1', [order_id]),
      dbQuery('SELECT * FROM order_items WHERE order_id = $1', [order_id]),
      dbQuery('SELECT * FROM pos_settings WHERE id = $1', ['default']),
      dbQuery("SELECT * FROM register_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1"),
    ]);

    if (orderRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Original order not found' }, { status: 404 });
    }

    const order = orderRows[0];
    if (order.status === 'voided') {
      return NextResponse.json({ success: false, error: 'Cannot refund a voided order.' }, { status: 400 });
    }
    if (order.status === 'refunded') {
      return NextResponse.json({ success: false, error: 'Order has already been fully refunded.' }, { status: 400 });
    }

    const posSettings = posSettingsRows[0] || {};
    const activeRegister = activeRegisterRows[0] || null;

    if (posSettings.require_refund_approval) {
      const adminUser = await dbQuery("SELECT pin_code FROM profiles WHERE role = 'admin' AND status = 'active' LIMIT 1");
      const validPin = adminUser[0]?.pin_code || '1234';
      if (admin_pin !== validPin) {
        return NextResponse.json({ success: false, error: 'Refund requires valid supervisor PIN.' }, { status: 403 });
      }
    }

    // Map existing items
    const itemMap = new Map<string, any>();
    orderItemRows.forEach((item: any) => itemMap.set(item.id, item));

    const validatedRefundItems: any[] = [];
    let calculatedRefundTotal = 0;

    if (resolvedRefundType === 'full') {
      for (const item of orderItemRows) {
        const remainingQty = Number((parseFloat(item.quantity) - parseFloat(item.refunded_quantity || 0)).toFixed(2));
        if (remainingQty > 0) {
          const itemRefundAmt = multiplyMoney(parseFloat(item.unit_price), remainingQty);
          calculatedRefundTotal = addMoney(calculatedRefundTotal, itemRefundAmt);
          validatedRefundItems.push({
            order_item_id: item.id,
            product_name_snapshot: item.product_name_snapshot,
            quantity: remainingQty,
            unit_price: parseFloat(item.unit_price),
            refund_amount: itemRefundAmt,
          });
        }
      }
    } else {
      // Partial refund
      if (!refund_items || !Array.isArray(refund_items) || refund_items.length === 0) {
        return NextResponse.json({ success: false, error: 'No items selected for partial refund.' }, { status: 400 });
      }

      for (const ri of refund_items) {
        const originalItem = itemMap.get(ri.order_item_id);
        if (!originalItem) {
          return NextResponse.json({ success: false, error: `Invalid item selected for refund.` }, { status: 400 });
        }

        const remainingQty = Number((parseFloat(originalItem.quantity) - parseFloat(originalItem.refunded_quantity || 0)).toFixed(2));
        const rawReqQty = parseFloat(ri.quantity);
        const reqQty = isNaN(rawReqQty) ? 0 : Number(rawReqQty.toFixed(2));
        if (reqQty <= 0 || reqQty > remainingQty) {
          return NextResponse.json(
            { success: false, error: `Invalid quantity for ${originalItem.product_name_snapshot}. Max refundable: ${remainingQty}` },
            { status: 400 }
          );
        }

        const unitPrice = parseFloat(originalItem.unit_price);
        const lineRefund = multiplyMoney(unitPrice, reqQty);
        calculatedRefundTotal = addMoney(calculatedRefundTotal, lineRefund);

        validatedRefundItems.push({
          order_item_id: originalItem.id,
          product_name_snapshot: originalItem.product_name_snapshot,
          quantity: reqQty,
          unit_price: unitPrice,
          refund_amount: lineRefund,
        });
      }
    }

    // Cap refund amount so it never exceeds net remaining paid on the order
    const priorRefundsRes = await dbQuery(
      'SELECT COALESCE(SUM(total_refund_amount), 0) as prior_total FROM refunds WHERE order_id = $1',
      [order.id]
    );
    const priorRefundedTotal = parseFloat(priorRefundsRes[0]?.prior_total || '0');
    const orderNetPaid = parseFloat(order.grand_total);
    const maxAllowableRefund = Math.max(0, subtractMoney(orderNetPaid, priorRefundedTotal));

    if (calculatedRefundTotal > maxAllowableRefund) {
      calculatedRefundTotal = maxAllowableRefund;
    }

    if (calculatedRefundTotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'No refundable balance remains on this order.' },
        { status: 400 }
      );
    }

    // Atomic execution
    const completedRefund = await withTransaction(async (client) => {
      // Generate refund sequential number REF-000101
      const refundSeqRes = await client.query("SELECT nextval('refund_seq') AS num");
      const refNum = refundSeqRes.rows[0].num;
      const receiptSettings = await client.query("SELECT refund_prefix FROM receipt_settings WHERE id = 'default'");
      const prefix = receiptSettings.rows[0]?.refund_prefix || 'REF-';
      const fullRefundNumber = `${prefix}${String(refNum).padStart(6, '0')}`;

      // Insert Refund row
      const refundRes = await client.query(
        `INSERT INTO refunds (
          refund_number, order_id, register_session_id, refund_type,
          total_refund_amount, refund_method, reason, notes,
          created_by, user_name_snapshot
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          fullRefundNumber,
          order.id,
          activeRegister ? activeRegister.id : null,
          resolvedRefundType,
          calculatedRefundTotal,
          refund_method || 'cash',
          reason.trim(),
          notes ? String(notes).trim() : null,
          validUserId,
          cashier_name,
        ]
      );

      const newRefund = refundRes.rows[0];

      // Insert refund items and update order_items
      for (const item of validatedRefundItems) {
        await client.query(
          `INSERT INTO refund_items (
            refund_id, order_item_id, product_name_snapshot, quantity, unit_price, refund_amount
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newRefund.id,
            item.order_item_id,
            item.product_name_snapshot,
            item.quantity,
            item.unit_price,
            item.refund_amount,
          ]
        );

        await client.query(
          `UPDATE order_items 
           SET refunded_quantity = refunded_quantity + $1 
           WHERE id = $2`,
          [item.quantity, item.order_item_id]
        );
      }

      // Check whether order is now fully or partially refunded
      const updatedItemsRes = await client.query(
        'SELECT quantity, refunded_quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );

      const allItemsRefunded = updatedItemsRes.rows.every(
        (i: any) => i.refunded_quantity >= i.quantity
      );

      const newOrderStatus = allItemsRefunded ? 'refunded' : 'partially_refunded';
      await client.query('UPDATE orders SET status = $1 WHERE id = $2', [newOrderStatus, order.id]);

      // If refund method is Cash, deduct from active cash register
      if (refund_method === 'cash' && activeRegister) {
        await client.query(
          `INSERT INTO register_transactions (
            register_session_id, type, amount, order_id, refund_id, reason, note, created_by, user_name_snapshot
          ) VALUES ($1, 'REFUND', $2, $3, $4, $5, $6, $7, $8)`,
          [
            activeRegister.id,
            calculatedRefundTotal,
            order.id,
            newRefund.id,
            `Cash Refund #${fullRefundNumber}`,
            `Reason: ${reason.trim()}`,
            validUserId,
            cashier_name,
          ]
        );
      }

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, user_name, action, entity_type, entity_id, description, new_values
        ) VALUES ($1, $2, 'REFUND_CREATED', 'refund', $3, $4, $5)`,
        [
          validUserId,
          cashier_name,
          newRefund.id,
          `Processed ${resolvedRefundType} refund (${fullRefundNumber}) of Rs. ${calculatedRefundTotal} for receipt #${order.receipt_number}. Reason: ${reason.trim()}`,
          JSON.stringify({
            refund_number: fullRefundNumber,
            order_id: order.id,
            receipt_number: order.receipt_number,
            amount: calculatedRefundTotal,
            method: refund_method,
            reason: reason.trim(),
          }),
        ]
      );

      return {
        ...newRefund,
        items: validatedRefundItems,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Refund ${completedRefund.refund_number} processed successfully`,
      refund: completedRefund,
    });
  } catch (error: any) {
    console.error('Process refund error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process refund', details: error.message }, { status: 500 });
  }
}
