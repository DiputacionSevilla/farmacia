/**
 * Capa de acceso a datos — traduce los modelos de Prisma a los tipos de
 * dominio puros que consume el motor temporal, y expone las consultas
 * públicas descritas en §9 "API propuesta".
 */

import { prisma } from "./prisma";
import {
  APP_TIMEZONE,
  computeOpenNow,
  getDutyContext,
  getDutyWindow,
} from "./temporal-engine";
import type {
  DutyShiftInput,
  HolidayInput,
  OpeningExceptionInput,
  OpeningHourRuleInput,
  PharmacyWithSchedule,
} from "./domain-types";
import { DateTime } from "luxon";

const MUNICIPALITY = "Mairena del Alcor";

/**
 * Las columnas `@db.Date` (service_date, period_start/end, valid_from/to,
 * holidays.date, opening_exceptions.date) almacenan una fecha de calendario
 * pura, sin hora ni zona horaria. Deben construirse y compararse siempre
 * como medianoche UTC — nunca convirtiendo desde Europe/Madrid, que
 * desplazaría el día por el desfase horario (CEST/CET).
 */
function dateOnlyToJSDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function jsDateToISODate(date: Date): string {
  return DateTime.fromJSDate(date, { zone: "utc" }).toISODate()!;
}

function toRuleInput(r: {
  weekday: number;
  opensAt: string;
  closesAt: string;
  validFrom: Date;
  validTo: Date | null;
  season: string;
}): OpeningHourRuleInput {
  return {
    weekday: r.weekday,
    opensAt: r.opensAt,
    closesAt: r.closesAt,
    validFrom: jsDateToISODate(r.validFrom),
    validTo: r.validTo ? jsDateToISODate(r.validTo) : null,
    season: r.season as OpeningHourRuleInput["season"],
  };
}

function toExceptionInput(e: {
  date: Date;
  type: string;
  opensAt: string | null;
  closesAt: string | null;
}): OpeningExceptionInput {
  return {
    date: jsDateToISODate(e.date),
    type: e.type as OpeningExceptionInput["type"],
    opensAt: e.opensAt,
    closesAt: e.closesAt,
  };
}

export async function getActivePharmaciesWithSchedule(): Promise<
  PharmacyWithSchedule[]
> {
  const pharmacies = await prisma.pharmacy.findMany({
    where: { active: true },
    include: { openingHourRules: true, openingExceptions: true },
    orderBy: { displayName: "asc" },
  });

  return pharmacies.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    address: p.address,
    municipality: p.municipality,
    phone: p.phone,
    latitude: p.latitude,
    longitude: p.longitude,
    verificationStatus: p.verificationStatus,
    active: p.active,
    openingHourRules: p.openingHourRules.map(toRuleInput),
    openingExceptions: p.openingExceptions.map(toExceptionInput),
  }));
}

export async function getHolidays(): Promise<HolidayInput[]> {
  const holidays = await prisma.holiday.findMany();
  return holidays.map((h) => ({
    date: jsDateToISODate(h.date),
    scope: h.scope,
  }));
}

