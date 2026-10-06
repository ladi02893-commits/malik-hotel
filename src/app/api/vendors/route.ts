import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    let query = `
      SELECT v.*,
        COALESCE((SELECT SUM(pi.total_amount) FROM purchase_invoices pi WHERE pi.vendor_id = v.id), 0) AS total_purchases_amount,
        COALESCE((SELECT SUM(vp.amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id), 0) AS total_payments_amount
      FROM vendors v
      WHERE v.is_active = TRUE
    `;
    const params: any[] = [];
    let idx = 1;

    if (category && category !== 'all') {
      query += ` AND v.category = $${idx}`;
      params.push(category);
      idx++;
    }

    if (search && search.trim()) {
      query += ` AND (v.name ILIKE $${idx} OR v.phone ILIKE $${idx} OR v.category ILIKE $${idx})`;
      params.push(`%${search.trim()}%`);
      idx++;
    }

    query += ` ORDER BY v.current_balance DESC, v.name ASC`;

    const vendors = await dbQuery(query, params);

    const formatted = vendors.map((v: any) => ({
      ...v,
      opening_balance: parseFloat(v.opening_balance) || 0,
      current_balance: parseFloat(v.current_balance) || 0,
      total_purchases_amount: parseFloat(v.total_purchases_amount) || 0,
      total_payments_amount: parseFloat(v.total_payments_amount) || 0,
    }));

    const totalPayables = formatted.reduce((sum: number, v: any) => sum + (v.current_balance > 0 ? v.current_balance : 0), 0);

    return NextResponse.json({
      success: true,
      vendors: formatted,
      totalPayables,
    });
  } catch (error: any) {
    console.error('Fetch vendors error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve vendors', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, category = 'General', address, opening_balance = 0 } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Vendor name is required.' }, { status: 400 });
    }

    const opBal = opening_amount_safe(opening_balance);

    const insertRes = await dbQuery(
      `INSERT INTO vendors (name, phone, category, address, opening_balance, current_balance)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name.trim(), phone ? phone.trim() : null, category, address ? address.trim() : null, opBal, opBal]
    );

    const newVendor = insertRes[0];

    return NextResponse.json({
      success: true,
      message: `Vendor "${newVendor.name}" created successfully.`,
      vendor: {
        ...newVendor,
        opening_balance: parseFloat(newVendor.opening_balance),
        current_balance: parseFloat(newVendor.current_balance),
      },
    });
  } catch (error: any) {
    console.error('Create vendor error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create vendor', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, phone, category, address } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Vendor ID is required.' }, { status: 400 });
    }

    const updateRes = await dbQuery(
      `UPDATE vendors SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        category = COALESCE($3, category),
        address = COALESCE($4, address),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name ? name.trim() : null, phone !== undefined ? (phone ? phone.trim() : null) : null, category || null, address !== undefined ? (address ? address.trim() : null) : null, id]
    );

    if (updateRes.length === 0) {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor updated successfully.',
      vendor: updateRes[0],
    });
  } catch (error: any) {
    console.error('Update vendor error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update vendor', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Vendor ID is required.' }, { status: 400 });
    }

    await dbQuery(`UPDATE vendors SET is_active = FALSE WHERE id = $1`, [id]);

    return NextResponse.json({ success: true, message: 'Vendor deactivated successfully.' });
  } catch (error: any) {
    console.error('Delete vendor error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete vendor', details: error.message }, { status: 500 });
  }
}

function opening_amount_safe(val: any) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
