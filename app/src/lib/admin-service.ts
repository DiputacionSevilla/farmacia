/**
 * Lógica de negocio del panel administrativo (RF008-RF011). Compartida por
 * las Server Actions de `/admin` y por las rutas REST `/api/admin/*` para
 * no duplicar las reglas de validación y publicación.
 */

import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { prisma } from "./prisma";
import { saveDutyPdf, readStoredObject } from "./storage";
import {
  parseDutyPdf,
  probeDutyPdfPeriod,
  type ParsedShiftCandidate,
} from "./pdf-parser";
import { recordAuditEvent } from "./audit";
import { getDutyWindow } from "./temporal-engine";

const MAX_PDF_SIZE_BYTES = Number(
  process.env.DUTY_PDF_MAX_SIZE_MB ?? "20"
) * 1024 * 1024;
const MIN_COVERAGE_RATIO = Number(process.env.DUTY_MIN_COVERAGE_RATIO ?? "0.9");
const MAX_UNRECOGNIZED_RATIO = Number(
  process.env.DUTY_MAX_UNRECOGNIZED_RATIO ?? "0.15"
);

function getAllowedHosts(): string[] {
  return (process.env.DUTY_PDF_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
}

function getSourceUrl(): string {
  return (
    process.env.DUTY_PDF_URL ??
    "https://servicios.farmaceuticosdesevilla.es/images/farmaciasguardia/T4/mairenadelalcor.pdf"
  );
}

function assertAllowedUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error("Solo se permite descargar el PDF por HTTPS.");
  }
  const allowed = getAllowedHosts();
  if (allowed.length > 0 && !allowed.includes(parsed.hostname)) {
    throw new Error(
      `El dominio "${parsed.hostname}" no está en la lista de dominios permitidos.`
    );
  }
}

const QUARTER_CODES = ["T1", "T2", "T3", "T4"] as const;

/**
 * Deriva las cuatro URL trimestrales candidatas a partir de la configurada
 * (Anexo §2-§3): el segmento `/T1/`.../T4/` de la URL es un localizador
 * trimestral, no una ruta fija. No se hardcodea ningún dominio ni ruta
 * nueva: se sustituye el código trimestral presente en `DUTY_PDF_URL`.
 */
