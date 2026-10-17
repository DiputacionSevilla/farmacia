# Farmacias de guardia — Mairena del Alcor

PWA municipal para consultar qué farmacias están abiertas y cuál está de
guardia en Mairena del Alcor, con panel de administración para regenerar el
calendario a partir del PDF oficial del Colegio Oficial de Farmacéuticos de
Sevilla.

**Titular y responsable del servicio:** Ayuntamiento de Mairena del Alcor.
**Desarrollo y mantenimiento:** Departamento de Informática del
Ayuntamiento de Mairena del Alcor.

Especificación completa en
[`../SDD_PWA_Farmacias_Guardia_Mairena.md`](../SDD_PWA_Farmacias_Guardia_Mairena.md)
y en el
[`../ANEXO_SDD_Descubrimiento_PDF_OCR_Farmacias_Mairena.md`](../ANEXO_SDD_Descubrimiento_PDF_OCR_Farmacias_Mairena.md).

## Arquitectura

Deliberadamente simple: **una aplicación Next.js** (App Router, TypeScript)
que sirve tanto el sitio público como el panel administrativo y la API, más
**una base de datos PostgreSQL**. Sin microservicios, sin cola de mensajes,
sin segundo lenguaje para el procesado del PDF (se hace en el propio
servidor Next.js con `pdfjs-dist`).

```
src/
  lib/
    temporal-engine.ts   Motor temporal puro (guardias, horarios, festivos)
    pdf-parser.ts        Extracción y normalización del PDF oficial
    admin-service.ts      Lógica de regeneración/validación/publicación
    queries.ts            Capa de acceso a datos (Prisma -> dominio)
    auth.ts, actions/     Sesión admin y Server Actions
  app/
    (public)/              Sitio público: hoy, semana, mes, ficha...
    (admin)/admin/          Panel administrativo (protegido)
    api/v1/                 API pública de solo lectura
prisma/
  schema.prisma            Modelo de datos
  seed.ts, seed-data/       Carga inicial (directorio + PDF oficial de ejemplo)
```

Dos grupos de rutas con *root layout* independiente: `(public)` lleva la
identidad municipal (cabecera, pie, PWA); `(admin)` es una interfaz de
gestión sin esa cabecera, protegida por `src/proxy.ts`.

Toda página con datos en tiempo real usa `export const dynamic =
"force-dynamic"` — el calendario de guardias nunca debe servirse desde una
caché estática.

## Requisitos

- Node.js 22+
- Docker Desktop (base de datos en desarrollo, imagen de producción)

## Desarrollo local

```bash
cp .env.example .env            # ajustar si hace falta
docker compose -f docker-compose.dev.yml up -d   # solo Postgres
npm install
npm run db:migrate              # crea las tablas
npm run db:seed                 # directorio + calendario oficial de ejemplo + admin
npm run dev
```

La siembra (`db:seed`) carga:

- Las 8 farmacias de Mairena del Alcor con nombre, dirección y teléfono
  (fuente: PDF oficial), **sin horario ordinario confirmado** — un horario
  no verificado nunca se muestra como "abierta" (RN005). Confírmalos desde
  `/admin/pharmacies`.
- El calendario de guardias oficial vigente en el momento de construir este
  proyecto (12 semanas), ya publicado.
- Un usuario administrador (`ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` en
  `.env`, por defecto `admin@mairenadelalcor.org` /
  `CambiaEstaClave!2026` — **cámbialo** antes de ir a producción).

Pruebas del motor temporal (límites horarios, festivos, DST):

```bash
npm run test
```

## Panel administrativo

`/admin` (protegido). Flujo de actualización del calendario (RF009-RF010,
ampliado por `ANEXO_SDD_Descubrimiento_PDF_OCR_Farmacias_Mairena.md`, que
prevalece sobre el SDD inicial en esta materia):

1. **Buscar y regenerar desde la fuente oficial** — el origen publica el
   calendario por trimestre (`T1`-`T4` en la URL); el panel descubre y
   clasifica los cuatro documentos candidatos (vigente / futuro / pasado /
   ya importado / no válido) antes de descargar nada completo.
