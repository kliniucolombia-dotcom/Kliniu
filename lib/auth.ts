import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/generated/prisma/client";

const SESSION_COOKIE_NAME = "kliniu_session";
const encoder = new TextEncoder();

function getSessionSecret() {
  return process.env.APP_SESSION_SECRET || "kliniu-dev-session-secret-change-me";
}

function getSessionKey() {
  return encoder.encode(getSessionSecret());
}

export type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

export async function createSessionToken(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionKey());
}

export async function readSessionToken(token: string) {
  const verified = await jwtVerify(token, getSessionKey());
  return verified.payload as SessionPayload;
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export type ResetPasswordPayload = {
  userId: string;
  email: string;
  purpose: "password-reset";
};

export async function createResetPasswordToken(userId: string, email: string) {
  return await new SignJWT({ userId, email, purpose: "password-reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(getSessionKey());
}

export async function readResetPasswordToken(token: string) {
  const verified = await jwtVerify(token, getSessionKey());
  const payload = verified.payload as Partial<ResetPasswordPayload>;

  if (payload.purpose !== "password-reset" || !payload.userId || !payload.email) {
    throw new Error("INVALID_RESET_TOKEN");
  }

  return payload as ResetPasswordPayload;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await readSessionToken(token);
  } catch {
    return null;
  }
}
