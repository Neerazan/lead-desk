# Stage 1: Base image
FROM node:22-alpine AS base

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 (DEV): Hot-reload dev server
# Used by docker-compose.override.yml — source is mounted as a volume.
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS dev
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies (layer-cached; re-runs only on package.json changes)
COPY package.json package-lock.json ./
RUN npm ci

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Source code is provided via volume mount at runtime — no COPY needed.
CMD ["npm", "run", "dev"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Install dependencies (shared by builder)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 (PROD): Build optimised production bundle
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Bake the internal Docker backend URL so Next.js rewrites compile correctly.
ARG INTERNAL_API_URL=http://backend:8000
ENV INTERNAL_API_URL=${INTERNAL_API_URL}

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 5 (PROD): Minimal production runner (non-root)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server output
COPY --from=builder /app/public ./public

# Set proper ownership for next cache and standalone bundle
RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
