# ============================================================
# xClaw v2.1.0 — Multi-stage Docker build
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app

# ─── Dependencies ────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/core/package.json ./packages/core/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/domains/package.json ./packages/domains/
COPY packages/ml/package.json ./packages/ml/
COPY packages/skills/package.json ./packages/skills/
COPY packages/skill-hub/package.json ./packages/skill-hub/
COPY packages/gateway/package.json ./packages/gateway/
COPY packages/server/package.json ./packages/server/
COPY packages/cli/package.json ./packages/cli/
COPY packages/channels/telegram/package.json ./packages/channels/telegram/
COPY packages/channels/facebook/package.json ./packages/channels/facebook/
COPY packages/channels/discord/package.json ./packages/channels/discord/
COPY packages/channels/slack/package.json ./packages/channels/slack/
COPY packages/channels/whatsapp/package.json ./packages/channels/whatsapp/
COPY packages/channels/zalo/package.json ./packages/channels/zalo/
COPY packages/channels/msteams/package.json ./packages/channels/msteams/
COPY packages/sandbox/package.json ./packages/sandbox/
COPY packages/doc-mcp/package.json ./packages/doc-mcp/
COPY packages/web/package.json ./packages/web/
RUN npm install

# ─── Build ───────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build server-side packages only
RUN npx tsc -b packages/shared && \
    npx tsc -b packages/db && \
    rm -rf packages/db/dist/migrations && \
    cp -r packages/db/src/migrations packages/db/dist/migrations && \
    npx tsc -b packages/core && \
    npx tsc -b packages/integrations && \
    npx tsc -b packages/domains && \
    npx tsc -b packages/ml && \
    npx tsc -b packages/sandbox && \
    npx tsc -b packages/skills && \
    npx tsc -b packages/skill-hub && \
    npx tsc -b packages/channels/telegram && \
    npx tsc -b packages/channels/facebook && \
    npx tsc -b packages/channels/discord && \
    npx tsc -b packages/channels/slack && \
    npx tsc -b packages/channels/whatsapp && \
    npx tsc -b packages/channels/zalo && \
    npx tsc -b packages/channels/msteams && \
    npx tsc -b packages/doc-mcp && \
    npx tsc -b packages/gateway && \
    npx tsc -b packages/server

# ─── Production ──────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# Run as non-root user for security
RUN addgroup -g 1001 -S xclaw && \
    adduser -S xclaw -u 1001 -G xclaw

# Copy built artifacts
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/integrations/dist ./packages/integrations/dist
COPY --from=builder /app/packages/integrations/package.json ./packages/integrations/
COPY --from=builder /app/packages/domains/dist ./packages/domains/dist
COPY --from=builder /app/packages/domains/package.json ./packages/domains/
COPY --from=builder /app/packages/ml/dist ./packages/ml/dist
COPY --from=builder /app/packages/ml/package.json ./packages/ml/
COPY --from=builder /app/packages/sandbox/dist ./packages/sandbox/dist
COPY --from=builder /app/packages/sandbox/package.json ./packages/sandbox/
COPY --from=builder /app/packages/skills/dist ./packages/skills/dist
COPY --from=builder /app/packages/skills/package.json ./packages/skills/
COPY --from=builder /app/packages/skill-hub/dist ./packages/skill-hub/dist
COPY --from=builder /app/packages/skill-hub/package.json ./packages/skill-hub/
COPY --from=builder /app/packages/channels/telegram/dist ./packages/channels/telegram/dist
COPY --from=builder /app/packages/channels/telegram/package.json ./packages/channels/telegram/
COPY --from=builder /app/packages/channels/facebook/dist ./packages/channels/facebook/dist
COPY --from=builder /app/packages/channels/facebook/package.json ./packages/channels/facebook/
COPY --from=builder /app/packages/channels/discord/dist ./packages/channels/discord/dist
COPY --from=builder /app/packages/channels/discord/package.json ./packages/channels/discord/
COPY --from=builder /app/packages/channels/slack/dist ./packages/channels/slack/dist
COPY --from=builder /app/packages/channels/slack/package.json ./packages/channels/slack/
COPY --from=builder /app/packages/channels/whatsapp/dist ./packages/channels/whatsapp/dist
COPY --from=builder /app/packages/channels/whatsapp/package.json ./packages/channels/whatsapp/
COPY --from=builder /app/packages/channels/zalo/dist ./packages/channels/zalo/dist
COPY --from=builder /app/packages/channels/zalo/package.json ./packages/channels/zalo/
COPY --from=builder /app/packages/channels/msteams/dist ./packages/channels/msteams/dist
COPY --from=builder /app/packages/channels/msteams/package.json ./packages/channels/msteams/
COPY --from=builder /app/packages/doc-mcp/dist ./packages/doc-mcp/dist
COPY --from=builder /app/packages/doc-mcp/package.json ./packages/doc-mcp/
COPY --from=builder /app/packages/gateway/dist ./packages/gateway/dist
COPY --from=builder /app/packages/gateway/package.json ./packages/gateway/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/data/dev-docs ./data/dev-docs
RUN chown -R xclaw:xclaw ./data

USER xclaw
EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
