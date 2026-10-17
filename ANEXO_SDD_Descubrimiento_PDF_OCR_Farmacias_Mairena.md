# Anexo al SDD - Descubrimiento trimestral y extracción híbrida de los PDF de farmacias de guardia

**Proyecto:** PWA de farmacias de guardia de Mairena del Alcor  
**Documento relacionado:** SDD inicial de la aplicación  
**Versión del anexo:** 1.0  
**Fecha de verificación:** 17 de octubre de 2026  
**Estado:** Requisitos obligatorios para incorporar al desarrollo

## 1. Objeto del anexo

Este anexo amplía y, cuando exista contradicción, **prevalece sobre el SDD inicial** en todo lo relacionado con:

- Localización del PDF oficial más reciente.
- Tratamiento de los códigos `T1`, `T2`, `T3` y `T4` de la URL.
- Determinación del periodo y año efectivos del documento.
- Detección de páginas sin texto extraíble.
- Aplicación selectiva de OCR.
- Validación, revisión y publicación de una regeneración.

El objetivo es impedir que una actualización incompleta o una extracción parcial deje días sin farmacia de guardia o publique datos incorrectos.

## 2. Fuente oficial examinada

Patrón observado:

```text
https://servicios.farmaceuticosdesevilla.es/images/farmaciasguardia/{TRIMESTRE}/mairenadelalcor.pdf
```

Valores candidatos:

```text
T1
T2
T3
T4
```

Ejemplo examinado:

```text
https://servicios.farmaceuticosdesevilla.es/images/farmaciasguardia/T4/mairenadelalcor.pdf
```

Durante la verificación se comprobó que las cuatro rutas `T1`, `T2`, `T3` y `T4` responden con documentos PDF. El documento `T4` disponible el 17 de octubre de 2026 contiene el calendario correspondiente al cuarto trimestre de 2026.

### 2.1. Conclusión sobre el código trimestral

El segmento `T1`-`T4` debe tratarse como un **localizador trimestral**, no como una URL fija. Sin embargo, ni el trimestre ni el año deben darse por válidos únicamente a partir de la URL, porque esta no contiene el año y previsiblemente se reutiliza o sobrescribe.

> El trimestre de la URL permite localizar documentos candidatos; el periodo y el año efectivos deben obtenerse siempre del contenido del PDF.

## 3. Nueva lógica de descubrimiento del PDF

### 3.1. Requisito funcional RF-ANX-001

Antes de iniciar una regeneración, el backend generará y comprobará las cuatro URL candidatas correspondientes a `T1`, `T2`, `T3` y `T4`.

Para cada respuesta deberá verificar:

1. Código HTTP satisfactorio.
2. Tipo MIME compatible con PDF.
3. Cabecera binaria `%PDF`.
4. Posibilidad de apertura mediante una biblioteca PDF.
5. Número de páginas mayor que cero.
6. Hash SHA-256 del contenido.
7. Periodo inicial y final obtenido del documento.

No se considerará válido un archivo solo porque la petición devuelva `200 OK`.

### 3.2. Selección de documentos

El sistema distinguirá los conceptos siguientes:

- **Documento vigente:** contiene la fecha actual dentro de su periodo.
- **Documento futuro:** su periodo comienza después de la fecha actual.
- **Documento más reciente publicado:** tiene la fecha final más alta entre los PDF válidos.
- **Documento ya importado:** su SHA-256 coincide con una importación anterior.

Si el trimestre siguiente se publica anticipadamente, podrá importarse como borrador, pero no deberá desplazar los datos vigentes antes de que comience su periodo.

En el cambio anual `T4` a `T1`, el año se deducirá de las fechas extraídas del contenido, nunca de la fecha del servidor ni del nombre de la carpeta.

### 3.3. Metadatos mínimos de la fuente

La importación deberá conservar, al menos:

```text
source_url
quarter_code
period_start
period_end
sha256
etag
last_modified
downloaded_at
page_count
native_text_pages
ocr_pages
failed_pages
import_status
parser_version
ocr_version
```

