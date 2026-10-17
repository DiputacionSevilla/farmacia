/**
 * Protección de `/admin` (RF008). Comprueba únicamente la validez de la
 * firma de la cookie de sesión (compatible con el entorno ligero de
 * Proxy); la comprobación de permisos concretos por acción se repite
 * siempre en el servidor (Server Actions / rutas API), nunca solo aquí.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "farmacias_admin_session";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const authenticated = await hasValidSession(request);

  if (pathname.startsWith("/admin")) {
    if (!isLoginPage && !authenticated) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (isLoginPage && authenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
