import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (!includeInactive) {
      query += ` AND p.is_active = TRUE`;
    }

    if (categoryId && categoryId !== 'all') {
      query += ` AND p.category_id = $${idx}`;
      params.push(categoryId);
      idx++;
    }

    if (search && search.trim()) {
      query += ` AND (p.name ILIKE $${idx} OR p.short_name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.product_code ILIKE $${idx})`;
      params.push(`%${search.trim()}%`);
      idx++;
    }

    query += ` ORDER BY p.sort_order ASC, p.name ASC`;

    const products = await dbQuery(query, params);

    return NextResponse.json({
      success: true,
      products: products.map((p: any) => ({
        ...p,
        selling_price: parseFloat(p.selling_price),
        cost_price: p.cost_price ? parseFloat(p.cost_price) : undefined,
      })),
    });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      short_name,
      category_id,
      selling_price,
      cost_price,
      sku,
      product_code,
      description,
      availability = 'available',
      is_active = true,
      sort_order = 0,
      image_url,
      cashier_name = 'Admin',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Product name is required.' }, { status: 400 });
    }
    if (!category_id) {
      return NextResponse.json({ success: false, error: 'Category is required.' }, { status: 400 });
    }
    const price = parseFloat(selling_price);
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ success: false, error: 'Selling price must be 0 or greater.' }, { status: 400 });
    }

    // Check duplicate in same category
    const dupCheck = await dbQuery(
      `SELECT id FROM products WHERE category_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND is_active = TRUE`,
      [category_id, name]
    );
    if (dupCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: `A product named "${name}" already exists in this category.` },
        { status: 400 }
      );
    }

    const insertRes = await dbQuery(
      `INSERT INTO products (
        name, short_name, category_id, selling_price, cost_price,
        sku, product_code, description, availability, is_active, sort_order, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        name.trim(),
        short_name ? short_name.trim() : null,
        category_id,
        price,
        cost_price ? parseFloat(cost_price) : null,
        sku ? sku.trim() : null,
        product_code ? product_code.trim() : null,
        description ? description.trim() : null,
        availability,
        is_active,
        parseInt(sort_order, 10) || 0,
        image_url || null,
      ]
    );

    const newProduct = insertRes[0];

    await dbQuery(
      `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, new_values)
       VALUES ($1, 'PRODUCT_CREATED', 'product', $2, $3, $4)`,
      [
        cashier_name,
        newProduct.id,
        `Created product "${name}" at Rs. ${price}`,
        JSON.stringify(newProduct),
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Product "${name}" created.`,
      product: {
        ...newProduct,
        selling_price: parseFloat(newProduct.selling_price),
      },
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      short_name,
      category_id,
      selling_price,
      cost_price,
      sku,
      product_code,
      description,
      availability,
      is_active,
      sort_order,
      image_url,
      cashier_name = 'Admin',
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required.' }, { status: 400 });
    }

    const existingRes = await dbQuery('SELECT * FROM products WHERE id = $1', [id]);
    if (existingRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }
    const existing = existingRes[0];

    const price = selling_price !== undefined ? parseFloat(selling_price) : parseFloat(existing.selling_price);

    const updateRes = await dbQuery(
      `UPDATE products SET
        name = COALESCE($1, name),
        short_name = COALESCE($2, short_name),
        category_id = COALESCE($3, category_id),
        selling_price = $4,
        cost_price = $5,
        sku = COALESCE($6, sku),
        product_code = COALESCE($7, product_code),
        description = COALESCE($8, description),
        availability = COALESCE($9, availability),
        is_active = COALESCE($10, is_active),
        sort_order = COALESCE($11, sort_order),
        image_url = COALESCE($12, image_url),
        updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [
        name ? name.trim() : null,
        short_name !== undefined ? (short_name ? short_name.trim() : null) : null,
        category_id || null,
        price,
        cost_price !== undefined ? (cost_price ? parseFloat(cost_price) : null) : existing.cost_price,
        sku !== undefined ? (sku ? sku.trim() : null) : null,
        product_code !== undefined ? (product_code ? product_code.trim() : null) : null,
        description !== undefined ? (description ? description.trim() : null) : null,
        availability || null,
        is_active !== undefined ? is_active : null,
        sort_order !== undefined ? parseInt(sort_order, 10) : null,
        image_url !== undefined ? image_url : null,
        id,
      ]
    );

    const updated = updateRes[0];

    // Audit price changes or availability changes
    const priceChanged = parseFloat(existing.selling_price) !== price;
    const actionDesc = priceChanged
      ? `Updated product "${updated.name}" price from Rs. ${existing.selling_price} to Rs. ${price}`
      : `Updated product "${updated.name}" details (${updated.availability})`;

    await dbQuery(
      `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, old_values, new_values)
       VALUES ($1, $2, 'product', $3, $4, $5, $6)`,
      [
        cashier_name,
        priceChanged ? 'PRICE_CHANGED' : 'PRODUCT_UPDATED',
        id,
        actionDesc,
        JSON.stringify(existing),
        JSON.stringify(updated),
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Product "${updated.name}" updated.`,
      product: {
        ...updated,
        selling_price: parseFloat(updated.selling_price),
      },
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update product', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clear_all') === 'true';
    const cashierName = searchParams.get('cashier_name') || 'Admin';

    if (clearAll) {
      // 1. Safely unlink order_items to preserve historical receipts
      await dbQuery('UPDATE order_items SET product_id = NULL WHERE product_id IS NOT NULL');
      // 2. Remove product_addon_groups
      await dbQuery('DELETE FROM product_addon_groups');
      // 3. Delete all products
      const deleteRes = await dbQuery('DELETE FROM products RETURNING id');

      await dbQuery(
        `INSERT INTO audit_logs (user_name, action, entity_type, description)
         VALUES ($1, 'ALL_PRODUCTS_CLEARED', 'product', $2)`,
        [cashierName, `Cleared all ${deleteRes.length} products from menu`]
      );

      return NextResponse.json({
        success: true,
        message: `Successfully cleared all ${deleteRes.length} products from menu.`,
        deletedCount: deleteRes.length,
      });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required.' }, { status: 400 });
    }

    const existingRes = await dbQuery('SELECT * FROM products WHERE id = $1', [id]);
    if (existingRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }
    const product = existingRes[0];

    // Safely unlink from order_items
    await dbQuery('UPDATE order_items SET product_id = NULL WHERE product_id = $1', [id]);
    // Delete product_addon_groups
    await dbQuery('DELETE FROM product_addon_groups WHERE product_id = $1', [id]);
    // Delete product
    await dbQuery('DELETE FROM products WHERE id = $1', [id]);

    await dbQuery(
      `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description, old_values)
       VALUES ($1, 'PRODUCT_DELETED', 'product', $2, $3, $4)`,
      [
        cashierName,
        id,
        `Deleted product "${product.name}"`,
        JSON.stringify(product),
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product', details: error.message },
      { status: 500 }
    );
  }
}

