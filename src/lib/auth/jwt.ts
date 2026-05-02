import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
  sub: string;  // userId (uuid)
  role: string;
  email: string;
}

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-min-32-chars-padding!!');
const COOKIE = 'kdl_session';
const EXPIRY = '7d';

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export { COOKIE };
