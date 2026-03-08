# Summit Client Dockerfile
#
# Multi-stage build for Railway deployment

# ============ Build Stage ============
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_PUBLIC_API_URL
ARG VITE_PUBLIC_WS_URL
ARG VITE_PUBLIC_CHAIN=SN_MAIN
ARG VITE_PUBLIC_SUMMIT_ADDRESS=0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa
ARG VITE_PUBLIC_POSTHOG_KEY
ARG VITE_PUBLIC_POSTHOG_HOST
ENV VITE_PUBLIC_API_URL=$VITE_PUBLIC_API_URL
ENV VITE_PUBLIC_WS_URL=$VITE_PUBLIC_WS_URL
ENV VITE_PUBLIC_CHAIN=$VITE_PUBLIC_CHAIN
ENV VITE_PUBLIC_SUMMIT_ADDRESS=$VITE_PUBLIC_SUMMIT_ADDRESS
ENV VITE_PUBLIC_POSTHOG_KEY=$VITE_PUBLIC_POSTHOG_KEY
ENV VITE_PUBLIC_POSTHOG_HOST=$VITE_PUBLIC_POSTHOG_HOST

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && \
    corepack prepare pnpm@10 --activate && \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# ============ Production Stage ============
FROM caddy:2.8.4-alpine AS production

WORKDIR /srv

RUN addgroup -S app && adduser -S -D -H -u 10001 -G app app

COPY --from=builder --chown=app:app /app/dist /srv
COPY --chown=app:app Caddyfile /etc/caddy/Caddyfile

ENV PORT=3000

USER app

EXPOSE 3000
