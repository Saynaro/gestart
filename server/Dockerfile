# ==============================================================================
# GESTART BACKEND — DOCKERFILE (Node.js 22 + Prisma + Chromium for PDF)
# ==============================================================================
FROM node:22-bookworm-slim

# Install Chromium & fonts for Puppeteer PDF generation + OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema & config and generate Prisma Client
COPY prisma ./prisma
COPY prisma.config.js ./
RUN npx prisma generate

# Copy backend source code
COPY src ./src

EXPOSE 5001

# Entrypoint runs Prisma schema sync/migrations and starts the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]

