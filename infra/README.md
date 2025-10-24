# Infrastructure Deployment Guide

This guide provides a step-by-step tutorial on how to deploy the UGM-AICare project to a Virtual Machine (VM) using the provided infrastructure scripts and GitHub Actions workflows. This setup assumes an external reverse proxy (e.g., Nginx) is already configured on the VM to handle domain routing and HTTPS.

## 1. VM Prerequisites

Before you begin, ensure your target VM meets the following requirements:

*   **Operating System:** A Linux-based OS (e.g., Ubuntu Server, CentOS).
*   **Docker:** Install the latest version of Docker.
    *   [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
    *   [Install Docker Engine on CentOS](https://docs.docker.com/engine/install/centos/)
*   **Docker Compose V2:** Ensure `docker compose` command is available (not `docker-compose`). Docker Compose V2 is usually installed with Docker Desktop or can be installed separately.
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
*   **Firewall Configuration:** Configure your VM's firewall to allow incoming traffic on the necessary ports:
    *   **Port 8000:** For the Backend (FastAPI) service.
    *   **Port 4000:** For the Frontend (Next.js) service.
    *   **Port 22:** For SSH access.
    *   Example (UFW on Ubuntu):
        ```bash
        sudo ufw allow 8000/tcp
        sudo ufw allow 4000/tcp
        sudo ufw allow 22/tcp
        sudo ufw enable
        ```
*   **Deploy User:** Create a dedicated SSH user on the VM with appropriate permissions to manage Docker and the project directory. This user should have `sudo` privileges for Docker commands without requiring a password (e.g., by adding them to the `docker` group).
    ```bash
    sudo useradd -m -s /bin/bash deployuser
    sudo usermod -aG docker deployuser
    sudo mkdir -p /home/deployuser/.ssh
    # Copy your public SSH key to /home/deployuser/.ssh/authorized_keys
    sudo chown -R deployuser:deployuser /home/deployuser/.ssh
    sudo chmod 700 /home/deployuser/.ssh
    sudo chmod 600 /home/deployuser/.ssh/authorized_keys
    ```
*   **Project Path:** Decide on an absolute path on the VM where the project repository will be cloned (e.g., `/opt/ugm-aicare`). Ensure the `deployuser` has write permissions to this directory.
*   **Reverse Proxy Configuration (Nginx/Apache):** You will need to configure your existing Nginx (or other reverse proxy) to forward traffic from your domain (e.g., `aicare.sumbu.xyz`) to the Docker containers running on `localhost:4000` (frontend) and `localhost:8000` (backend). This includes handling HTTPS/SSL termination at the Nginx level.

## 2. GitHub Secrets Configuration

The deployment process relies on GitHub Secrets to securely store sensitive information. Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

*   **`VM_SSH_HOST`**: The IP address or hostname of your deployment VM.
*   **`VM_SSH_USER`**: The SSH username for connecting to the VM (e.g., `deployuser`).
*   **`VM_SSH_PRIVATE_KEY`**: The SSH private key (PEM format) for authentication. Ensure this key corresponds to the public key added to your `deployuser`'s `authorized_keys` file on the VM.
*   **`VM_PROJECT_PATH`**: The absolute path to the project directory on the VM (e.g., `/opt/ugm-aicare`). This is where the repository will be cloned and managed.
*   **`ENV_FILE_PRODUCTION`**: (Optional, but highly recommended) A multi-line secret containing the entire `.env` file content for your production environment. This secret will be written to a `.env` file in the `VM_PROJECT_PATH` on the VM during deployment, providing necessary environment variables for your services (e.g., `DATABASE_URL`, `POSTGRES_USER`, `REDIS_HOST`, `MINIO_ACCESS_KEY`, etc.).

## 3. Deployment Steps (using GitHub Actions)

Once your VM is prepared and GitHub Secrets are configured, deployments are automated via GitHub Actions.

### Automatic Deployment (on `push` to `main`)

Any `push` event to the `main` branch will automatically trigger the `CD Pipeline - Deploy to VM` workflow (`.github/workflows/deploy.yml`). This workflow will:

1.  Build, test, scan, and push Docker images to GHCR (via `ci.yml`).
2.  SSH into your VM.
3.  Clone/update the repository at `VM_PROJECT_PATH`.
4.  Write the `ENV_FILE_PRODUCTION` secret to a `.env` file.
5.  Execute the `./infra/scripts/deploy.sh` script with the latest commit SHA.
6.  The `deploy.sh` script will then:
    *   Log in to GHCR.
    *   Pull the latest `backend` and `frontend` Docker images.
    *   Run database migrations using `./infra/scripts/migrate.sh`.
    *   Bring up the services using `docker compose -f infra/compose/docker-compose.prod.yml` up -d.
    *   Perform health checks against the locally exposed service ports.

### Manual Deployment

You can also trigger a deployment manually:

1.  Navigate to the `Actions` tab in your GitHub repository.
2.  Select the `CD Pipeline - Deploy to VM` workflow from the left sidebar.
3.  Click on the "Run workflow" dropdown button.
4.  Ensure the `main` branch is selected.
5.  Leave the `rollback_sha` field empty for a standard deployment of the latest `main` branch.
6.  Click "Run workflow".

## 4. Rollback Procedure

In case of a faulty deployment, you can easily rollback to a previous stable version:

1.  Navigate to the `Actions` tab in your GitHub repository.
2.  Select the `CD Pipeline - Deploy to VM` workflow.
3.  Click on the "Run workflow" dropdown button.
4.  In the `rollback_sha` input field, enter the **Git SHA** of the commit you wish to rollback to (e.g., a SHA from a previous successful deployment).
5.  Click "Run workflow".

The workflow will then execute the `rollback` job, which will pull and deploy the specified older version of the application, ensuring your application returns to a stable state.

## 6. Customizing Ports and Environment Variables

It may be necessary to change the default exposed ports (4000 for frontend, 8000 for backend) or other environment variables for your specific deployment.

### Changing Exposed Ports

The exposed ports for the `frontend` and `backend` services are defined in `infra/compose/docker-compose.prod.yml` within the `ports` section of each service.

*   **Frontend:**
    ```yaml
    frontend:
      ports:
        - "4000:3000" # Host_Port:Container_Port
    ```
    To change the host port (e.g., to 4001), modify this line to `- "4001:3000"`. The container port (3000) should generally remain unchanged unless you modify the frontend Dockerfile.

*   **Backend:**
    ```yaml
    backend:
      ports:
        - "8000:8000" # Host_Port:Container_Port
    ```
    To change the host port (e.g., to 8001), modify this line to `- "8001:8000"`. The container port (8000) should generally remain unchanged unless you modify the backend Dockerfile.

**Important:** If you change these host ports, you must also update your Nginx (or other reverse proxy) configuration on the VM to proxy traffic to the new host ports. Additionally, ensure your VM's firewall rules are updated to allow traffic on the new ports.

### Overriding Configuration with `docker-compose.override.yml`

For temporary changes, local testing, or specific VM setups where you don't want to modify `infra/compose/docker-compose.prod.yml` directly, you can use a `docker-compose.override.yml` file.

1.  **Create an override file:** In the `VM_PROJECT_PATH` directory on your VM, create a file named `docker-compose.override.yml`.
2.  **Define overrides:** In this file, specify only the services and properties you wish to override. For example, to change the frontend port to 4001:
    ```yaml
    # docker-compose.override.yml
    services:
      frontend:
        ports:
          - "4001:3000"
    ```
3.  **Apply overrides:** When running `docker compose`, it automatically looks for `docker-compose.override.yml` in the same directory as `docker-compose.yml` (or `docker-compose.prod.yml` in our case). The `deploy.sh` script already uses `-f infra/compose/docker-compose.prod.yml`, so if you place `docker-compose.override.yml` in the `infra/compose/` directory, it will be picked up automatically.
    ```bash
    # The deploy.sh script will implicitly use this if present in infra/compose/
    docker compose -f infra/compose/docker-compose.prod.yml up -d
    # Or explicitly:
    docker compose -f infra/compose/docker-compose.prod.yml -f infra/compose/docker-compose.override.yml up -d
    ```
    **Note:** For this to work seamlessly with the `deploy.sh` script, you would typically place `docker-compose.override.yml` alongside `docker-compose.prod.yml` in `infra/compose/`. However, since `deploy.sh` only explicitly references `docker-compose.prod.yml`, you would need to modify `deploy.sh` to explicitly include the override file if it's not automatically picked up by Docker Compose's default behavior (which it usually is if named `docker-compose.override.yml` in the same directory).

### Environment Variables

Environment variables like `FRONTEND_URL`, `BACKEND_URL`, `ALLOWED_ORIGINS`, and `NEXT_PUBLIC_API_URL` are crucial for inter-service communication and external access.

*   These variables are loaded from the `.env` file (generated from `ENV_FILE_PRODUCTION` secret) at the root of your `VM_PROJECT_PATH`.
*   Ensure that the values in your `ENV_FILE_PRODUCTION` secret correctly reflect the ports and domains your Nginx is configured to use. For example, if Nginx exposes your frontend on `https://your-domain.com` and your backend API on `https://your-domain.com/api`, then your `.env` should contain:
    ```
    FRONTEND_URL=https://your-domain.com
    BACKEND_URL=https://your-domain.com/api
    ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
    NEXT_PUBLIC_API_URL=https://your-domain.com/api
    ```
    If Nginx is proxying to `localhost:4000` and `localhost:8000`, then the current default values in `infra/compose/docker-compose.prod.yml` (e.g., `http://localhost:4000`) are appropriate for the containers' internal view. The `ENV_FILE_PRODUCTION` secret should then contain the values that the application itself needs to know about its public-facing URLs.

## 7. Troubleshooting Tips

*   **SSH Connection Issues:**
    *   Verify `VM_SSH_HOST`, `VM_SSH_USER`, and `VM_SSH_PRIVATE_KEY` secrets are correct.
    *   Ensure the public key corresponding to `VM_SSH_PRIVATE_KEY` is correctly added to `~/.ssh/authorized_keys` for the `deployuser` on the VM.
    *   Check VM firewall rules (Port 22).
*   **Docker/Docker Compose Issues:**
    *   Ensure Docker and Docker Compose V2 are correctly installed and running on the VM.
    *   Verify the `deployuser` is part of the `docker` group and can run Docker commands without `sudo`.
*   **Environment Variables (`.env`) Issues:**
    *   Double-check the `ENV_FILE_PRODUCTION` secret for correct syntax and all required variables.
    *   Ensure there are no hidden characters (like carriage returns) in the secret that might corrupt the `.env` file on Linux.
*   **Migration Failures:**
    *   Check the logs of the `deploy` workflow for output from `infra/scripts/migrate.sh`.
    *   Ensure `DATABASE_URL` in your `.env` file is correct and the database service is healthy.
*   **Application Health Check Failures:**
    *   Verify the application logs of the `backend` and `frontend` containers on the VM for errors.
    *   Check VM firewall rules for ports 8000 and 4000.
    *   Ensure the services are actually listening on the expected ports inside the Docker containers.
*   **Nginx/Reverse Proxy Issues:**
    *   Ensure Nginx is running and correctly configured to proxy requests to `localhost:4000` (frontend) and `localhost:8000` (backend).
    *   Verify Nginx's SSL configuration is correct and certificates are valid.
    *   Check Nginx access and error logs for clues.
