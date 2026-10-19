---
name: session-2026-10-19-widget
description: Widget incrustable /widget para OpenCms, desplegado el 19-oct-2026 en 10.158.0.3
metadata:
  node_type: memory
  type: project
---

**Hecho y desplegado** (commit `915b25e`, rama `master`, servidor `10.158.0.3`):
- Ruta `/widget` (route group `(widget)`, layout propio sin cabecera/pie/SW):
  farmacia de guardia ahora (llamar / cómo llegar), hasta 4 abiertas más,
  enlace al calendario completo, 112 y escudo pequeño junto al título.
  Se refresca cada 5 min (`WidgetRuntime`) y avisa de su altura por `postMessage`.
- `public/widget.js`: script de inserción que crea el iframe autoajustable.
- Framing: `X-Frame-Options: DENY` sigue en todo salvo `/widget`; allí
  `src/proxy.ts` pone `CSP frame-ancestors` leyendo `WIDGET_FRAME_ANCESTORS`
  en runtime (no requiere rebuild). `public/sw.js` no cachea `/widget`.
- Guía para quien publique en OpenCms: `INTEGRACION_OPENCMS.md` (raíz).

**Pendiente:**
- Confirmar el dominio real de la web municipal y fijar `WIDGET_FRAME_ANCESTORS`
  en `/opt/farmacia/app/.env` (hoy: supuesto `www.mairenadelalcor.es`).
- Comprobar que Nginx Proxy Manager no añade X-Frame-Options/CSP a `/widget`
  (solo se probó el puerto 3005 directo).
- Todo lo pendiente de [[session-2026-10-17-status]] (clave admin, festivos,
  horarios reales).

**Despliegue:** ahora se hace por SSH con la clave `id_ed25519_miciudad_cpd`
(usuario `fjcarrion`); ver `~/.claude/CLAUDE.md`. Servidor: `/opt/farmacia`,
contenedor `app-app-1` en puerto 3005. Gotcha: ficheros nuevos del repo
usan LF y los existentes CRLF; al editar con scripts preservar el fin de línea.
