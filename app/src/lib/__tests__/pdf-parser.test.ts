import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDutyPdf } from "../pdf-parser";

// Prueba de integración con el PDF oficial real (Anexo SDD de
// descubrimiento/OCR, CA-ANX-003/004/005): el documento T4 de referencia
// tiene 12 páginas, 2 de ellas sin texto nativo extraíble (páginas 4 y 5),
// y debe recuperarse un calendario continuo de 84 días sin huecos.
// El OCR tarda varios segundos; se amplía el timeout por defecto.
describe("parseDutyPdf — PDF oficial de referencia (texto nativo + OCR)", () => {
  const fixturePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "prisma",
    "seed-data",
    "mairenadelalcor-20261017.pdf"
  );
  const buffer = readFileSync(fixturePath);

  it(
    "recupera las 168 entradas (84 días x día/noche) sin páginas fallidas",
    async () => {
      const result = await parseDutyPdf(buffer);

      expect(result.errors).toEqual([]);
      expect(result.periodStart).toBe("2026-10-05");
      expect(result.periodEnd).toBe("2026-12-27");
      expect(result.shifts).toHaveLength(168);
      expect(result.failedPageCount).toBe(0);
      expect(result.pagesNeedingManualReview).toEqual([]);

      // Las dos páginas sin capa de texto deben haberse recuperado por OCR.
      expect(result.ocrPageCount).toBe(2);
      expect(result.nativeTextPageCount).toBe(10);

      // Cobertura continua: un turno de día y uno de noche por cada fecha
      // del periodo, sin huecos (CA-ANX-004).
      const byDate = new Map<string, Set<string>>();
      for (const s of result.shifts) {
        const set = byDate.get(s.date) ?? new Set<string>();
        set.add(s.shiftType);
        byDate.set(s.date, set);
      }
      let cursor = new Date("2026-10-05T00:00:00Z");
      const end = new Date("2026-12-27T00:00:00Z");
      let missing = 0;
      while (cursor <= end) {
        const iso = cursor.toISOString().slice(0, 10);
        const set = byDate.get(iso);
        if (!set || !set.has("day") || !set.has("night")) missing++;
        cursor = new Date(cursor.getTime() + 86400000);
      }
      expect(missing).toBe(0);
    },
    30_000
  );
});
