import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawMaterials = await dbQuery(
      `SELECT * FROM raw_materials WHERE is_active = TRUE ORDER BY category ASC, name ASC`
    );

    return NextResponse.json({
      success: true,
      rawMaterials: rawMaterials.map((r: any) => ({
        ...r,
        default_price: parseFloat(r.default_price) || 0,
      })),
    });
  } catch (error: any) {
    console.error('Fetch raw materials error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve raw materials', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, unit = 'kg', default_price = 0, category = 'General' } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Material name is required.' }, { status: 400 });
    }

    const price = Math.max(0, parseFloat(default_price) || 0);

    const insertRes = await dbQuery(
      `INSERT INTO raw_materials (name, unit, default_price, category)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), unit.trim(), price, category.trim()]
    );

    return NextResponse.json({
      success: true,
      message: `Raw material "${name}" added successfully.`,
      rawMaterial: {
        ...insertRes[0],
        default_price: price,
      },
    });
  } catch (error: any) {
    console.error('Create raw material error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create raw material', details: error.message }, { status: 500 });
  }
}
