#!/bin/bash
# deploy-prod.sh
# Deploys or restarts the production application on the VM.
# Assumes it's run from the project root on the VM.

echo "Starting production deployment/restart..."

# Navigate to the script's directory (optional, but good practice if script is not in project root)
# DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# cd "$DIR"

# 1. Pull the latest changes from your Git repository
echo "Pulling latest code from Git..."
git pull
# Add error handling for git pull if desired
# if [ $? -ne 0 ]; then
#     echo "Git pull failed. Aborting."
#     exit 1
# fi

# 2. Ensure the production .env file is correctly configured on the VM.
# (This script doesn't manage .env content, just a reminder)
if [ ! -f .env ]; then
    echo "WARNING: Production .env file not found. Please ensure it exists and is configured."
    # Optionally exit if .env is critical and missing
    # exit 1
fi

# 3. Build and restart Docker containers in detached mode
echo "Building and restarting Docker containers..."
# The --remove-orphans flag removes containers for services no longer defined in docker-compose.yml
docker-compose up --build -d --remove-orphans

# 4. Optional: Display logs for a few seconds or follow them
echo "Displaying logs for frontend and backend (Ctrl+C to stop)..."
# Timeout after 30 seconds, or remove timeout to follow indefinitely
timeout 30s docker-compose logs -f frontend backend || true 
# The '|| true' ensures the script doesn't exit with an error if timeout is reached or logs are interrupted

# 5. Optional: Prune old Docker images and volumes to save space
# Use with caution, especially if you need to roll back quickly to older images.
# echo "Pruning old Docker images and volumes..."
# docker image prune -af
# docker volume prune -f

echo "Production deployment/restart script finished."