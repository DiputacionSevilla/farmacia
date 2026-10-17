/**
 * Respaldo OCR para páginas del PDF de guardias sin capa de texto nativa
 * (Anexo SDD — Descubrimiento y extracción híbrida, §5).
 *
 * Renderiza la página a 300 ppp con `@napi-rs/canvas` (binario precompilado,
 * sin dependencias nativas que compilar) y la reconoce con Tesseract.js
 * usando el modelo de español empaquetado en `resources/tessdata`, para
 * poder operar sin salida a internet en producción.
 */

import path from "node:path";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { createCanvas } from "@napi-rs/canvas";

const RENDER_DPI = 300;
const PDF_BASE_DPI = 72;

function tessdataPath(): string {
  return process.env.TESSDATA_PATH ?? path.join(process.cwd(), "resources", "tessdata");
}

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("spa", 1, {
      langPath: tessdataPath(),
      gzip: false,
    }).then(async (worker) => {
      // SINGLE_COLUMN captura de forma más fiable el título y los bloques de
      // texto en columna que el modo automático con este diseño de tabla.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
      return worker;
    });
  }
  return workerPromise;
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

export interface OcrPageResult {
  text: string;
  confidence: number;
}

/** Renderiza y aplica OCR a una página de pdf.js (API `legacy/build/pdf.mjs`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ocrPdfPage(page: any): Promise<OcrPageResult> {
  const scale = RENDER_DPI / PDF_BASE_DPI;
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const png = canvas.toBuffer("image/png");

  const worker = await getWorker();
  const { data } = await worker.recognize(png);
  return { text: data.text, confidence: data.confidence };
}
