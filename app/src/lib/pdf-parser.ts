/**
 * Extracción y normalización del calendario de guardias (RF009; ampliado
 * por el Anexo SDD de descubrimiento trimestral y extracción híbrida).
 *
 * Interpreta el formato del PDF publicado por el Real e Ilustre Colegio
 * Oficial de Farmacéuticos de Sevilla para Mairena del Alcor: una tabla por
 * semana con un encabezado "Farmacias de Guardia de MAIRENA DEL ALCOR desde
 * DD-mmm-YYYY hasta el DD-mmm-YYYY" seguida de bloques "LUNES N" / "Día
 * (...)" / "Noche (...)" con el formato de entrada:
 *   "<dirección> (<teléfono>) - <titular>"
 * o, para guardias fuera del municipio:
 *   "El Viso del Alcor - <dirección> (<teléfono>) - <titular>"
 *
 * Extracción híbrida por página (Anexo §5): se intenta primero el texto
 * nativo de la página; si no contiene una tabla reconocible, se renderiza
 * la página como imagen y se aplica OCR (español). En el texto reconocido
 * por OCR las casillas de día de la semana ("LUNES 26"...) no siempre se
 * reconocen de forma fiable (comprobado empíricamente), así que en modo OCR
 * las fechas se derivan secuencialmente a partir del periodo del
 * encabezado (que sí se reconoce con fiabilidad) en vez de confiar en el
 * número de día leído por OCR — evita atribuir una guardia a una fecha
 * equivocada por una confusión de dígitos del motor de OCR.
 */

import { DateTime } from "luxon";
import { ocrPdfPage, terminateOcrWorker } from "./pdf-ocr";

// pdfjs-dist no publica tipos CJS limpios para el build "legacy"; se carga
// de forma perezosa y se tipa mínimamente aquí.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsModule = any;

let pdfjsModulePromise: Promise<PdfJsModule> | null = null;
function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsModulePromise;
}

const MONTHS_ES: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

const WEEKDAY_NAMES = [
  "LUNES",
  "MARTES",
  "MIÉRCOLES",
  "JUEVES",
  "VIERNES",
  "SÁBADO",
  "DOMINGO",
];

const HEADER_RE =
  /Farmacias de Guardia de MAIRENA DEL ALCOR desde (\d{2})-(\w{3})-(\d{4}) hasta el (\d{2})-(\w{3})-(\d{4})/i;

const DAY_HEADER_RE = new RegExp(
  `^(${WEEKDAY_NAMES.join("|")}) (\\d{1,2})$`,
  "i"
);

// Versión tolerante, solo para decidir dónde termina una entrada: el OCR
// puede añadir ruido tras el número de día (p. ej. el borde de la casilla
// reconocido como "|"), por lo que aquí no se exige fin de línea exacto.
const DAY_HEADER_PREFIX_RE = new RegExp(
  `^(${WEEKDAY_NAMES.join("|")}) \\d{1,2}\\b`,
  "i"
);

