FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/core/package.json ./packages/core/
COPY packages/skills/package.json ./packages/skills/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY packages/ ./packages/

# Build
FROM base AS builder
RUN npm run build

# ── Server image ─────────────────────────────────────────────
FROM node:20-alpine AS server
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/skills/dist ./packages/skills/dist
COPY --from=builder /app/packages/skills/package.json ./packages/skills/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/packages/web/package.json ./packages/web/
RUN npm install --omit=dev
EXPOSE 3001
CMD ["node", "packages/server/dist/index.js"]
