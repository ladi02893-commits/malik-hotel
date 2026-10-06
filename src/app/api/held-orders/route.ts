import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const heldOrders = await dbQuery(
      `SELECT * FROM held_orders WHERE status = 'held' ORDER BY created_at DESC`
    );

    const formatted = heldOrders.map((h: any) => {
      const payload =
        typeof h.cart_payload === 'string'
          ? (() => {
              try {
                return JSON.parse(h.cart_payload);
              } catch {
                return {};
              }
            })()
          : h.cart_payload || {};

      return {
        ...h,
        cart_payload: payload,
        subtotal: parseFloat(h.subtotal) || 0,
        discount_amount: parseFloat(h.discount_amount) || 0,
        grand_total: parseFloat(h.grand_total) || 0,
        items_count: Array.isArray(payload?.items) ? payload.items.length : 0,
      };
    });

    return NextResponse.json({ success: true, heldOrders: formatted });
  } catch (error: any) {
    console.error('Fetch held orders error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve held orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cart_payload,
      customer_name,
      note,
      subtotal,
      discount_amount = 0,
      grand_total,
      cashier_name = 'Admin',
      user_id,
    } = body;

    if (!cart_payload || !cart_payload.items || cart_payload.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty. Nothing to hold.' }, { status: 400 });
    }

    // Generate Hold Number H-0012
    const seqRes = await dbQuery("SELECT nextval('hold_seq') AS num");
    const num = seqRes[0]?.num || Date.now().toString().slice(-4);
    const holdNumber = `H-${String(num).padStart(4, '0')}`;

    let validUserId: string | null = null;
    if (user_id) {
      try {
        const pCheck = await dbQuery('SELECT id FROM profiles WHERE id = $1', [user_id]);
        if (pCheck.length > 0) validUserId = pCheck[0].id;
      } catch {
        validUserId = null;
      }
    }

    const cleanSubtotal = Number(subtotal) || 0;
    const cleanDiscount = Number(discount_amount) || 0;
    const cleanGrandTotal = Number(grand_total) || cleanSubtotal;

    const insertRes = await dbQuery(
      `INSERT INTO held_orders (
        hold_number, customer_name, note, cart_payload,
        subtotal, discount_amount, grand_total, created_by, cashier_name_snapshot, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'held') RETURNING *`,
      [
        holdNumber,
        customer_name ? String(customer_name).trim() : null,
        note ? String(note).trim() : null,
        JSON.stringify(cart_payload),
        cleanSubtotal,
        cleanDiscount,
        cleanGrandTotal,
        validUserId,
        cashier_name || 'Admin',
      ]
    );

    const heldOrder = insertRes[0];

    // Log to audit (non-blocking)
    try {
      await dbQuery(
        `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description)
         VALUES ($1, 'ORDER_HELD', 'held_order', $2, $3)`,
        [
          cashier_name || 'Admin',
          heldOrder.id,
          `Placed cart on hold (${holdNumber}) for Rs. ${cleanGrandTotal} (${cart_payload.items.length} items)`,
        ]
      );
    } catch (auditErr) {
      console.warn('Audit log write warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Order held as ${holdNumber}`,
      heldOrder: {
        ...heldOrder,
        subtotal: parseFloat(heldOrder.subtotal),
        discount_amount: parseFloat(heldOrder.discount_amount),
        grand_total: parseFloat(heldOrder.grand_total),
      },
    });
  } catch (error: any) {
    console.error('Hold order error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to hold order' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const cashierName = body.cashier_name || 'Admin';

    if (!id) {
      return NextResponse.json({ success: false, error: 'Hold ID is required' }, { status: 400 });
    }

    const heldRes = await dbQuery('SELECT * FROM held_orders WHERE id = $1', [id]);
    if (heldRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Held order not found' }, { status: 404 });
    }

    const heldOrder = heldRes[0];

    // Mark as resumed
    await dbQuery(
      `UPDATE held_orders SET status = 'resumed', resumed_at = NOW() WHERE id = $1`,
      [id]
    );

    try {
      await dbQuery(
        `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description)
         VALUES ($1, 'ORDER_RESUMED', 'held_order', $2, $3)`,
        [cashierName, id, `Resumed held order ${heldOrder.hold_number}`]
      );
    } catch (auditErr) {
      console.warn('Audit log warning:', auditErr);
    }

    const payload =
      typeof heldOrder.cart_payload === 'string'
        ? (() => {
            try {
              return JSON.parse(heldOrder.cart_payload);
            } catch {
              return {};
            }
          })()
        : heldOrder.cart_payload || {};

    return NextResponse.json({
      success: true,
      message: `Held order ${heldOrder.hold_number} resumed.`,
      cart_payload: payload,
      customer_name: heldOrder.customer_name,
      note: heldOrder.note,
    });
  } catch (error: any) {
    console.error('Resume held order error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to resume held order' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Hold ID is required' }, { status: 400 });
    }

    await dbQuery(`UPDATE held_orders SET status = 'cancelled' WHERE id = $1`, [id]);

    return NextResponse.json({ success: true, message: 'Held order deleted.' });
  } catch (error: any) {
    console.error('Delete held order error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete held order' },
      { status: 500 }
    );
  }
}
