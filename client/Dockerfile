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
# STAGE 2: SERVE WITH NGINX (FRONTEND + API.GESTART.COM REVERSE PROXY)
# ==============================================================================
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (handles gestart.com & api.gestart.com)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React PWA assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]

