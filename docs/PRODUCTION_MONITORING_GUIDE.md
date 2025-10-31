# Production Monitoring Integration Guide

**Last Updated:** October 31, 2025  
**Status:** ✅ Fully Integrated

This document describes the complete monitoring integration for UGM-AICare production deployments.

---

## 📋 Overview

The monitoring stack has been fully integrated into the production CI/CD pipeline and deployment scripts. It includes:

- **ELK Stack** (Elasticsearch, Logstash, Kibana, Filebeat) - Log aggregation and visualization
- **Prometheus + Grafana** - Metrics collection and visualization
- **Langfuse** - Agent tracing and LLM observability
- **AlertManager** - Alert routing and notifications
- **Exporters** - Node, cAdvisor, PostgreSQL, Redis metrics

---

## 🚀 Deployment Options

### Option 1: Deploy with Monitoring (Recommended)

**Via CI/CD (Automatic):**
```bash
# Push to main branch - monitoring is deployed by default
git push origin main
```

**Via Manual Deployment:**
```bash
# On production server
cd /path/to/UGM-AICare
./deploy-prod.sh deploy-monitoring
```

**Via GitHub Actions (Manual Trigger):**
1. Go to Actions → CI/CD Pipeline → Run workflow
2. Set "Deploy monitoring stack" to `true`
3. Click "Run workflow"

### Option 2: Deploy Without Monitoring

**Via Manual Deployment:**
```bash
cd /path/to/UGM-AICare
./deploy-prod.sh deploy
```

**Via GitHub Actions:**
1. Go to Actions → CI/CD Pipeline → Run workflow
2. Set "Deploy monitoring stack" to `false`
3. Click "Run workflow"

### Option 3: Add Monitoring to Existing Deployment

```bash
# On production server
cd /path/to/UGM-AICare

# Setup Langfuse database and configuration
./deploy-prod.sh setup-langfuse

# Start monitoring stack
docker compose -f infra/compose/docker-compose.prod.yml \
               -f infra/compose/docker-compose.prod-monitoring.yml \
               --env-file .env up -d
```

---

## 🔧 Configuration

### Required Environment Variables

Add these to your production `.env` file (or GitHub Secret `ENV_FILE_PRODUCTION`):

```bash
# ============================================
# Langfuse (Agent Tracing)
# ============================================
LANGFUSE_ENABLED=true
LANGFUSE_HOST=http://localhost:8262
LANGFUSE_SECRET=<generate-with-openssl-rand-base64-32>
LANGFUSE_SALT=<generate-with-openssl-rand-base64-32>
LANGFUSE_NEXTAUTH_URL=http://localhost:8262
# Generate after first access to Langfuse UI:
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key-here
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key-here

# ============================================
# Monitoring Stack
# ============================================
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<strong-password-here>

# Optional: Slack alerts
ALERTMANAGER_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

MONITORING_ENABLED=true
```

### Generate Secrets

```bash
# Generate Langfuse secrets
openssl rand -base64 32  # Use for LANGFUSE_SECRET
openssl rand -base64 32  # Use for LANGFUSE_SALT

# Or use Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📊 Access Points (Production)

After deployment with monitoring enabled:

| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| **Kibana** (Logs) | 8254 | http://your-server:8254 | No auth |
| **Grafana** (Metrics) | 8256 | http://your-server:8256 | admin / `GRAFANA_ADMIN_PASSWORD` |
| **Prometheus** | 8255 | http://your-server:8255 | No auth |
| **Langfuse** (Traces) | 8262 | http://your-server:8262 | Create on first access |
| **AlertManager** | 8261 | http://your-server:8261 | No auth |
| **Backend Metrics** | 8000 | http://your-server:8000/metrics | No auth |

**⚠️ Security Note:** In production, these ports should be:
1. Blocked by firewall (only accessible via SSH tunnel or VPN)
2. Behind reverse proxy with authentication
3. Protected by network security groups

---

## 🔐 Secure Access (Recommended)

### Option 1: SSH Tunnel

```bash
# On your local machine
ssh -L 8254:localhost:8254 \
    -L 8256:localhost:8256 \
    -L 8255:localhost:8255 \
    -L 8262:localhost:8262 \
    user@your-production-server

