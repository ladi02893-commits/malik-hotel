import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, dbQuery } from '@/lib/insforge/server';
import { addMoney, subtractMoney, multiplyMoney, calculateRounding } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items || body.cart || [];
    const {
      discount_type,
      discount_value = 0,
      admin_pin,
      payments,
      customer_name,
      customer_phone,
      notes,
      idempotency_key,
      cashier_name = 'Admin',
      user_id,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cannot checkout with an empty cart.' }, { status: 400 });
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one payment method is required.' }, { status: 400 });
    }

    // 1. Idempotency Check
    if (idempotency_key) {
      const existingOrder = await dbQuery('SELECT id, order_number, receipt_number FROM orders WHERE idempotency_key = $1', [idempotency_key]);
      if (existingOrder.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Order already processed.',
          order: existingOrder[0],
          is_duplicate: true,
        });
      }
    }

    // 2. Fetch POS Settings & Active Register Session
    const [posSettingsRows, receiptSettingsRows, activeRegisterRows] = await Promise.all([
      dbQuery('SELECT * FROM pos_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM receipt_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM register_sessions WHERE status = $1 ORDER BY opened_at DESC LIMIT 1', ['open']),
    ]);

    // Defensive check: verify user_id exists in profiles table so FK constraint is never violated
    let validUserId: string | null = null;
    if (user_id) {
      try {
        const profileCheck = await dbQuery('SELECT id FROM profiles WHERE id = $1', [user_id]);
        if (profileCheck.length > 0) {
          validUserId = profileCheck[0].id;
        }
      } catch {
        validUserId = null;
      }
    }

    const posSettings = posSettingsRows[0] || {};
    const receiptSettings = receiptSettingsRows[0] || {};
    const activeRegister = activeRegisterRows[0] || null;

    if (posSettings.require_open_register && !activeRegister) {
      return NextResponse.json(
        { success: false, error: 'Register is closed. Please open cash register before billing.' },
        { status: 400 }
      );
    }

    // 3. Fetch authoritative products and addons from DB
    const productIds = items.map((i: any) => i.product_id);
    const dbProducts = await dbQuery(
      'SELECT id, name, selling_price, availability, is_active FROM products WHERE id = ANY($1)',
      [productIds]
    );

    const productMap = new Map<string, any>();
    dbProducts.forEach((p: any) => productMap.set(p.id, p));

    // Gather all addon IDs
    const allAddonIds: string[] = [];
    items.forEach((item: any) => {
      if (item.addons && Array.isArray(item.addons)) {
        item.addons.forEach((a: any) => allAddonIds.push(a.addon_id));
      }
    });

    const addonMap = new Map<string, any>();
    if (allAddonIds.length > 0) {
      const dbAddons = await dbQuery(
        'SELECT id, name, price, is_active FROM addons WHERE id = ANY($1)',
        [allAddonIds]
      );
      dbAddons.forEach((a: any) => addonMap.set(a.id, a));
    }

    // 4. Server-Authoritative Price Recalculation
    let serverSubtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const dbProd = productMap.get(item.product_id);
      if (!dbProd) {
        return NextResponse.json({ success: false, error: `Product "${item.name}" not found.` }, { status: 400 });
      }
      if (!dbProd.is_active || dbProd.availability === 'sold_out' || dbProd.availability === 'inactive') {
        return NextResponse.json(
          { success: false, error: `Product "${dbProd.name}" is currently unavailable/sold out.` },
          { status: 400 }
        );
      }

      const unitPrice = item.custom_unit_price !== undefined && parseFloat(item.custom_unit_price) > 0
        ? parseFloat(item.custom_unit_price)
        : parseFloat(dbProd.selling_price);
      const rawQty = parseFloat(item.quantity);
      const quantity = isNaN(rawQty) || rawQty <= 0 ? 1 : Number(rawQty.toFixed(2));
      const itemSubtotal = multiplyMoney(unitPrice, quantity);

      // Validate add-ons
      let addonsTotal = 0;
      const validatedAddons: any[] = [];

      if (item.addons && Array.isArray(item.addons)) {
        for (const addon of item.addons) {
          const dbAddon = addonMap.get(addon.addon_id);
          if (dbAddon && dbAddon.is_active) {
            const addonPrice = parseFloat(dbAddon.price);
            const addonQty = Math.max(1, parseInt(addon.quantity, 10) || 1);
            const addonLineTotal = multiplyMoney(addonPrice, addonQty);
            addonsTotal = addMoney(addonsTotal, addonLineTotal);
            validatedAddons.push({
              addon_id: dbAddon.id,
              name_snapshot: dbAddon.name,
              price_snapshot: addonPrice,
              quantity: addonQty,
              line_total: addonLineTotal,
            });
          }
        }
      }

      const itemDiscount = Math.max(0, parseFloat(item.item_discount) || 0);
      const lineTotal = subtractMoney(addMoney(itemSubtotal, addonsTotal), itemDiscount);

      serverSubtotal = addMoney(serverSubtotal, lineTotal);
      validatedItems.push({
        product_id: dbProd.id,
        name_snapshot: dbProd.name,
        product_name_snapshot: dbProd.name,
        name: dbProd.name,
        unit_price: unitPrice,
        quantity,
        item_subtotal: itemSubtotal,
        addons_total: addonsTotal,
        item_discount: itemDiscount,
        line_total: lineTotal,
        note: item.note ? String(item.note).trim() : null,
        addons: validatedAddons,
      });
    }

    // 5. Discount Validation & Calculation
    let discountAmount = 0;
    const requestedDiscountValue = Math.max(0, parseFloat(discount_value) || 0);

    if (posSettings.enable_discounts && requestedDiscountValue > 0) {
      if (discount_type === 'percentage') {
        const percent = Math.min(100, requestedDiscountValue);
        discountAmount = multiplyMoney(serverSubtotal, percent / 100);

        // Check cashier limit vs supervisor PIN
        const maxCashierPercent = parseFloat(posSettings.max_cashier_discount_percent || 15);
        const pinThreshold = parseFloat(posSettings.require_pin_above_percent || 20);

        if (percent > maxCashierPercent) {
          if (percent > pinThreshold) {
            // Validate admin PIN
            const adminUser = await dbQuery("SELECT pin_code FROM profiles WHERE role = 'admin' AND status = 'active' LIMIT 1");
            const validPin = adminUser[0]?.pin_code || '1234';
            if (admin_pin !== validPin) {
              return NextResponse.json(
                { success: false, error: `Discount of ${percent}% exceeds limit (${maxCashierPercent}%) and requires a valid supervisor PIN.` },
                { status: 403 }
              );
            }
          }
        }
      } else if (discount_type === 'fixed') {
        if (!posSettings.allow_fixed_discount) {
          return NextResponse.json({ success: false, error: 'Fixed discounts are disabled in POS settings.' }, { status: 400 });
        }
        discountAmount = Math.min(serverSubtotal, requestedDiscountValue);
      }
    }

    const discountedSubtotal = subtractMoney(serverSubtotal, discountAmount);

    // 6. Tax & Service Charge
    let taxAmount = 0;
    if (posSettings.enable_tax && parseFloat(posSettings.tax_rate_percent) > 0) {
      taxAmount = multiplyMoney(discountedSubtotal, parseFloat(posSettings.tax_rate_percent) / 100);
    }

    let serviceChargeAmount = 0;
    if (posSettings.enable_service_charge && parseFloat(posSettings.service_charge_percent) > 0) {
      serviceChargeAmount = multiplyMoney(discountedSubtotal, parseFloat(posSettings.service_charge_percent) / 100);
    }

    const rawTotal = addMoney(discountedSubtotal, taxAmount, serviceChargeAmount);

    // 7. Rounding
    const { roundedTotal, roundingAmount } = calculateRounding(rawTotal, posSettings.enable_rounding);
    const grandTotal = roundedTotal;

    // 8. Payment Validation
    let totalPaid = 0;
    let cashChange = 0;

    for (const p of payments) {
      const amount = parseFloat(p.amount) || 0;
      if (amount <= 0) continue;
      totalPaid = addMoney(totalPaid, amount);

      if (p.method_id === 'cash' && p.amount_tendered) {
        const tendered = parseFloat(p.amount_tendered);
        if (tendered > amount) {
          cashChange = subtractMoney(tendered, amount);
        }
      }
    }

    if (totalPaid < grandTotal) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment incomplete. Total Due: Rs. ${grandTotal}, Provided: Rs. ${totalPaid}.`,
        },
        { status: 400 }
      );
    }

    // 9. Atomic Transaction
    const completedOrder = await withTransaction(async (client) => {
      // Generate numbers sequentially
      const receiptSeqRes = await client.query("SELECT nextval('receipt_seq') AS num");
      const orderSeqRes = await client.query("SELECT nextval('order_seq') AS num");

      const receiptNum = receiptSeqRes.rows[0].num;
      const orderNum = orderSeqRes.rows[0].num;

      const prefix = receiptSettings.receipt_prefix || 'MTN-';
      const orderPrefix = receiptSettings.order_prefix || 'ORD-';

      const padReceipt = String(receiptNum).padStart(7, '0');
      const fullReceiptNumber = `${prefix}${padReceipt}`;

      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const padOrder = String(orderNum).padStart(4, '0');
      const fullOrderNumber = `${orderPrefix}${datePart}-${padOrder}`;

      // Insert Order
      const orderInsertQuery = `
        INSERT INTO orders (
          order_number, receipt_number, register_session_id,
          customer_name_snapshot, customer_phone_snapshot, status,
          subtotal, discount_type, discount_value, discount_amount,
          tax_rate_percent, tax_amount, service_charge_percent, service_charge_amount,
          rounding_amount, grand_total, total_paid, change_returned,
          notes, idempotency_key, created_by, cashier_name_snapshot,
          created_at, completed_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'completed',
          $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21,
          NOW(), NOW()
        ) RETURNING *
      `;

      const orderRes = await client.query(orderInsertQuery, [
        fullOrderNumber,
        fullReceiptNumber,
        activeRegister ? activeRegister.id : null,
        customer_name ? String(customer_name).trim() : null,
        customer_phone ? String(customer_phone).trim() : null,
        serverSubtotal,
        discount_type || null,
        requestedDiscountValue,
        discountAmount,
        posSettings.tax_rate_percent || 0,
        taxAmount,
        posSettings.service_charge_percent || 0,
        serviceChargeAmount,
        roundingAmount,
        grandTotal,
        totalPaid,
        cashChange,
        notes ? String(notes).trim() : null,
        idempotency_key || null,
        validUserId,
        cashier_name,
      ]);

      const newOrder = orderRes.rows[0];

      // Insert Order Items & Addons
      for (const item of validatedItems) {
        const itemRes = await client.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name_snapshot,
            unit_price, quantity, item_subtotal, addons_total,
            item_discount, line_total, note
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            newOrder.id,
            item.product_id,
            item.name_snapshot,
            item.unit_price,
            item.quantity,
            item.item_subtotal,
            item.addons_total,
            item.item_discount,
            item.line_total,
            item.note,
          ]
        );

        const orderItemId = itemRes.rows[0].id;

        for (const addon of item.addons) {
          await client.query(
            `INSERT INTO order_item_addons (
              order_item_id, addon_id, addon_name_snapshot,
              price_snapshot, quantity, line_total
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              orderItemId,
              addon.addon_id,
              addon.name_snapshot,
              addon.price_snapshot,
              addon.quantity,
              addon.line_total,
            ]
          );
        }
      }

      // Insert Payments
      for (const p of payments) {
        const amt = parseFloat(p.amount) || 0;
        if (amt <= 0) continue;

        const tendered = p.amount_tendered ? parseFloat(p.amount_tendered) : null;
        const change = p.method_id === 'cash' ? cashChange : null;

        await client.query(
          `INSERT INTO payments (
            order_id, payment_method_id, amount,
            reference_number, amount_tendered, change_returned,
            status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7)`,
          [
            newOrder.id,
            p.method_id,
            amt,
            p.reference_number || null,
            tendered,
            change,
            validUserId,
          ]
        );

        // If Cash payment, record in cash drawer session
        if (p.method_id === 'cash' && activeRegister) {
          await client.query(
            `INSERT INTO register_transactions (
              register_session_id, type, amount, order_id,
              reason, note, created_by, user_name_snapshot
            ) VALUES ($1, 'SALE', $2, $3, 'Cash Sale', $4, $5, $6)`,
            [
              activeRegister.id,
              amt,
              newOrder.id,
              `Receipt #${fullReceiptNumber}`,
              validUserId,
              cashier_name,
            ]
          );
        }
      }

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, user_name, action, entity_type, entity_id, description, new_values
        ) VALUES ($1, $2, 'SALE_COMPLETED', 'order', $3, $4, $5)`,
        [
          validUserId,
          cashier_name,
          newOrder.id,
          `Completed sale ${fullReceiptNumber} for Rs. ${grandTotal} (${payments.map((p: any) => p.method_id).join(', ')})`,
          JSON.stringify({
            receipt_number: fullReceiptNumber,
            grand_total: grandTotal,
            subtotal: serverSubtotal,
            items_count: validatedItems.length,
          }),
        ]
      );

      return {
        ...newOrder,
        items: validatedItems,
        payments,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Order completed successfully',
      order: completedOrder,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unable to complete payment. Please try again.' },
      { status: 500 }
    );
  }
}