const DAY_BLOCK_RE = /^Día\s*\(/i;
const NIGHT_BLOCK_RE = /^Noche\s*\(/i;
const ENTRY_RE = /^(.*?)\s*\((\d[\d.]*\d)\)\s*-\s*(.*)$/;

export type ExtractionMethod = "native" | "ocr" | "failed";

export interface ParsedShiftCandidate {
  date: string; // ISO YYYY-MM-DD
  shiftType: "day" | "night";
  municipality: string;
  address: string;
  phone: string; // solo dígitos
  owner: string;
  sourcePage: number;
  rawText: string;
  extractionMethod: ExtractionMethod;
}

export interface PageExtractionResult {
  pageNumber: number;
  hasExtractableText: boolean;
  extractionMethod: ExtractionMethod;
  ocrConfidence: number | null;
  shifts: ParsedShiftCandidate[];
  warnings: string[];
}

export interface PdfExtractionResult {
  pages: PageExtractionResult[];
  shifts: ParsedShiftCandidate[];
  periodStart: string | null;
  periodEnd: string | null;
  pagesNeedingManualReview: number[];
  nativeTextPageCount: number;
  ocrPageCount: number;
  failedPageCount: number;
  errors: string[];
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function parsePeriodHeader(lines: string[]): {
  startDay: number;
  startMonth: number;
  startYear: number;
  endDay: number;
  endMonth: number;
  endYear: number;
} | null {
  const headerLine = lines.find((l) => HEADER_RE.test(l));
  if (!headerLine) return null;
  const h = headerLine.match(HEADER_RE)!;
  return {
    startDay: Number(h[1]),
    startMonth: MONTHS_ES[h[2].toLowerCase()],
    startYear: Number(h[3]),
    endDay: Number(h[4]),
    endMonth: MONTHS_ES[h[5].toLowerCase()],
    endYear: Number(h[6]),
  };
}

function parseEntry(
  raw: string,
  date: string,
  shiftType: "day" | "night",
  pageNumber: number,
  municipality: string,
  extractionMethod: ExtractionMethod
): ParsedShiftCandidate | null {
  // El carácter de casilla "□" usa una fuente de símbolos embebida que
  // pdf.js decodifica como un carácter Unicode arbitrario seguido de un
  // carácter de control (p. ej. "Ŀ\u0003"). Se elimina todo prefijo hasta
  // el primer carácter de control, y si no hay ninguno, cualquier símbolo
  // no alfanumérico inicial (incluye el "o" suelto que produce el OCR).
  let s = raw;
  const controlCharMatch = s.slice(0, 4).match(/[\x00-\x1F\x7F]/);
  if (controlCharMatch) {
    s = s.slice(s.indexOf(controlCharMatch[0]) + 1);
  }
  s = s.replace(/^[^\p{L}\d]+/u, "").trim();
  let entryMunicipality = municipality;
  if (s.startsWith("El Viso del Alcor")) {
    entryMunicipality = "El Viso del Alcor";
    s = s.replace(/^El Viso del Alcor\s*-\s*/, "");
  }
  const match = s.match(ENTRY_RE);
  if (!match) return null;
  const [, address, phone, owner] = match;
  const digits = phone.replace(/\D/g, "");
  return {
    date,
    shiftType,
    municipality: entryMunicipality,
    address: address.trim().replace(/,$/, ""),
    phone: digits,
    owner: owner.trim(),
    sourcePage: pageNumber,
    rawText: raw,
    extractionMethod,
  };
}

/**
 * Agrupa las líneas de texto de una página reconstruyendo entradas que
 * pdf.js puede partir en varios "items" de texto.
 */
function extractLines(textItems: Array<{ str: string; hasEOL?: boolean }>): string[] {
  const lines: string[] = [];
  let current = "";
  for (const item of textItems) {
    current += item.str;
    if (item.hasEOL) {
      if (current.trim()) lines.push(current.trim());
      current = "";
    } else if (!item.str.endsWith(" ")) {
      current += " ";
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

interface RawBlock {
  shiftType: "day" | "night";
  entry: string;
  /** Línea en la que empezó el bloque "Día ("/"Noche (", útil para saber si
   * hay un encabezado de día de la semana justo antes. */
  index: number;
}

/**
 * Recorre las líneas de una página y agrupa cada bloque "Día ("/"Noche ("
 * con su entrada (posiblemente repartida en varias líneas físicas), sin
 * asignar todavía una fecha — ese paso depende del modo de extracción.
 */
function collectBlocks(lines: string[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isDay = DAY_BLOCK_RE.test(line);
    const isNight = NIGHT_BLOCK_RE.test(line);
    if (!isDay && !isNight) continue;

    let j = i + 1;
    let entry = j < lines.length ? lines[j] : "";
    while (
      j + 1 < lines.length &&
      !DAY_HEADER_PREFIX_RE.test(lines[j + 1]) &&
      !DAY_BLOCK_RE.test(lines[j + 1]) &&
      !NIGHT_BLOCK_RE.test(lines[j + 1]) &&
      !HEADER_RE.test(lines[j + 1])
    ) {
      j++;
      entry += " " + lines[j];
    }
    blocks.push({ shiftType: isDay ? "day" : "night", entry, index: i });
    i = j;
  }
  return blocks;
}

/** Extracción nativa: usa los encabezados "LUNES N" para fechar cada bloque. */
function parseNativePage(
  pageNumber: number,
  lines: string[],
  municipality: string
): PageExtractionResult {
  const warnings: string[] = [];
  const header = parsePeriodHeader(lines);
  if (!header) {
    return {
      pageNumber,
      hasExtractableText: lines.length > 0,
      extractionMethod: "failed",
      ocrConfidence: null,
      shifts: [],
      warnings,
    };
  }

  const dateByLineIndex = new Map<number, string>();
  let currentDate: string | null = null;
  let currentYear = header.startYear;
  for (let i = 0; i < lines.length; i++) {
    const dayMatch = lines[i].match(DAY_HEADER_RE);
    if (dayMatch) {
      const dayNum = Number(dayMatch[2]);
      let month = header.startMonth;
      if (dayNum < header.startDay) {
        month = header.endMonth;
        if (header.endMonth < header.startMonth) currentYear = header.endYear;
      }
      currentDate = `${currentYear}-${pad2(month)}-${pad2(dayNum)}`;
    }
    if (currentDate) dateByLineIndex.set(i, currentDate);
  }

  const shifts: ParsedShiftCandidate[] = [];
  for (const block of collectBlocks(lines)) {
    const date = dateByLineIndex.get(block.index);
    if (!date) continue;
    const parsed = parseEntry(block.entry, date, block.shiftType, pageNumber, municipality, "native");
    if (parsed) {
      shifts.push(parsed);
    } else {
      warnings.push(
        `No se pudo interpretar la entrada de ${block.shiftType === "day" ? "día" : "noche"} del ${date} (página ${pageNumber}): "${block.entry}"`
      );
    }
  }

  return {
    pageNumber,
    hasExtractableText: true,
    extractionMethod: "native",
    ocrConfidence: null,
    shifts,
    warnings,
  };
}

/**
 * Extracción OCR: los encabezados "LUNES N" no son fiables (confirmado con
 * el PDF de referencia), así que la fecha se deriva secuencialmente a
 * partir del inicio del periodo: el primer bloque "Día (" corresponde al
 * primer día del periodo, el segundo al día siguiente, etc.
 */
function parseOcrPage(
  pageNumber: number,
  text: string,
  municipality: string,
  confidence: number
): PageExtractionResult {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const warnings: string[] = [];
  const header = parsePeriodHeader(lines);
  if (!header) {
    return {
      pageNumber,
      hasExtractableText: false,
      extractionMethod: "failed",
      ocrConfidence: confidence,
      shifts: [],
      warnings: [
        `OCR de la página ${pageNumber} no reconoció el encabezado del periodo; requiere revisión manual.`,
      ],
    };
  }

  const periodStart = DateTime.fromObject({
    year: header.startYear,
    month: header.startMonth,
    day: header.startDay,
  });

  const shifts: ParsedShiftCandidate[] = [];
  let dayIndex = -1;
  for (const block of collectBlocks(lines)) {
    if (block.shiftType === "day") dayIndex++;
    if (dayIndex < 0) continue; // entrada antes del primer "Día (" (no debería ocurrir)
    const date = periodStart.plus({ days: dayIndex }).toISODate()!;
    const parsed = parseEntry(block.entry, date, block.shiftType, pageNumber, municipality, "ocr");
    if (parsed) {
      shifts.push(parsed);
    } else {
      warnings.push(
        `OCR: no se pudo interpretar la entrada de ${block.shiftType === "day" ? "día" : "noche"} nº${dayIndex + 1} (página ${pageNumber}): "${block.entry}"`
      );
    }
  }

  if (dayIndex !== 6) {
    warnings.push(
      `OCR de la página ${pageNumber} reconoció ${dayIndex + 1} día(s) en vez de los 7 esperados; revisar manualmente.`
    );
  }

  return {
    pageNumber,
    hasExtractableText: true,
    extractionMethod: "ocr",
    ocrConfidence: confidence,
    shifts,
    warnings,
  };
}

function pageNeedsOcr(native: PageExtractionResult): boolean {
  // Criterios del Anexo §5.2: texto vacío, sin bloques Día/Noche reconocidos,
  // o sin periodo detectable.
  if (!native.hasExtractableText) return true;
  if (native.extractionMethod === "failed") return true;
  if (native.shifts.length === 0) return true;
  return false;
}

export interface PeriodProbeResult {
  valid: boolean;
  pageCount: number;
  periodStart: string | null;
  periodEnd: string | null;
}

function extractPeriodFromText(text: string): { start: string; end: string } | null {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const header = parsePeriodHeader(lines);
  if (!header) return null;
  return {
    start: `${header.startYear}-${pad2(header.startMonth)}-${pad2(header.startDay)}`,
    end: `${header.endYear}-${pad2(header.endMonth)}-${pad2(header.endDay)}`,
  };
}

/**
 * Sondeo ligero (Anexo §3.1): abre el PDF y lee primero el texto nativo de
 * cada página para determinar el periodo cubierto, sin interpretar los
 * turnos todavía. Algunos trimestres se publican enteramente como imagen
 * (comprobado con los documentos T1-T3 del origen real, sin ninguna página
 * con texto nativo): en ese caso se aplica OCR solo a la primera página
 * para poder clasificar igualmente el documento, evitando así descartar
 * como "no válido" un trimestre que en realidad sí puede importarse.
 */
export async function probeDutyPdfPeriod(buffer: Buffer): Promise<PeriodProbeResult> {
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    return { valid: false, pageCount: 0, periodStart: null, periodEnd: null };
  }
  try {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    }).promise;

    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines = extractLines(
        textContent.items as Array<{ str: string; hasEOL?: boolean }>
      );
      const header = parsePeriodHeader(lines);
      if (!header) continue;
      const start = `${header.startYear}-${pad2(header.startMonth)}-${pad2(header.startDay)}`;
      const end = `${header.endYear}-${pad2(header.endMonth)}-${pad2(header.endDay)}`;
      if (!periodStart || start < periodStart) periodStart = start;
      if (!periodEnd || end > periodEnd) periodEnd = end;
    }

    if (!periodStart && doc.numPages > 0) {
      // Se usan la primera y la última página (no solo la primera) porque
      // cada página solo cubre una semana: el inicio real del documento
      // está en la primera y el final real en la última.
      try {
        const firstPage = await doc.getPage(1);
        const first = extractPeriodFromText((await ocrPdfPage(firstPage)).text);
        if (first) periodStart = first.start;

        if (doc.numPages > 1) {
          const lastPage = await doc.getPage(doc.numPages);
          const last = extractPeriodFromText((await ocrPdfPage(lastPage)).text);
          periodEnd = last ? last.end : first?.end ?? null;
        } else {
          periodEnd = first?.end ?? null;
        }
        await terminateOcrWorker();
      } catch {
        // Se deja como no determinado; discoverQuarterlySources lo marcará
        // "invalido" y el administrador podrá revisarlo manualmente.
      }
    }

    return { valid: true, pageCount: doc.numPages, periodStart, periodEnd };
  } catch {
    return { valid: false, pageCount: 0, periodStart: null, periodEnd: null };
  }
}

export interface ParsePdfOptions {
  municipality?: string;
  maxPages?: number;
  /** Permite desactivar el respaldo OCR (p. ej. en pruebas rápidas). */
  enableOcr?: boolean;
}

/** RF009 paso 6-7 / Anexo §5 — extracción híbrida texto nativo + OCR. */
export async function parseDutyPdf(
  buffer: Buffer,
  options: ParsePdfOptions = {}
): Promise<PdfExtractionResult> {
  const municipality = options.municipality ?? "Mairena del Alcor";
  const enableOcr = options.enableOcr ?? true;
  const pdfjs = await loadPdfJs();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;

  const maxPages = options.maxPages ?? 200;
  if (doc.numPages > maxPages) {
    return {
      pages: [],
      shifts: [],
      periodStart: null,
      periodEnd: null,
      pagesNeedingManualReview: [],
      nativeTextPageCount: 0,
      ocrPageCount: 0,
      failedPageCount: 0,
      errors: [
        `El PDF tiene ${doc.numPages} páginas, que supera el máximo permitido (${maxPages}).`,
      ],
    };
  }

  const pages: PageExtractionResult[] = [];
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines = extractLines(
        textContent.items as Array<{ str: string; hasEOL?: boolean }>
      );
      const nativeResult = parseNativePage(pageNum, lines, municipality);

      if (!enableOcr || !pageNeedsOcr(nativeResult)) {
        pages.push(nativeResult);
        continue;
      }

      try {
        const { text, confidence } = await ocrPdfPage(page);
        pages.push(parseOcrPage(pageNum, text, municipality, confidence));
      } catch (err) {
        pages.push({
          pageNumber: pageNum,
          hasExtractableText: nativeResult.hasExtractableText,
          extractionMethod: "failed",
          ocrConfidence: null,
          shifts: [],
          warnings: [
            `Fallo al aplicar OCR a la página ${pageNum}: ${err instanceof Error ? err.message : String(err)}`,
          ],
        });
      }
    }
  } finally {
    if (enableOcr) await terminateOcrWorker();
  }

  const allShifts = pages.flatMap((p) => p.shifts);
  const pagesNeedingManualReview = pages
    .filter((p) => p.extractionMethod === "failed")
    .map((p) => p.pageNumber);

  const dates = allShifts.map((s) => s.date).sort();
  const periodStart = dates[0] ?? null;
  const periodEnd = dates[dates.length - 1] ?? null;

  const errors: string[] = [];
  if (allShifts.length === 0) {
    errors.push(
      "No se ha podido interpretar ninguna guardia del PDF. Puede que el formato haya cambiado o que el OCR no haya reconocido el documento."
    );
  }

  return {
    pages,
    shifts: allShifts,
    periodStart,
    periodEnd,
    pagesNeedingManualReview,
    nativeTextPageCount: pages.filter((p) => p.extractionMethod === "native").length,
    ocrPageCount: pages.filter((p) => p.extractionMethod === "ocr").length,
    failedPageCount: pages.filter((p) => p.extractionMethod === "failed").length,
    errors,
  };
}
