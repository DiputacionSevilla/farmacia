import type { Metadata } from "next";

export const metadata: Metadata = { title: "Declaración de accesibilidad" };

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-blue-900">
        Declaración de accesibilidad
      </h1>

      <p className="mt-4 text-brand-blue-900">
        El Ayuntamiento de Mairena del Alcor se compromete a hacer accesible
        este sitio web de conformidad con el Real Decreto 1112/2018, de 7 de
        septiembre, sobre accesibilidad de los sitios web y aplicaciones
        para dispositivos móviles del sector público, y con el nivel AA de
        las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Medidas aplicadas
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-blue-800">
        <li>Navegación completa por teclado y foco visible.</li>
        <li>Compatibilidad con lectores de pantalla.</li>
        <li>
          Contraste de color suficiente y diseño adaptable hasta un zoom del
          200&nbsp;%.
        </li>
        <li>
          La información crítica (guardia, horario) nunca depende solo del
          color.
        </li>
        <li>Objetivos táctiles de al menos 44×44 píxeles CSS.</li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Comunicar una incidencia
      </h2>
      <p className="mt-2 text-brand-blue-800">
        Si detectas una barrera de accesibilidad, puedes comunicarlo a{" "}
        <a href="mailto:informacion@mairenadelalcor.org" className="underline">
          informacion@mairenadelalcor.org
        </a>
        , indicando la página y el problema encontrado.
      </p>
    </div>
  );
}
