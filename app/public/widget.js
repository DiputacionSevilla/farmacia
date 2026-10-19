/*!
 * Widget "Farmacia de guardia" — Ayuntamiento de Mairena del Alcor.
 *
 * Uso (en la web municipal, p. ej. un elemento "HTML" de OpenCms):
 *
 *   <div id="farmacias-guardia"></div>
 *   <script src="https://farmacias.mairenadelalcor.net/widget.js" async></script>
 *
 * Crea un iframe accesible hacia /widget y lo ajusta a la altura del
 * contenido. No depende de ninguna librería ni de estilos de la página
 * anfitriona.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : "";
  if (!origin) return;

  var host =
    document.getElementById("farmacias-guardia") ||
    (script && script.parentNode);
  if (!host) return;

  var frame = document.createElement("iframe");
  frame.src = origin + "/widget";
  frame.title = "Farmacia de guardia en Mairena del Alcor";
  frame.loading = "lazy";
  frame.style.cssText =
    "width:100%;max-width:560px;height:420px;border:0;display:block;";
  host.appendChild(frame);

  window.addEventListener("message", function (event) {
    if (event.origin !== origin || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (
      data &&
      data.type === "farmacias-guardia-widget:height" &&
      typeof data.height === "number"
    ) {
      frame.style.height = Math.ceil(data.height) + "px";
    }
  });
})();
