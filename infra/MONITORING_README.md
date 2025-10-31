# UGM-AICare Monitoring Setup

Complete production-ready monitoring stack with ELK (logs) + Prometheus + Grafana (metrics).

## 📚 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Services](#services)
- [Access Points](#access-points)
- [Configuration](#configuration)
- [Metrics Reference](#metrics-reference)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop running
- At least 4GB RAM available for monitoring stack
- Ports available: 3001, 5601, 8080, 9090, 9093, 9100, 9121, 9187, 9200, 9300, 9600

### Start Monitoring

```bash
# Start all monitoring services
bash scripts/start-monitoring.sh

# Or start individually
docker compose -f docker-compose.elk.yml up -d
docker compose -f docker-compose.monitoring.yml up -d
```

### Stop Monitoring

```bash
# Stop all monitoring services
bash scripts/stop-monitoring.sh

# Or stop individually
docker compose -f docker-compose.elk.yml down
docker compose -f docker-compose.monitoring.yml down
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   UGM-AICare Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Structured   │  │ /metrics     │  │ Agent/Tool      │  │
│  │ JSON Logs    │  │ Endpoint     │  │ Decorators      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐
│   Filebeat      │  │   Prometheus    │  │   Custom     │
│ (Log Shipping)  │  │ (Metrics Store) │  │   Metrics    │
└────────┬────────┘  └────────┬────────┘  └──────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│   Logstash      │  │    Grafana      │
│ (Log Pipeline)  │  │  (Dashboards)   │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Elasticsearch   │
│  (Log Storage)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Kibana      │
│ (Log Explorer)  │
└─────────────────┘
```

---

## 🛠️ Services

### ELK Stack

| Service | Purpose | Port | Container Name |
|---------|---------|------|----------------|
| **Elasticsearch** | Log storage and search | 9200, 9300 | `ugm_aicare_elasticsearch` |
| **Logstash** | Log aggregation and parsing | 5000, 9600 | `ugm_aicare_logstash` |
| **Kibana** | Log visualization | 5601 | `ugm_aicare_kibana` |
| **Filebeat** | Log shipping from Docker | - | `ugm_aicare_filebeat` |

### Prometheus + Grafana Stack

| Service | Purpose | Port | Container Name |
|---------|---------|------|----------------|
| **Prometheus** | Time-series metrics database | 9090 | `ugm_aicare_prometheus` |
| **Grafana** | Metrics dashboards | 3001 | `ugm_aicare_grafana` |
| **AlertManager** | Alert routing and notifications | 9093 | `ugm_aicare_alertmanager` |
| **Node Exporter** | System metrics | 9100 | `ugm_aicare_node_exporter` |
| **cAdvisor** | Container metrics | 8080 | `ugm_aicare_cadvisor` |
| **Postgres Exporter** | Database metrics | 9187 | `ugm_aicare_postgres_exporter` |
| **Redis Exporter** | Cache metrics | 9121 | `ugm_aicare_redis_exporter` |

### Langfuse (Agent Tracing & LLM Observability)

| Service | Purpose | Port | Container Name |
|---------|---------|------|----------------|
| **Langfuse** | Agent tracing, LLM observability, trace analytics | 8262 | `ugm_aicare_langfuse` |

---

## 🌐 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Kibana** | <http://localhost:5601> | No auth |
| **Grafana** | <http://localhost:3001> | admin / admin123 |
| **Prometheus** | <http://localhost:9090> | No auth |
| **AlertManager** | <http://localhost:9093> | No auth |
| **Langfuse** | <http://localhost:8262> | Account required (setup on first access) |
| **Backend Metrics** | <http://localhost:8000/metrics> | No auth |
| **FastAPI Metrics** | <http://localhost:8000/metrics/fastapi> | No auth |

---

## 🚀 Quick Start

### Start All Monitoring Services

```bash
# Start everything (ELK + Prometheus + Grafana + Langfuse)
./dev.sh up-all

# Or start monitoring separately
./dev.sh monitoring start
```

### Setup Langfuse (One-Time)

```bash
# Setup Langfuse for agent tracing
./dev.sh setup-langfuse
```

This will:

1. Create `langfuse_db` database
2. Generate secrets and update `.env`
3. Start Langfuse service on port 8262
4. Display next steps for API key generation

---

See full documentation at: [`docs/PRODUCTION_MONITORING.md`](../docs/PRODUCTION_MONITORING.md)