/** Versión publicada vigente del calendario de guardias, si existe. */
export async function getPublishedCalendarVersion() {
  return prisma.dutyCalendarVersion.findFirst({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getDutyShiftsInRange(
  from: string,
  to: string
): Promise<DutyShiftInput[]> {
  const version = await getPublishedCalendarVersion();
  if (!version) return [];
  const shifts = await prisma.dutyShift.findMany({
    where: {
      calendarVersionId: version.id,
      serviceDate: {
        gte: dateOnlyToJSDate(from),
        lte: dateOnlyToJSDate(to),
      },
    },
  });
  return shifts.map((s) => ({
    pharmacyId: s.pharmacyId,
    shiftType: s.shiftType,
    serviceDate: jsDateToISODate(s.serviceDate),
    rawName: s.rawName,
    rawAddress: s.rawAddress,
    rawMunicipality: s.rawMunicipality,
    rawPhone: s.rawPhone,
  }));
}

export interface OpenNowResult
  extends Awaited<ReturnType<typeof computeOpenNow>> {
  dataVersion: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  calendarExpired: boolean;
}

/** RF001 — "Abiertas ahora". */
export async function getOpenNow(reference?: Date): Promise<OpenNowResult> {
  const now = reference
    ? DateTime.fromJSDate(reference).setZone(APP_TIMEZONE)
    : DateTime.now().setZone(APP_TIMEZONE);

  const dutyContext = getDutyContext(now);
  const [pharmacies, holidays, version] = await Promise.all([
    getActivePharmaciesWithSchedule(),
    getHolidays(),
    getPublishedCalendarVersion(),
  ]);

  let dutyShifts: DutyShiftInput[] = [];
  let calendarExpired = false;
  if (version) {
    const periodEnd = jsDateToISODate(version.periodEnd);
    calendarExpired = dutyContext.serviceDate > periodEnd;
    dutyShifts = await getDutyShiftsInRange(
      dutyContext.serviceDate,
      dutyContext.serviceDate
    );
  }

  const result = computeOpenNow(
    now,
    pharmacies,
    holidays,
    calendarExpired ? [] : dutyShifts,
    MUNICIPALITY
  );

  return {
    ...result,
    dataVersion: version?.id ?? null,
    periodStart: version ? jsDateToISODate(version.periodStart) : null,
    periodEnd: version ? jsDateToISODate(version.periodEnd) : null,
    calendarExpired,
  };
}

export interface DayDutyInfo {
  date: string;
  day: DutyShiftInput | null;
  night: DutyShiftInput | null;
}

/** RF003/RF004/RF005 — guardias de un rango de fechas. */
export async function getDutySchedule(
  from: string,
  to: string
): Promise<DayDutyInfo[]> {
  const shifts = await getDutyShiftsInRange(from, to);
  const byDate = new Map<string, DayDutyInfo>();

  let cursor = DateTime.fromISO(from, { zone: APP_TIMEZONE });
  const end = DateTime.fromISO(to, { zone: APP_TIMEZONE });
  while (cursor <= end) {
    byDate.set(cursor.toISODate()!, {
      date: cursor.toISODate()!,
      day: null,
      night: null,
    });
    cursor = cursor.plus({ days: 1 });
  }

  for (const shift of shifts) {
    const entry = byDate.get(shift.serviceDate);
    if (!entry) continue;
    if (shift.shiftType === "day") entry.day = shift;
    else entry.night = shift;
  }

  return [...byDate.values()];
}

export interface DayDetail {
  date: string;
  isHoliday: boolean;
  duty: DayDutyInfo;
  pharmacyIntervals: Array<{
    pharmacy: PharmacyWithSchedule;
    intervals: Array<{ opensAt: string; closesAt: string }>;
    confirmed: boolean;
  }>;
}

/** RF003 — vista detallada de un día: guardia y horarios ordinarios. */
export async function getDayDetail(date: string): Promise<DayDetail> {
  const zoned = DateTime.fromISO(date, { zone: APP_TIMEZONE });
  const [pharmacies, holidays, dutyShifts] = await Promise.all([
    getActivePharmaciesWithSchedule(),
    getHolidays(),
    getDutyShiftsInRange(date, date),
  ]);

  const isHoliday = holidays.some((h) => h.date === date);
  const weekday = zoned.weekday;

  const pharmacyIntervals = pharmacies.map((pharmacy) => {
    const exception = pharmacy.openingExceptions.find((e) => e.date === date);
    if (exception) {
      if (exception.type === "closed") {
        return { pharmacy, intervals: [], confirmed: true };
      }
      if (exception.type === "open_all_day") {
        return {
          pharmacy,
          intervals: [{ opensAt: "00:00", closesAt: "24:00" }],
          confirmed: true,
        };
      }
      if (exception.opensAt && exception.closesAt) {
        return {
          pharmacy,
          intervals: [
            { opensAt: exception.opensAt, closesAt: exception.closesAt },
          ],
          confirmed: true,
        };
      }
    }
    if (isHoliday) {
      return { pharmacy, intervals: [], confirmed: false };
    }
    const intervals = pharmacy.openingHourRules
      .filter(
        (r) =>
          r.weekday === weekday &&
          r.validFrom <= date &&
          (!r.validTo || r.validTo >= date)
      )
      .map((r) => ({ opensAt: r.opensAt, closesAt: r.closesAt }));
    return {
      pharmacy,
      intervals,
      confirmed: pharmacy.verificationStatus === "confirmed",
    };
  });

  const day = dutyShifts.find((s) => s.shiftType === "day") ?? null;
  const night = dutyShifts.find((s) => s.shiftType === "night") ?? null;

  return {
    date,
    isHoliday,
    duty: { date, day, night },
    pharmacyIntervals,
  };
}

export async function getPharmacyById(id: string) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    include: { openingHourRules: true, openingExceptions: true },
  });
  if (!pharmacy || !pharmacy.active) return null;
  return pharmacy;
}

export interface DutyDisplay {
  pharmacyId: string | null;
  name: string;
  address: string;
  municipality: string;
  phone: string | null;
  outOfTown: boolean;
}

/** Resuelve un turno de guardia a su información de presentación, usando el
 * directorio cuando hay correspondencia y los datos crudos del PDF en caso
 * contrario (p. ej. farmacias de El Viso del Alcor, RN006). */
export function resolveDutyDisplay(
  shift: DutyShiftInput | null,
  pharmaciesById: Map<string, PharmacyWithSchedule>,
  municipality = MUNICIPALITY
): DutyDisplay | null {
  if (!shift) return null;
  if (shift.pharmacyId) {
    const pharmacy = pharmaciesById.get(shift.pharmacyId);
    if (pharmacy) {
      return {
        pharmacyId: pharmacy.id,
        name: pharmacy.displayName,
        address: pharmacy.address,
        municipality: pharmacy.municipality,
        phone: pharmacy.phone,
        outOfTown: pharmacy.municipality !== municipality,
      };
    }
  }
  return {
    pharmacyId: null,
    name: shift.rawName ?? "Farmacia de guardia",
    address: shift.rawAddress ?? "",
    municipality: shift.rawMunicipality ?? municipality,
    phone: shift.rawPhone ?? null,
    outOfTown: (shift.rawMunicipality ?? municipality) !== municipality,
  };
}

export { getDutyWindow };
