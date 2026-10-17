import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

// Driver adapter (pg): las consultas se ejecutan a través del driver `pg`
// de Node en lugar del binario nativo del motor de consultas de Prisma.
// Ver prisma/schema.prisma (previewFeatures = ["driverAdapters"]).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Patrón singleton recomendado por Prisma para evitar agotar las conexiones
// en desarrollo con hot-reload de Next.js.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
