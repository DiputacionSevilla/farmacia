---
name: deployment-target
description: Dónde y cómo se despliega la app en producción (CPD municipal)
metadata:
  node_type: memory
  type: project
  originSessionId: 212b035b-dd0b-4633-8149-cbe8323abc3f
  modified: 2026-10-17T13:07:55.899Z
---

Despliegue de producción: máquina del CPD del Ayuntamiento de Mairena del
Alcor, **distinta** del PC donde se desarrolló (sin acceso directo desde
aquí). Flujo: push a un repositorio GitHub creado por el usuario → `git
pull` en la máquina del CPD → `docker compose up -d --build` con
`app/docker-compose.yml`.

Arquitectura de red: Nginx Proxy Manager (ya existente en el CPD) hace de
proxy inverso con TLS (Let's Encrypt) para `farmacias.mairenadelalcor.net`,
apuntando a `http://<ip-máquina>:<APP_PORT>` donde escucha el contenedor
`app` (puerto interno 3000). La app **no** gestiona TLS ella misma.

Dos contenedores: `app` (Next.js, construido desde `app/Dockerfile`) +
`db` (Postgres 16, sin puerto publicado al host). Variables de entorno
obligatorias en el `.env` de producción: `DB_PASSWORD`, `AUTH_SECRET`
(32+ bytes aleatorios), `DUTY_PDF_URL`, `DUTY_PDF_ALLOWED_HOSTS`,
`APP_PORT`. Las migraciones Prisma se aplican solas al arrancar
(`docker-entrypoint.sh` → `prisma migrate deploy`), nunca automáticamente
contra producción sin pasar por `prisma/migrations/`.

Primer arranque: no hay datos hasta ejecutar
`docker compose exec app npx tsx prisma/seed.ts` (carga directorio de
8 farmacias + calendario oficial de ejemplo + usuario admin
`admin@mairenadelalcor.org` / `CambiaEstaClave!2026` — cambiar la
contraseña cuanto antes). Detalle completo en `app/README.md`.

Ver [project-overview](project-overview.md) y [architecture-decisions](architecture-decisions.md).
