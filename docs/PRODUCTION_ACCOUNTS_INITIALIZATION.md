# Production Accounts Initialization Guide

## Overview

This guide explains how to properly initialize admin and counselor accounts for production deployment of the UGM-AICare platform.

## Problem Context

Previously, production deployments sometimes failed to create admin/counselor accounts properly, leading to "Invalid Credentials" errors when trying to login. This occurred because:

1. Email encryption wasn't working correctly
2. Password hashing wasn't being verified
3. Accounts weren't being created during database initialization
4. Existing accounts weren't being updated when credentials changed

## Solution

We've implemented a robust account initialization system with three layers:

### Layer 1: Automatic Initialization (Startup)

The application automatically creates admin/counselor accounts on startup via `app/services/admin_bootstrap.py`. This runs during the FastAPI lifespan startup.

**When it runs:**
- Every time the backend starts
- Checks if accounts exist
- Creates them if missing
- Skips if already present

### Layer 2: Manual Initialization Script

A dedicated Python script for manual account initialization with verification.

**Location:** `backend/scripts/init_production_accounts.py`

**Features:**
- Creates or updates admin account
- Creates or updates counselor account
- Verifies email encryption/decryption works
- Verifies password hashing works
- Provides detailed logging and diagnostics

**Usage:**
```bash
cd backend

# Option 1: Run Python script directly
python scripts/init_production_accounts.py

# Option 2: Use convenience shell script
chmod +x scripts/init_accounts.sh
./scripts/init_accounts.sh
```

### Layer 3: Deployment Integration

The initialization script is automatically run during production deployment after database migrations.

**Integrated into:** `infra/scripts/deploy.sh`

**When it runs:**
- After Docker containers are started
- After database migrations complete
- Before health checks

## Environment Variables

The following environment variables are required in your `.env` file:

```bash
# Database connection
DATABASE_URL=postgresql://user:password@host:port/database

# Encryption (required for email encryption)
ENCRYPTION_KEY=your-fernet-encryption-key-here

# Admin account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=strong-admin-password-here

# Counselor account
COUNSELOR_EMAIL=counselor@yourdomain.com
COUNSELOR_PASSWORD=strong-counselor-password-here
COUNSELOR_NAME=Main Counselor  # Optional, defaults to "Main Counselor"
```

### Generating a Fernet Encryption Key

```python
from cryptography.fernet import Fernet
key = Fernet.generate_key()
print(key.decode())  # Use this as your ENCRYPTION_KEY
```

Or via command line:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Verification

The initialization script includes built-in verification that checks:

### ✅ Account Creation/Update
- Admin account exists in database
- Counselor account exists in database
- Accounts have correct roles
- Accounts are active and email verified

### ✅ Email Encryption
- Email is properly encrypted in database
- Encrypted email can be decrypted back to original
- Decrypted email matches the input email

### ✅ Password Hashing
- Password is properly hashed with bcrypt
- Plain password can be verified against hash
- Hash verification passes

### Example Output

```
==============================================================
PRODUCTION ACCOUNTS INITIALIZATION
==============================================================
Connecting to database: localhost:5432/ugm_aicare

------------------------------------------------------------
Processing admin account for email: admin@example.com
Admin account exists, updating password and ensuring active status...
✅ Admin account updated and password verified!

------------------------------------------------------------
Processing counselor account for email: counselor@example.com
Creating new counselor account...
✅ Counselor account created and password verified!

------------------------------------------------------------
==============================================================
VERIFYING ACCOUNTS
==============================================================
✅ Admin account found in database
   - ID: 123
   - Role: admin
   - Active: True
   - Email verified: True
   - Email encryption/decryption: ✅ Working
   - Password verification: ✅ Working

✅ Counselor account found in database
   - ID: 124
   - Role: counselor
   - Active: True
   - Email verified: True
   - Email encryption/decryption: ✅ Working
   - Password verification: ✅ Working
==============================================================

==============================================================
✅ PRODUCTION ACCOUNTS INITIALIZATION COMPLETE
==============================================================

You can now login with:
  Admin:     admin@example.com
  Counselor: counselor@example.com
==============================================================
```

## Troubleshooting

### Problem: "Invalid Credentials" Error

**Cause:** Account doesn't exist or password doesn't match

**Solution:**
```bash
# Run initialization script manually
cd backend
python scripts/init_production_accounts.py
```

### Problem: "Failed to encrypt email"

**Cause:** `ENCRYPTION_KEY` not set or invalid

**Solution:**
```bash
# Generate new key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Add to .env
echo "ENCRYPTION_KEY=your-generated-key-here" >> .env

# Re-run initialization
python scripts/init_production_accounts.py
```

### Problem: "Database connection failed"

**Cause:** `DATABASE_URL` incorrect or database not accessible