# Then access locally:
# - Kibana: http://localhost:8254
# - Grafana: http://localhost:8256
# - Prometheus: http://localhost:8255
# - Langfuse: http://localhost:8262
```

### Option 2: Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/monitoring
server {
    listen 443 ssl;
    server_name monitoring.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Basic auth
    auth_basic "Monitoring Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location /kibana/ {
        proxy_pass http://localhost:8254/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /grafana/ {
        proxy_pass http://localhost:8256/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /prometheus/ {
        proxy_pass http://localhost:8255/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /langfuse/ {
        proxy_pass http://localhost:8262/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Server (VM)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Application Stack                            │   │
│  │  (docker-compose.prod.yml)                          │   │
│  │                                                      │   │
│  │  • Backend (FastAPI)    → Port 8000                 │   │
│  │  • Frontend (Next.js)   → Port 4000                 │   │
│  │  • Database (PostgreSQL)                            │   │
│  │  • Cache (Redis)                                    │   │
│  │  • Storage (MinIO)                                  │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │ Shared Networks:                            │
│               │ - internal_network                          │
│               │ - monitoring                                │
│               ▼                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Monitoring Stack                            │   │
│  │  (docker-compose.prod-monitoring.yml)               │   │
│  │                                                      │   │
│  │  Log Pipeline:                                       │   │
│  │  Containers → Filebeat → Logstash → Elasticsearch   │   │
│  │                                    → Kibana          │   │
│  │                                                      │   │
│  │  Metrics Pipeline:                                   │   │
│  │  Exporters → Prometheus → Grafana                   │   │
│  │             ↓                                        │   │
│  │        AlertManager                                  │   │
│  │                                                      │   │
│  │  Agent Tracing:                                      │   │
│  │  Backend → Langfuse → PostgreSQL                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 CI/CD Integration

### Workflow File: `.github/workflows/ci.yml`

**Key Features:**

1. **Workflow Input:**
   - `deploy_monitoring` (boolean, default: `true`)
   - Allows manual control of monitoring deployment

2. **Deployment Step:**
   ```yaml
   - name: Deploy to VM
     script: |
       DEPLOY_MONITORING="${{ github.event.inputs.deploy_monitoring || 'true' }}"
       ./infra/scripts/deploy.sh ${{ github.sha }} "$DEPLOY_MONITORING"
   ```

3. **Verification Step:**
   - Checks health of Prometheus, Grafana, Elasticsearch, Langfuse
   - Only runs if monitoring is deployed

### Deploy Script: `infra/scripts/deploy.sh`

**Enhanced with:**

1. **Monitoring Parameter:**
   ```bash
   GIT_SHA=$1
   DEPLOY_MONITORING=${2:-false}
   ```

2. **Langfuse Database Setup:**
   - Automatically creates `langfuse_db` if it doesn't exist

3. **Health Checks:**
   - Elasticsearch: `http://localhost:8250/_cluster/health`
   - Prometheus: `http://localhost:8255/-/healthy`
   - Langfuse: `http://localhost:8262/api/public/health`

4. **Deployment Summary:**
   - Displays all access URLs
   - Shows next steps for Langfuse API key generation

---

## 📈 Monitoring Components

### 1. Elasticsearch (Log Storage)

**Container:** `ugm_aicare_elasticsearch_prod`  
**Port:** 8250 (HTTP), 8251 (Transport)  
**Volume:** `elasticsearch_data`

**Health Check:**
```bash
curl http://localhost:8250/_cluster/health
```

**Configuration:**
- Single-node cluster
- 512MB heap size
- Security disabled (behind firewall)

### 2. Logstash (Log Processing)

