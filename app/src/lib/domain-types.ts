/**
 * Tipos de dominio puros (sin dependencia de Prisma) usados por el motor
 * temporal y por el parser del PDF. Mantenerlos desacoplados del ORM permite
 * probar las reglas de negocio sin base de datos.
 */

export type ShiftType = "day" | "night";

export type ExceptionType = "closed" | "special_hours" | "open_all_day";

export type HolidayScope = "national" | "regional" | "local";

export type Season = "all_year" | "summer" | "winter";

export interface OpeningHourRuleInput {
  /** 1 = lunes ... 7 = domingo (ISO 8601) */
  weekday: number;
  /** "HH:mm" en Europe/Madrid */
  opensAt: string;
  closesAt: string;
  /** Fecha ISO "YYYY-MM-DD" */
  validFrom: string;
  validTo: string | null;
  season: Season;
}

export interface OpeningExceptionInput {
  /** Fecha ISO "YYYY-MM-DD" */
  date: string;
  type: ExceptionType;
  opensAt?: string | null;
  closesAt?: string | null;
}

export interface HolidayInput {
  date: string;
  scope: HolidayScope;
}

export type VerificationStatus = "confirmed" | "pending" | "inactive";

export interface PharmacySummary {
  id: string;
  displayName: string;
  address: string;
  municipality: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: VerificationStatus;
  active: boolean;
}

export interface PharmacyWithSchedule extends PharmacySummary {
  openingHourRules: OpeningHourRuleInput[];
  openingExceptions: OpeningExceptionInput[];
}

export interface DutyShiftInput {
  pharmacyId: string | null;
  shiftType: ShiftType;
  serviceDate: string;
  /** Datos crudos, usados cuando la farmacia aún no está en el directorio */
  rawName?: string | null;
  rawAddress?: string | null;
  rawMunicipality?: string | null;
  rawPhone?: string | null;
}

export type OpenReason = "ordinary" | "duty";

export interface OrdinaryStatus {
  open: boolean;
  reason:
    | "exception_closed"
    | "exception_open_all_day"
    | "exception_special_hours"
    | "ordinary"
    | "holiday_unconfirmed"
    | "no_rule";
  closesAt: string | null;
}
