import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';
import { signToken, COOKIE } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('oauth_state')?.value;

  if (!code || state !== savedState) {
    return NextResponse.redirect('/login?error=oauth_state');
  }
  cookieStore.delete('oauth_state');

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return NextResponse.redirect('/login?error=oauth_token');

  // Get user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileRes.json();
  if (!profile.email) return NextResponse.redirect('/login?error=oauth_profile');

  // Check if user already exists to preserve their existing role
  const { data: existingUser } = await supabaseServer
    .from('users')
    .select('id, role')
    .eq('email', profile.email.toLowerCase())
    .maybeSingle();

  // Only assign role for new users; never downgrade an existing user's role
  const roleForNewUser = existingUser ? undefined : (
    await supabaseServer.from('users').select('*', { count: 'exact', head: true })
      .then(({ count }) => (count ?? 0) === 0 ? 'owner' : 'seller')
  );

  const upsertPayload: Record<string, unknown> = {
    email: profile.email.toLowerCase(),
    google_id: profile.id,
    first_name: profile.given_name ?? '',
    last_name: profile.family_name ?? '',
    avatar_url: profile.picture ?? '',
    email_verified: true,
    active: true,
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (roleForNewUser) upsertPayload.role = roleForNewUser;

  const { data: user } = await supabaseServer
    .from('users')
    .upsert(upsertPayload, { onConflict: 'email' })
    .select('id, email, role')
    .single();
  if (!user) return NextResponse.redirect('/login?error=db');

  const token = await signToken({ sub: user.id, role: user.role, email: user.email });
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
