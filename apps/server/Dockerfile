# pgPulse API server
# Build from the REPO ROOT (the monorepo lockfile lives there):
#   docker build -f apps/server/Dockerfile -t pgpulse-server .

# ── 1. Dependencies (production only) ────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only the manifests first, so this layer is cached until dependencies change.
# npm ci checks the lockfile against EVERY workspace, so both package.json files are needed.
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/

# Install just the server workspace's runtime dependencies (no devDependencies,
# no web packages) and skip install scripts.
RUN npm ci --omit=dev --workspace=@pgpulse/server --ignore-scripts \
 && npm cache clean --force

# ── 2. Runtime ───────────────────────────────────────────────
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app ./
COPY apps/server/src ./apps/server/src

# The official image ships an unprivileged "node" user; never run as root.
USER node
WORKDIR /app/apps/server

EXPOSE 4000
# Configuration comes from environment variables (see docker-compose.yml).
CMD ["node", "src/index.js"]
