import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await dbQuery(`
      SELECT c.*, COUNT(p.id) as products_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    return NextResponse.json({
      success: true,
      categories: categories.map((c: any) => ({
        ...c,
        products_count: parseInt(c.products_count, 10),
      })),
    });
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, sort_order = 0, is_active = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const insertRes = await dbQuery(
      `INSERT INTO categories (name, slug, sort_order, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [cleanName, slug, parseInt(sort_order, 10) || 0, is_active]
    );

    return NextResponse.json({
      success: true,
      message: `Category "${cleanName}" created.`,
      category: insertRes[0],
    });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, sort_order, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required.' }, { status: 400 });
    }

    const cleanName = name ? name.trim() : null;
    const slug = cleanName ? cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : null;

    const updateRes = await dbQuery(
      `UPDATE categories SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        sort_order = COALESCE($3, sort_order),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [cleanName, slug, sort_order !== undefined ? parseInt(sort_order, 10) : null, is_active !== undefined ? is_active : null, id]
    );

    return NextResponse.json({
      success: true,
      message: `Category updated.`,
      category: updateRes[0],
    });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update category', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const cascade = searchParams.get('cascade') === 'true';

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required.' }, { status: 400 });
    }

    // Safety check: Check if products exist
    const prodCountRes = await dbQuery('SELECT COUNT(*) as count FROM products WHERE category_id = $1', [id]);
    const count = parseInt(prodCountRes[0]?.count || '0', 10);
    if (count > 0 && !cascade) {
      return NextResponse.json(
        {
          success: false,
          hasProducts: true,
          productCount: count,
          error: `Cannot delete category with ${count} assigned product(s). Would you like to delete the category and all its products?`,
        },
        { status: 400 }
      );
    }

    if (count > 0 && cascade) {
      // 1. Unlink products from order_items
      await dbQuery(
        'UPDATE order_items SET product_id = NULL WHERE product_id IN (SELECT id FROM products WHERE category_id = $1)',
        [id]
      );
      // 2. Remove addon groups for products in this category
      await dbQuery(
        'DELETE FROM product_addon_groups WHERE product_id IN (SELECT id FROM products WHERE category_id = $1)',
        [id]
      );
      // 3. Delete products in this category
      await dbQuery('DELETE FROM products WHERE category_id = $1', [id]);
    }

    await dbQuery('DELETE FROM categories WHERE id = $1', [id]);
    return NextResponse.json({
      success: true,
      message: count > 0 && cascade
        ? `Category and ${count} assigned product(s) deleted successfully.`
        : 'Category deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete category', details: error.message }, { status: 500 });
  }
}
