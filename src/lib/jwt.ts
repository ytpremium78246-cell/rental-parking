import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "parking-india-super-secret-jwt-key-production-ready-2026";
const key = new TextEncoder().encode(secretKey);

export interface TokenPayload {
  userId: string;
  email: string | null;
  role: string;
  name: string;
  phone: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}
