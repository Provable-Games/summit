# Summit Client Dockerfile
#
# Multi-stage build for Railway deployment

# ============ Build Stage ============
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_PUBLIC_CHAIN=SN_MAIN
ARG VITE_PUBLIC_SUMMIT_ADDRESS=0x01aa95ea66e7e01acf7dc3fda8be0d8661230c4c36b0169e2bab8ab4d6700dfc
ENV VITE_PUBLIC_CHAIN=$VITE_PUBLIC_CHAIN
ENV VITE_PUBLIC_SUMMIT_ADDRESS=$VITE_PUBLIC_SUMMIT_ADDRESS

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && \
    corepack prepare pnpm@10.0.0 --activate && \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# ============ Production Stage ============
FROM caddy:2.8.4-alpine AS production

WORKDIR /srv

COPY --from=builder /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

ENV PORT=3000

EXPOSE 3000
