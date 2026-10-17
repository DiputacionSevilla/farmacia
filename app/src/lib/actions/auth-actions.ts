"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "Introduce correo y contraseña." };
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.active) {
    await recordAuditEvent({
      userId: null,
      action: "admin_login_failed",
      entityType: "AdminUser",
      entityId: null,
      result: "failure",
      after: { email },
    });
    return { error: "Credenciales incorrectas." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordAuditEvent({
      userId: user.id,
      action: "admin_login_failed",
      entityType: "AdminUser",
      entityId: user.id,
      result: "failure",
    });
    return { error: "Credenciales incorrectas." };
  }

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
  });
  await setSessionCookie(token);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await recordAuditEvent({
    userId: user.id,
    action: "admin_login_success",
    entityType: "AdminUser",
    entityId: user.id,
    result: "success",
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}
