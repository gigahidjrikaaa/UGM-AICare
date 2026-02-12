# syntax=docker/dockerfile:1.6

# frontend/Dockerfile

# Pin Node major version for reproducible builds across stages.
ARG NODE_IMAGE=node:20-bookworm-slim

# 1. Development Stage ('development')
FROM ${NODE_IMAGE} AS development

# Set working directory
WORKDIR /app

# Disable Next telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package.json and lock file
COPY package.json package-lock.json ./
# Install dependencies. Prefer npm ci for reproducibility, but fall back to npm install
# if the lockfile is out of sync (avoids CI hard-fail during deployment).
RUN --mount=type=cache,target=/root/.npm \
	sh -lc "npm ci --no-audit --no-fund || npm install --no-audit --no-fund"

# Copy the rest of the application code
COPY . .

# Expose the port Next.js runs on
EXPOSE 22000

# Default command for development (runs dev server)
CMD ["npm", "run", "dev:docker"]


# ---


# 2. Production Build Stage ('builder')
# Use the development stage as a base or start fresh
FROM ${NODE_IMAGE} AS builder

WORKDIR /app

# Disable Next telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Copy dependency manifests
COPY package.json package-lock.json ./

# Prefer clean install for exact versions, but fall back to npm install if lockfile drift exists.
RUN --mount=type=cache,target=/root/.npm \
	sh -lc "npm ci --prefer-offline --no-audit --no-fund || npm install --prefer-offline --no-audit --no-fund"

# Copy the rest of the source code
COPY . .

# Set build-time environment variables
# These will be baked into the static assets by Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Add other NEXT_PUBLIC_ ARGs and ENVs here

# Build the Next.js application
# Disable Turbopack in production (use webpack for stability)
# Increase Node memory limit to prevent OOM during build
ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN npm run build


# ---


# 3. Production Runtime Stage ('production')
# Use a minimal Node.js image for the final production image
FROM ${NODE_IMAGE} AS production

WORKDIR /app

# Set environment for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Sensible defaults for platform runtimes (Coolify will typically override PORT)
ENV HOSTNAME=0.0.0.0
ENV PORT=22000

# Copy built artifacts from the 'builder' stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Expose the port Next.js runs on
EXPOSE 22000

# Set user to non-root (good practice)
USER node

# Command to run the optimized production server
CMD ["node", "server.js"]

# Note: Requires 'output: "standalone"' in next.config.ts for this setup
# If not using standalone, adjust the copy steps and CMD accordingly
# CMD ["npm", "start"] might work if standalone is not used,
# but you need to copy node_modules from the builder stage as well.