**Solution:**
```bash
# Test database connection
docker compose -f infra/compose/docker-compose.prod.yml exec backend \
  python -c "from sqlalchemy import create_engine; engine = create_engine('$DATABASE_URL'); print('Connection OK')"

# Check if DATABASE_URL is set
grep DATABASE_URL .env
```

### Problem: Script says account exists but login still fails

**Cause:** Email encryption key may have changed

**Solution:**
```bash
# Force update of existing accounts
# The script will update email and password with current ENCRYPTION_KEY
python scripts/init_production_accounts.py
```

## Production Deployment

### Automatic (GitHub Actions)

Accounts are automatically initialized during deployment:

1. GitHub Actions runs CI/CD pipeline
2. Docker images are built
3. Containers are deployed to VM
4. Database migrations run
5. **→ Account initialization runs automatically ←**
6. Health checks verify deployment

### Manual (Docker Compose)

If deploying manually with Docker Compose:

```bash
# 1. Pull latest code
git pull origin main

# 2. Ensure .env file has all required variables
cat .env | grep -E "ADMIN_EMAIL|ADMIN_PASSWORD|COUNSELOR_EMAIL|COUNSELOR_PASSWORD|ENCRYPTION_KEY"

# 3. Run deployment script (includes account initialization)
./infra/scripts/deploy.sh $(git rev-parse HEAD)

# Or initialize accounts manually after deployment:
docker compose -f infra/compose/docker-compose.prod.yml exec backend \
  python scripts/init_production_accounts.py
```

## Security Best Practices

### 1. Strong Passwords
```bash
# Generate strong passwords (20+ characters)
openssl rand -base64 32

# Use different passwords for admin and counselor
ADMIN_PASSWORD=$(openssl rand -base64 32)
COUNSELOR_PASSWORD=$(openssl rand -base64 32)
```

### 2. Secure Environment Variables

**Never commit secrets to git:**
```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore

# Use GitHub Secrets for production
# Settings → Secrets and variables → Actions → New repository secret
# Add: ENV_FILE_PRODUCTION (contains entire .env content base64-encoded)
```

### 3. Rotate Credentials Regularly

```bash
# Update passwords in .env
nano .env  # or vim .env

# Re-run initialization to update database
python scripts/init_production_accounts.py
```

### 4. Audit Logging

Account creation/updates are logged:
```bash
# Check backend logs
docker compose -f infra/compose/docker-compose.prod.yml logs backend | grep "Admin account"
docker compose -f infra/compose/docker-compose.prod.yml logs backend | grep "Counselor account"
```

## Related Files

- **Initialization Script:** `backend/scripts/init_production_accounts.py`
- **Shell Wrapper:** `backend/scripts/init_accounts.sh`
- **Bootstrap Service:** `backend/app/services/admin_bootstrap.py`
- **Database Init:** `backend/app/database/__init__.py`
- **Deployment Script:** `infra/scripts/deploy.sh`
- **Auth Route:** `backend/app/routes/auth.py`

## API Testing

After initialization, test the accounts:

```bash
# Test admin login
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your-admin-password"}'

# Test counselor login
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"counselor@yourdomain.com","password":"your-counselor-password"}'

# Expected response:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "token_type": "bearer",
#   "user": { ... }
# }
```

## Monitoring

### Check Account Status in Database

```sql
-- Connect to database
psql $DATABASE_URL

-- View admin/counselor accounts
SELECT id, role, is_active, email_verified, created_at, last_login
FROM users
WHERE role IN ('admin', 'counselor');

-- Check if emails are encrypted (should see encrypted strings)
SELECT email FROM users WHERE role = 'admin' LIMIT 1;
```

### Application Logs

```bash
# Watch for account initialization during startup
docker compose -f infra/compose/docker-compose.prod.yml logs -f backend | grep -E "admin|counselor"

# Expected logs:
# "Admin account already present (by role or email); skipping bootstrap."
# OR
# "Default admin user created from environment configuration."
```

## FAQ

**Q: Do I need to run the script every deployment?**  
A: No, the deployment script (`deploy.sh`) automatically runs it for you.

**Q: What if I change the admin password in .env?**  
A: Run `python scripts/init_production_accounts.py` to update the database with the new password.

**Q: Can I have multiple admin accounts?**  
A: Yes, create them via the admin dashboard UI or database directly. This script only ensures at least one admin exists.

**Q: Is it safe to run the script multiple times?**  
A: Yes, it's idempotent. It will update existing accounts instead of creating duplicates.

**Q: What if ENCRYPTION_KEY changes?**  
A: Existing encrypted emails won't decrypt. Run the script to re-encrypt emails with the new key.

---

**Last Updated:** November 2, 2025  
**Related Documentation:** `docs/DOCKERFILE_GEMINI_MIGRATION_FIX.md`, `PROJECT_SINGLE_SOURCE_OF_TRUTH.md`
