import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, withTransaction } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [businessRes, posRes, receiptRes, paymentsRes] = await Promise.all([
      dbQuery('SELECT * FROM business_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM pos_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM receipt_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM payment_methods ORDER BY sort_order ASC'),
    ]);

    return NextResponse.json({
      success: true,
      businessSettings: businessRes[0] || {},
      posSettings: posRes[0] || {},
      receiptSettings: receiptRes[0] || {},
      paymentMethods: paymentsRes || [],
    });
  } catch (error: any) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve settings', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, data, cashier_name = 'Admin' } = body;

    if (!section || !data) {
      return NextResponse.json({ success: false, error: 'Section and data are required.' }, { status: 400 });
    }

    if (section === 'business') {
      await dbQuery(
        `UPDATE business_settings SET
          business_name = $1, location = $2, phone = $3,
          currency = $4, currency_symbol = $5, timezone = $6,
          is_setup_completed = TRUE, updated_at = NOW()
         WHERE id = 'default'`,
        [
          data.business_name,
          data.location,
          data.phone,
          data.currency || 'PKR',
          data.currency_symbol || 'Rs.',
          data.timezone || 'Asia/Karachi',
        ]
      );
    } else if (section === 'pos') {
      await dbQuery(
        `UPDATE pos_settings SET
          enable_discounts = $1,
          max_cashier_discount_percent = $2,
          require_pin_above_percent = $3,
          allow_fixed_discount = $4,
          allow_item_discount = $5,
          enable_split_payment = $6,
          enable_split_bill = $7,
          enable_hold_orders = $8,
          enable_item_notes = $9,
          enable_addons = $10,
          enable_tax = $11,
          tax_rate_percent = $12,
          enable_service_charge = $13,
          service_charge_percent = $14,
          enable_rounding = $15,
          require_open_register = $16,
          require_refund_approval = $17,
          require_void_approval = $18,
          require_refund_reason = $19,
          updated_at = NOW()
         WHERE id = 'default'`,
        [
          Boolean(data.enable_discounts),
          parseFloat(data.max_cashier_discount_percent) || 15,
          parseFloat(data.require_pin_above_percent) || 20,
          Boolean(data.allow_fixed_discount),
          Boolean(data.allow_item_discount),
          Boolean(data.enable_split_payment),
          Boolean(data.enable_split_bill),
          Boolean(data.enable_hold_orders),
          Boolean(data.enable_item_notes),
          Boolean(data.enable_addons),
          Boolean(data.enable_tax),
          parseFloat(data.tax_rate_percent) || 0,
          Boolean(data.enable_service_charge),
          parseFloat(data.service_charge_percent) || 0,
          Boolean(data.enable_rounding),
          Boolean(data.require_open_register),
          Boolean(data.require_refund_approval),
          Boolean(data.require_void_approval),
          Boolean(data.require_refund_reason),
        ]
      );
    } else if (section === 'receipt') {
      await dbQuery(
        `UPDATE receipt_settings SET
          business_name = $1, address = $2, phone = $3,
          receipt_prefix = $4, order_prefix = $5, refund_prefix = $6,
          header_message = $7, footer_message = $8,
          show_cashier = $9, show_customer = $10,
          show_payment_method = $11, show_discount = $12,
          auto_print = $13, paper_width_mm = $14, print_copies = $15,
          updated_at = NOW()
         WHERE id = 'default'`,
        [
          data.business_name,
          data.address,
          data.phone,
          data.receipt_prefix || 'MTN-',
          data.order_prefix || 'ORD-',
          data.refund_prefix || 'REF-',
          data.header_message || '',
          data.footer_message || '',
          Boolean(data.show_cashier),
          Boolean(data.show_customer),
          Boolean(data.show_payment_method),
          Boolean(data.show_discount),
          Boolean(data.auto_print),
          parseInt(data.paper_width_mm, 10) || 80,
          parseInt(data.print_copies, 10) || 1,
        ]
      );
    } else if (section === 'payments') {
      // data is an array of payment methods
      if (Array.isArray(data)) {
        await withTransaction(async (client) => {
          for (const pm of data) {
            await client.query(
              `UPDATE payment_methods SET
                name = $1, is_active = $2, sort_order = $3, is_default = $4, require_reference = $5, updated_at = NOW()
               WHERE id = $6`,
              [pm.name, Boolean(pm.is_active), parseInt(pm.sort_order, 10) || 0, Boolean(pm.is_default), Boolean(pm.require_reference), pm.id]
            );
          }
        });
      }
    }

    await dbQuery(
      `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, new_values)
       VALUES ($1, 'SETTINGS_UPDATED', 'settings', $2, $3, $4)`,
      [
        cashier_name,
        section,
        `Updated settings for section: ${section}`,
        JSON.stringify(data),
      ]
    );

    return NextResponse.json({ success: true, message: `${section} settings saved successfully.` });
  } catch (error: any) {
    console.error('Save settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings', details: error.message }, { status: 500 });
  }
}
