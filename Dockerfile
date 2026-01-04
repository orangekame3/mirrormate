FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3), bun, and git deps
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Bun for faster dependency installation
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Ensure public directory exists (may not exist in some projects)
RUN mkdir -p public

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config

# Copy plugin package.json files for runtime manifest loading
# Each plugin needs its package.json for manifest loading
COPY --from=builder /app/node_modules/mirrormate-clock-plugin/package.json ./node_modules/mirrormate-clock-plugin/package.json

# Copy better-sqlite3 native module
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Create data directory for SQLite database
RUN mkdir -p data && chown nextjs:nodejs data

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

CMD ["node", "server.js"]
