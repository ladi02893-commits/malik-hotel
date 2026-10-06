import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, dbQuery } from '@/lib/insforge/server';
import { addMoney, subtractMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeRes = await dbQuery(
      `SELECT * FROM register_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`
    );

    if (activeRes.length === 0) {
      return NextResponse.json({
        success: true,
        isOpen: false,
        activeRegister: null,
      });
    }

    const session = activeRes[0];
    const sessionId = session.id;

    // Fetch transactions for this register session
    const txs = await dbQuery(
      `SELECT * FROM register_transactions WHERE register_session_id = $1 ORDER BY created_at DESC`,
      [sessionId]
    );

    // Calculate shift breakdown
    const openingAmount = parseFloat(session.opening_amount);
    let cashSales = 0;
    let cashIn = 0;
    let cashOut = 0;
    let cashRefunds = 0;
    let adjustments = 0;

    for (const tx of txs) {
      const amt = parseFloat(tx.amount);
      if (tx.type === 'SALE') cashSales = addMoney(cashSales, amt);
      else if (tx.type === 'CASH_IN') cashIn = addMoney(cashIn, amt);
      else if (tx.type === 'CASH_OUT') cashOut = addMoney(cashOut, amt);
      else if (tx.type === 'REFUND') cashRefunds = addMoney(cashRefunds, amt);
      else if (tx.type === 'ADJUSTMENT') adjustments = addMoney(adjustments, amt);
    }

    // Digital sales during this session
    const digitalRes = await dbQuery(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.register_session_id = $1 
         AND p.payment_method_id != 'cash' 
         AND o.status = 'completed'`,
      [sessionId]
    );
    const digitalSales = parseFloat(digitalRes[0]?.total || '0');

    // Expected Drawer Cash = Opening + Cash Sales + Cash In - Cash Refunds - Cash Out + Adjustments
    const expectedCash = addMoney(
      openingAmount,
      cashSales,
      cashIn,
      -cashRefunds,
      -cashOut,
      adjustments
    );

    return NextResponse.json({
      success: true,
      isOpen: true,
      activeRegister: {
        ...session,
        opening_amount: openingAmount,
        breakdown: {
          opening_amount: openingAmount,
          cash_sales: cashSales,
          digital_sales: digitalSales,
          cash_in: cashIn,
          cash_out: cashOut,
          cash_refunds: cashRefunds,
          adjustments,
          expected_cash: expectedCash,
        },
        transactions: txs.map((t: any) => ({
          ...t,
          amount: parseFloat(t.amount),
        })),
      },
    });
  } catch (error: any) {
    console.error('Fetch register session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve register status', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, opening_amount, actual_amount, closing_note, amount, reason, note, cashier_name = 'Admin', user_id } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Register action is required.' }, { status: 400 });
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

    // 1. OPEN REGISTER
    if (action === 'open') {
      const activeRes = await dbQuery("SELECT id FROM register_sessions WHERE status = 'open' LIMIT 1");
      if (activeRes.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A register session is already open. Please close it first.' },
          { status: 400 }
        );
      }

      const openingCash = Math.max(0, parseFloat(opening_amount) || 0);

      const session = await withTransaction(async (client) => {
        const sessionRes = await client.query(
          `INSERT INTO register_sessions (
            opening_amount, status, opened_at, user_name_snapshot, user_id
          ) VALUES ($1, 'open', NOW(), $2, $3) RETURNING *`,
          [openingCash, cashier_name, validUserId]
        );
        const newSession = sessionRes.rows[0];

        // Record opening transaction
        await client.query(
          `INSERT INTO register_transactions (
            register_session_id, type, amount, reason, note, created_by, user_name_snapshot
          ) VALUES ($1, 'OPENING', $2, 'Register Opening Float', 'Cash counted at start of shift', $3, $4)`,
          [newSession.id, openingCash, validUserId, cashier_name]
        );

        // Audit log
        await client.query(
          `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, new_values)
           VALUES ($1, 'REGISTER_OPENED', 'register_session', $2, $3, $4)`,
          [
            cashier_name,
            newSession.id,
            `Opened register with Rs. ${openingCash} opening cash`,
            JSON.stringify({ opening_amount: openingCash }),
          ]
        );

        return newSession;
      });

      return NextResponse.json({
        success: true,
        message: `Register opened with Rs. ${openingCash}`,
        session,
      });
    }

    // Active register required for remaining actions
    const activeRes = await dbQuery("SELECT * FROM register_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
    if (activeRes.length === 0) {
      return NextResponse.json({ success: false, error: 'No active register session found.' }, { status: 400 });
    }
    const currentSession = activeRes[0];

    // 2. CASH IN
    if (action === 'cash_in') {
      const parsedAmt = parseFloat(amount);
      if (isNaN(parsedAmt) || parsedAmt <= 0) {
        return NextResponse.json({ success: false, error: 'Cash In amount must be greater than zero.' }, { status: 400 });
      }
      if (!reason || !reason.trim()) {
        return NextResponse.json({ success: false, error: 'Reason for Cash In is required.' }, { status: 400 });
      }

      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO register_transactions (
            register_session_id, type, amount, reason, note, created_by, user_name_snapshot
          ) VALUES ($1, 'CASH_IN', $2, $3, $4, $5, $6)`,
          [currentSession.id, parsedAmt, reason.trim(), note ? String(note).trim() : null, validUserId, cashier_name]
        );

        await client.query(
          `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, new_values)
           VALUES ($1, 'CASH_IN', 'register_transaction', $2, $3, $4)`,
          [
            cashier_name,
            currentSession.id,
            `Cash In: Added Rs. ${parsedAmt}. Reason: ${reason.trim()}`,
            JSON.stringify({ amount: parsedAmt, reason: reason.trim(), note }),
          ]
        );
      });

      return NextResponse.json({ success: true, message: `Rs. ${parsedAmt} added to drawer.` });
    }

    // 3. CASH OUT
    if (action === 'cash_out') {
      const parsedAmt = parseFloat(amount);
      if (isNaN(parsedAmt) || parsedAmt <= 0) {
        return NextResponse.json({ success: false, error: 'Cash Out amount must be greater than zero.' }, { status: 400 });
      }
      if (!reason || !reason.trim()) {
        return NextResponse.json({ success: false, error: 'Reason for Cash Out is required.' }, { status: 400 });
      }

      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO register_transactions (
            register_session_id, type, amount, reason, note, created_by, user_name_snapshot
          ) VALUES ($1, 'CASH_OUT', $2, $3, $4, $5, $6)`,
          [currentSession.id, parsedAmt, reason.trim(), note ? String(note).trim() : null, validUserId, cashier_name]
        );

        await client.query(
          `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, new_values)
           VALUES ($1, 'CASH_OUT', 'register_transaction', $2, $3, $4)`,
          [
            cashier_name,
            currentSession.id,
            `Cash Out: Withdrew Rs. ${parsedAmt}. Reason: ${reason.trim()}`,
            JSON.stringify({ amount: parsedAmt, reason: reason.trim(), note }),
          ]
        );
      });

      return NextResponse.json({ success: true, message: `Rs. ${parsedAmt} withdrawn from drawer.` });
    }

    // 4. CLOSE REGISTER
    if (action === 'close') {
      const countedActual = Math.max(0, parseFloat(actual_amount) || 0);

      // Re-calculate expected drawer cash
      const txs = await dbQuery(
        'SELECT type, amount FROM register_transactions WHERE register_session_id = $1',
        [currentSession.id]
      );

      const openingAmt = parseFloat(currentSession.opening_amount);
      let cashSales = 0;
      let cashIn = 0;
      let cashOut = 0;
      let cashRefunds = 0;
      let adjustments = 0;

      for (const t of txs) {
        const amt = parseFloat(t.amount);
        if (t.type === 'SALE') cashSales = addMoney(cashSales, amt);
        else if (t.type === 'CASH_IN') cashIn = addMoney(cashIn, amt);
        else if (t.type === 'CASH_OUT') cashOut = addMoney(cashOut, amt);
        else if (t.type === 'REFUND') cashRefunds = addMoney(cashRefunds, amt);
        else if (t.type === 'ADJUSTMENT') adjustments = addMoney(adjustments, amt);
      }

      const expectedAmt = addMoney(openingAmt, cashSales, cashIn, -cashRefunds, -cashOut, adjustments);
      const difference = subtractMoney(countedActual, expectedAmt);

      const closedSession = await withTransaction(async (client) => {
        const updateRes = await client.query(
          `UPDATE register_sessions 
           SET status = 'closed', closed_at = NOW(), 
               expected_amount = $1, actual_amount = $2, difference = $3, closing_note = $4
           WHERE id = $5 RETURNING *`,
          [expectedAmt, countedActual, difference, closing_note ? String(closing_note).trim() : null, currentSession.id]
        );

        // Record closing adjustment if difference exists
        if (difference !== 0) {
          await client.query(
            `INSERT INTO register_transactions (
              register_session_id, type, amount, reason, note, created_by, user_name_snapshot
            ) VALUES ($1, 'ADJUSTMENT', $2, 'Closing Reconciliation Difference', $3, $4, $5)`,
            [
              currentSession.id,
              difference,
              `Discrepancy: Expected Rs. ${expectedAmt}, Counted Rs. ${countedActual}`,
              validUserId,
              cashier_name,
            ]
          );
        }

        // Audit log
        await client.query(
          `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, new_values)
           VALUES ($1, 'REGISTER_CLOSED', 'register_session', $2, $3, $4)`,
          [
            cashier_name,
            currentSession.id,
            `Closed register: Expected Rs. ${expectedAmt}, Counted Rs. ${countedActual}, Difference Rs. ${difference}`,
            JSON.stringify({
              opening_amount: openingAmt,
              expected_amount: expectedAmt,
              actual_amount: countedActual,
              difference,
              closing_note,
            }),
          ]
        );

        return updateRes.rows[0];
      });

      return NextResponse.json({
        success: true,
        message: `Register closed successfully. Difference: Rs. ${difference}`,
        summary: {
          ...closedSession,
          opening_amount: openingAmt,
          expected_amount: expectedAmt,
          actual_amount: countedActual,
          difference,
          cash_sales: cashSales,
          cash_in: cashIn,
          cash_out: cashOut,
          cash_refunds: cashRefunds,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid register action' }, { status: 400 });
  } catch (error: any) {
    console.error('Register action error:', error);
    return NextResponse.json({ success: false, error: 'Register operation failed', details: error.message }, { status: 500 });
  }
}
