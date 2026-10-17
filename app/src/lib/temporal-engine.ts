/**
 * Motor temporal — calcula guardias vigentes y farmacias abiertas por
 * horario ordinario en un instante dado, en la zona horaria Europe/Madrid.
 *
 * Reglas de referencia: SDD §4.4, RF002, RF003, RN001-RN007.
 * Todas las funciones son puras: no acceden a base de datos ni reloj del
 * sistema salvo que se les pase explícitamente el instante de referencia.
 */

import { DateTime } from "luxon";
import type {
  DutyShiftInput,
  HolidayInput,
  OpeningExceptionInput,
  OpeningHourRuleInput,
  OrdinaryStatus,
  PharmacyWithSchedule,
  ShiftType,
} from "./domain-types";

export const APP_TIMEZONE = "Europe/Madrid";

const DUTY_DAY_START = "09:30";
const DUTY_DAY_END = "22:00"; // = inicio de la guardia nocturna
const DUTY_NIGHT_END = "09:30"; // del día siguiente

/** Convierte "HH:mm" a minutos desde medianoche. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesOfDay(dt: DateTime): number {
  return dt.hour * 60 + dt.minute + dt.second / 60;
}

/**
 * Instante de referencia en Europe/Madrid. Acepta un `Date`/ISO opcional
 * para pruebas deterministas; por defecto usa la hora actual del sistema.
 */
export function nowInAppZone(reference?: Date | string): DateTime {
  if (reference === undefined) {
    return DateTime.now().setZone(APP_TIMEZONE);
  }
  if (typeof reference === "string") {
    return DateTime.fromISO(reference, { zone: APP_TIMEZONE });
  }
  return DateTime.fromJSDate(reference).setZone(APP_TIMEZONE);
}

export interface DutyContext {
  /** Fecha de servicio (YYYY-MM-DD) a la que pertenece la guardia vigente. */
  serviceDate: string;
  shiftType: ShiftType;
}

/**
 * RF002 / RN002 / RN003 — determina qué guardia está vigente en el instante
 * dado:
 *  - [09:30, 22:00)            -> guardia diurna de la fecha actual.
 *  - [22:00, 24:00)            -> guardia nocturna de la fecha actual.
 *  - [00:00, 09:30)            -> guardia nocturna de la fecha anterior.
 */
export function getDutyContext(now: DateTime): DutyContext {
  const minutes = minutesOfDay(now);
  const dayStart = toMinutes(DUTY_DAY_START);
  const dayEnd = toMinutes(DUTY_DAY_END);

  if (minutes >= dayStart && minutes < dayEnd) {
    return { serviceDate: now.toISODate()!, shiftType: "day" };
  }
  if (minutes >= dayEnd) {
    return { serviceDate: now.toISODate()!, shiftType: "night" };
  }
  // minutes < dayStart => pertenece a la guardia nocturna del día anterior
  const previousDay = now.minus({ days: 1 });
  return { serviceDate: previousDay.toISODate()!, shiftType: "night" };
}

/**
 * Instante exacto (inicio/fin) de una guardia concreta, útil para mostrar
 * "hora prevista de cierre" en las tarjetas (RF001).
 */
export function getDutyWindow(
  serviceDate: string,
  shiftType: ShiftType
): { startsAt: DateTime; endsAt: DateTime } {
  const base = DateTime.fromISO(serviceDate, { zone: APP_TIMEZONE });
  if (shiftType === "day") {
    return {
      startsAt: setTime(base, DUTY_DAY_START),
      endsAt: setTime(base, DUTY_DAY_END),
    };
  }
  return {
    startsAt: setTime(base, DUTY_DAY_END),
    endsAt: setTime(base.plus({ days: 1 }), DUTY_NIGHT_END),
  };
}

