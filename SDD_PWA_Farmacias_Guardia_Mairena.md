# SDD Aplicación PWA de farmacias abiertas y de guardia de Mairena del Alcor

**Versión:** 1.0  
**Fecha:** 17 de octubre de 2026  
**Destinatario:** agente programador responsable del análisis, desarrollo, pruebas y despliegue  
**Promotor:** Ayuntamiento de Mairena del Alcor

## 1. Resumen ejecutivo

Se desarrollará una aplicación web progresiva, mobile first e instalable como PWA, destinada a informar a la ciudadanía de las farmacias abiertas en el momento de la consulta y de las farmacias de guardia de Mairena del Alcor.

La aplicación combinará tres fuentes de información independientes:

1. El calendario oficial de farmacias de guardia publicado por el Colegio Oficial de Farmacéuticos de Sevilla en formato PDF.
2. Los horarios ordinarios y excepcionales de las farmacias de Mairena del Alcor.
3. El calendario de festivos nacionales, autonómicos y locales aplicable al municipio.

La pantalla principal deberá responder de forma inmediata a la pregunta **qué farmacias están abiertas ahora**, mostrando primero las situadas en Mairena del Alcor. La farmacia de guardia se identificará mediante una etiqueta diferenciada, aunque coincida con una farmacia abierta por horario ordinario.

El sistema dispondrá de una zona de administración protegida. Un administrador podrá comprobar si el PDF oficial ha cambiado, regenerar el calendario, revisar las diferencias y publicar la nueva versión. Ninguna actualización se publicará sin validación previa.

La aplicación se difundirá desde la web y las redes sociales oficiales del Ayuntamiento. Por tanto, debe transmitir carácter institucional, indicar claramente el origen y la fecha de actualización de los datos y cumplir los requisitos aplicables de accesibilidad, seguridad y protección de datos.

## 2. Objetivos

### 2.1 Objetivos funcionales

- Mostrar las farmacias abiertas en el momento exacto de la consulta.
- Diferenciar entre apertura por horario ordinario y apertura por servicio de guardia.
- Priorizar las farmacias ubicadas en Mairena del Alcor.
- Mostrar la farmacia de guardia diurna y nocturna de cualquier fecha disponible.
- Permitir la consulta semanal y mensual.
- Facilitar llamada telefónica y navegación hasta la farmacia.
- Permitir la instalación en Android e iOS como PWA.
- Permitir a un administrador regenerar de forma segura el calendario al actualizarse el PDF oficial.
- Tener en cuenta festivos, horarios especiales, cierres excepcionales y cambios estacionales.

### 2.2 Objetivos institucionales

- Presentar el servicio como información municipal fiable y actualizada.
- Mantener trazabilidad sobre la fuente y las modificaciones publicadas.
- Reducir el riesgo de mostrar como abierta una farmacia que realmente está cerrada.
- Ofrecer una experiencia accesible, rápida y clara desde el móvil.

### 2.3 Fuera de alcance de la primera versión

- Reserva o venta de medicamentos.
- Consulta de existencias de productos.
- Envío de recetas o datos sanitarios.
- Registro de ciudadanía o perfiles personales.
- Sustituir la información oficial del Colegio de Farmacéuticos.
- Publicación automática de un PDF recién detectado sin revisión administrativa.

## 3. Usuarios y roles

| Rol | Capacidades |
|---|---|
| Ciudadanía | Consultar farmacias abiertas, guardias, horarios, direcciones, teléfonos y rutas. Instalar la PWA. No requiere autenticación. |
| Administrador de contenido | Revisar el PDF, regenerar calendario, mantener horarios, festivos y excepciones, previsualizar cambios, publicar y restaurar una versión anterior. |
| Administrador técnico | Gestionar usuarios, configuración, fuentes, observabilidad, copias, seguridad y despliegues. |
| Auditor o consulta | Consultar historial, diferencias y registros de publicación sin capacidad de modificación. Rol opcional. |

Se aplicará control de acceso basado en roles. Una misma persona podrá acumular roles cuando proceda.

## 4. Fuentes de información

### 4.1 Calendario oficial de guardias

Fuente inicial configurable:

