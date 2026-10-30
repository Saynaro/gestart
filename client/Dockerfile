# ==============================================================================
# STAGE 1: BUILD REACT / VITE FRONTEND
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments injected at compile time for Vite
ARG VITE_BACKEND_URL=https://api.gestart.com
ARG VITE_API_URL=https://api.gestart.com/api
ARG VITE_FRONTEND_URL=https://gestart.com

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==============================================================================
# STAGE 2: SERVE WITH NGINX (AUTO-DETECTS HTTP OR HTTPS SSL)
# ==============================================================================
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf && mkdir -p /etc/nginx/templates /var/www/certbot

# Copy both HTTP and HTTPS Nginx templates
COPY nginx.conf /etc/nginx/templates/nginx-http.conf
COPY nginx-ssl.conf /etc/nginx/templates/nginx-ssl.conf
COPY docker-entrypoint.sh /docker-entrypoint-ssl.sh
RUN chmod +x /docker-entrypoint-ssl.sh

# Copy built React PWA assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["/docker-entrypoint-ssl.sh"]