`etag` y `last_modified` serán opcionales cuando el servidor no los proporcione. El SHA-256 será obligatorio.

## 4. Evidencia de páginas no extraíbles

El PDF `T4` examinado tiene **12 páginas**. La extracción convencional recupera texto de 10 páginas, pero omite por completo dos páginas intermedias:

| Página visible | Periodo semanal | Extracción de texto | Tratamiento necesario |
|---:|---|---|---|
| 4 | 26/10/2026-01/11/2026 | Sin contenido útil | OCR |
| 5 | 02/11/2026-08/11/2026 | Sin contenido útil | OCR |

Las dos páginas se visualizan correctamente y contienen la misma estructura de turnos que las demás, pero carecen de una capa de texto utilizable por el extractor probado. Técnicamente pueden ser páginas escaneadas o páginas insertadas como imagen.

Por tanto, una extracción exclusivamente basada en `pypdf`, `pdfplumber`, `PyMuPDF` u otra biblioteca de lectura de texto perdería **14 días completos**, comprendidos entre el 26 de octubre y el 8 de noviembre de 2026.

## 5. Extracción híbrida por página

### 5.1. Requisito funcional RF-ANX-002

La importación será híbrida y se ejecutará individualmente sobre cada página:

1. Intentar extracción de texto nativo.
2. Evaluar si el resultado es suficiente y coherente.
3. Cuando no lo sea, renderizar únicamente esa página como imagen.
4. Aplicar OCR configurado para español.
5. Normalizar el texto resultante.
6. Parsear los turnos.
7. Aplicar las mismas validaciones estructurales y de negocio, con independencia del método usado.

No se aplicará OCR a todo el documento de manera predeterminada. El texto nativo debe preferirse porque es más rápido y normalmente produce menos errores en nombres, teléfonos y direcciones.

### 5.2. Criterios para activar OCR

Una página se enviará a OCR cuando se cumpla cualquiera de estas condiciones:

- Texto vacío o por debajo de un umbral configurable.
- No se detecta ningún día de la semana.
- No aparecen las etiquetas `Día` y `Noche` o sus variantes normalizadas.
- No puede obtenerse el intervalo semanal.
- Se detectan menos de siete fechas o menos de siete bloques diarios.
- El texto presenta una proporción anómala de caracteres ilegibles.
- El parser no consigue producir registros válidos a partir del texto extraído.

No debe usarse solamente el número de caracteres como criterio. Una página podría contener encabezados o pies extraíbles mientras el cuerpo principal permanece como imagen.

### 5.3. Recomendaciones técnicas para OCR

- Renderizado mínimo recomendado: **300 ppp**.
- Idioma OCR: español (`spa`), con soporte adicional para caracteres latinos.
- Aplicar corrección de inclinación y mejora de contraste cuando sea necesario.
- Mantener una copia temporal de la imagen solo durante el procesamiento.
- Registrar el motor, versión, resolución y puntuación de confianza.
- No registrar imágenes ni contenido completo del PDF en logs generales.

Puede utilizarse Tesseract OCR u otro motor equivalente. La elección concreta queda abierta, siempre que se satisfagan los criterios de aceptación.

### 5.4. Normalización posterior

El normalizador deberá contemplar, como mínimo:

- Mayúsculas, minúsculas y tildes en días de la semana.
- Diferencias entre guion, raya y separadores similares.
- Espacios duplicados y saltos de línea internos.
- Teléfonos con puntos, espacios o grupos separados.
- Confusiones OCR habituales entre `0/O`, `1/I/l`, `5/S` y `8/B`.
- Abreviaturas como `Avda.`, `c/`, `s/n`, `Ma.`, `Mª` y equivalentes.

Las correcciones no podrán alterar silenciosamente nombres o direcciones si existe ambigüedad. Los resultados dudosos deberán quedar marcados para revisión.

## 6. Validaciones obligatorias

### 6.1. Validación por página semanal

Para considerar una página válida deberán comprobarse:

