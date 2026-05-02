import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Load .env.local if present
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local not found, use existing env */ }

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const email = process.env.OWNER_EMAIL!;
  const password = process.env.OWNER_PASSWORD!;
  if (!email || !password) throw new Error('OWNER_EMAIL and OWNER_PASSWORD required');

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase.from('users').upsert({
    email: email.toLowerCase(),
    password_hash: passwordHash,
    role: 'owner',
    first_name: 'Admin',
    last_name: '',
    active: true,
    email_verified: true,
  }, { onConflict: 'email' }).select().single();

  if (error) throw error;
  console.log('Owner created:', data.id, data.email);
}

main().catch(console.error);
