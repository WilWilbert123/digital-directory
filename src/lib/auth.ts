import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "bispos_session";

export type UserRole = "SUPER_ADMIN" | "MALL_ADMIN" | "KIOSK_OPERATOR";

export function isUserRole(value: string): value is UserRole {
  return value === "SUPER_ADMIN" || value === "MALL_ADMIN" || value === "KIOSK_OPERATOR";
}

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
};

function secret() {
  const value = process.env.AUTH_SECRET ?? "dev-only-change-me";
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  cookies().delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export function canManage(role: UserRole) {
  return role === "SUPER_ADMIN" || role === "MALL_ADMIN";
}
