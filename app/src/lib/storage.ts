/**
 * Almacenamiento de objetos para los PDF originales (RF009 paso 5).
 *
 * Implementación mínima en sistema de ficheros, con nombre inmutable
 * (hash del contenido). Pensada para sustituirse por un driver S3 sin
 * cambiar el resto de la aplicación: toda la app pasa por estas funciones.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

function storageRoot(): string {
  return process.env.STORAGE_PATH ?? path.join(process.cwd(), "storage");
}

export function dutyPdfObjectKey(sha256: string): string {
  return `duty-pdfs/${sha256}.pdf`;
}

export async function saveDutyPdf(
  sha256: string,
  buffer: Buffer
): Promise<string> {
  const key = dutyPdfObjectKey(sha256);
  // turbopackIgnore: STORAGE_PATH es deliberadamente dinámico (configurable
  // por entorno); el destino real se controla mediante validación de clave,
  // no mediante el empaquetado estático de Turbopack.
  const fullPath = path.join(/* turbopackIgnore: true */ storageRoot(), key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return key;
}

export async function readStoredObject(key: string): Promise<Buffer> {
  const fullPath = path.join(/* turbopackIgnore: true */ storageRoot(), key);
  return readFile(fullPath);
}