`https://servicios.farmaceuticosdesevilla.es/images/farmaciasguardia/T4/mairenadelalcor.pdf`

El enlace no debe estar codificado directamente en varios lugares. Se almacenará como parámetro de configuración versionado.

El PDF actual distingue:

- Guardia de día: de 9:30 a 22:00.
- Guardia de noche: de 22:00 a 9:30 del día siguiente.
- Guardias nocturnas que pueden corresponder a farmacias de El Viso del Alcor.

El PDF es la fuente de verdad del calendario de guardias. En caso de discrepancia, la aplicación deberá advertir que prevalece la información oficial publicada por el Colegio Oficial de Farmacéuticos de Sevilla.

### 4.2 Directorio y horarios ordinarios

El PDF de guardias no contiene información suficiente para saber qué otras farmacias están abiertas por su horario comercial. Se mantendrá un directorio propio con:

- Nombre público de la farmacia.
- Titular o denominación, cuando sea necesario.
- Dirección normalizada.
- Municipio y código postal.
- Teléfono.
- Coordenadas geográficas verificadas.
- Horario ordinario por día de la semana.
- Tramos partidos de mañana y tarde.
- Horario de verano y de invierno, si existen.
- Excepciones por fecha.
- Fecha y fuente de la última verificación.
- Estado: confirmado, pendiente de confirmar o inactivo.

Los horarios deberán ser confirmados por una fuente fiable: Colegio Oficial, farmacia correspondiente o revisión municipal documentada. Una farmacia con horario desconocido o caducado no se mostrará como abierta por horario ordinario. Sí podrá mostrarse como de guardia cuando así figure en el PDF.

### 4.3 Festivos

El motor deberá combinar:

- Festivos nacionales publicados en el BOE.
- Festivos autonómicos publicados en el BOJA.
- Las dos fiestas locales de Mairena del Alcor publicadas por la autoridad competente y contrastadas con el Ayuntamiento o el BOP de Sevilla.
- Excepciones municipales o comerciales introducidas y justificadas por el administrador.

No se utilizará una API comercial de festivos como única fuente de verdad. Puede emplearse como apoyo, pero los datos publicados deberán quedar vinculados a una fuente oficial y a una versión anual.

### 4.4 Jerarquía de confianza

1. Calendario oficial de guardias del Colegio Oficial de Farmacéuticos de Sevilla.
2. Publicaciones oficiales BOE, BOJA y BOP para festivos.
3. Datos verificados por el Ayuntamiento o por la farmacia para horarios ordinarios y excepciones.
4. Fuentes externas auxiliares, únicamente para detectar posibles cambios pendientes de confirmar.

## 5. Requisitos funcionales

### RF 001 Consulta de farmacias abiertas ahora

La pantalla principal incluirá un botón o acceso destacado **Abiertas ahora**. Al activarlo, el servidor o el cliente calculará la situación usando la zona horaria `Europe/Madrid`.

El resultado mostrará:

- Todas las farmacias de Mairena del Alcor abiertas por horario ordinario.
- La farmacia de guardia vigente, aunque ya esté incluida por horario ordinario.
- Una única tarjeta por farmacia, con varias etiquetas cuando corresponda.
- Las farmacias de otros municipios solo cuando formen parte de la guardia vigente o cuando el usuario amplíe expresamente el ámbito.

Orden de los resultados:

1. Farmacias de Mairena del Alcor de guardia y abiertas.
2. Resto de farmacias abiertas en Mairena del Alcor.
3. Farmacia de guardia de otro municipio, cuando corresponda.

Cada tarjeta incluirá nombre, dirección, municipio, teléfono, estado, motivo de apertura, hora prevista de cierre, botón para llamar y botón para obtener indicaciones.

### RF 002 Cálculo temporal

El motor aplicará estas reglas:

- De 9:30 inclusive a 22:00 no inclusive se considera vigente la guardia diurna de la fecha actual.
- De 22:00 inclusive a 24:00 se considera vigente la guardia nocturna de la fecha actual.
- De 00:00 a 9:30 no inclusive se considera vigente la guardia nocturna iniciada en la fecha anterior.
- Los límites se evaluarán en `Europe/Madrid`, contemplando los cambios de horario de verano e invierno.
- El horario ordinario se evaluará por intervalos y permitirá más de un tramo en el mismo día.
- En festivos se aplicará primero la excepción específica y, si no existe, el horario de festivo. Si no hay horario de festivo confirmado, no se supondrá que la farmacia está abierta.