**Container:** `ugm_aicare_logstash_prod`  
**Port:** 8252 (Beats input), 8253 (API)  
**Config:** `infra/elk/logstash/pipeline/`

**Pipeline:**
```
Filebeat → Logstash → Elasticsearch
```

### 3. Kibana (Log Visualization)

**Container:** `ugm_aicare_kibana_prod`  
**Port:** 8254  
**URL:** http://localhost:8254

**Index Pattern:** `ugm-aicare-*`

### 4. Filebeat (Log Shipping)

**Container:** `ugm_aicare_filebeat_prod`  
**Config:** `infra/elk/filebeat/filebeat.yml`

**Collects:**
- Docker container logs
- JSON-formatted application logs
- Metadata enrichment

### 5. Prometheus (Metrics Database)

**Container:** `ugm_aicare_prometheus_prod`  
**Port:** 8255  
**Volume:** `prometheus_data`  
**Retention:** 30 days

**Scrape Targets:**
- Backend: `http://backend:8000/metrics`
- Node Exporter: `http://node-exporter:9100/metrics`
- cAdvisor: `http://cadvisor:8080/metrics`
- PostgreSQL: `http://postgres-exporter:9187/metrics`
- Redis: `http://redis-exporter:9121/metrics`

### 6. Grafana (Metrics Visualization)

**Container:** `ugm_aicare_grafana_prod`  
**Port:** 8256  
**Volume:** `grafana_data`

**Datasources:**
- Prometheus (auto-provisioned)

**Dashboards:**
- Auto-provisioned from `infra/monitoring/grafana/dashboards/`

### 7. Langfuse (Agent Tracing)

**Container:** `ugm_aicare_langfuse_prod`  
**Port:** 8262  
**Database:** `langfuse_db` (PostgreSQL)

**First-Time Setup:**
1. Access http://localhost:8262
2. Create admin account
3. Create project: "ugm-aicare-agents"
4. Go to Settings → API Keys
5. Generate new key pair
6. Update `.env`:
   ```bash
   LANGFUSE_PUBLIC_KEY=pk-lf-<your-key>
   LANGFUSE_SECRET_KEY=sk-lf-<your-key>
   ```
7. Restart backend:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml restart backend
   ```

---

## 🧪 Testing & Validation

### 1. Verify All Services Running

```bash
docker ps --filter "name=ugm_aicare" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output should show:
- `ugm_aicare_backend`
- `ugm_aicare_frontend`
- `ugm_aicare_elasticsearch_prod`
- `ugm_aicare_prometheus_prod`
- `ugm_aicare_grafana_prod`
- `ugm_aicare_langfuse_prod`
- etc.

### 2. Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "Checking application health..."
curl -sf http://localhost:8000/health || echo "❌ Backend down"
curl -sf http://localhost:4000 || echo "❌ Frontend down"

echo ""
echo "Checking monitoring health..."
curl -sf http://localhost:8250/_cluster/health || echo "❌ Elasticsearch down"
curl -sf http://localhost:8255/-/healthy || echo "❌ Prometheus down"
curl -sf http://localhost:8256/api/health || echo "❌ Grafana down"
curl -sf http://localhost:8262/api/public/health || echo "❌ Langfuse down"

echo ""
echo "✅ All checks completed"
```

### 3. View Logs

```bash
# Application logs
docker compose -f infra/compose/docker-compose.prod.yml logs -f backend
docker compose -f infra/compose/docker-compose.prod.yml logs -f frontend

# Monitoring logs
docker logs -f ugm_aicare_elasticsearch_prod
docker logs -f ugm_aicare_prometheus_prod
docker logs -f ugm_aicare_langfuse_prod
```

### 4. Check Metrics Collection

```bash
# Check if Prometheus is scraping targets
curl http://localhost:8255/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check backend metrics endpoint
curl http://localhost:8000/metrics
```

---

## 🚨 Troubleshooting

### Issue: Monitoring services not starting

**Symptoms:** Containers exit immediately or health checks fail

**Solution:**
```bash
# Check logs
docker logs ugm_aicare_elasticsearch_prod
docker logs ugm_aicare_prometheus_prod
docker logs ugm_aicare_langfuse_prod

