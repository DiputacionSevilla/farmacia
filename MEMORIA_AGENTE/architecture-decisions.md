---
name: architecture-decisions
description: Decisiones técnicas clave tomadas al construir la app y por qué
metadata:
  node_type: memory
  type: project
  originSessionId: 212b035b-dd0b-4633-8149-cbe8323abc3f
  modified: 2026-10-17T15:06:35.468Z
---

**Por qué:** documentar elecciones no obvias desde el código, para no
deshacerlas sin querer en una sesión futura.

- **Un solo contenedor Next.js** (App Router, TS) para sitio público + API
  + panel admin, más Postgres. Se descartó microservicios/segundo
  lenguaje a propósito (el usuario pidió "arquitectura simple").
- **Cache Components / PPR de Next.js 16 desactivado** (`next.config.ts`).
  Esta app es inherentemente de datos en tiempo real (guardia vigente
  "ahora mismo"); el modelo de caché estática de Next 16 obligaba a anotar
  cada ruta y no aportaba nada aquí. Todas las páginas/rutas con datos
  usan `export const dynamic = "force-dynamic"` explícito — si se añade
  una página nueva con datos de Prisma, **hay que añadir esa línea** o
  Next la prerenderizará estática en build y quedará con datos obsoletos.
- **Dos route groups con root layout propio:** `(public)` (cabecera/pie
  municipal, PWA) y `(admin)` (sin esa cabecera, protegido por
  `src/proxy.ts`). `manifest.ts`/`favicon.ico`/`globals.css` quedan fuera
  de ambos grupos, a nivel de `src/app/`.
- **Columnas `@db.Date` de Prisma (service_date, period_start/end,
  holidays.date, opening_hour_rules.valid_from/to, opening_exceptions.date)
  se construyen y comparan SIEMPRE como medianoche UTC**, nunca
  convirtiendo desde Europe/Madrid — hubo un bug real por esto (fechas se
  desplazaban un día por el offset CEST/CET). Ver los helpers
  `dateOnlyToJSDate`/`jsDateToISODate` en `src/lib/queries.ts`.
- **OCR sin salida a internet:** Tesseract.js + `@napi-rs/canvas`
  (binarios precompilados, sin compilar nada) en vez de Python/Tesseract
  nativo, para no añadir un segundo runtime al Docker. Modelo de español
  bundleado en `app/resources/tessdata/spa.traineddata` (committeado en
  git, ~2.2MB). **Gotcha de Turbopack:** los addons nativos (`.node`)
  deben listarse en `serverExternalPackages` en `next.config.ts` o el
  build de producción falla (`next build` sí compila bien en dev, falla
  en build — comprobar siempre con `npm run build` real, no solo `next
  dev`, antes de dar algo por terminado).
- **Fechas en páginas OCR del PDF de guardias:** los encabezados "LUNES
  26" etc. NO son fiables por OCR (confirmado empíricamente con el PDF
  real — se pierden o leen mal). Las fechas en modo OCR se derivan
  secuencialmente desde el periodo del encabezado de la semana (que sí es
  fiable), nunca del número de día leído por OCR. Ver
  `src/lib/pdf-parser.ts` (`parseOcrPage`).
- **Siembra (`prisma/seed.ts`) debe ser idempotente** — hubo un bug real
  donde re-ejecutarla duplicaba las 8 farmacias porque el `upsert` buscaba
  por un id inexistente en vez de por un campo estable (teléfono). Ya
  corregido; si se añaden más seeds, buscar siempre por un campo natural
  único antes de crear.
- Horarios ordinarios de las farmacias **no se siembran** (a propósito):
  RN005 prohíbe mostrar "abierta por horario" sin verificación fiable. Los
  confirma un administrador desde `/admin/pharmacies`.
- Festivos **no se siembran** (a propósito): cada uno necesita su fuente
  oficial real (BOE/BOJA/BOP), no se inventan de ejemplo.
- **Prisma sin motor de consultas nativo:** `generator client` usa
  `engineType = "client"` + `output = "../src/generated/prisma"`, y
  `src/lib/prisma.ts` pasa un `adapter` (`@prisma/adapter-pg` + `pg`) al
  construir `PrismaClient`. **Importante:** pasar solo `adapter` sin
  `engineType = "client"` NO es suficiente — Prisma sigue generando y
  exigiendo el binario nativo igualmente; hay que declarar las dos cosas.
  Motivo: el build de Docker se colgó varias veces descargando ese binario
  en una red inestable. `src/generated/` no se commitea (se regenera en
  cada build con `prisma generate`, igual que `node_modules`). Lo que
  **no** cambia: `prisma migrate deploy` sigue usando su propio motor de
  esquema nativo (`schema-engine`), ese binario no se ha eliminado — solo
  el de consultas, que es el que se ejecuta en cada petición.
- Los imports de enums de Prisma (`AdminRole`, `AuditResult`, etc.) deben
  hacerse desde `@/generated/prisma`, no desde `@prisma/client` (ese
  paquete ya no es donde vive el cliente generado).

Ver [project-overview](project-overview.md) y [deployment-target](deployment-target.md).
