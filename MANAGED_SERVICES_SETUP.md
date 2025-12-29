# Docker Compose Managed Services Configuration

## Overview

The docker-compose setup has been **simplified** to only contain application containers:

- **Backend (FastAPI)**
- **Frontend (Next.js)**

**All infrastructure services are now managed services** and configured via environment variables:

- PostgreSQL (managed)
- Redis (managed)
- S3 Storage (managed)

---

## Required `.env` Variables

### Database (PostgreSQL - Managed)

```env
# Example: AWS RDS, Supabase, DigitalOcean Managed DB, etc.
DATABASE_URL=postgresql+asyncpg://user:password@hostname:5432/dbname
```

**Format:** `postgresql+asyncpg://[user]:[password]@[host]:[port]/[dbname]`

**Examples:**

```env
# AWS RDS
DATABASE_URL=postgresql+asyncpg://postgres:mypassword@my-rds-instance.c9akciq32.us-east-1.rds.amazonaws.com:5432/aicare_db

# Supabase
DATABASE_URL=postgresql+asyncpg://postgres:mypassword@db.xxxxx.supabase.co:5432/postgres

# DigitalOcean Managed Database
DATABASE_URL=postgresql+asyncpg://doadmin:mypassword@my-db-do-user-xxxxx.db.ondigitalocean.com:25060/aicare_db
```

### Redis (Managed)

```env
# Redis Host (required)
REDIS_HOST=hostname
# REDIS_HOST=my-redis.xxxxx.cache.amazonaws.com

# Redis Port (default: 6379)
REDIS_PORT=6379
# REDIS_PORT=6380  # Some managed services use different ports

# Redis Password (if required)
REDIS_PASSWORD=your_redis_password
# Leave empty if no password

# Redis Username (if required by service)
REDIS_USERNAME=default
# Most services don't require this, set to empty: REDIS_USERNAME=

# Alternative: Full Redis URL (optional, instead of separate params)
REDIS_URL=redis://default:password@hostname:6379
```

**Examples:**

```env
# AWS ElastiCache
REDIS_HOST=my-redis.xxxxx.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=myredispassword

# DigitalOcean Managed Redis
REDIS_HOST=my-redis-do-user-xxxxx.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=myredispassword

# Redis Cloud
REDIS_HOST=redis-xxxxx.c9.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=16909
REDIS_PASSWORD=myredispassword
```

### S3 Storage (Managed)

```env
# S3 Endpoint (hostname:port)
MINIO_ENDPOINT=s3.region.amazonaws.com
# MINIO_ENDPOINT=my-bucket.nyc3.digitaloceanspaces.com
# MINIO_ENDPOINT=objects.your-provider.com

# S3 Access Key
MINIO_ACCESS_KEY=your_access_key

# S3 Secret Key
MINIO_SECRET_KEY=your_secret_key

# S3 Bucket Name (where files are stored)
MINIO_BUCKET=content-resources

# Use HTTPS for S3 (true for most cloud providers)
MINIO_SECURE=true
```

**Examples:**

```env
# AWS S3
MINIO_ENDPOINT=s3.us-east-1.amazonaws.com
MINIO_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
MINIO_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
MINIO_BUCKET=my-aicare-bucket
MINIO_SECURE=true

# DigitalOcean Spaces
MINIO_ENDPOINT=nyc3.digitaloceanspaces.com
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=my-aicare-space
MINIO_SECURE=true

# MinIO (self-hosted)
MINIO_ENDPOINT=minio.example.com:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=content-resources
MINIO_SECURE=false  # Only if using HTTP (not recommended for prod)
```

---

## Complete `.env` Template

```env
# ═══════════════════════════════════════════════════════════════
# MANAGED SERVICES CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# Database (PostgreSQL - Managed Service)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# Redis (Managed Service)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_USERNAME=
REDIS_URL=

# S3 Storage (Managed Service)
MINIO_ENDPOINT=s3.region.amazonaws.com
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=content-resources
MINIO_SECURE=true

# ═══════════════════════════════════════════════════════════════
# APPLICATION CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# Backend
BACKEND_EXTERNAL_PORT=22001
BACKEND_URL=http://localhost:22001

# Frontend
FRONTEND_EXTERNAL_PORT=22000
FRONTEND_URL=http://localhost:22000
NEXT_PUBLIC_API_URL=http://localhost:22001

# Security
JWT_SECRET_KEY=your-secret-jwt-key-min-32-chars
EMAIL_ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Admin & Counselor Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
COUNSELOR_EMAIL=counselor@example.com
COUNSELOR_PASSWORD=your_counselor_password
COUNSELOR_NAME=Main Counselor

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## Migration from Local Services to Managed Services

### Step 1: Set up Managed Services

Choose your provider:

- **PostgreSQL:** AWS RDS, Supabase, DigitalOcean, GCP Cloud SQL, Heroku Postgres
- **Redis:** AWS ElastiCache, DigitalOcean, Redis Cloud, Upstash
- **S3:** AWS S3, DigitalOcean Spaces, Wasabi, Backblaze B2

### Step 2: Update `.env`

```bash
# Before (using local containers):
DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/aicare_db
REDIS_HOST=redis
REDIS_PORT=6379
MINIO_ENDPOINT=minio:9000

