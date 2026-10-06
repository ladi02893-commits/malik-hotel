import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      categories,
      products,
      addonGroups,
      addons,
      productAddonGroups,
      quickNotes,
      paymentMethods,
      posSettings,
      businessSettings,
      receiptSettings,
      openRegisterSessions,
      heldOrdersCountRes,
    ] = await Promise.all([
      dbQuery('SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC'),
      dbQuery(`
        SELECT p.*, c.name AS category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        WHERE p.is_active = TRUE AND p.availability != 'hidden' 
        ORDER BY p.sort_order ASC, p.name ASC
      `),
      dbQuery('SELECT * FROM addon_groups WHERE is_active = TRUE ORDER BY sort_order ASC'),
      dbQuery('SELECT * FROM addons WHERE is_active = TRUE ORDER BY sort_order ASC'),
      dbQuery('SELECT * FROM product_addon_groups'),
      dbQuery('SELECT * FROM quick_notes WHERE is_active = TRUE ORDER BY sort_order ASC'),
      dbQuery('SELECT * FROM payment_methods WHERE is_active = TRUE ORDER BY sort_order ASC'),
      dbQuery('SELECT * FROM pos_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM business_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM receipt_settings WHERE id = $1', ['default']),
      dbQuery('SELECT * FROM register_sessions WHERE status = $1 ORDER BY opened_at DESC LIMIT 1', ['open']),
      dbQuery('SELECT COUNT(*) AS count FROM held_orders WHERE status = $1', ['held']),
    ]);

    // Attach addons to addon groups
    const addonGroupsWithItems = addonGroups.map((group: any) => ({
      ...group,
      addons: addons.filter((a: any) => a.addon_group_id === group.id),
    }));

    // Attach addon groups to products
    const productsWithAddons = products.map((prod: any) => {
      const groupIds = productAddonGroups
        .filter((pag: any) => pag.product_id === prod.id)
        .map((pag: any) => pag.addon_group_id);

      const assignedGroups = addonGroupsWithItems.filter((g: any) => groupIds.includes(g.id));
      return {
        ...prod,
        selling_price: parseFloat(prod.selling_price),
        cost_price: prod.cost_price ? parseFloat(prod.cost_price) : undefined,
        addon_groups: assignedGroups,
      };
    });

    const activeRegister = openRegisterSessions.length > 0 ? {
      ...openRegisterSessions[0],
      opening_amount: parseFloat(openRegisterSessions[0].opening_amount),
    } : null;

    return NextResponse.json({
      success: true,
      categories,
      products: productsWithAddons,
      quickNotes,
      paymentMethods,
      posSettings: posSettings[0] || {},
      businessSettings: businessSettings[0] || {},
      receiptSettings: receiptSettings[0] || {},
      activeRegister,
      heldOrdersCount: parseInt(heldOrdersCountRes[0]?.count || '0', 10),
    });
  } catch (error: any) {
    console.error('POS init error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize POS data', details: error.message },
      { status: 500 }
    );
  }
}