### RF 003 Vista del día

La vista diaria mostrará:

- Farmacias abiertas ahora.
- Guardia diurna.
- Guardia nocturna.
- Horarios ordinarios del día.
- Indicador de festivo o día especial.
- Fuente y fecha de actualización.

### RF 004 Vista semanal

- Presentará siete días con el día actual centrado inicialmente.
- Permitirá avanzar y retroceder semanas.
- Al seleccionar un día se mostrarán sus guardias y farmacias abiertas por tramos.
- El día actual y los festivos tendrán indicadores visuales y textuales, no dependientes solo del color.

### RF 005 Vista mensual

- Mostrará el mes completo de lunes a domingo.
- Identificará los días con calendario disponible, festivos y fechas sin datos.
- Al pulsar una fecha se abrirá su detalle.
- No se inventarán guardias fuera del intervalo cubierto por el PDF publicado.

### RF 006 Ficha de farmacia

La ficha contendrá:

- Nombre y dirección.
- Teléfono con enlace `tel:`.
- Botón **Cómo llegar** mediante enlace universal de mapas.
- Horario ordinario semanal.
- Horarios especiales conocidos.
- Indicador de guardia cuando proceda.
- Fecha de última verificación del horario.

La geolocalización será opcional y solo se solicitará después de una acción expresa del usuario. La aplicación funcionará completamente sin conceder ubicación.

### RF 007 Instalación PWA

La aplicación deberá:

- Incluir `manifest.webmanifest` con nombre, nombre corto, iconos, colores, idioma y modo `standalone`.
- Disponer de iconos de 192 y 512 píxeles, incluido icono maskable.
- Registrar un service worker seguro y versionado.
- Mostrar instrucciones de instalación adaptadas a Android e iOS cuando el navegador no ofrezca el evento de instalación.
- Mantener disponible sin conexión la interfaz, el directorio y la última versión publicada del calendario.
- Mostrar de forma visible que los datos pueden no estar actualizados cuando se consulta sin conexión.
- Detectar una nueva versión y ofrecer **Actualizar aplicación** sin bloquear la consulta.

### RF 008 Administración

La zona `/admin` requerirá autenticación. No se incluirán credenciales ni secretos en el cliente.

Funciones mínimas:

- Panel de estado de las fuentes.
- Botón **Comprobar actualización del PDF**.
- Botón **Regenerar calendario** cuando exista un PDF nuevo o cuando se autorice un reprocesado.
- Previsualización del calendario extraído.
- Comparación con la versión publicada.
- Gestión del directorio y horarios ordinarios.
- Gestión de festivos y excepciones.
- Publicación, cancelación y restauración de versiones.
- Historial de acciones y errores.

El botón de regeneración solo se renderizará para usuarios autorizados. La API deberá comprobar el permiso en el servidor aunque alguien intente invocarla manualmente.

### RF 009 Regeneración del calendario desde el PDF

El flujo será:

1. Descargar el PDF desde el servidor, nunca directamente desde el navegador del administrador.
2. Validar protocolo HTTPS, dominio permitido, tipo MIME, firma `%PDF`, tamaño máximo y número razonable de páginas.
3. Calcular SHA 256 y registrar `ETag` y `Last-Modified` cuando estén disponibles.
4. Si el hash coincide con el último archivo procesado, informar **No se han detectado cambios**.
5. Guardar el PDF original en almacenamiento de objetos con nombre inmutable.
6. Extraer texto por página. Aplicar OCR solo como alternativa si una página no contiene texto utilizable.
7. Interpretar fechas, turnos, direcciones, teléfonos, titulares y municipios.
8. Normalizar cada farmacia contra el directorio existente.
9. Ejecutar validaciones estructurales y de negocio.
10. Generar una versión candidata sin modificar la publicada.
11. Mostrar diferencias y advertencias al administrador.
12. Exigir confirmación para publicar.
13. Publicar todos los cambios en una única transacción.
14. Invalidar cachés y comunicar a las PWA que existe una nueva versión.