function setTime(date: DateTime, hhmm: string): DateTime {
  const [h, m] = hhmm.split(":").map(Number);
  return date.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

/** ISO weekday: 1 = lunes ... 7 = domingo. */
function isoWeekday(date: DateTime): number {
  return date.weekday;
}

function isDateHoliday(date: string, holidays: HolidayInput[]): boolean {
  return holidays.some((h) => h.date === date);
}

function findException(
  date: string,
  exceptions: OpeningExceptionInput[]
): OpeningExceptionInput | undefined {
  return exceptions.find((e) => e.date === date);
}

/**
 * RF002 / RF011 / RN004 / RN005 — resuelve el estado de apertura por horario
 * ordinario de una farmacia en una fecha y hora concretas.
 *
 * Precedencia: cierre excepcional > apertura excepcional / horario especial
 * > horario ordinario del día. En festivos, si no existe excepción, NO se
 * asume el horario ordinario: el estado queda como "no confirmado" y la
 * farmacia nunca se presenta como abierta por este motivo (RN005).
 */
export function getOrdinaryStatus(
  date: DateTime,
  time: DateTime,
  rules: OpeningHourRuleInput[],
  exceptions: OpeningExceptionInput[],
  holidays: HolidayInput[]
): OrdinaryStatus {
  const isoDate = date.toISODate()!;
  const exception = findException(isoDate, exceptions);

  if (exception) {
    if (exception.type === "closed") {
      return { open: false, reason: "exception_closed", closesAt: null };
    }
    if (exception.type === "open_all_day") {
      return {
        open: true,
        reason: "exception_open_all_day",
        closesAt: "24:00",
      };
    }
    // special_hours
    if (exception.opensAt && exception.closesAt) {
      const minutes = minutesOfDay(time);
      const open =
        minutes >= toMinutes(exception.opensAt) &&
        minutes < toMinutes(exception.closesAt);
      return {
        open,
        reason: "exception_special_hours",
        closesAt: open ? exception.closesAt : null,
      };
    }
    // Excepción mal formada: no se asume apertura.
    return { open: false, reason: "no_rule", closesAt: null };
  }

  if (isDateHoliday(isoDate, holidays)) {
    // Sin excepción específica para un festivo: no se afirma apertura.
    return { open: false, reason: "holiday_unconfirmed", closesAt: null };
  }

  const weekday = isoWeekday(date);
  const applicable = rules.filter((r) => {
    if (r.weekday !== weekday) return false;
    if (r.validFrom > isoDate) return false;
    if (r.validTo && r.validTo < isoDate) return false;
    return true;
  });

  const minutes = minutesOfDay(time);
  for (const rule of applicable) {
    const opens = toMinutes(rule.opensAt);
    const closes = toMinutes(rule.closesAt);
    if (minutes >= opens && minutes < closes) {
      return { open: true, reason: "ordinary", closesAt: rule.closesAt };
    }
  }

  return applicable.length > 0
    ? { open: false, reason: "ordinary", closesAt: null }
    : { open: false, reason: "no_rule", closesAt: null };
}

export interface OpenNowCard {
  pharmacyId: string | null;
  displayName: string;
  address: string;
  municipality: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  reasons: Array<"ordinary" | "duty">;
  dutyShiftType: ShiftType | null;
  closesAt: string | null; // "HH:mm" o "24:00" en horario ordinario
  dutyWindow: { startsAt: string; endsAt: string } | null; // ISO
  /** true si la farmacia de guardia no está en Mairena del Alcor (RN006) */
  outOfTown: boolean;
}

/**
 * RF001 — combina horario ordinario y guardia vigente en el conjunto de
 * tarjetas a mostrar en "Abiertas ahora", ya ordenado según la prioridad:
 *  1. Farmacias de Mairena de guardia y abiertas.
 *  2. Resto de farmacias abiertas en Mairena del Alcor.
 *  3. Farmacia de guardia de otro municipio, si corresponde.
 */
export function computeOpenNow(
  now: DateTime,
  pharmacies: PharmacyWithSchedule[],
  holidays: HolidayInput[],
  dutyShifts: DutyShiftInput[],
  municipality = "Mairena del Alcor"
): { dutyContext: DutyContext; cards: OpenNowCard[] } {
  const dutyContext = getDutyContext(now);
  const relevantShifts = dutyShifts.filter(
    (s) =>
      s.serviceDate === dutyContext.serviceDate &&
      s.shiftType === dutyContext.shiftType
  );
  const dutyWindow = getDutyWindow(
    dutyContext.serviceDate,
    dutyContext.shiftType
  );

  const cardsById = new Map<string, OpenNowCard>();
  const dutyWithoutMatch: OpenNowCard[] = [];

  for (const pharmacy of pharmacies) {
    if (!pharmacy.active) continue;
    const status = getOrdinaryStatus(
      now,
      now,
      pharmacy.openingHourRules,
      pharmacy.openingExceptions,
      holidays
    );
    const isDuty = relevantShifts.some((s) => s.pharmacyId === pharmacy.id);
    const ordinaryConfirmed =
      status.open && pharmacy.verificationStatus === "confirmed";

    if (!ordinaryConfirmed && !isDuty) continue;

    const reasons: Array<"ordinary" | "duty"> = [];
    if (ordinaryConfirmed) reasons.push("ordinary");
    if (isDuty) reasons.push("duty");

    cardsById.set(pharmacy.id, {
      pharmacyId: pharmacy.id,
      displayName: pharmacy.displayName,
      address: pharmacy.address,
      municipality: pharmacy.municipality,
      phone: pharmacy.phone,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
      reasons,
      dutyShiftType: isDuty ? dutyContext.shiftType : null,
      closesAt: ordinaryConfirmed ? status.closesAt : null,
      dutyWindow: isDuty
        ? {
            startsAt: dutyWindow.startsAt.toISO()!,
            endsAt: dutyWindow.endsAt.toISO()!,
          }
        : null,
      outOfTown: false,
    });
  }

  // Guardias sin correspondencia en el directorio (p.ej. El Viso del Alcor,
  // RN006) o farmacias de guardia fuera de Mairena no presentes arriba.
  for (const shift of relevantShifts) {
    if (shift.pharmacyId && cardsById.has(shift.pharmacyId)) continue;
    dutyWithoutMatch.push({
      pharmacyId: shift.pharmacyId,
      displayName: shift.rawName ?? "Farmacia de guardia",
      address: shift.rawAddress ?? "",
      municipality: shift.rawMunicipality ?? "",
      phone: shift.rawPhone ?? null,
      latitude: null,
      longitude: null,
      reasons: ["duty"],
      dutyShiftType: dutyContext.shiftType,
      closesAt: null,
      dutyWindow: {
        startsAt: dutyWindow.startsAt.toISO()!,
        endsAt: dutyWindow.endsAt.toISO()!,
      },
      outOfTown: (shift.rawMunicipality ?? municipality) !== municipality,
    });
  }

  const inTown = (c: OpenNowCard) =>
    c.municipality === municipality || c.municipality === "";

  const groupA = [...cardsById.values()].filter(
    (c) => c.reasons.includes("duty") && inTown(c)
  );
  const groupB = [...cardsById.values()].filter(
    (c) => !c.reasons.includes("duty") && inTown(c)
  );
  const groupC = [
    ...[...cardsById.values()].filter((c) => !inTown(c)),
    ...dutyWithoutMatch,
  ];

  const byName = (a: OpenNowCard, b: OpenNowCard) =>
    a.displayName.localeCompare(b.displayName, "es");

  return {
    dutyContext,
    cards: [
      ...groupA.sort(byName),
      ...groupB.sort(byName),
      ...groupC.sort(byName),
    ],
  };
}
