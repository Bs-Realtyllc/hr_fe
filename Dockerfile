# ── build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time by
# webpack — they must be passed in here as build-args, not just as runtime
# env vars on the container. See docker-compose.main.yml / .drone.yml.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_LEARNING_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_LEARNING_URL=$NEXT_PUBLIC_LEARNING_URL

RUN npm run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache dumb-init curl
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/public       ./public
COPY --from=builder --chown=appuser:nodejs /app/.next/standalone ./
COPY --from=builder --chown=appuser:nodejs /app/.next/static  ./.next/static

USER appuser

EXPOSE 6001
ENV NODE_ENV=production
ENV PORT=6001
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
