import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/calendar", label: "Calendario de guardias" },
  { href: "/admin/pharmacies", label: "Farmacias" },
  { href: "/admin/holidays", label: "Festivos" },
  { href: "/admin/audit", label: "Auditoría" },
];

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Proxy ya filtra el acceso; se repite aquí por defensa en profundidad
  // (RF008 — la comprobación de permisos se hace siempre en servidor).
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col bg-brand-blue-50">
      <header className="bg-brand-blue-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/escudo-mairena.webp"
              alt=""
              width={32}
              height={38}
            />
            <span className="font-semibold">Administración · Farmacias Mairena</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span>{session.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="tap-target rounded-lg border border-white/30 px-3 py-1.5 hover:bg-white/10"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Navegación administrativa" className="border-t border-white/10">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="tap-target flex items-center px-3 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-4 text-xs text-brand-blue-500">
        Departamento de Informática · Ayuntamiento de Mairena del Alcor
      </footer>
    </div>
  );
}
