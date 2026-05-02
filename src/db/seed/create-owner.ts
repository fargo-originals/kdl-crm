import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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
