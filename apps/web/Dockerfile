# pgPulse web UI: build the static site with Vite, serve it with nginx.
# Build from the REPO ROOT:
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=http://localhost:4000 -t pgpulse-web .

# ── 1. Build ─────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
# Full install (dev deps included: Vite, Tailwind) for the web workspace only.
# npm picks the Linux (musl) native binaries for Vite/Tailwind from the lockfile.
RUN npm ci --workspace=@pgpulse/web

COPY apps/web ./apps/web

# The browser talks to the API directly, so its URL is baked into the bundle
# at build time. Vite exposes VITE_* environment variables to the app.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

# vite build only: type-checking (tsc -b) is a CI job, not an image-build step.
RUN npx --workspace=@pgpulse/web vite build

# ── 2. Serve ─────────────────────────────────────────────────
# nginx-unprivileged runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
