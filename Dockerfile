# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
ENTRYPOINT ["npx", "prisma"]

FROM base AS builder
ARG NEXTAUTH_SECRET=build-time-nextauth-secret
ARG APP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ENV NODE_ENV=production
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV APP_ENCRYPTION_KEY=${APP_ENCRYPTION_KEY}
ENV DATABASE_URL=file:/tmp/build.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public
RUN npm run build
RUN mkdir -p /app/data/backups
RUN DATABASE_URL=file:/app/data/dev.db npx prisma migrate deploy

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=9002
ENV DATABASE_URL=file:/data/dev.db
ENV LOCAL_BACKUP_PATH=/data/backups

EXPOSE 9002

COPY --from=builder --chown=nonroot:nonroot /app/public ./public
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=builder --chown=nonroot:nonroot /app/prisma ./prisma
COPY --from=builder --chown=nonroot:nonroot /app/data /data

USER nonroot:nonroot
CMD ["server.js"]