2. Al elegir un candidato, se descarga en el servidor, se calcula su
   SHA-256 y se compara con el último procesado. **Extracción híbrida por
   página**: se usa el texto nativo del PDF y, solo en las páginas que no
   lo tengan (algunos trimestres se publican enteramente como imagen), se
   aplica OCR en español (Tesseract.js + `@napi-rs/canvas`, con el modelo
   de idioma empaquetado en `resources/tessdata` — funciona sin salida a
   internet). Si no hay cambios respecto al último PDF procesado, se
   indica sin crear nada nuevo. Si hay errores bloqueantes, la versión
   queda guardada como *rechazada* (con el PDF y el motivo, trazabilidad
   completa) pero no afecta a lo publicado.
3. Si todo es correcto se crea una **versión candidata**: revisa el
   resumen de diferencias en `/admin/calendar/<id>` y publícala de forma
   explícita. Nunca se sobrescribe la versión publicada sin confirmación
   (RN008).
4. Toda versión anterior puede **restaurarse** sin volver a procesar el PDF
   (RN009).

Dado que el OCR nunca es perfecto, los campos dudosos (por ejemplo, un
teléfono con un dígito de más) se detectan mediante las validaciones
estructurales antes de poder publicarse, y las fechas en las páginas OCR
se derivan siempre del periodo del encabezado (fiable) en vez de los
números de día individuales (menos fiables por OCR), para no atribuir
nunca una guardia a la fecha equivocada.

Las farmacias y los festivos se gestionan en `/admin/pharmacies` y
`/admin/holidays`. Cada festivo debe referenciar su publicación oficial
(BOE/BOJA/BOP) — no se siembran festivos de ejemplo para no inventar
fuentes: cárgalos tú con la referencia real antes de publicar el servicio.

Todas las acciones administrativas quedan registradas en `/admin/audit`.

## Despliegue en Docker (CPD municipal)

El contenedor `app` escucha internamente en el puerto 3000 y se publica en
el host en `APP_PORT` (por defecto 3000). **Nginx Proxy Manager**, en la
misma red o en otra máquina del CPD, debe tener un *proxy host* para
`farmacias.mairenadelalcor.net` apuntando a
`http://<ip-de-esta-máquina>:<APP_PORT>`, con SSL gestionado por NPM
(Let's Encrypt). La aplicación no gestiona TLS por sí misma.

```bash
cp .env.example .env    # revisar DUTY_PDF_URL, STORAGE_PATH no aplica en Docker
# Definir además, como variables de entorno del compose (no van en .env del contenedor):
#   DB_PASSWORD, AUTH_SECRET (openssl rand -base64 48), DB_USER, DB_NAME, APP_PORT
docker compose up -d --build
```

En el primer arranque no hay datos: entra con
`docker compose exec app npx tsx prisma/seed.ts` (o define
`RUN_SEED_ON_START=true` una sola vez) para cargar el directorio y crear el
primer usuario administrador, y cambia su contraseña cuanto antes desde una
futura función de gestión de usuarios o directamente en base de datos.

Las migraciones (`prisma migrate deploy`) se aplican automáticamente al
arrancar el contenedor (`docker-entrypoint.sh`), nunca se ejecutan contra
la base de datos de producción sin pasar antes por una versión de
migración en `prisma/migrations/`.

El volumen `app_storage` conserva los PDF originales descargados
(inmutables, nombrados por su SHA-256) entre despliegues.

### Variables de entorno de producción relevantes

| Variable | Descripción |
|---|---|
| `DB_PASSWORD` | Contraseña de PostgreSQL (obligatoria) |
| `AUTH_SECRET` | Secreto de firma de sesión, 32+ bytes aleatorios |
| `DUTY_PDF_URL` | URL del PDF oficial (configurable, no embebida en el código) |
| `DUTY_PDF_ALLOWED_HOSTS` | Lista blanca de dominios permitidos para la descarga |
| `APP_PORT` | Puerto publicado al host para Nginx Proxy Manager |

## Limitaciones conocidas de esta versión

- El flujo administrativo expuesto en `/admin` cubre el ciclo completo
  (descubrir, regenerar, validar, publicar, restaurar) mediante Server
  Actions; no se ha implementado la superficie REST completa de
  `/api/admin/*` descrita en §9 del SDD (las consultas públicas de
  `/api/v1/*` sí están completas).
- No hay proveedor OIDC corporativo integrado: la autenticación
  administrativa es local (correo + contraseña, sesión JWT). El modelo de
  datos (`AdminUser`, roles) está pensado para sustituirse por Entra ID u
  otro proveedor municipal sin tocar el resto de la aplicación.
- No se siembran festivos de ejemplo (ver más arriba): deben cargarse con
  su fuente oficial real antes de depender de ellos en producción.
