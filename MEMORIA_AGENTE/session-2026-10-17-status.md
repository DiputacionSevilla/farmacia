---
name: session-2026-10-17-status
description: Estado al cerrar la sesión de desarrollo del 17 de octubre de 2026
metadata:
  node_type: memory
  type: project
  originSessionId: 212b035b-dd0b-4633-8149-cbe8323abc3f
  modified: 2026-10-17T15:06:23.861Z
---

**Qué quedó hecho y subido a GitHub** (`https://github.com/DiputacionSevilla/farmacia`,
rama `master`, último commit `23b4945`): MVP completo + panel admin + OCR
híbrido + descubrimiento trimestral (ver [architecture-decisions](architecture-decisions.md)) +
referencias al Departamento de Informática + migración de Prisma a driver
adapter (`pg`, sin binario nativo del motor de consultas) para reducir el
riesgo de que el build de Docker se cuelgue por red.

**Despliegue**: el usuario ya hizo `git pull` en la máquina del CPD. En el
momento de cerrar la sesión no se había confirmado si `docker compose up
-d --build` completó correctamente allí — **pendiente de confirmación en
la próxima sesión**. Si hay problemas, revisar primero:
1. `docker compose exec app npx tsx prisma/seed.ts` — debe completar sin
   el error `Cannot find module '../src/lib/temporal-engine'` (ya
   corregido, pero confirmar que el `git pull` recogió el commit
   `6cafa77` o posterior).
2. Si el build se cuelga en `npm ci`, probablemente sea el binario
   `schema-engine` (usado por `prisma migrate`, no eliminado por el
   driver adapter) — comprobar salida a internet de esa máquina.

**Incidencia sin resolver en el PC de desarrollo** (no bloqueante para el
CPD): Docker Desktop se quedó sin arrancar el daemon tras varios
reinicios forzados al final de la sesión, probablemente por la misma
inestabilidad de red que afectó varias builds durante el día. Revisar
manualmente la próxima vez que se use Docker en esta máquina.

**Siguientes pasos pendientes** (ninguno urgente, a decidir con el
usuario):
- Confirmar que el despliegue en el CPD funciona de extremo a extremo
  (seed, login admin, regenerar calendario).
- Cambiar la contraseña del admin semilla en producción.
- Cargar festivos reales (BOE/BOJA/BOP) — no hay ninguno sembrado a
  propósito.
- Confirmar horarios ordinarios reales de las 8 farmacias desde
  `/admin/pharmacies` — tampoco sembrados a propósito (RN005).

Ver [project-overview](project-overview.md), [deployment-target](deployment-target.md), [architecture-decisions](architecture-decisions.md).
