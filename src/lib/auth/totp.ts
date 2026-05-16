import { generateSecret as _generateSecret, verifySync, generateURI } from 'otplib';

const APP_NAME = 'KDL CRM';

/** Generate a new TOTP secret for a user */
export function generateTotpSecret(): string {
  return _generateSecret();
}

/** Build the otpauth:// URL used by authenticator apps */
export function getTotpUri(email: string, secret: string): string {
  return generateURI({
    label: email,
    issuer: APP_NAME,
    secret,
  });
}

/** Build a QR code URL using the free qrserver.com API (no npm package needed) */
export function getQrCodeUrl(totpUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`;
}

/** Verify a TOTP code against a secret */
export function verifyTotp(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/** Generate 8 one-time recovery codes */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