Validaciones obligatorias:

- Intervalo continuo de fechas o huecos expresamente justificados.
- Un turno diurno y uno nocturno por fecha.
- Horas reconocibles y coherentes.
- Farmacias y teléfonos normalizados.
- Detección de nuevas farmacias no presentes en el directorio.
- Detección de cambios de municipio.
- Ausencia de duplicados.
- Fecha inicial no posterior a la final.
- Cobertura mínima configurable.
- Rechazo automático si el porcentaje de registros no reconocidos supera el umbral configurado.

### RF 010 Previsualización y publicación

La pantalla de revisión mostrará:

- Registros añadidos, eliminados y modificados.
- Periodo anterior y nuevo periodo.
- Farmacias nuevas o sin correspondencia.
- Fechas sin turnos.
- Cambios de teléfono, dirección o municipio.
- Advertencias y errores bloqueantes.

Solo podrá publicarse una versión sin errores bloqueantes. Las advertencias requerirán confirmación explícita. La publicación registrará usuario, fecha, hash del PDF, versión anterior, versión nueva y comentario opcional.

### RF 011 Festivos y excepciones

- Importación anual de festivos desde fuentes oficiales o mediante fichero estructurado revisado.
- Clasificación: nacional, autonómico o local.
- Enlace o referencia a la disposición oficial.
- Posibilidad de crear excepciones por farmacia y fecha.
- Precedencia: cierre excepcional, apertura excepcional, horario de festivo, horario ordinario.
- Vista previa del efecto de un festivo sobre **Abiertas ahora**.

### RF 012 Avisos y calidad del dato

La interfaz pública mostrará:

- Última actualización del calendario de guardias.
- Periodo cubierto.
- Última verificación de horarios ordinarios.
- Enlace al PDF oficial utilizado.
- Aviso cuando el calendario esté próximo a caducar.
- Aviso destacado cuando no exista información vigente.
- Medio de contacto municipal para comunicar errores.

## 6. Reglas de negocio

| Código | Regla |
|---|---|
| RN 001 | Una farmacia puede estar abierta por horario ordinario, por guardia o por ambos motivos. |
| RN 002 | La guardia nocturna pertenece a la fecha en la que comienza a las 22:00. |
| RN 003 | Entre 00:00 y 9:29:59 se consulta la guardia nocturna de la fecha anterior. |
| RN 004 | Un festivo no implica automáticamente el cierre de todas las farmacias; se evalúan excepciones y guardia. |
| RN 005 | Un horario no confirmado no permite afirmar que la farmacia está abierta. |
| RN 006 | La farmacia de guardia siempre se presenta, aunque esté en El Viso del Alcor. |
| RN 007 | No se proyectan rotaciones fuera de las fechas publicadas en el PDF. |
| RN 008 | Un PDF nuevo genera una versión candidata; nunca sobrescribe directamente la versión vigente. |
| RN 009 | La versión pública debe poder restaurarse sin reprocesar el PDF. |
| RN 010 | Todas las fechas y horas se almacenan de forma inequívoca y se presentan en `Europe/Madrid`. |

## 7. Arquitectura propuesta

### 7.1 Enfoque

Aplicación web responsive con frontend PWA, API de servidor, base de datos relacional y almacenamiento inmutable de los PDF originales.

Tecnologías de referencia:

- Frontend: Next.js con TypeScript o equivalente mantenible.
- Componentes accesibles y CSS responsive sin dependencia de una aplicación nativa.
- PWA: service worker y Workbox o implementación equivalente.
- Backend: API del propio framework o servicio independiente en TypeScript o Python.
- Extracción: `pdfplumber`, `pypdf` o equivalente; OCR con Tesseract o servicio controlado como alternativa.
- Base de datos: PostgreSQL.
- Almacenamiento de PDF: almacenamiento de objetos compatible con S3 o infraestructura municipal equivalente.
- Autenticación administrativa: proveedor OIDC corporativo, Microsoft Entra ID o sistema municipal existente.
- Despliegue: infraestructura aprobada por el Ayuntamiento, con HTTPS, dominio institucional y monitorización.

