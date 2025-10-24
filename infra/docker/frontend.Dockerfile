# frontend/Dockerfile

# 1. Development Stage ('development')
# Use an official Node.js image. Check your required Node version (e.g., 18, 20)
FROM node:slim as development

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package.json package-lock.json* ./
# Install dependencies using npm ci (clean install based on lock file)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the port Next.js runs on
EXPOSE 3000

# Default command for development (runs dev server)
CMD ["npm", "run", "dev:docker"]


# ---


# 2. Production Build Stage ('builder')
# Use the development stage as a base or start fresh
FROM node:slim as builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci

# Copy the rest of the source code
COPY . .

# Set build-time environment variables
# These will be baked into the static assets by Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Add other NEXT_PUBLIC_ ARGs and ENVs here

# Build the Next.js application
RUN npm run build
RUN echo "NEXT_PUBLIC_API_URL is $NEXT_PUBLIC_API_URL"


# ---


# 3. Production Runtime Stage ('production')
# Use a minimal Node.js image for the final production image
FROM node:slim as production

WORKDIR /app

# Set environment for production
ENV NODE_ENV production

# Copy built artifacts from the 'builder' stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Expose the port Next.js runs on
EXPOSE 3000

# Set user to non-root (good practice)
USER node

# Command to run the optimized production server
CMD ["node", "server.js"]

# Note: Requires 'output: "standalone"' in next.config.ts for this setup
# If not using standalone, adjust the copy steps and CMD accordingly
# CMD ["npm", "start"] might work if standalone is not used,
# but you need to copy node_modules from the builder stage as well.