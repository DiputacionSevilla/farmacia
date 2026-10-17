import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-blue-900">Privacidad</h1>

      <p className="mt-4 text-brand-blue-900">
        La consulta pública de este servicio no requiere registro ni datos
        personales.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Geolocalización
      </h2>
      <p className="mt-2 text-brand-blue-800">
        El uso de la ubicación del dispositivo es opcional y solo se
        solicita tras una acción expresa de la persona usuaria (por ejemplo,
        al pulsar &quot;Cómo llegar&quot;). No se almacena en los
        servidores del Ayuntamiento.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Analítica
      </h2>
      <p className="mt-2 text-brand-blue-800">
        No se utiliza analítica de terceros. Si en el futuro se incorporase
        alguna medición agregada, se documentará en esta página junto con su
        base jurídica, conforme a las orientaciones de la Agencia Española
        de Protección de Datos para administraciones públicas.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Panel administrativo
      </h2>
      <p className="mt-2 text-brand-blue-800">
        El acceso administrativo queda registrado con fines de auditoría y
        trazabilidad (usuario, fecha, acción). Estos registros se conservan
        el tiempo necesario para garantizar la integridad del servicio y se
        tratan conforme al Reglamento General de Protección de Datos.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Contacto
      </h2>
      <p className="mt-2 text-brand-blue-800">
        <a href="mailto:informacion@mairenadelalcor.org" className="underline">
          informacion@mairenadelalcor.org
        </a>
      </p>
    </div>
  );
}
