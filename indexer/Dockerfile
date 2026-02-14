# Summit Indexer Dockerfile
#
# Multi-stage build for optimized production image

# ============ Build Stage ============
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source files
COPY . .

# Build the indexer
RUN npm run build

# ============ Production Stage ============
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S indexer -u 1001 -G nodejs

# Install production dependencies + tsx for status check script
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm install --no-save --legacy-peer-deps tsx && \
    npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/.apibara ./.apibara
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/apibara.config.ts ./apibara.config.ts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/indexers ./indexers
COPY --from=builder /app/scripts ./scripts

# Switch to non-root user
USER indexer

# Environment variables (override at runtime)
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://postgres:postgres@postgres:5432/summit
ENV STREAM_URL=https://mainnet.starknet.a5a.ch
ENV WORLD_ADDRESS=0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a
ENV STARTING_BLOCK=2125240
ENV NAMESPACE=summit_relayer_6

# Health check - just verify node process is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Run DNA status check then start indexer
CMD ["sh", "-c", "npm run check-dna && npm run start -- --indexer=summit"]