# Common issues:
# 1. Insufficient memory - increase Docker memory limit
# 2. Port conflicts - check if ports 8250-8262 are available
# 3. Volume permissions - ensure Docker has write access

# Restart specific service
docker compose -f infra/compose/docker-compose.prod.yml \
               -f infra/compose/docker-compose.prod-monitoring.yml \
               restart elasticsearch
```

### Issue: Langfuse database not found

**Symptoms:** `ERROR: database "langfuse_db" does not exist`

**Solution:**
```bash
# Create database manually
docker exec ugm_aicare_db psql -U giga -d aicare_db -c "CREATE DATABASE langfuse_db;"

# Restart Langfuse
docker compose -f infra/compose/docker-compose.prod.yml \
               -f infra/compose/docker-compose.prod-monitoring.yml \
               restart langfuse-server
```

### Issue: Prometheus not scraping backend

**Symptoms:** No metrics in Grafana for backend

**Solution:**
```bash
# Check if backend is on monitoring network
docker inspect ugm_aicare_backend | jq '.[0].NetworkSettings.Networks'

# Should show both "internal_network" and "monitoring"

# If missing, restart backend
docker compose -f infra/compose/docker-compose.prod.yml restart backend
```

### Issue: Filebeat not shipping logs

**Symptoms:** No logs appearing in Kibana

**Solution:**
```bash
# Check Filebeat logs
docker logs ugm_aicare_filebeat_prod

# Verify Filebeat can reach Logstash
docker exec ugm_aicare_filebeat_prod curl -I http://logstash:5000

# Restart Filebeat
docker compose -f infra/compose/docker-compose.prod-monitoring.yml restart filebeat
```

---

## 📊 Maintenance

### Regular Tasks

1. **Monitor Disk Usage:**
   ```bash
   docker system df
   
   # Clean up old volumes if needed
   docker volume prune
   ```

2. **Rotate Logs:**
   - Elasticsearch: Automated with 30-day retention
   - Docker logs: Configure via `/etc/docker/daemon.json`:
     ```json
     {
       "log-driver": "json-file",
       "log-opts": {
         "max-size": "10m",
         "max-file": "3"
       }
     }
     ```

3. **Update Monitoring Images:**
   ```bash
   docker compose -f infra/compose/docker-compose.prod-monitoring.yml pull
   docker compose -f infra/compose/docker-compose.prod-monitoring.yml up -d
   ```

4. **Backup Monitoring Data:**
   ```bash
   # Backup volumes
   docker run --rm -v prometheus_data:/data -v $(pwd):/backup \
     alpine tar czf /backup/prometheus_data.tar.gz -C /data .
   
   docker run --rm -v grafana_data:/data -v $(pwd):/backup \
     alpine tar czf /backup/grafana_data.tar.gz -C /data .
   ```

---

## 📚 Additional Resources

- **Prometheus Configuration:** `infra/monitoring/prometheus/prometheus.yml`
- **Alert Rules:** `infra/monitoring/prometheus/alert_rules.yml`
- **Grafana Datasources:** `infra/monitoring/grafana/datasources/`
- **Logstash Pipeline:** `infra/elk/logstash/pipeline/`
- **Filebeat Config:** `infra/elk/filebeat/filebeat.yml`

---

## 🎯 Next Steps

1. ✅ Deploy with monitoring enabled
2. ✅ Setup Langfuse API keys
3. ⏳ Configure Slack alerts in AlertManager
4. ⏳ Create custom Grafana dashboards
5. ⏳ Setup Kibana index patterns
6. ⏳ Add agent tracing decorators to backend code
7. ⏳ Configure reverse proxy with SSL
8. ⏳ Setup automated backups

---

**Last Updated:** October 31, 2025  
**Maintained By:** UGM-AICare Team