Las tecnologías pueden cambiar, pero no deben reducir las garantías funcionales, de seguridad, trazabilidad o accesibilidad establecidas en este documento.

### 7.2 Componentes

1. **Portal público PWA:** consulta de abiertas ahora, guardias, calendario y fichas.
2. **Panel administrativo:** fuentes, regeneración, revisión, publicación y auditoría.
3. **API de consulta:** datos públicos versionados y cálculo de aperturas.
4. **API administrativa:** protegida por autenticación y permisos.
5. **Procesador de PDF:** descarga, extracción, normalización y validación.
6. **Motor temporal:** horarios, guardias, festivos, excepciones y zona horaria.
7. **Base de datos:** directorio, horarios, calendarios, versiones y auditoría.
8. **Almacenamiento de objetos:** PDF originales y resultados de extracción.
9. **Observabilidad:** registros, métricas, alertas y seguimiento de errores.

## 8. Modelo de datos mínimo

### `pharmacies`

- `id` UUID.
- `official_name`.
- `display_name`.
- `owner_name` opcional.
- `address`, `postal_code`, `municipality`.
- `latitude`, `longitude`.
- `phone`.
- `active`.
- `source_type`, `source_reference`.
- `verified_at`, `verified_by`.

### `opening_hour_rules`

- `id`, `pharmacy_id`.
- `valid_from`, `valid_to`.
- `weekday`.
- `opens_at`, `closes_at`.
- `season` opcional.
- `source_reference`.

Debe admitir varios intervalos por día.

### `opening_exceptions`

- `id`, `pharmacy_id`, `date`.
- `type`: closed, special_hours, open_all_day.
- `opens_at`, `closes_at` opcionales.
- `reason`, `source_reference`.

### `holidays`

- `id`, `date`, `name`.
- `scope`: national, regional, local.
- `municipality` cuando proceda.
- `official_source_url`.
- `published_at`, `verified_at`.

### `duty_calendar_versions`

- `id`, `status`: candidate, published, rejected, archived.
- `period_start`, `period_end`.
- `source_url`, `source_sha256`, `etag`, `last_modified`.
- `source_object_key`.
- `parser_version`.
- `created_at`, `created_by`, `published_at`, `published_by`.
- `validation_summary`, `notes`.

### `duty_shifts`

- `id`, `calendar_version_id`, `service_date`.
- `shift_type`: day, night.
- `starts_at`, `ends_at`.
- `pharmacy_id`.
- `raw_text`, `source_page`.

Restricción única por versión, fecha y tipo de turno.

### `audit_events`

- `id`, `occurred_at`, `user_id`, `action`.
- `entity_type`, `entity_id`.
- `before_json`, `after_json`.
- `ip_hash` o información técnica proporcional.
- `result`, `correlation_id`.

## 9. API propuesta

### Pública

- `GET /api/v1/status`
- `GET /api/v1/pharmacies/open-now`
- `GET /api/v1/pharmacies/{id}`
- `GET /api/v1/guards?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/calendar/month/{year}/{month}`
- `GET /api/v1/data-version`

`open-now` devolverá la hora efectiva usada, zona horaria, farmacias, motivo de apertura, hora de cierre prevista y versión de los datos.

### Administrativa

- `POST /api/admin/sources/duty/check`
- `POST /api/admin/sources/duty/regenerate`
- `GET /api/admin/calendar-candidates/{id}`
- `GET /api/admin/calendar-candidates/{id}/diff`
- `POST /api/admin/calendar-candidates/{id}/publish`
- `POST /api/admin/calendar-versions/{id}/restore`
- CRUD de farmacias, horarios, excepciones y festivos.
- `GET /api/admin/audit-events`

Las operaciones mutables exigirán protección CSRF cuando corresponda, autorización en servidor, validación de esquema, registro de auditoría e idempotencia.

## 10. Experiencia de usuario móvil

### 10.1 Pantalla principal

Orden recomendado:

1. Cabecera institucional compacta.
2. Fecha, hora y estado de actualización.
3. Botón principal **Abiertas ahora**.
4. Lista de farmacias abiertas, con etiqueta **De guardia** o **Horario ordinario**.
5. Accesos **Hoy**, **Semana** y **Mes**.
6. Enlace a la fuente oficial y aviso informativo.

