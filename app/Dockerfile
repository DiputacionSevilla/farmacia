# Imagen única de producción. Se prioriza la simplicidad de mantenimiento
# (un solo contenedor Node.js con el servidor Next.js) sobre la optimización
# máxima de tamaño: la tabla `AdminUser` y el volumen de datos de este
# servicio son pequeños y no justifican una arquitectura más compleja.

FROM node:22-bookworm-slim AS base
WORKDIR /app
# OpenSSL para Prisma; fontconfig/freetype para el renderizado de páginas
# PDF a imagen (@napi-rs/canvas) usado en el respaldo OCR (RF009 / Anexo §5).
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl libfontconfig1 libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/resources ./resources
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/storage \
    && chown -R nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
