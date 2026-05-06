import { getSession } from './session';
import { redirect } from 'next/navigation';

export async function guardOwner() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'owner') redirect('/dashboard');
  return session;
}

export async function guardAdmin() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'owner' && session.role !== 'admin') redirect('/dashboard');
  return session;
}
