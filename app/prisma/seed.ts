/**
 * Script de siembra — carga el directorio de farmacias de Mairena del
 * Alcor y el calendario de guardias extraído manualmente del PDF oficial
 * del Colegio Oficial de Farmacéuticos de Sevilla vigente en la fecha de
 * desarrollo (ver prisma/seed-data). También crea el primer usuario
 * administrador.
 *
 * Los horarios ordinarios (opening_hour_rules) se dejan SIN sembrar a
 * propósito: el SDD prohíbe mostrar como "abierta por horario" una
 * farmacia cuyo horario no haya sido confirmado por una fuente fiable
 * (RN005). El administrador debe confirmarlos desde el panel antes de que
 * aparezcan en "Abiertas ahora" por ese motivo; la guardia oficial sí
 * queda disponible desde el primer arranque.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getDutyWindow } from "../src/lib/temporal-engine";

const prisma = new PrismaClient();

interface SeedPharmacy {
  key: string;
  displayName: string;
  address: string;
  phone: string;
  ownerName: string;
}

interface SeedDutyEntry {
  date: string;
  shift: "day" | "night";
  pharmacyKey: string | null;
  municipality: string;
  address: string;
  phone: string;
  owner: string;
}

function loadJson<T>(relPath: string): T {
  const full = path.join(__dirname, relPath);
  return JSON.parse(readFileSync(full, "utf-8"));
}

async function main() {
  console.log("Sembrando directorio de farmacias...");
  const pharmaciesSeed = loadJson<SeedPharmacy[]>(
    "seed-data/pharmacies.json"
  );

  const keyToId = new Map<string, string>();
  for (const p of pharmaciesSeed) {
    // No hay una columna @unique natural en el esquema para esta clave; se
    // busca por teléfono (estable y único en este directorio) para que
    // volver a ejecutar la siembra no duplique farmacias.
    const existing = await prisma.pharmacy.findFirst({
      where: { phone: p.phone },
    });
    const pharmacy = await prisma.pharmacy.upsert({
      where: { id: existing?.id ?? "00000000-0000-0000-0000-000000000000" },
      update: {},
      create: {
        officialName: p.displayName,
        displayName: p.displayName,
        ownerName: p.ownerName,
        address: p.address,
        municipality: "Mairena del Alcor",
        phone: p.phone,
        active: true,
        sourceType: "colegio_oficial",
        sourceReference:
          "Calendario de guardias del Real e Ilustre Colegio de Farmacéuticos de Sevilla",
        verificationStatus: "pending",
      },
    });
    keyToId.set(p.key, pharmacy.id);
  }
  console.log(`  ${keyToId.size} farmacias de Mairena del Alcor cargadas.`);

  console.log("Sembrando calendario de guardias oficial...");
  const fixturePdfPath = path.join(
    __dirname,
    "seed-data",
    "mairenadelalcor-20261017.pdf"
  );
  const pdfBuffer = readFileSync(fixturePdfPath);
  const sha256 = createHash("sha256").update(pdfBuffer).digest("hex");

  // Copia el PDF fixture al almacenamiento local de desarrollo (storage/),
  // simulando el almacenamiento de objetos inmutable de producción (RF009).
  const storageDir = path.join(__dirname, "..", "storage", "duty-pdfs");
  const storagePdfPath = path.join(
    storageDir,
    "mairenadelalcor-20261017.pdf"
  );
  mkdirSync(storageDir, { recursive: true });
  if (!existsSync(storagePdfPath)) {
    copyFileSync(fixturePdfPath, storagePdfPath);
  }

  const sourceUrl =
    process.env.DUTY_PDF_URL ??
    "https://servicios.farmaceuticosdesevilla.es/images/farmaciasguardia/T4/mairenadelalcor.pdf";

  const existing = await prisma.dutyCalendarVersion.findFirst({
    where: { sourceSha256: sha256 },
  });

  let versionId: string;
  if (existing) {
    versionId = existing.id;
    console.log("  La versión del calendario ya existía, se reutiliza.");
  } else {
    const version = await prisma.dutyCalendarVersion.create({
      data: {
        status: "published",
        periodStart: new Date("2026-10-05"),
        periodEnd: new Date("2026-12-27"),
        sourceUrl,
        sourceSha256: sha256,
        sourceObjectKey: "duty-pdfs/mairenadelalcor-20261017.pdf",
        parserVersion: "seed-manual-v1",
        createdBy: "seed-script",
        publishedAt: new Date(),
        publishedBy: "seed-script",
        notes:
          "Carga inicial transcrita manualmente del PDF oficial (12 semanas, 05-oct-2026 a 27-dic-2026) para arrancar el entorno de desarrollo.",
      },
    });
    versionId = version.id;

    const entries = loadJson<SeedDutyEntry[]>(
      "seed-data/duty-2026-10-05_2026-12-27.json"
    );
    for (const e of entries) {
      const window = getDutyWindow(e.date, e.shift);
      await prisma.dutyShift.create({
        data: {
          calendarVersionId: versionId,
          serviceDate: new Date(e.date),
          shiftType: e.shift,
          startsAt: window.startsAt.toJSDate(),
          endsAt: window.endsAt.toJSDate(),
          pharmacyId: e.pharmacyKey ? keyToId.get(e.pharmacyKey) ?? null : null,
          rawName: e.pharmacyKey ? null : `Farmacia de guardia (${e.municipality})`,
          rawAddress: e.address,
          rawMunicipality: e.municipality,
          rawPhone: e.phone,
          rawText: `${e.address} (${e.phone}) - ${e.owner}`,
        },
      });
    }
    console.log(`  ${entries.length} turnos de guardia cargados.`);
  }

  console.log("Sembrando usuario administrador inicial...");
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@mairenadelalcor.org";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "CambiaEstaClave!2026";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Administrador municipal",
      passwordHash,
      roles: ["content_admin", "tech_admin"],
      active: true,
    },
  });
  console.log(`  Usuario admin: ${email}`);
  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.log(
      `  Contraseña provisional: ${password} — CAMBIAR antes de producción.`
    );
  }

  console.log("Siembra completada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
