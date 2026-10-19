# Integración del widget "Farmacia de guardia" en la web municipal (OpenCms)

El widget es una vista resumida de la pantalla principal pensada para una
consulta rápida en una urgencia: **farmacia de guardia ahora** (nombre,
dirección, hasta qué hora, botón *Llamar* y *Cómo llegar*), hasta 4 farmacias
más abiertas, enlace al calendario completo y el 112.

- URL del widget: `https://farmacias.mairenadelalcor.net/widget`
- Script de inserción: `https://farmacias.mairenadelalcor.net/widget.js`
- Se actualiza solo (cada 5 min y al volver a la pestaña), así que no muestra
  una guardia vieja tras el cambio de turno de las 9:30 / 22:00.
- No hay nada que mantener en OpenCms: los datos viven en esta aplicación.

## 1. Opción recomendada: script de una línea

En OpenCms, en el elemento de contenido **HTML / Código fuente** (el que admite
`<script>`), pegar:

```html
<div id="farmacias-guardia"></div>
<script src="https://farmacias.mairenadelalcor.net/widget.js" async></script>
<noscript>
  <a href="https://farmacias.mairenadelalcor.net/">Consultar la farmacia de guardia</a>
</noscript>
```

El script crea un iframe accesible (con `title`) que ajusta su altura al
contenido. No depende de estilos ni librerías de la web municipal.

## 2. Alternativa sin JavaScript (si el editor filtra `<script>`)

```html
<iframe src="https://farmacias.mairenadelalcor.net/widget"
        title="Farmacia de guardia en Mairena del Alcor"
        width="100%" height="460" style="border:0;max-width:560px" loading="lazy">
  <a href="https://farmacias.mairenadelalcor.net/">Consultar la farmacia de guardia</a>
</iframe>
```

Altura fija: si hay varias farmacias de guardia o abiertas puede quedar algo
justa; con la opción 1 se ajusta sola.

## 3. Dónde colocarlo para que sea fácil de localizar

Recomendación (de más a menos importante):

1. **Portada, columna lateral o bloque "Servicios rápidos"**, por encima del
   pliegue en móvil. Es donde un ciudadano con prisa mirará primero.
2. **Una página propia con URL estable**, p. ej.
   `/servicios/farmacias-de-guardia`, con el widget y un enlace destacado a la
   aplicación completa. Sirve para buscadores, para el menú y para QR/carteles.
3. **Enlace permanente en cabecera o menú principal**: "Farmacia de guardia"
   hacia esa página. En OpenCms basta con una entrada de navegación, no hace
   falta tocar la plantilla.
4. (Opcional) Un banner/atajo en la portada con el icono de cruz de farmacia
   que apunte a la misma página.

Para que quede en todas las páginas, lo ideal es un **elemento de plantilla
(formato/contenedor compartido)** de la portada en vez de pegarlo página a
página; así hay un único punto de edición.

## 4. Requisitos de seguridad / red

| Dónde | Qué hacer |
|---|---|
| Esta app (`.env` del CPD) | `WIDGET_FRAME_ANCESTORS` = dominio(s) reales de la web municipal, separados por espacios. Por defecto: `https://www.mairenadelalcor.es https://mairenadelalcor.es` (**confirmar**). Tras cambiarlo: `docker compose up -d` (se lee en runtime, no hace falta reconstruir). |
| Nginx Proxy Manager | No añadir `X-Frame-Options` ni otra CSP para `/widget`; si el proxy host las añade globalmente, el iframe quedará bloqueado. |
| OpenCms (si tiene CSP propia) | Permitir `https://farmacias.mairenadelalcor.net` en `script-src` y `frame-src`. |

Solo `/widget` se puede incrustar; el resto de la aplicación sigue con
`X-Frame-Options: DENY`.

## 5. Comprobación tras publicarlo

1. Abrir la página de OpenCms: se ve la tarjeta de guardia, sin barras de scroll.
2. Si sale un recuadro vacío/bloqueado: abrir la consola del navegador; un
   error `frame-ancestors` indica que `WIDGET_FRAME_ANCESTORS` no incluye el
   dominio exacto (con `www` o sin él, `https`).
3. Probar el botón *Llamar* en un móvil y *Cómo llegar*.
4. Cambiar la hora del sistema o esperar a las 9:30/22:00 y comprobar que
   cambia el turno.
