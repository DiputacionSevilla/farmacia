/**
 * Autenticación administrativa (§3, RF008).
 *
 * Implementación mínima autocontenida: credenciales + sesión JWT firmada en
 * cookie httpOnly. Se diseña para poder sustituirse por un proveedor OIDC
 * corporativo (Microsoft Entra ID o equivalente municipal) manteniendo la
 * tabla `AdminUser` como espejo local de roles y auditoría (§7.1).
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@/generated/prisma";

const SESSION_COOKIE = "farmacias_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET no está configurado o es demasiado corto. Defínelo como variable de entorno."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // AdminUser.id
  email: string;
  name: string;
  roles: AdminRole[];
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !Array.isArray(payload.roles)
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles as AdminRole[],
    };
  } catch {
    return null;
  }
}

/** Establece la cookie de sesión tras un login correcto. */
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Lee y valida la sesión actual desde la cookie de la petición. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Comprueba en servidor que la sesión tiene al menos uno de los roles dados. */
export function hasRole(
  session: SessionPayload | null,
  roles: AdminRole[]
): boolean {
  if (!session) return false;
  return session.roles.some((r) => roles.includes(r));
}

export { SESSION_COOKIE };
