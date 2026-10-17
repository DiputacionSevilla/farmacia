import { DateTime } from "luxon";
import { APP_TIMEZONE } from "./temporal-engine";

export function formatDateTimeEs(iso: string): string {
  return DateTime.fromISO(iso, { zone: APP_TIMEZONE }).setLocale("es").toFormat(
    "d 'de' LLLL 'de' yyyy, HH:mm"
  );
}

export function formatTimeEs(iso: string): string {
  return DateTime.fromISO(iso, { zone: APP_TIMEZONE }).toFormat("HH:mm");
}

export function formatDateEs(iso: string): string {
  return DateTime.fromISO(iso, { zone: APP_TIMEZONE })
    .setLocale("es")
    .toFormat("d 'de' LLLL 'de' yyyy");
}

export function formatDateShortEs(iso: string): string {
  return DateTime.fromISO(iso, { zone: APP_TIMEZONE })
    .setLocale("es")
    .toFormat("ccc d LLL");
}

export function formatWeekdayEs(iso: string): string {
  return DateTime.fromISO(iso, { zone: APP_TIMEZONE })
    .setLocale("es")
    .toFormat("cccc");
}

export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return `tel:+34${digits.length === 9 ? digits : digits.replace(/^34/, "")}`;
}

export function formatPhoneEs(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 9) return phone;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Enlace universal de mapas (RF006 — "Cómo llegar"). */
export function mapsHref(params: {
  address: string;
  municipality: string;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  if (params.latitude != null && params.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`;
  }
  const query = encodeURIComponent(`${params.address}, ${params.municipality}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
