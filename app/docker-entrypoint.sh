#!/bin/sh
# Aplica las migraciones pendientes antes de arrancar el servidor (RN008/009:
# nunca se sobrescribe directamente, cada cambio queda versionado).
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  echo "RUN_SEED_ON_START=true: ejecutando siembra inicial..."
  npx tsx prisma/seed.ts
fi

exec "$@"