export function getQuarterCandidateUrls(): Array<{ quarter: string; url: string }> {
  const base = getSourceUrl();
  const match = base.match(/\/(T[1-4])\//i);
  if (!match) {
    // La URL configurada no sigue el patrón trimestral conocido: se usa
    // tal cual como único candidato.
    return [{ quarter: "—", url: base }];
  }
  return QUARTER_CODES.map((q) => ({
    quarter: q,
    url: base.replace(match[0], `/${q}/`),
  }));
}

export type QuarterCandidateStatus =
  | "vigente"
  | "futuro"
  | "pasado"
  | "ya_importado"
  | "invalido"
  | "inalcanzable";

export interface QuarterCandidate {
  quarter: string;
  url: string;
  status: QuarterCandidateStatus;
  periodStart: string | null;
  periodEnd: string | null;
  pageCount: number | null;
  sha256: string | null;
  alreadyImportedVersionId: string | null;
  message: string;
}

/**
 * RF-ANX-001/3.2 — descubre y clasifica los cuatro documentos trimestrales
 * candidatos sin crear todavía ninguna versión candidata: el administrador
 * decide después cuál regenerar (§7, pasos 1-4).
 */
export async function discoverQuarterlySources(): Promise<QuarterCandidate[]> {
  const candidates = getQuarterCandidateUrls();
  const today = DateTime.now().toISODate()!;

  const results: QuarterCandidate[] = [];
  for (const candidate of candidates) {
    try {
      assertAllowedUrl(candidate.url);
    } catch (e) {
      results.push({
        ...candidate,
        status: "invalido",
        periodStart: null,
        periodEnd: null,
        pageCount: null,
        sha256: null,
        alreadyImportedVersionId: null,
        message: e instanceof Error ? e.message : "URL no permitida.",
      });
      continue;
    }

    let response: Response;
    try {
      response = await fetch(candidate.url, { method: "GET" });
    } catch {
      results.push({
        ...candidate,
        status: "inalcanzable",
        periodStart: null,
        periodEnd: null,
        pageCount: null,
        sha256: null,
        alreadyImportedVersionId: null,
        message: "No se ha podido contactar con el origen.",
      });
      continue;
    }
    if (!response.ok) {
      results.push({
        ...candidate,
        status: "inalcanzable",
        periodStart: null,
        periodEnd: null,
        pageCount: null,
        sha256: null,
        alreadyImportedVersionId: null,
        message: `El servidor respondió con HTTP ${response.status}.`,
      });
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
      results.push({
        ...candidate,
        status: "invalido",
        periodStart: null,
        periodEnd: null,
        pageCount: null,
        sha256: null,
        alreadyImportedVersionId: null,
        message: "La respuesta no es un PDF válido (código 200 con contenido no-PDF).",
      });
      continue;
    }

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const existing = await prisma.dutyCalendarVersion.findFirst({
      where: { sourceSha256: sha256 },
      orderBy: { createdAt: "desc" },
    });

    const probe = await probeDutyPdfPeriod(buffer);
    let status: QuarterCandidateStatus;
    let message: string;
    if (existing) {
      status = "ya_importado";
      message = `Ya importado el ${existing.createdAt.toISOString().slice(0, 10)} (versión ${existing.status}).`;
    } else if (!probe.valid || !probe.periodStart || !probe.periodEnd) {
      status = "invalido";
      message = "No se ha podido determinar el periodo cubierto por este documento.";
    } else if (today < probe.periodStart) {
      status = "futuro";
      message = "Periodo aún no iniciado: puede importarse como borrador sin afectar al calendario vigente.";
    } else if (today > probe.periodEnd) {
      status = "pasado";
      message = "El periodo cubierto ya ha finalizado.";
    } else {
      status = "vigente";
      message = "Contiene la fecha actual: es el documento recomendado para regenerar.";
    }

    results.push({
      ...candidate,
      status,
      periodStart: probe.periodStart,
      periodEnd: probe.periodEnd,
      pageCount: probe.pageCount || null,
      sha256,
      alreadyImportedVersionId: existing?.id ?? null,
      message,
    });
  }

  return results;
}

export interface SourceCheckResult {
  sourceUrl: string;
  reachable: boolean;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  lastProcessedSha256: string | null;
  likelyChanged: boolean;
  message: string;
}

/** RF009 paso 1 (ligero) — comprueba cabeceras sin descargar el PDF entero. */
export async function checkDutySource(): Promise<SourceCheckResult> {
  const sourceUrl = getSourceUrl();
  assertAllowedUrl(sourceUrl);

  const lastVersion = await prisma.dutyCalendarVersion.findFirst({
    orderBy: { createdAt: "desc" },
  });

  let response: Response;
  try {
    response = await fetch(sourceUrl, { method: "HEAD" });
    if (!response.ok) {
      // Algunos servidores no implementan HEAD correctamente.
      response = await fetch(sourceUrl, { method: "GET" });
    }
  } catch {
    return {
      sourceUrl,
      reachable: false,
      etag: null,
      lastModified: null,
      contentLength: null,
      lastProcessedSha256: lastVersion?.sourceSha256 ?? null,
      likelyChanged: false,
      message: "No se ha podido contactar con el servidor del Colegio de Farmacéuticos.",
    };
  }

  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");
  const contentLength = response.headers.get("content-length");

  const likelyChanged =
    !lastVersion ||
    (etag !== null && etag !== lastVersion.etag) ||
    (lastModified !== null && lastModified !== lastVersion.lastModified);

  return {
    sourceUrl,
    reachable: true,
    etag,
    lastModified,
    contentLength: contentLength ? Number(contentLength) : null,
    lastProcessedSha256: lastVersion?.sourceSha256 ?? null,
    likelyChanged,
    message: likelyChanged
      ? "El origen indica posibles cambios. Regenera el calendario para confirmarlo."
      : "No se detectan cambios en las cabeceras del origen.",
  };
}

export interface ValidationSummary {
  errors: string[];
  warnings: string[];
  newPharmacies: Array<{ phone: string; address: string; municipality: string }>;
  municipalityChanges: Array<{
    pharmacyId: string;
    phone: string;
    directoryMunicipality: string;
    pdfMunicipality: string;
  }>;
  coverageRatio: number;
  unrecognizedRatio: number;
}

async function validateCandidate(
  shifts: ParsedShiftCandidate[],
  pageWarningCount: number,
  periodStart: string | null,
  periodEnd: string | null
): Promise<ValidationSummary> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!periodStart || !periodEnd) {
    errors.push("No se ha podido determinar el periodo cubierto por el PDF.");
    return {
      errors,
      warnings,
      newPharmacies: [],
      municipalityChanges: [],
      coverageRatio: 0,
      unrecognizedRatio: 1,
    };
  }
  if (periodStart > periodEnd) {
    errors.push("La fecha inicial del periodo es posterior a la fecha final.");
  }

  // Cobertura: un turno de día y uno de noche por cada fecha del periodo.
  const byDate = new Map<string, Set<string>>();
  for (const s of shifts) {
    const set = byDate.get(s.date) ?? new Set<string>();
    set.add(s.shiftType);
    byDate.set(s.date, set);
  }
  let expectedDays = 0;
  let completeDays = 0;
  let cursor = DateTime.fromISO(periodStart);
  const end = DateTime.fromISO(periodEnd);
  const missingDays: string[] = [];
  while (cursor <= end) {
    expectedDays++;
    const iso = cursor.toISODate()!;
    const set = byDate.get(iso);
    if (set && set.has("day") && set.has("night")) {
      completeDays++;
    } else {
      missingDays.push(iso);
    }
    cursor = cursor.plus({ days: 1 });
  }
  const coverageRatio = expectedDays === 0 ? 0 : completeDays / expectedDays;
  if (missingDays.length > 0) {
    warnings.push(
      `${missingDays.length} fecha(s) sin turno completo (día y noche): ${missingDays
        .slice(0, 10)
        .join(", ")}${missingDays.length > 10 ? "…" : ""}`
    );
  }
  if (coverageRatio < MIN_COVERAGE_RATIO) {
    errors.push(
      `La cobertura de fechas (${Math.round(coverageRatio * 100)}%) es inferior al mínimo exigido (${Math.round(MIN_COVERAGE_RATIO * 100)}%).`
    );
  }

  // Duplicados exactos (misma fecha + turno repetido con datos distintos).
  const seen = new Map<string, ParsedShiftCandidate>();
  for (const s of shifts) {
    const key = `${s.date}|${s.shiftType}`;
    const prev = seen.get(key);
    if (prev && prev.phone !== s.phone) {
      errors.push(
        `Entrada duplicada e inconsistente para ${key}: "${prev.rawText}" frente a "${s.rawText}".`
      );
    }
    seen.set(key, s);
  }

  // Teléfonos no normalizables (deberían tener 9 dígitos en España).
  const badPhones = shifts.filter((s) => s.phone.length !== 9);
  if (badPhones.length > 0) {
    warnings.push(
      `${badPhones.length} entrada(s) con teléfono de formato inesperado.`
    );
  }

  // Nuevas farmacias / cambios de municipio frente al directorio actual.
  const pharmacies = await prisma.pharmacy.findMany({
    where: { active: true },
  });
  const byPhone = new Map(pharmacies.map((p) => [p.phone?.replace(/\D/g, ""), p]));

  const newPharmacies: ValidationSummary["newPharmacies"] = [];
  const municipalityChanges: ValidationSummary["municipalityChanges"] = [];
  const seenPhones = new Set<string>();
  for (const s of shifts) {
    if (s.municipality !== "Mairena del Alcor") continue;
    if (seenPhones.has(s.phone)) continue;
    seenPhones.add(s.phone);
    const match = byPhone.get(s.phone);
    if (!match) {
      newPharmacies.push({
        phone: s.phone,
        address: s.address,
        municipality: s.municipality,
      });
    } else if (match.municipality !== s.municipality) {
      municipalityChanges.push({
        pharmacyId: match.id,
        phone: s.phone,
        directoryMunicipality: match.municipality,
        pdfMunicipality: s.municipality,
      });
    }
  }
  if (newPharmacies.length > 0) {
    warnings.push(
      `${newPharmacies.length} farmacia(s) del PDF no están en el directorio todavía.`
    );
  }

  const totalExpectedEntries = expectedDays * 2;
  const unrecognizedRatio =
    totalExpectedEntries === 0
      ? 1
      : (pageWarningCount + missingDays.length * 2) /
        Math.max(totalExpectedEntries, 1);
  if (unrecognizedRatio > MAX_UNRECOGNIZED_RATIO) {
    errors.push(
      `El porcentaje de registros no reconocidos (${Math.round(unrecognizedRatio * 100)}%) supera el umbral permitido (${Math.round(MAX_UNRECOGNIZED_RATIO * 100)}%).`
    );
  }

  return {
    errors,
    warnings,
    newPharmacies,
    municipalityChanges,
    coverageRatio,
    unrecognizedRatio,
  };
}

