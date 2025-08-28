#!/bin/bash
# start-dev.sh
# Starts the development environment using Docker Compose.
# Assumes docker-compose.override.yml exists for development-specific settings.

echo "Starting development environment..."

# Navigate to the script's directory (optional, but good practice if script is not in project root)
# DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# cd "$DIR"

# Ensure local .env files (like frontend/.env.local) are in place if your app needs them
# (This script doesn't manage them, just a reminder)

# Build and start containers.
# The -f flags are technically not needed if docker-compose.override.yml is present,
# as Docker Compose picks it up automatically, but it's explicit.
# Remove --build if you don't want to rebuild images every time.
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d

# If you prefer to run in detached mode and then view logs:
# docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
# docker-compose logs -f frontend backend

echo "Development environment stopped."