import { prisma } from "@/lib/prisma";
import { formatDateTimeEs } from "@/lib/format";

export default async function AdminAuditPage() {
  const events = await prisma.auditEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
  const userIds = [...new Set(events.map((e) => e.userId).filter(Boolean))] as string[];
  const users = await prisma.adminUser.findMany({
    where: { id: { in: userIds } },
  });
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue-900">
        Historial de auditoría
      </h1>
      <p className="mt-1 text-sm text-brand-blue-700">
        Últimas 100 acciones administrativas registradas.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-brand-blue-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-blue-50 text-brand-blue-700">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Entidad</th>
              <th className="p-3">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-blue-100">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="p-3 whitespace-nowrap text-brand-blue-700">
                  {formatDateTimeEs(e.occurredAt.toISOString())}
                </td>
                <td className="p-3 text-brand-blue-900">
                  {e.userId ? userNameById.get(e.userId) ?? e.userId : "—"}
                </td>
                <td className="p-3 text-brand-blue-900">{e.action}</td>
                <td className="p-3 text-brand-blue-700">
                  {e.entityType}
                  {e.entityId ? ` #${e.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="p-3">
                  <span
                    className={
                      e.result === "success"
                        ? "text-status-open"
                        : "text-status-warn"
                    }
                  >
                    {e.result === "success" ? "Éxito" : "Fallo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
