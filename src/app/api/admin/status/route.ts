import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const configuredAdmins = (process.env.ADMIN_EMAILS || '')
    .split(/[;,\n]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const metadataRole = user.app_metadata?.role;
  const metadataRoles = user.app_metadata?.roles;
  const isAdmin = metadataRole === 'admin'
    || (Array.isArray(metadataRoles) && metadataRoles.includes('admin'))
    || Boolean(user.email && configuredAdmins.includes(user.email.toLowerCase()));

  return NextResponse.json({ isAdmin }, { headers: { 'Cache-Control': 'no-store' } });
}
