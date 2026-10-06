import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const action = searchParams.get('action');

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (action && action !== 'all') {
      query += ` AND action = $${idx}`;
      params.push(action);
      idx++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const logs = await dbQuery(query, params);

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Fetch audit logs error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve audit trail' }, { status: 500 });
  }
}
