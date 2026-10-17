import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/acerca-de-los-datos", label: "Acerca de los datos" },
  { href: "/accesibilidad", label: "Accesibilidad" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/aviso-legal", label: "Aviso legal" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-brand-blue-100 bg-brand-blue-50">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-brand-blue-900">
        <p className="font-semibold">Ayuntamiento de Mairena del Alcor</p>
        <p className="mt-1 text-brand-blue-800">
          Servicio informativo municipal basado en la fuente oficial del
          Real e Ilustre Colegio Oficial de Farmacéuticos de Sevilla. No
          sustituye la información oficial del Colegio.
        </p>
        <nav aria-label="Enlaces del pie de página" className="mt-4">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="tap-target inline-flex items-center underline decoration-brand-orange-500 decoration-2 underline-offset-4 hover:text-brand-orange-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-4 text-xs text-brand-blue-700">
          Contacto para incidencias de datos:{" "}
          <a
            className="underline"
            href="mailto:informacion@mairenadelalcor.org"
          >
            informacion@mairenadelalcor.org
          </a>
        </p>
        <p className="mt-2 text-xs text-brand-blue-500">
          Desarrollado y mantenido por el Departamento de Informática del
          Ayuntamiento de Mairena del Alcor.
        </p>
      </div>
    </footer>
  );
}
