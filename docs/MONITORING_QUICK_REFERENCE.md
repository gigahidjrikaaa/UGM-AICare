# Production Monitoring - Quick Reference

## 🚀 Quick Commands

### Log Monitoring

```bash
# Real-time logs
docker compose logs -f backend

# Search for errors
docker compose logs backend | grep ERROR

# Export logs
docker compose logs backend > logs-$(date +%Y%m%d).txt

# Follow specific container
docker logs -f ugm_aicare_backend_dev --tail 100
```

### Metrics Access

- **Prometheus**: <http://your-server:9090>
- **Grafana**: <http://your-server:3000>
- **Kibana**: <http://your-server:5601>
- **Backend Metrics**: <http://your-server:8000/metrics>

### Quick Health Checks

```bash
# Check all services
curl http://localhost:8000/health

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Elasticsearch
curl http://localhost:9200/_cluster/health
```

---

## 📊 Key Metrics Dashboard

### Application Health

- ✅ Request rate: < 1000 req/s (normal)
- ✅ Error rate: < 1% (healthy)
- ✅ P95 latency: < 2s (good)
- ⚠️ P95 latency: 2-5s (warning)
- 🚨 P95 latency: > 5s (critical)

### Agent Performance

- ✅ STA: < 1s (fast)
- ✅ SCA: < 3s (normal)
- ✅ SDA: < 2s (good)
- 🚨 Any agent: > 10s (investigate)

### Crisis Response

- ✅ Escalation response: < 5 min (target)
- ⚠️ Escalation response: 5-15 min (delayed)
- 🚨 Escalation response: > 15 min (critical)

---

## 🔥 Common Issues & Fixes

### Issue: High Error Rate

```bash
# Check error logs
docker compose logs backend | grep ERROR | tail -50

# Check database connection
docker exec backend python -c "from app.database import get_async_db; print('DB OK')"

# Restart service
docker compose restart backend
```

### Issue: Slow Response Time

```bash
# Check database query performance
# Login to PostgreSQL
docker exec -it db psql -U giga -d aicare_db

# Find slow queries
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# Check connection pool
SELECT count(*) FROM pg_stat_activity;
```

### Issue: Memory Leak

```bash
# Check memory usage
docker stats --no-stream

# Restart container
docker compose restart backend

# Check logs for OOM
docker compose logs backend | grep -i "out of memory"
```

---

## 📱 Alert Severity Levels

### 🚨 **CRITICAL** (Immediate Action Required)

- Backend service down
- Database unreachable
- Error rate > 5%
- Crisis escalation not processed > 15 min
- Memory usage > 95%

### ⚠️ **WARNING** (Action Required Soon)

- High latency (P95 > 2s)
- Error rate > 1%
- Agent processing time > 5s
- Memory usage > 80%
- Disk space < 20%

### ℹ️ **INFO** (Monitor)

- Deployment notifications
- Backup completion
- Scheduled maintenance

---

## 🛠️ Troubleshooting Workflow

```
1. Check Grafana dashboard
   ↓
2. Is the service down?
   → Yes: Check Docker logs
   → No: Continue to step 3
   ↓
3. High error rate?
   → Yes: Check backend logs for exceptions
   → No: Continue to step 4
   ↓
4. Slow response?
   → Yes: Check database query performance
   → No: Check LLM API latency
   ↓
5. Database issues?
   → Check connection pool size
   → Check slow query log
   ↓
6. LLM API issues?
   → Check Gemini API status
   → Check API key validity
```

---

## 📞 Escalation Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Critical Outage | DevOps Lead | < 15 min |
| Security Incident | Security Team | < 30 min |
| Data Privacy | Privacy Officer | < 1 hour |
| Crisis Escalation Failure | Clinical Lead | < 5 min |

---

## 🔐 Access Credentials

**Production Access** (Stored in Password Manager):

- Grafana: `admin / [vault:grafana-admin-pass]`
- Kibana: `elastic / [vault:elastic-pass]`
- PostgreSQL: `giga / [vault:postgres-pass]`
- Server SSH: `ssh ugm-admin@prod-server`

---

## 📈 Weekly Monitoring Checklist

- [ ] Review error rate trend
- [ ] Check average response time
- [ ] Verify backup completion
- [ ] Review crisis escalation metrics
- [ ] Check disk space usage
- [ ] Review security logs
- [ ] Update runbook with new issues
- [ ] Team meeting: discuss incidents

---

## 📚 Quick Links

- [Full Monitoring Guide](./PRODUCTION_MONITORING.md)
- [Incident Response Playbook](./INCIDENT_RESPONSE.md)
- [Architecture Docs](./PROJECT_SINGLE_SOURCE_OF_TRUTH.md)
- [Grafana Dashboards](http://grafana.ugm-aicare.com)
- [Kibana Logs](http://kibana.ugm-aicare.com)
