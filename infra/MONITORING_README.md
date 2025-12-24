# UGM-AICare Monitoring (Docker Compose Profiles)

This repository uses Docker Compose **profiles** to avoid having separate compose files for monitoring/logging stacks.

The canonical Compose files are:

- `infra/compose/docker-compose.dev.yml`
- `infra/compose/docker-compose.prod.yml`

## Quick start (dev)

Recommended (scripts):

```bash
./dev.sh monitoring start
# or
./monitoring.sh start
```

Equivalent (raw Compose):

```bash
docker compose -f infra/compose/docker-compose.dev.yml --profile monitoring --profile elk up -d
```

Stop:

```bash
./dev.sh monitoring stop
# or
./monitoring.sh stop
```

## Quick start (prod)

```bash
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env --profile monitoring --profile elk up -d
```

## Access points (default)

- Elasticsearch: <http://localhost:22020>
- Kibana: <http://localhost:22024>
- Logstash API: <http://localhost:22023>
- Prometheus: <http://localhost:22010>
- Grafana: <http://localhost:22011> (credentials: `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`)
- Langfuse: <http://localhost:22016>
- Backend metrics (if backend is running): <http://localhost:22001/metrics> and <http://localhost:22001/metrics/fastapi>

## Troubleshooting

Check Prometheus targets:

```bash
curl -s http://localhost:22010/targets | head
```

Restart Grafana:

```bash
docker compose -f infra/compose/docker-compose.dev.yml --profile monitoring restart grafana
```

ELK health:

```bash
curl -s http://localhost:22020/_cluster/health
curl -s http://localhost:22024/api/status | head
```

For monitoring design/metrics strategy (conceptual, not operational commands), see `docs/PRODUCTION_MONITORING.md`.