### 10.2 Diseño

- El escudo y la identidad visual deberán utilizar los recursos autorizados por Comunicación.
- Se respetará el manual de identidad corporativa municipal.
- No se presentará como una campaña comercial.
- El carácter oficial se reforzará mediante dominio institucional, cabecera y pie municipal, fecha de actualización, fuente visible y datos de contacto.
- El verde farmacéutico puede utilizarse como color funcional, subordinado a la identidad municipal.
- Los botones táctiles tendrán al menos 44 por 44 píxeles CSS.
- La información crítica no dependerá solo del color ni de iconos sin texto.

### 10.3 Estados vacíos y de error

- Sin conexión y con datos almacenados: mostrar última versión y aviso de posible desactualización.
- Sin conexión y sin datos: mostrar teléfono de emergencias correspondiente y enlace no operativo claramente señalado.
- PDF caducado: no afirmar que una farmacia está de guardia fuera del periodo cubierto.
- Horarios ordinarios no verificados: ocultar de **Abiertas ahora** o mostrar **Horario pendiente de confirmar**, pero nunca **Abierta**.
- Error de mapas: mantener dirección copiable y teléfono disponible.

## 11. Imagen institucional y publicación oficial

La aplicación se publicará preferentemente bajo un dominio institucional, por ejemplo:

- `farmacias.mairenadelalcor.es`, o
- una ruta integrada en `mairenadelalcor.org`.

Requisitos:

- HTTPS obligatorio.
- Cabecera con identidad del Ayuntamiento y denominación clara del servicio.
- Pie con aviso legal, privacidad, accesibilidad, contacto y titularidad municipal.
- Declaración de accesibilidad accesible desde todas las pantallas.
- Página **Acerca de los datos** con fuentes, limitaciones y proceso de actualización.
- Fecha y hora de última actualización visibles.
- Enlace al PDF oficial vigente.
- No usar expresiones como **dato oficial del Ayuntamiento** para información no validada o procedente de terceros. Utilizar **servicio informativo municipal basado en la fuente oficial indicada**.

Antes de difundirla deberán aprobarla, al menos, el área responsable del contenido, Informática, Comunicación y las unidades municipales responsables de accesibilidad, protección de datos y seguridad cuando corresponda.

## 12. Accesibilidad, privacidad y seguridad

### 12.1 Accesibilidad

- Cumplimiento del Real Decreto 1112/2018 y del estándar armonizado aplicable.
- Objetivo técnico mínimo: WCAG 2.2 nivel AA.
- Navegación completa por teclado.
- Orden de foco lógico y foco visible.
- Compatibilidad con lector de pantalla.
- Contraste suficiente, zoom al 200 por ciento y diseño adaptable.
- Mensajes de estado anunciados mediante regiones accesibles.
- Formularios con etiquetas, ayuda y errores asociados.
- Declaración de accesibilidad y mecanismo para comunicar incumplimientos.

### 12.2 Privacidad

- La consulta pública no requerirá cuenta ni datos personales.
- La geolocalización será opcional, puntual y no se almacenará por defecto.
- No se incorporará analítica de terceros sin evaluación, base jurídica e información adecuadas.
- Priorizar analítica sin cookies o métricas agregadas alojadas en infraestructura controlada.
- Documentar el tratamiento de datos de los administradores y los periodos de conservación.

### 12.3 Seguridad

- Aplicar análisis de categoría y medidas del Esquema Nacional de Seguridad que determine el Ayuntamiento.
- Autenticación multifactor para administradores cuando el proveedor lo permita.
- Principio de mínimo privilegio.
- Sesiones seguras, expiración, revocación y protección frente a fijación.
- CSP restrictiva, HSTS, protección contra XSS, CSRF, SSRF e inyección.
- Lista cerrada de dominios permitidos para descargar PDF.
- Límites de tamaño, tiempo y recursos para PDF y OCR.
- Dependencias inventariadas y actualizadas.
- Copias de seguridad, restauración probada y registro de incidentes.
- Secretos únicamente en un gestor de secretos.
- Registros sin teléfonos personales, ubicación del usuario ni contenido sensible innecesario.

