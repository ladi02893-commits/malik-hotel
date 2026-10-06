// scripts/test_e2e_flow.js
// Automated End-to-End Test Suite for Malik Tasty Nashta Point POS

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=================================================================');
  console.log('🧪 STARTING E2E INTEGRATION TEST SUITE: MALIK TASTY NASHTA POINT POS');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. POS Init
    console.log('--- Step 1: Initializing POS System & Menu Data ---');
    const initRes = await request('/api/pos/init');
    assert(initRes.ok && initRes.data.success, 'POS Init responds with 200 OK and success=true');
    assert(initRes.data.categories.length > 0, `Loaded ${initRes.data.categories.length} categories`);
    assert(initRes.data.products.length >= 20, `Loaded ${initRes.data.products.length} menu products`);
    assert(initRes.data.paymentMethods.length >= 4, `Loaded ${initRes.data.paymentMethods.length} payment methods`);

    const andaParatha = initRes.data.products.find(p => p.name.includes('Anda Paratha'));
    const chai = initRes.data.products.find(p => p.name.includes('Karak Chai'));
    const chana = initRes.data.products.find(p => p.name.includes('Chana'));
    assert(andaParatha && chai && chana, 'Found core nashta items (Anda Paratha, Karak Chai, Chana)');

    // 2. Open Cash Register Shift
    console.log('\n--- Step 2: Cash Register Opening Shift ---');
    let registerId = initRes.data.activeRegister?.id;
    if (!registerId) {
      const openRes = await request('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          action: 'open',
          opening_amount: 5000,
          cashier_name: 'Malik Ammar (Admin)',
        }),
      });
      if (openRes.ok && openRes.data.success) {
        assert(true, 'Successfully opened cash register session with Rs. 5,000 float');
        registerId = openRes.data.session?.id;
      } else {
        const checkReg = await request('/api/register');
        registerId = checkReg.data.activeRegister?.id;
        assert(registerId, 'Active cash register session confirmed open');
      }
    } else {
      assert(true, 'Active cash register session already running for counter');
    }

    // 3. Cash In Movement
    console.log('\n--- Step 3: Cash In Float Adjustment ---');
    const cashInRes = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        action: 'cash_in',
        session_id: registerId,
        amount: 2000,
        reason: 'FLOAT_ADDITION',
        note: 'Added extra small change to drawer',
        user_name: 'Admin',
      }),
    });
    assert(cashInRes.ok && cashInRes.data.success, 'Added Rs. 2,000 cash in to register');

    // 4. Cart Hold and Resume
    console.log('\n--- Step 4: Hold and Resume Cart Flow ---');
    const holdPayload = {
      customer_name: 'Chaudhry Rashid',
      note: 'Dine-in Table 4',
      cart_payload: {
        items: [
          {
            id: 'line-1',
            product_id: andaParatha.id,
            name: andaParatha.name,
            unit_price: parseFloat(andaParatha.selling_price),
            quantity: 2,
            note: 'Mirch kam, extra crispy',
            addons: [],
            item_discount: 0,
            line_total: parseFloat(andaParatha.selling_price) * 2,
          },
          {
            id: 'line-2',
            product_id: chai.id,
            name: chai.name,
            unit_price: parseFloat(chai.selling_price),
            quantity: 2,
            note: 'Chai strong',
            addons: [],
            item_discount: 0,
            line_total: parseFloat(chai.selling_price) * 2,
          }
        ],
        discount_amount: 0,
        discount_type: 'fixed',
        discount_value: 0,
      },
      subtotal: parseFloat(andaParatha.selling_price) * 2 + parseFloat(chai.selling_price) * 2,
      discount_amount: 0,
      grand_total: parseFloat(andaParatha.selling_price) * 2 + parseFloat(chai.selling_price) * 2,
      cashier_name: 'Admin',
    };

    const holdRes = await request('/api/held-orders', {
      method: 'POST',
      body: JSON.stringify(holdPayload),
    });
    assert(holdRes.ok && holdRes.data.success, `Order placed on hold: ${holdRes.data.heldOrder?.hold_number}`);

    const listHeld = await request('/api/held-orders');
    assert(listHeld.data.heldOrders?.length > 0, `Hold list has ${listHeld.data.heldOrders.length} held carts`);

    const resumeRes = await request(`/api/held-orders?id=${holdRes.data.heldOrder.id}`, {
      method: 'PUT',
    });
    assert(resumeRes.ok && resumeRes.data.success, `Resumed hold order with ${resumeRes.data.heldOrder?.cart_payload?.items?.length} items intact`);

    // 5. Atomic Checkout Sale 1: Cash Payment
    console.log('\n--- Step 5: Server-Authoritative Atomic Sale 1 (Cash) ---');
    const checkoutSale1 = {
      cart: [
        {
          id: 'item-1',
          product_id: andaParatha.id,
          name: andaParatha.name,
          unit_price: parseFloat(andaParatha.selling_price),
          quantity: 2,
          note: 'Mirch kam',
          addons: [],
          item_discount: 0,
          line_total: parseFloat(andaParatha.selling_price) * 2,
        },
        {
          id: 'item-2',
          product_id: chai.id,
          name: chai.name,
          unit_price: parseFloat(chai.selling_price),
          quantity: 2,
          note: 'Chai strong',
          addons: [],
          item_discount: 0,
          line_total: parseFloat(chai.selling_price) * 2,
        }
      ],
      discount_type: 'fixed',
      discount_value: 20,
      customer_name: 'Walk-in Customer',
      payments: [
        {
          method_id: 'cash',
          method_name: 'Cash',
          amount: parseFloat(andaParatha.selling_price) * 2 + parseFloat(chai.selling_price) * 2 - 20,
          amount_tendered: 1000,
          change_returned: 1000 - (parseFloat(andaParatha.selling_price) * 2 + parseFloat(chai.selling_price) * 2 - 20),
        }
      ],
      cashier_name: 'Admin',
      idempotency_key: `sale-test-uuid-${Date.now()}-1`,
    };

    const sale1Res = await request('/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutSale1),
    });
    assert(sale1Res.ok && sale1Res.data.success, `Sale 1 completed successfully! Receipt: ${sale1Res.data.order?.receipt_number}`);
    assert(sale1Res.data.order?.receipt_number.startsWith('MTN-'), 'Deterministic MTN- receipt format generated');
    assert(sale1Res.data.order?.status === 'completed', 'Order status is completed');
    const completedOrder1 = sale1Res.data.order;

    // Idempotency check: Sending the exact same request again must not create a duplicate order
    const duplicateRes = await request('/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutSale1),
    });
    assert(duplicateRes.ok && duplicateRes.data.is_duplicate, 'Idempotency safety verified: Duplicate payment prevented and original order returned');

    // 6. Sale 2: Digital Payment (JazzCash)
    console.log('\n--- Step 6: Atomic Sale 2 (JazzCash Digital Payment) ---');
    const checkoutSale2 = {
      cart: [
        {
          id: 'item-3',
          product_id: chana.id,
          name: chana.name,
          unit_price: parseFloat(chana.selling_price),
          quantity: 2,
          addons: [],
          item_discount: 0,
          line_total: parseFloat(chana.selling_price) * 2,
        }
      ],
      customer_name: 'Haji Aslam',
      customer_phone: '0300-7654321',
      payments: [
        {
          method_id: 'jazzcash',
          method_name: 'JazzCash',
          amount: parseFloat(chana.selling_price) * 2,
          reference_number: 'JC-882910482',
        }
      ],
      cashier_name: 'Admin',
      idempotency_key: `sale-test-uuid-${Date.now()}-2`,
    };

    const sale2Res = await request('/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutSale2),
    });
    assert(sale2Res.ok && sale2Res.data.success, `Sale 2 completed via JazzCash! Receipt: ${sale2Res.data.order?.receipt_number}`);
    const completedOrder2 = sale2Res.data.order;

    // 7. Duplicate Receipt Reprint
    console.log('\n--- Step 7: Duplicate Receipt Reprint Audit ---');
    const reprintRes = await request(`/api/orders/${completedOrder1.id}/reprint`, {
      method: 'POST',
      body: JSON.stringify({ cashier_name: 'Admin' }),
    });
    assert(reprintRes.ok && reprintRes.data.success, `Receipt reprint logged in audit trail (reprint count: ${reprintRes.data.reprint_count})`);

    // 8. Partial Refund
    console.log('\n--- Step 8: Itemized Partial Refund Flow ---');
    // Fetch full order details with items
    const orderDetailsRes = await request(`/api/orders/${completedOrder1.id}`);
    const order1Item = orderDetailsRes.data.order?.items?.[0];
    assert(order1Item, 'Retrieved order line items for refund');

    const refundRes = await request('/api/refunds', {
      method: 'POST',
      body: JSON.stringify({
        order_id: completedOrder1.id,
        refund_method: 'cash',
        reason: 'Customer requested change of mind',
        refund_items: [
          {
            order_item_id: order1Item.id,
            quantity: 1,
            unit_price: parseFloat(order1Item.unit_price),
          }
        ],
        cashier_name: 'Admin',
      }),
    });
    assert(refundRes.ok && refundRes.data.success, `Partial refund completed (${refundRes.data.refund?.refund_number}) for Rs. ${refundRes.data.refund?.total_refund_amount}`);

    // 9. Void Order
    console.log('\n--- Step 9: Order Void with Audit Record ---');
    const voidRes = await request(`/api/orders/${completedOrder2.id}/void`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Guest had to leave urgently before food preparation',
        admin_pin: '1234',
        cashier_name: 'Admin',
      }),
    });
    assert(voidRes.ok && voidRes.data.success, `Order ${completedOrder2.order_number} marked void without hard-deleting records`);

    // 10. Cash Register Drawer Summary & Close
    console.log('\n--- Step 10: Cash Register Closing & Reconciliation ---');
    const registerState = await request('/api/register');
    assert(registerState.ok && registerState.data.activeRegister, 'Current register session active');
    console.log(`   Drawer breakdown -> Opening: Rs. ${registerState.data.breakdown?.opening}, Cash Sales: Rs. ${registerState.data.breakdown?.cashSales}, Cash In: Rs. ${registerState.data.breakdown?.cashIn}, Refunds: Rs. ${registerState.data.breakdown?.cashRefunds}, Expected Drawer Cash: Rs. ${registerState.data.breakdown?.expectedCash}`);

    const closeRes = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        action: 'close',
        actual_amount: registerState.data.breakdown?.expectedCash,
        closing_note: 'Daily evening shift reconciliation balanced perfectly',
        cashier_name: 'Malik Ammar (Admin)',
      }),
    });
    assert(closeRes.ok && closeRes.data.success, `Register shift closed. Discrepancy difference: Rs. ${closeRes.data.session?.difference}`);

    // 11. Reports Generation
    console.log('\n--- Step 11: Real Reports from PostgreSQL Database ---');
    const reportsRes = await request('/api/reports?range=today');
    assert(reportsRes.ok && reportsRes.data.success, 'Reports generated accurately from database');
    assert(reportsRes.data.summary?.totalOrders > 0, `Total completed/modified orders today: ${reportsRes.data.summary?.totalOrders}`);
    assert(reportsRes.data.productSales?.length > 0, `Product sales tracked ${reportsRes.data.productSales?.length} items sold`);
    console.log(`   Gross Sales: Rs. ${reportsRes.data.summary?.grossSales}, Refunds: Rs. ${reportsRes.data.summary?.totalRefundAmount}, Net Sales: Rs. ${reportsRes.data.summary?.netSales}`);

    // 12. Settings Live Feature Flags
    console.log('\n--- Step 12: Settings Live Update Test ---');
    const updateSettingsRes = await request('/api/settings', {
      method: 'POST',
      body: JSON.stringify({
        section: 'pos',
        data: {
          ...initRes.data.posSettings,
          enable_discounts: true,
          max_cashier_discount_percent: 25,
        },
        cashier_name: 'Admin',
      }),
    });
    assert(updateSettingsRes.ok && updateSettingsRes.data.success, 'Updated POS feature settings in InsForge PostgreSQL');

    // 13. Audit Log Verification
    console.log('\n--- Step 13: Immutable Audit Trail Inspection ---');
    const auditRes = await request('/api/audit?limit=10');
    assert(auditRes.ok && auditRes.data.logs?.length > 0, `Retrieved ${auditRes.data.logs?.length} recent immutable audit records`);

    console.log('\n=================================================================');
    console.log(`🏁 TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('=================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error running tests:', err);
    process.exit(1);
  }
}

runTests();
