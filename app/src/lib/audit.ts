import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import type { AuditResult } from "@/generated/prisma";

/** Registra un evento de auditoría (§8 `audit_events`, RN008/009). */
export async function recordAuditEvent(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  result: AuditResult;
  correlationId?: string;
}) {
  await prisma.auditEvent.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      beforeJson: params.before === undefined ? undefined : (params.before as object),
      afterJson: params.after === undefined ? undefined : (params.after as object),
      result: params.result,
      correlationId: params.correlationId ?? randomUUID(),
    },
  });
}
