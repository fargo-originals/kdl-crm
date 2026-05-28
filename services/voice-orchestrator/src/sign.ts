import crypto from 'node:crypto';
import { config } from './config.js';

// HMAC-SHA256 hex del cuerpo crudo. Debe coincidir con signBody() del CRM.
export function sign(body: string): string {
  return crypto.createHmac('sha256', config.sharedSecret).update(body).digest('hex');
}

export function verify(body: string, signature: string | null | undefined): boolean {
  if (!config.sharedSecret || !signature) return false;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
