# OpenClaw Aurora - Dockerfile para Railway/Docker
FROM node:20-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia código fonte
COPY . .

# Compila TypeScript
RUN npm run build

# Expõe porta do WebSocket
EXPOSE 18789

# Variáveis de ambiente (serão sobrescritas no Railway)
ENV NODE_ENV=production
ENV PORT=18789

# Inicia o servidor
CMD ["npm", "start"]
