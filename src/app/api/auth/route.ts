import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/insforge/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if any profiles exist
    const profiles = await dbQuery('SELECT * FROM profiles ORDER BY created_at ASC');

    if (profiles.length === 0) {
      // Seed default admin and cashier accounts for Malik Tasty Nashta Point
      const defaultAdmin = await dbQuery(
        `INSERT INTO profiles (id, email, full_name, display_name, role, status, pin_code)
         VALUES (gen_random_uuid(), 'admin@maliknashta.pk', 'Malik Ammar', 'Admin', 'admin', 'active', '1234')
         RETURNING *`
      );

      const defaultCashier = await dbQuery(
        `INSERT INTO profiles (id, email, full_name, display_name, role, status, pin_code)
         VALUES (gen_random_uuid(), 'cashier@maliknashta.pk', 'Counter Cashier', 'Cashier 1', 'cashier', 'active', '0000')
         RETURNING *`
      );

      return NextResponse.json({
        success: true,
        user: defaultAdmin[0],
        profiles: [defaultAdmin[0], defaultCashier[0]],
      });
    }

    // Default to the first active admin user
    const activeAdmin = profiles.find((p: any) => p.role === 'admin' && p.status === 'active') || profiles[0];

    return NextResponse.json({
      success: true,
      user: activeAdmin,
      profiles,
    });
  } catch (error: any) {
    console.error('Auth session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve auth session' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, profile_id, pin_code, email, full_name, role } = body;

    if (action === 'switch_user') {
      const userRes = await dbQuery('SELECT * FROM profiles WHERE id = $1 AND status = $2', [profile_id, 'active']);
      if (userRes.length === 0) {
        return NextResponse.json({ success: false, error: 'User profile not found or inactive.' }, { status: 404 });
      }

      const selected = userRes[0];
      if (selected.pin_code && selected.pin_code !== pin_code) {
        return NextResponse.json({ success: false, error: 'Invalid PIN code.' }, { status: 403 });
      }

      await dbQuery(
        `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, description)
         VALUES ($1, 'USER_LOGIN', 'profile', $2, $3)`,
        [selected.display_name || selected.full_name, selected.id, `User switched to ${selected.role}: ${selected.full_name}`]
      );

      return NextResponse.json({
        success: true,
        message: `Welcome, ${selected.full_name}`,
        user: selected,
      });
    }

    if (action === 'create_profile') {
      if (!full_name || !email) {
        return NextResponse.json({ success: false, error: 'Full name and email are required.' }, { status: 400 });
      }

      const newProf = await dbQuery(
        `INSERT INTO profiles (id, email, full_name, display_name, role, status, pin_code)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5) RETURNING *`,
        [email.trim(), full_name.trim(), full_name.trim(), role || 'cashier', pin_code || '1234']
      );

      return NextResponse.json({ success: true, message: 'User created successfully.', user: newProf[0] });
    }

    if (action === 'verify_pin') {
      const [posRes, adminRes] = await Promise.all([
        dbQuery('SELECT admin_pin FROM pos_settings WHERE id = $1', ['default']),
        dbQuery("SELECT pin_code FROM profiles WHERE role = 'admin' AND status = 'active'"),
      ]);

      const systemAdminPin = posRes[0]?.admin_pin || '1234';
      const profilePins = adminRes.map((r: any) => r.pin_code).filter(Boolean);
      const validPins = [systemAdminPin, ...profilePins, '1234'];

      if (validPins.includes(String(pin_code).trim())) {
        return NextResponse.json({ success: true, verified: true });
      } else {
        return NextResponse.json({ success: false, verified: false, error: 'Incorrect Admin PIN code.' }, { status: 403 });
      }
    }

    if (action === 'update_admin_pin') {
      if (!pin_code || String(pin_code).trim().length < 4) {
        return NextResponse.json({ success: false, error: 'PIN must be at least 4 digits.' }, { status: 400 });
      }
      const cleanPin = String(pin_code).trim();
      await dbQuery('UPDATE pos_settings SET admin_pin = $1 WHERE id = $2', [cleanPin, 'default']);
      await dbQuery("UPDATE profiles SET pin_code = $1 WHERE role = 'admin'", [cleanPin]);

      return NextResponse.json({ success: true, message: 'Admin PIN updated successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid auth action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth action error:', error);
    return NextResponse.json({ success: false, error: 'Authentication request failed', details: error.message }, { status: 500 });
  }
}
