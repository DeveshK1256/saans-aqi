# Multi-stage non-root Dockerfile for Saans on Google Cloud Run
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Step 1: Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Step 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Step 3: Production runner (non-root)
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Non-root user setup
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Public & static assets
COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
