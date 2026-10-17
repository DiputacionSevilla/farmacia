import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Abiertas ahora" },
  { href: "/hoy", label: "Hoy" },
  { href: "/semana", label: "Semana" },
  { href: "/mes", label: "Mes" },
];

export function SiteHeader() {
  return (
    <header className="bg-brand-blue-900 text-white">
      <div className="bg-brand-blue-950 px-4 py-1 text-center text-xs">
        Ayuntamiento de Mairena del Alcor — servicio informativo municipal
      </div>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Image
          src="/escudo-mairena.webp"
          alt="Escudo del Ayuntamiento de Mairena del Alcor"
          width={44}
          height={53}
          priority
          className="shrink-0"
        />
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-base font-semibold sm:text-lg">
            Farmacias de guardia
          </span>
          <span className="text-xs text-brand-blue-100 sm:text-sm">
            Mairena del Alcor
          </span>
        </Link>
      </div>
      <nav
        aria-label="Navegación principal"
        className="border-t border-white/10 bg-brand-blue-900"
      >
        <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="tap-target flex items-center px-3 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