## 13. Requisitos no funcionales

| Categoría | Requisito |
|---|---|
| Rendimiento | LCP menor de 2,5 segundos en móvil de gama media con conexión 4G razonable. |
| Disponibilidad | Objetivo inicial del 99,5 por ciento mensual, excluido mantenimiento anunciado. |
| Compatibilidad | Dos últimas versiones de Chrome, Edge, Firefox y Safari; Android e iOS vigentes. |
| Escalabilidad | Lecturas públicas cacheables y administración desacoplada del tráfico público. |
| Mantenibilidad | TypeScript estricto o tipado equivalente, pruebas y documentación de decisiones. |
| Observabilidad | Errores, latencia, estado del PDF, caducidad del calendario y fallos de regeneración. |
| Recuperación | RPO máximo 24 horas y RTO objetivo 4 horas para configuración y datos administrativos. |
| Internacionalización | Español en la primera versión, sin impedir traducciones futuras. |
| SEO | Metadatos descriptivos, URL canónica y datos estructurados cuando proceda. |

## 14. Caché y funcionamiento sin conexión

- Cache first para recursos estáticos versionados.
- Network first con timeout para calendarios y directorio, usando la última versión válida como alternativa.
- Nunca cachear respuestas administrativas ni tokens.
- El calendario publicado será inmutable por versión.
- La PWA almacenará el identificador de versión y la fecha de sincronización.
- Si la versión almacenada ha caducado, se mostrará un aviso persistente.
- Tras una publicación, la API actualizará la versión de datos y la PWA invalidará la caché correspondiente.

## 15. Pruebas obligatorias

### 15.1 Motor temporal

- Lunes laborable a las 10:00: aparecen todas las farmacias de Mairena con horario confirmado abierto, además de la etiqueta de guardia correspondiente.
- 9:29: se usa la guardia nocturna iniciada el día anterior.
- 9:30: comienza la guardia diurna del día actual.
- 21:59: continúa la guardia diurna.
- 22:00: comienza la guardia nocturna del día actual.
- 00:00: se mantiene la guardia nocturna de la fecha anterior.
- Domingo, festivo nacional, autonómico y local.
- Cambio al horario de verano y cambio al horario de invierno.
- Farmacia con jornada partida.
- Cierre excepcional y apertura excepcional.

### 15.2 Procesamiento del PDF

- PDF sin cambios.
- PDF válido con nuevo periodo.
- Cambio de formato menor.
- Página sin capa de texto que requiere OCR.
- Fecha duplicada o ausente.
- Teléfono desconocido.
- Nueva farmacia.
- Archivo HTML renombrado como PDF.
- PDF excesivamente grande o corrupto.
- Fallo de red durante la descarga.
- Publicación simultánea por dos administradores.
- Restauración de una versión anterior.

### 15.3 PWA y accesibilidad

- Instalación en Android y guía de instalación en iOS.
- Inicio en modo standalone.
- Consulta sin conexión con aviso.
- Actualización del service worker.
- Navegación por teclado y lector de pantalla.
- Contraste, reflujo, zoom y orientación.
- Objetivos táctiles y mensajes dinámicos.

## 16. Criterios de aceptación

1. A una hora y fecha dadas, el sistema identifica correctamente la guardia vigente y las farmacias abiertas por horario ordinario.
2. Las guardias nocturnas entre 00:00 y 9:30 se atribuyen a la fecha de inicio correcta.
3. Los festivos modifican la evaluación de horarios sin eliminar la guardia.
4. El usuario distingue claramente **De guardia** de **Abierta por horario ordinario**.
5. El calendario no ofrece predicciones fuera del periodo publicado.
6. La PWA se instala y funciona con la última versión publicada sin conexión.
7. Un usuario público no puede acceder a funciones administrativas.
8. El administrador puede detectar, procesar, revisar y publicar un PDF nuevo.
9. La regeneración conserva el PDF original, el hash, los resultados y la auditoría.
10. Una versión con errores bloqueantes no puede publicarse.
11. Se puede restaurar una versión anterior.
12. La interfaz cumple las comprobaciones de accesibilidad acordadas.
13. La aplicación muestra identidad municipal, fuente, vigencia y fecha de actualización.