export interface RegenerateResult {
  status: "unchanged" | "candidate_created" | "rejected";
  candidateId?: string;
  validation?: ValidationSummary;
  message: string;
}

/** RF009 completo — descarga, valida, extrae y crea una versión candidata. */
export async function regenerateDutyCalendar(
  userId: string,
  sourceUrlOverride?: string
): Promise<RegenerateResult> {
  // Permite regenerar a partir de un candidato trimestral concreto
  // descubierto por `discoverQuarterlySources` (Anexo §7); por defecto usa
  // la URL configurada.
  const sourceUrl = sourceUrlOverride ?? getSourceUrl();
  assertAllowedUrl(sourceUrl);

  const response = await fetch(sourceUrl, { method: "GET" });
  if (!response.ok) {
    throw new Error(`No se ha podido descargar el PDF (HTTP ${response.status}).`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
    throw new Error(`Tipo de contenido inesperado: "${contentType}".`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_PDF_SIZE_BYTES) {
    throw new Error("El PDF supera el tamaño máximo permitido.");
  }
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new Error(
      "El archivo descargado no es un PDF válido (firma %PDF ausente)."
    );
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const existing = await prisma.dutyCalendarVersion.findFirst({
    where: { sourceSha256: sha256 },
  });
  if (existing) {
    await recordAuditEvent({
      userId,
      action: "duty_source_check",
      entityType: "DutyCalendarVersion",
      entityId: existing.id,
      result: "success",
      after: { sha256, status: "unchanged" },
    });
    return {
      status: "unchanged",
      message: "No se han detectado cambios respecto al último PDF procesado.",
    };
  }

  const extraction = await parseDutyPdf(buffer);
  const pageWarnings = extraction.pages.reduce(
    (acc, p) => acc + p.warnings.length,
    0
  );
  const validation = await validateCandidate(
    extraction.shifts,
    pageWarnings + extraction.pagesNeedingManualReview.length * 2,
    extraction.periodStart,
    extraction.periodEnd
  );

  if (extraction.pagesNeedingManualReview.length > 0) {
    validation.warnings.unshift(
      `Páginas sin texto extraíble (posible imagen escaneada), requieren revisión manual: ${extraction.pagesNeedingManualReview.join(", ")}.`
    );
  }
  validation.errors.unshift(...extraction.errors);

  const objectKey = await saveDutyPdf(sha256, buffer);

  if (validation.errors.length > 0) {
    // Se guarda igualmente como versión rechazada para dejar rastro (RN008).
    const rejected = await prisma.dutyCalendarVersion.create({
      data: {
        status: "rejected",
        periodStart: new Date(`${extraction.periodStart ?? "1970-01-01"}T00:00:00Z`),
        periodEnd: new Date(`${extraction.periodEnd ?? "1970-01-01"}T00:00:00Z`),
        sourceUrl,
        sourceSha256: sha256,
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        sourceObjectKey: objectKey,
        parserVersion: "pdfjs-v1",
        createdBy: userId,
        validationSummary: validation as object,
        notes: "Rechazada automáticamente por errores de validación bloqueantes.",
      },
    });
    await recordAuditEvent({
      userId,
      action: "duty_regenerate_rejected",
      entityType: "DutyCalendarVersion",
      entityId: rejected.id,
      result: "failure",
      after: validation as object,
    });
    return {
      status: "rejected",
      candidateId: rejected.id,
      validation,
      message: "El PDF se ha procesado pero contiene errores bloqueantes. Revisa el detalle antes de volver a intentarlo.",
    };
  }

  const candidate = await prisma.dutyCalendarVersion.create({
    data: {
      status: "candidate",
      periodStart: new Date(`${extraction.periodStart}T00:00:00Z`),
      periodEnd: new Date(`${extraction.periodEnd}T00:00:00Z`),
      sourceUrl,
      sourceSha256: sha256,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      sourceObjectKey: objectKey,
      parserVersion: "pdfjs-v1",
      createdBy: userId,
      validationSummary: validation as object,
    },
  });

  const pharmacies = await prisma.pharmacy.findMany({ where: { active: true } });
  const byPhone = new Map(
    pharmacies.map((p) => [p.phone?.replace(/\D/g, ""), p])
  );

  for (const shift of extraction.shifts) {
    const matched =
      shift.municipality === "Mairena del Alcor"
        ? byPhone.get(shift.phone)
        : undefined;
    const window = getDutyWindow(shift.date, shift.shiftType);
    await prisma.dutyShift.create({
      data: {
        calendarVersionId: candidate.id,
        serviceDate: new Date(`${shift.date}T00:00:00Z`),
        shiftType: shift.shiftType,
        startsAt: window.startsAt.toJSDate(),
        endsAt: window.endsAt.toJSDate(),
        pharmacyId: matched?.id ?? null,
        rawName: matched ? null : `Farmacia de guardia (${shift.municipality})`,
        rawAddress: shift.address,
        rawMunicipality: shift.municipality,
        rawPhone: shift.phone,
        rawText: shift.rawText,
        sourcePage: shift.sourcePage,
      },
    });
  }

  await recordAuditEvent({
    userId,
    action: "duty_regenerate_candidate_created",
    entityType: "DutyCalendarVersion",
    entityId: candidate.id,
    result: "success",
    after: { sha256, shiftCount: extraction.shifts.length },
  });

  return {
    status: "candidate_created",
    candidateId: candidate.id,
    validation,
    message: `Versión candidata creada con ${extraction.shifts.length} turnos. Revisa las diferencias antes de publicar.`,
  };
}

export interface DiffEntry {
  date: string;
  shiftType: "day" | "night";
  change: "added" | "removed" | "modified" | "unchanged";
  before: string | null;
  after: string | null;
}

/** RF010 — compara una versión candidata con la versión publicada vigente. */
export async function getCandidateDiff(candidateId: string): Promise<{
  candidate: Awaited<ReturnType<typeof prisma.dutyCalendarVersion.findUniqueOrThrow>>;
  published: Awaited<ReturnType<typeof prisma.dutyCalendarVersion.findFirst>>;
  diff: DiffEntry[];
}> {
  const candidate = await prisma.dutyCalendarVersion.findUniqueOrThrow({
    where: { id: candidateId },
    include: { shifts: { include: { pharmacy: true } } },
  });
  const published = await prisma.dutyCalendarVersion.findFirst({
    where: { status: "published" },
    include: { shifts: { include: { pharmacy: true } } },
  });

  function describe(shift: { pharmacy: { displayName: string } | null; rawName: string | null; rawAddress: string | null; rawPhone: string | null }) {
    return shift.pharmacy?.displayName ?? `${shift.rawName ?? shift.rawAddress ?? "?"} (${shift.rawPhone ?? "sin teléfono"})`;
  }

  const beforeMap = new Map(
    (published?.shifts ?? []).map((s) => [
      `${s.serviceDate.toISOString().slice(0, 10)}|${s.shiftType}`,
      describe(s),
    ])
  );
  const afterMap = new Map(
    candidate.shifts.map((s) => [
      `${s.serviceDate.toISOString().slice(0, 10)}|${s.shiftType}`,
      describe(s),
    ])
  );

  const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const diff: DiffEntry[] = [];
  for (const key of [...allKeys].sort()) {
    const [date, shiftType] = key.split("|") as [string, "day" | "night"];
    const before = beforeMap.get(key) ?? null;
    const after = afterMap.get(key) ?? null;
    let change: DiffEntry["change"] = "unchanged";
    if (before === null && after !== null) change = "added";
    else if (before !== null && after === null) change = "removed";
    else if (before !== after) change = "modified";
    diff.push({ date, shiftType, change, before, after });
  }

  return { candidate, published, diff };
}

/** RF010/RN008 — publica una versión candidata en una única transacción. */
export async function publishCandidate(
  candidateId: string,
  userId: string,
  comment?: string
) {
  const candidate = await prisma.dutyCalendarVersion.findUniqueOrThrow({
    where: { id: candidateId },
  });
  if (candidate.status !== "candidate") {
    throw new Error("Solo se puede publicar una versión candidata.");
  }
  const validation = candidate.validationSummary as unknown as ValidationSummary | null;
  if (validation && validation.errors.length > 0) {
    throw new Error("La versión tiene errores bloqueantes y no puede publicarse.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.dutyCalendarVersion.updateMany({
      where: { status: "published" },
      data: { status: "archived" },
    });
    await tx.dutyCalendarVersion.update({
      where: { id: candidateId },
      data: {
        status: "published",
        publishedAt: new Date(),
        publishedBy: userId,
        notes: comment ?? candidate.notes,
      },
    });
  });

  await recordAuditEvent({
    userId,
    action: "duty_calendar_published",
    entityType: "DutyCalendarVersion",
    entityId: candidateId,
    result: "success",
    after: { comment },
  });
}

/** RN009 — restaura una versión anterior sin reprocesar el PDF. */
export async function restoreCalendarVersion(versionId: string, userId: string) {
  // Lanza si no existe; también sirve de comprobación de permisos implícita.
  await prisma.dutyCalendarVersion.findUniqueOrThrow({
    where: { id: versionId },
  });
  await prisma.$transaction(async (tx) => {
    await tx.dutyCalendarVersion.updateMany({
      where: { status: "published" },
      data: { status: "archived" },
    });
    await tx.dutyCalendarVersion.update({
      where: { id: versionId },
      data: { status: "published", publishedAt: new Date(), publishedBy: userId },
    });
  });
  await recordAuditEvent({
    userId,
    action: "duty_calendar_restored",
    entityType: "DutyCalendarVersion",
    entityId: versionId,
    result: "success",
  });
}

export { readStoredObject };