- Siete días consecutivos, salvo que se justifique documentalmente una estructura diferente.
- Un bloque diurno y uno nocturno por cada fecha.
- Correspondencia entre día de la semana y fecha calendario.
- Intervalo semanal coherente con la primera y última fecha.
- Nombre de farmacia o titular, dirección y teléfono cuando figuren en el documento.
- Ausencia de fechas duplicadas dentro de la misma importación.

### 6.2. Validación global del trimestre

Antes de permitir la publicación se comprobará:

- Continuidad de fechas entre páginas consecutivas.
- Ausencia de días sin turnos.
- Ausencia de solapamientos incompatibles.
- Correspondencia del periodo con el trimestre localizado, admitiendo semanas que crucen de mes o año cuando el documento oficial así lo haga.
- Número de registros esperado para el intervalo detectado.
- Existencia de al menos una farmacia de guardia diurna y otra nocturna por fecha.
- Coherencia entre los registros importados y los ya publicados en las fechas solapadas.

Una importación no podrá publicarse si tiene páginas fallidas, fechas ausentes o errores de validación críticos.

### 6.3. Validación de farmacias de Mairena y municipios relacionados

El parser deberá conservar el municipio asociado a cada farmacia. No debe asumir que todas las guardias nocturnas pertenecen a Mairena del Alcor, pues el documento puede derivarlas a El Viso del Alcor u otra localidad del ámbito de guardia.

La aplicación podrá priorizar visualmente Mairena del Alcor, pero no modificará el municipio indicado por la fuente oficial.

## 7. Flujo administrativo de regeneración

El botón restringido al administrador se denominará preferentemente **“Buscar y regenerar desde la fuente oficial”** y ejecutará estas fases:

1. Buscar los PDF trimestrales candidatos.
2. Validarlos y extraer sus periodos.
3. Informar de cuál está vigente, cuál es el más reciente y cuáles ya fueron importados.
4. Permitir seleccionar el documento propuesto o cancelar.
5. Descargarlo y calcular su SHA-256.
6. Extraer cada página mediante texto nativo u OCR.
7. Ejecutar las validaciones.
8. Generar una versión en estado `DRAFT`.
9. Mostrar un resumen y las diferencias respecto a la versión publicada.
10. Exigir confirmación administrativa para publicar.

La búsqueda, descarga o extracción no publicará directamente los cambios.

### 7.1. Resumen mínimo para el administrador

```text
Fuente oficial: [URL]
Trimestre localizado: T4
Periodo detectado: 05/10/2026-27/12/2026
Hash: [SHA-256]
Páginas totales: 12
Páginas con texto nativo: 10
Páginas procesadas mediante OCR: 2
Páginas con error: 0
Días importados: 84
Advertencias: [número]
Errores críticos: [número]
Estado propuesto: BORRADOR VALIDADO / REQUIERE REVISIÓN
```

Los valores anteriores describen el resultado esperado para el PDF examinado, pero deberán calcularse dinámicamente en cada regeneración.

## 8. Estados y auditoría

Estados recomendados:

```text
DISCOVERED
DOWNLOADED
EXTRACTING
VALIDATING
DRAFT
REVIEW_REQUIRED
VALIDATED
PUBLISHED
REJECTED
FAILED
```

El sistema conservará:

- Administrador que inició la operación.
- Fechas y horas de cada transición.
- Fuente y hash del documento.
- Método de extracción por página.
- Advertencias y errores encontrados.
- Cambios efectuados antes de publicar.
- Administrador que aprobó la publicación.
- Versión anterior para permitir reversión.

## 9. Requisitos de seguridad

- Solo el backend podrá descargar y procesar el PDF.
- El dominio de descarga estará incluido en una lista cerrada de orígenes permitidos.
- No se aceptarán URL arbitrarias introducidas por el usuario.
- Se establecerán límites de tamaño, tiempo de descarga, páginas y memoria.
- El archivo se procesará como contenido no confiable.
- La regeneración y publicación requerirán rol administrativo.
- La publicación será una operación transaccional: o se publica la versión completa o se conserva íntegramente la anterior.

