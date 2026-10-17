---
name: project-overview
description: "Qué es este proyecto, dónde vive el código y los documentos de referencia"
metadata:
  node_type: memory
  type: project
  originSessionId: 212b035b-dd0b-4633-8149-cbe8323abc3f
  modified: 2026-10-17T13:07:46.120Z
---

PWA de farmacias de guardia de Mairena del Alcor, encargada por el
Ayuntamiento. Repo local en `C:\Users\usuario\Documents\Proyectos\ayto\farmacia`
(git inicializado, sin remoto hasta que se suba a GitHub). La app Next.js
vive en el subdirectorio `app/`; los documentos de especificación están en
la raíz del repo, junto al escudo municipal:

- `SDD_PWA_Farmacias_Guardia_Mairena.md` — especificación funcional
  completa (SDD), incluye en su §21 la "Instrucción final para el agente
  programador".
- `ANEXO_SDD_Descubrimiento_PDF_OCR_Farmacias_Mairena.md` — anexo que el
  usuario añadió a mitad de sesión de desarrollo; **prevalece sobre el SDD
  inicial** en todo lo relativo a descubrimiento trimestral del PDF
  (`T1`-`T4`) y extracción híbrida (texto nativo + OCR). Alta prioridad,
  "previo a la puesta en producción pública".
- `escudo-mairena.webp` — escudo oficial, usado para generar iconos PWA y
  como base de la paleta de color (azul/naranja) de la app.

Desarrollado en un PC fuera de la red municipal; el despliegue real se
hace en una máquina del CPD vía `git pull` desde GitHub + Docker Compose.
Dominio público: `farmacias.mairenadelalcor.net`, detrás de Nginx Proxy
Manager (gestiona TLS). Ver [deployment-target](deployment-target.md) y
[architecture-decisions](architecture-decisions.md).

**Titular/responsable:** Ayuntamiento de Mairena del Alcor. **Desarrollo y
mantenimiento:** Departamento de Informática municipal — así se referencia
en el footer público, `/aviso-legal`, `/acerca-de-los-datos`, el panel
admin y el README.