# After (using managed services):
DATABASE_URL=postgresql+asyncpg://user:pass@my-rds.xxxxx.com:5432/aicare_db
REDIS_HOST=my-redis.xxxxx.com
REDIS_PORT=6379
MINIO_ENDPOINT=s3.us-east-1.amazonaws.com
```

### Step 3: Run Migrations (if not auto-run)

Since the migration service is no longer included, run migrations manually:

```bash
# SSH into backend container
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml exec backend bash

# Inside container, run migrations
alembic upgrade head
```

Or create a migration runner container temporarily:

```bash
docker compose -f docker-compose.base.yml run --rm backend alembic upgrade head
```

### Step 4: Start Services

```bash
# Development
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

# Pre-production
docker compose -f docker-compose.base.yml -f docker-compose.preprod.yml up -d

# Production
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d
```

---

## Verification

### Test Database Connection

```bash
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml exec backend bash

# Inside container:
psql $DATABASE_URL -c "SELECT 1;"
```

### Test Redis Connection

```bash
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml exec backend bash

# Inside container:
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

### Test S3 Connection

```bash
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml exec backend bash

# Inside container:
python -c "
import boto3
s3 = boto3.client('s3', 
  endpoint_url='https://$MINIO_ENDPOINT',
  aws_access_key_id='$MINIO_ACCESS_KEY',
  aws_secret_access_key='$MINIO_SECRET_KEY'
)
print(s3.list_buckets())
"
```

---

## Troubleshooting

### Database Connection Failed

```
Error: could not connect to server: Connection refused
```

**Solutions:**

1. Verify `DATABASE_URL` is correct
2. Check if managed database is running/accessible
3. Verify network/firewall rules allow your IP
4. Test with `psql`:

   ```bash
   psql postgresql://user:pass@host:5432/dbname
   ```

### Redis Connection Failed

```
Error: ConnectionRefusedError: [Errno 111] Connection refused
```

**Solutions:**

1. Verify `REDIS_HOST` and `REDIS_PORT` are correct
2. Check if Redis service is running
3. Verify `REDIS_PASSWORD` if required
4. Test with `redis-cli`:

   ```bash
   redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
   ```

### S3 Connection Failed

```
Error: NoCredentialsError or InvalidBucketName
```

**Solutions:**

1. Verify `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
2. Ensure `MINIO_BUCKET` exists in S3
3. Check S3 access permissions
4. Verify `MINIO_SECURE` setting (true for HTTPS, false for HTTP)

---

## Security Best Practices

✅ **Do:**

- Store `.env` in `.gitignore` (never commit secrets)
- Use strong passwords for all services
- Enable TLS/HTTPS for all managed services
- Use VPC/network isolation where possible
- Rotate access keys regularly
- Use secrets manager (AWS Secrets Manager, GitHub Secrets, etc.)

❌ **Don't:**

- Commit `.env` to git
- Use default credentials in production
- Use HTTP for S3 in production
- Store secrets in code
- Share `.env` files via email/chat

---

## Examples by Provider

### AWS

```env
# RDS PostgreSQL
DATABASE_URL=postgresql+asyncpg://postgres:password@my-db.xxxxx.us-east-1.rds.amazonaws.com:5432/aicare_db

# ElastiCache Redis
REDIS_HOST=my-redis.xxxxx.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=my_password

# S3
MINIO_ENDPOINT=s3.us-east-1.amazonaws.com
MINIO_ACCESS_KEY=AKIA...
MINIO_SECRET_KEY=...
MINIO_BUCKET=aicare-bucket
MINIO_SECURE=true
```

### DigitalOcean

```env
# Managed Database
DATABASE_URL=postgresql+asyncpg://doadmin:password@my-db-do-user-xxxxx.db.ondigitalocean.com:25060/aicare_db

# Managed Redis
REDIS_HOST=my-redis-do-user-xxxxx.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=password

# Spaces (S3-compatible)
MINIO_ENDPOINT=nyc3.digitaloceanspaces.com
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=aicare
MINIO_SECURE=true
```

### Supabase

```env
# PostgreSQL
DATABASE_URL=postgresql+asyncpg://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Redis (via Upstash integration)
REDIS_HOST=redis-xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=password

# S3 (AWS or use Supabase Storage)
MINIO_ENDPOINT=s3.xxxxx.amazonaws.com
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
```

---

## Next Steps

1. **Choose your managed service providers**
2. **Create accounts and databases**
3. **Update `.env` with service details**
4. **Run migrations** (if needed)
5. **Start docker-compose** with new configuration
6. **Verify all services are accessible**
