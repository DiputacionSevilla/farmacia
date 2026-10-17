import Link from "next/link";
import { prisma } from "@/lib/prisma";

const VERIFICATION_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendiente",
  inactive: "Inactivo",
};

const VERIFICATION_CLASSES: Record<string, string> = {
  confirmed: "bg-status-open-bg text-status-open",
  pending: "bg-brand-orange-100 text-brand-orange-700",
  inactive: "bg-brand-blue-100 text-brand-blue-700",
};

export default async function AdminPharmaciesPage() {
  const pharmacies = await prisma.pharmacy.findMany({
    orderBy: { displayName: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue-900">Farmacias</h1>
        <Link
          href="/admin/pharmacies/new"
          className="tap-target rounded-lg bg-brand-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-800"
        >
          Añadir farmacia
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-brand-blue-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-blue-50 text-brand-blue-700">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Municipio</th>
              <th className="p-3">Horario</th>
              <th className="p-3">Activa</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-blue-100">
            {pharmacies.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium text-brand-blue-900">
                  {p.displayName}
                </td>
                <td className="p-3 text-brand-blue-700">{p.municipality}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${VERIFICATION_CLASSES[p.verificationStatus]}`}
                  >
                    {VERIFICATION_LABELS[p.verificationStatus]}
                  </span>
                </td>
                <td className="p-3 text-brand-blue-700">{p.active ? "Sí" : "No"}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/pharmacies/${p.id}`}
                    className="tap-target rounded-lg border border-brand-blue-200 px-3 py-1.5 text-brand-blue-900 hover:bg-brand-blue-50"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