## 17. Despliegue y operación

Entornos separados:

- Desarrollo.
- Preproducción para validación funcional y de contenido.
- Producción.

El despliegue a producción requerirá:

- Pruebas automatizadas superadas.
- Migraciones verificadas y reversibles.
- Revisión de seguridad de cabeceras y dependencias.
- Validación del área responsable del contenido.
- Comprobación de accesibilidad.
- Copia previa y plan de reversión.

Alertas recomendadas:

- El calendario caduca en 14, 7, 3 y 1 día.
- El PDF oficial ha cambiado.
- La extracción ha fallado.
- Hay una versión candidata pendiente.
- El endpoint público no responde.
- Se ha producido un error repetido en el cálculo de aperturas.

La comprobación programada del PDF puede generar una alerta, pero no publicará automáticamente el contenido.

## 18. Fases de implementación

### Fase 0 Descubrimiento y datos

- Confirmar responsables municipales.
- Reunir imagen corporativa y dominio.
- Verificar directorio y horarios de todas las farmacias.
- Definir autenticación administrativa.
- Recopilar festivos y fuentes oficiales.

### Fase 1 MVP público

- Directorio, guardias, abiertas ahora, semana, mes, llamada y mapas.
- PWA instalable y modo sin conexión.
- Fuente y vigencia visibles.

### Fase 2 Administración

- Autenticación y roles.
- Regeneración, validación, diferencias, publicación y restauración.
- Gestión de horarios, festivos y excepciones.
- Auditoría.

### Fase 3 Oficialización

- Integración visual municipal.
- Auditoría de accesibilidad y seguridad.
- Dominio institucional, aviso legal y declaración de accesibilidad.
- Preproducción, validación de contenido y publicación.

### Fase 4 Operación y mejora

- Alertas de caducidad y cambios del PDF.
- Métricas agregadas respetuosas con la privacidad.
- Revisión periódica de horarios y fuentes.

## 19. Entregables del agente programador

- Código fuente y scripts de despliegue.
- Migraciones y modelo de datos.
- Parser del PDF con pruebas y muestras anonimizadas cuando proceda.
- PWA completa con iconos y manifiesto.
- Panel administrativo.
- Suite de pruebas unitarias, integración, extremo a extremo y accesibilidad.
- Documentación de instalación, configuración, copia y restauración.
- Manual breve de administración y regeneración.
- Registro de decisiones arquitectónicas.
- Inventario de componentes y dependencias.
- Informe de cumplimiento de criterios de aceptación.

## 20. Fuentes normativas y operativas de referencia

- Calendario oficial de farmacias de guardia: <https://servicios.farmaceuticosdesevilla.es/images/farmaciasguardia/T4/mairenadelalcor.pdf>
- Área de Salud del Ayuntamiento de Mairena del Alcor: <https://www.mairenadelalcor.org/es/salud/>
- Boletín Oficial de la Junta de Andalucía: <https://www.juntadeandalucia.es/eboja.html>
- Boletín Oficial de la Provincia de Sevilla: <https://bopsevilla.dipusevilla.es/>
- Boletín Oficial del Estado: <https://www.boe.es/>
- Real Decreto 1112/2018 sobre accesibilidad: <https://www.boe.es/eli/es/rd/2018/09/07/1112>
- WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
- Real Decreto 311/2022 por el que se regula el Esquema Nacional de Seguridad: <https://www.boe.es/eli/es/rd/2022/05/03/311>
- Orientaciones de la AEPD sobre cookies y analítica web en las Administraciones Públicas: <https://www.aepd.es/documento/orientaciones-analitica-web-aapp.pdf>

## 21. Instrucción final para el agente programador

Implementa el sistema de forma incremental. Comienza por el modelo de datos, el motor temporal y las pruebas de límites horarios. Continúa con la extracción versionada del PDF y sus validaciones. Construye después la experiencia móvil y la PWA. Añade el panel administrativo cuando el flujo público sea correcto. No publiques datos inferidos, horarios sin verificar ni calendarios fuera del periodo oficial. Toda modificación de datos públicos debe conservar fuente, versión, usuario y fecha.
