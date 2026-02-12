# ==============================================================================
# OpenClaw Aurora - Production Dockerfile
# Multi-stage build para imagem menor e mais segura
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Builder - Compila TypeScript
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar apenas package files primeiro (aproveita cache do Docker)
COPY package*.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci --only=production=false

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# ------------------------------------------------------------------------------
# STAGE 2: Runtime - Imagem final enxuta
# ------------------------------------------------------------------------------
FROM node:20-alpine

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Criar usuário não-root para segurança
RUN adduser -D -h /app openclaw

# Definir working directory
WORKDIR /app

# Mudar para usuário não-root
USER openclaw

# Copiar apenas o necessário do builder
COPY --from=builder --chown=openclaw:openclaw /app/dist ./dist
COPY --from=builder --chown=openclaw:openclaw /app/node_modules ./node_modules
COPY --from=builder --chown=openclaw:openclaw /app/package.json ./
COPY --from=builder --chown=openclaw:openclaw /app/.openclaw.json ./.openclaw.json

# Copiar diretórios auxiliares (se existirem)
COPY --from=builder --chown=openclaw:openclaw /app/agents ./agents 2>/dev/null || true
COPY --from=builder --chown=openclaw:openclaw /app/transforms ./transforms 2>/dev/null || true
COPY --from=builder --chown=openclaw:openclaw /app/skills ./skills 2>/dev/null || true

# Expor porta do WebSocket
EXPOSE 18789

# Variáveis de ambiente (serão sobrescritas no Railway)
ENV NODE_ENV=production
ENV PORT=18789

# Healthcheck nativo do Docker
# Verifica se WebSocket server está respondendo em /health
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:18789/health || exit 1

# Inicia o servidor (como usuário não-root)
CMD ["node", "dist/start-all.js"]
