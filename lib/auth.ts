import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "kliniu_session";
const encoder = new TextEncoder();

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error("APP_SESSION_SECRET no está configurada.");
  }
  return secret;
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
  // Los enlaces de reset y de verificación se firman con la misma clave: un token
  // con `purpose` nunca vale como sesión.
  if ("purpose" in verified.payload || !verified.payload.userId) {
    throw new Error("INVALID_SESSION_TOKEN");
  }
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

export type EmailVerificationPayload = {
  userId: string;
  email: string;
  purpose: "email-verify";
};

export async function createEmailVerificationToken(userId: string, email: string) {
  return await new SignJWT({ userId, email, purpose: "email-verify" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSessionKey());
}

export async function readEmailVerificationToken(token: string) {
  const verified = await jwtVerify(token, getSessionKey());
  const payload = verified.payload as Partial<EmailVerificationPayload>;

  if (payload.purpose !== "email-verify" || !payload.userId || !payload.email) {
    throw new Error("INVALID_VERIFICATION_TOKEN");
  }

  return payload as EmailVerificationPayload;
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

  let session: SessionPayload;
  try {
    session = await readSessionToken(token);
  } catch {
    return null;
  }

  // El JWT dura 7 días y no se puede revocar: se confirma contra la base que la
  // cuenta siga activa, para que una sesión abierta en otro dispositivo deje de
  // servir en cuanto la cuenta se elimina, suspende o desactiva.
  if (prisma) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { status: true },
    });
    if (user?.status !== "ACTIVE") return null;
  }

  return session;
}

// PIN adicional del rol ADMIN. Sin ADMIN_EXTRA_PIN configurada el login falla
// cerrado ("unset"): nunca hay un PIN por defecto.
export function checkAdminPin(pin: string): "ok" | "wrong" | "unset" {
  const expected = process.env.ADMIN_EXTRA_PIN?.trim();
  if (!expected) return "unset";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(pin), digest(expected)) ? "ok" : "wrong";
}
