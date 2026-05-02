export async function revalidateLanding(tags: string[] = ['landing:snapshot', 'landing:blog']) {
  const url = process.env.NEXT_PUBLIC_LANDING_URL;
  const secret = process.env.LANDING_REVALIDATE_SECRET;
  if (!url || !secret) return;

  await fetch(`${url}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-secret': secret,
    },
    body: JSON.stringify({ tags }),
  }).catch(err => console.error('Revalidate failed:', err));
}
