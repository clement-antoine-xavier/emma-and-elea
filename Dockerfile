# syntax=docker/dockerfile:1
ARG NODE_VERSION=26.12.1
ARG ALPINE_VERSION=3.24
ARG NODE_IMAGE=node:${NODE_VERSION}-alpine${ALPINE_VERSION}

# ============================================
# Stage 1: Install dependencies
# ============================================

FROM ${NODE_IMAGE} AS installer

WORKDIR /usr/local/src/emma-and-elea

# Prisma's postinstall runs `prisma generate`, so the schema and config must be
# present before `npm ci`.
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma7.config.ts ./

RUN --mount=type=cache,target=/root/.npm \
  npm ci --no-audit --no-fund

# ============================================
# Stage 2: Build the Next.js standalone app
# ============================================

FROM ${NODE_IMAGE} AS builder

WORKDIR /usr/local/src/emma-and-elea

COPY --from=installer /usr/local/src/emma-and-elea/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders. The auth module is imported while Next.js collects
# route handlers, and Prisma's adapter is constructed at module scope. These
# values live only in the builder stage; the runner receives real values from
# Compose at runtime.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV BETTER_AUTH_SECRET="build-time-placeholder-secret-000000000000"
ENV BETTER_AUTH_URL="http://localhost:3000"

RUN npm run build

# ============================================
# Stage 3: One-shot migration runner
# ============================================

FROM ${NODE_IMAGE} AS migrator

WORKDIR /usr/local/src/emma-and-elea

COPY --from=installer /usr/local/src/emma-and-elea/node_modules ./node_modules
COPY package.json prisma7.config.ts ./
COPY prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy"]

# ============================================
# Stage 4: Production runtime
# ============================================

FROM ${NODE_IMAGE} AS runner

WORKDIR /usr/local/src/emma-and-elea

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js writes runtime caches here, so the directory must be writable by the
# unprivileged node user.
RUN mkdir -p .next && chown node:node .next

COPY --from=builder --chown=node:node /usr/local/src/emma-and-elea/public ./public
COPY --from=builder --chown=node:node /usr/local/src/emma-and-elea/.next/standalone ./
COPY --from=builder --chown=node:node /usr/local/src/emma-and-elea/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