## 10. Criterios de aceptación

### CA-ANX-001 - Descubrimiento trimestral

El sistema consulta `T1`-`T4`, identifica los PDF válidos y determina sus periodos a partir del contenido.

### CA-ANX-002 - No confiar en el año de la URL

La aplicación obtiene el año de las fechas internas y gestiona correctamente el cambio `T4` a `T1`.

### CA-ANX-003 - Detección de páginas sin texto

Con el PDF `T4` verificado, el sistema identifica las páginas visibles 4 y 5 como páginas que requieren OCR.

### CA-ANX-004 - Recuperación mediante OCR

La importación recupera los turnos del 26/10/2026 al 08/11/2026 sin dejar huecos ni duplicados.

### CA-ANX-005 - Extracción selectiva

Las diez páginas con texto nativo se procesan sin OCR y las dos páginas problemáticas se procesan mediante OCR.

### CA-ANX-006 - Bloqueo por calendario incompleto

Si se elimina, daña o no puede interpretarse una página, la importación queda en `REVIEW_REQUIRED` o `FAILED` y no puede publicarse.

### CA-ANX-007 - Detección de documento sin cambios

Si el SHA-256 coincide con un documento ya importado, el sistema informa de que no existen cambios y evita una regeneración duplicada, salvo ejecución forzada y auditada.

### CA-ANX-008 - Publicación revisable y reversible

La importación se crea como borrador, muestra diferencias y solo se publica mediante confirmación administrativa. La versión anterior continúa disponible para reversión.

## 11. Casos de prueba mínimos

| ID | Escenario | Resultado esperado |
|---|---|---|
| CP-01 | Las cuatro URL responden con PDF | Se analizan los cuatro documentos y se muestran sus periodos |
| CP-02 | Una ruta devuelve HTML con código 200 | Se rechaza como PDF inválido |
| CP-03 | El PDF es idéntico al ya importado | Se detecta por SHA-256 y no se duplica |
| CP-04 | Página con texto nativo completo | Se procesa como `TEXT` |
| CP-05 | Página visible sin capa de texto | Se procesa como `OCR` |
| CP-06 | Página con pie extraíble y cuerpo como imagen | Se activa OCR por incumplir la estructura esperada |
| CP-07 | OCR confunde un teléfono | Se normaliza si es inequívoco o se marca para revisión |
| CP-08 | Falta un día entre dos páginas | Se bloquea la publicación |
| CP-09 | T1 contiene fechas del nuevo año | Se toma el año del contenido y se mantiene continuidad con T4 |
| CP-10 | Se publica anticipadamente el trimestre siguiente | Se importa como borrador futuro sin retirar el calendario vigente |
| CP-11 | Fallo durante la publicación | Se conserva completa la versión publicada anterior |
| CP-12 | Usuario no administrador intenta regenerar | Acceso denegado y evento auditado |

## 12. Definición de terminado

Esta ampliación podrá considerarse terminada cuando:

- La URL deje de estar fijada exclusivamente a `T4`.
- El descubridor trimestral esté cubierto por pruebas automatizadas.
- La extracción se realice y registre por página.
- Exista un respaldo OCR selectivo.
- El PDF `T4` de referencia produzca un calendario continuo, incluyendo las dos páginas problemáticas.
- Los errores críticos bloqueen la publicación.
- El administrador disponga de resumen, advertencias y comparación antes de publicar.
- Se conserven fuente, hash, auditoría y versión anterior.
- Existan pruebas unitarias, de integración y de extremo a extremo para los casos de aceptación descritos.

## 13. Prioridad de implementación

Los requisitos de este anexo se consideran **prioridad alta y previos a la puesta en producción pública**, debido a que la aplicación se difundirá desde canales oficiales del Ayuntamiento y la ausencia o atribución incorrecta de una farmacia de guardia podría afectar directamente a la ciudadanía.
