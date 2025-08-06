# UGM-AICare Quick Reference

## Key Commands

### Development

```bash
# Start all services
docker compose up -d

# Frontend only
cd frontend && pnpm dev

# Backend only  
cd backend && uvicorn app.main:app --reload

# Run migrations
cd backend && alembic upgrade head
```

### Testing

```bash
# Frontend tests
cd frontend && pnpm test

# Backend tests
cd backend && pytest

# E2E tests
pnpm test:e2e
```

## Environment Variables

### Critical Variables

```env
# LLM Providers
GEMMA_API_KEY=your_ina17_gemma_key
GOOGLE_GENAI_API_KEY=your_gemini_key

# N8N Integration
N8N_WEBHOOK_URL=https://ina17.com/n8n-webhook
N8N_API_KEY=your_n8n_key

# Admin Access
ADMIN_EMAIL=admin@ugm.ac.id
ADMIN_PASSWORD=secure_password
```

## Common Issues

### Issue: LLM Rate Limit

**Solution**: Fallback to Gemma, implement caching

### Issue: Redis Connection Failed

**Solution**: Check Docker, fallback to in-memory

### Issue: OAuth Not Working

**Solution**: Verify callback URLs, check domain

### Issue: Admin Can't Login

**Solution**: Check credentials in .env, verify role

## Useful Links

- Frontend: <http://localhost:4000>
- Backend API: <http://localhost:8000/docs>
- Admin Dashboard: <http://localhost:4000/admin>
- N8N: <https://ina17.com/n8n>
