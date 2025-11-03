# Grafana Dashboard Setup Guide

## 📊 Pre-Built Dashboards

Your UGM-AICare project now includes **2 pre-configured Grafana dashboards** that will automatically load when you start the monitoring stack:

### 1. **Platform Overview** (`ugm-aicare-overview`)
**Panels:**
- Request Rate & Response Time
- Crisis Escalations (1h)
- Active Users
- Agent Processing Time (STA, SCA, SDA, IA)
- Agent Invocations
- LLM API Latency & Token Usage
- Database Query Duration
- Cache Hit Rate

### 2. **Safety Agents** (`ugm-aicare-agents`)
**Panels:**
- Success Rate Gauges (STA, SCA, SDA, IA)
- Agent Errors by Type
- Agent Invocations (bar chart)
- Crisis Escalation Rate
- Intervention Plans Activity
- Plan Success Metrics (completion vs abandonment)

---

## 🚀 Quick Start

### Step 1: Start Monitoring Stack

```bash
# Option 1: Start everything together
./dev.sh up-all

# Option 2: Start monitoring separately
./dev.sh monitoring start
```

### Step 2: Access Grafana

Open browser: **http://localhost:8256**

**Credentials:**
- Username: `admin`
- Password: `admin123`

### Step 3: View Dashboards

1. Click **Dashboards** (icon: four squares) in the left sidebar
2. You should see:
   - **UGM-AICare - Platform Overview**
   - **UGM-AICare - Safety Agents**
3. Click any dashboard to open it

---

## 🔧 Troubleshooting

### Issue: "No data" in panels

**Cause:** Backend metrics not being collected yet

**Solution:**
1. Ensure backend is running: `http://localhost:8000/metrics`
2. Check Prometheus targets: `http://localhost:8255/targets`
   - All targets should show **UP** (green)
3. Generate some traffic:
   ```bash
   # Chat with Aika to generate metrics
   curl http://localhost:8000/api/v1/aika -X POST \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello", "user_id": "test"}'
   ```

### Issue: Dashboards not appearing

**Cause:** Dashboard files not mounted correctly

**Solution:**
1. Verify files exist:
   ```bash
   ls infra/monitoring/grafana/dashboards/
   # Should show: dashboards.yml, ugm-aicare-overview.json, ugm-aicare-agents.json
   ```

2. Restart Grafana:
   ```bash
   docker compose -f docker-compose.monitoring.yml restart grafana
   ```

3. Check Grafana logs:
   ```bash
   docker logs ugm_aicare_grafana
   ```

### Issue: "Cannot connect to Prometheus"

**Solution:**
1. Check Prometheus is running:
   ```bash
   curl http://localhost:8255/-/healthy
   ```

2. Verify datasource in Grafana:
   - Go to **Configuration** → **Data Sources**
   - Click **Prometheus**
   - Ensure URL is: `http://prometheus:9090`
   - Click **Save & Test** (should show "Data source is working")

---

## 🎨 Customizing Dashboards

### Adding New Panels

1. Open a dashboard
2. Click **Add panel** (top right)
3. Select **Add a new panel**
4. Configure:
   - **Query:** Choose Prometheus
   - **Metric:** Start typing (e.g., `agent_`, `llm_`, `http_`)
   - **Visualization:** Choose type (Graph, Gauge, Stat, etc.)
5. Click **Apply**

### Available Metrics

#### HTTP Metrics
- `http_requests_total` - Total requests by method, endpoint, status
- `http_request_duration_seconds` - Request duration histogram

#### Agent Metrics
- `agent_processing_time_seconds` - Processing time by agent
- `agent_invocations_total` - Invocation count by agent/intent
- `agent_errors_total` - Error count by agent/error_type
- `agent_success_rate` - Success rate (0-1)

#### LLM Metrics
- `llm_api_calls_total` - API calls by model
- `llm_api_duration_seconds` - API latency
- `llm_token_usage_total` - Token usage by model/type
- `llm_api_errors_total` - API errors by model

#### Mental Health Metrics
- `crisis_escalations_total` - Crisis escalation count
- `crisis_response_time_seconds` - Crisis response time
- `intervention_plans_created_total` - Plans created
- `intervention_plan_steps_completed_total` - Steps completed
- `intervention_plan_completion_rate` - Completion rate
- `intervention_plan_abandonment_rate` - Abandonment rate

#### System Metrics
- `db_query_duration_seconds` - Database query duration
- `db_connection_pool_size` - Connection pool size
- `cache_hits_total` - Cache hits
- `cache_misses_total` - Cache misses
- `active_users` - Active user count
- `user_session_duration_seconds` - Session duration

### Example Queries

**Average agent processing time (5min window):**
```promql
rate(agent_processing_time_seconds_sum[5m]) / rate(agent_processing_time_seconds_count[5m])
```

**Total agent invocations per agent:**
```promql
sum by (agent) (rate(agent_invocations_total[5m]))
```

**Cache hit rate:**
```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

**95th percentile response time:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

---

## 📚 Additional Resources

- **Grafana Docs:** https://grafana.com/docs/
- **PromQL Guide:** https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Project Monitoring Guide:** `docs/PRODUCTION_MONITORING.md`
- **Metrics Implementation:** `backend/app/core/metrics.py`

---

## 🎯 Next Steps

1. ✅ **Start monitoring stack** - Dashboards load automatically
2. ✅ **Generate traffic** - Chat with Aika, create plans
3. ⏳ **Set up alerts** - Configure Slack/email notifications
4. ⏳ **Create custom dashboards** - Tailor to your needs
5. ⏳ **Production deployment** - Deploy with monitoring enabled

---

**Questions?** Check `docs/MONITORING_IMPLEMENTATION.md` or the main README.
