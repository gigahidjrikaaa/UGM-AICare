# Backend Build Test - Usage Guide

## Quick Start

Test your backend build for Web3.py import errors:

```bash
./dev.sh test-build
```

## What It Does

The `test-build` command performs a comprehensive backend build test:

### 1. **Builds Backend Container**
- Uses Docker BuildKit for fast builds
- Compiles all Python dependencies
- Creates production-ready image

### 2. **Tests Critical Imports**
Tests all blockchain-related imports that were fixed:

✅ **Web3.py Core**
```python
from web3 import Web3
from web3.middleware import geth_poa_middleware
```

✅ **BaseWeb3Client (main blockchain)**
```python
from app.blockchain.base_web3 import BaseWeb3Client
```

✅ **BaseWeb3Client (domains)**
```python
from app.domains.blockchain.base_web3 import BaseWeb3Client
```

✅ **CareTokenService**
```python
from app.domains.finance.services.care_token_service import CareTokenService
```

✅ **EDU Chain NFT Client**
```python
from app.blockchain.edu_chain.nft_client import init_blockchain
```

✅ **FastAPI Application**
```python
from app.main import app
```

### 3. **Tests POA Middleware**
- Injects `geth_poa_middleware` at layer 0
- Verifies middleware works correctly
- Tests connection to SOMNIA blockchain (if available)

### 4. **Checks Web3.py Version**
- Displays installed Web3.py version
- Confirms v6+ is installed

## Expected Output

### Success (All Tests Pass)

```
🧪 Testing backend build for import errors...

1️⃣ Building backend container...
[+] Building 45.2s (12/12) FINISHED
✅ Backend build successful

2️⃣ Testing Python imports...
Python version: 3.11.x

Testing critical imports...

✅ Web3.py: OK
   - geth_poa_middleware available
✅ BaseWeb3Client (blockchain): OK
✅ BaseWeb3Client (domains): OK
✅ CareTokenService: OK
✅ EDU Chain NFT Client: OK
✅ FastAPI Application: OK

✅ All imports successful!

Testing POA middleware injection...
✅ POA middleware injection: OK
✅ Connection test: OK (Chain ID: 50311)

🎉 All tests passed! Backend is ready for deployment.

3️⃣ Checking Web3.py version...
Web3.py version: 6.20.4

✅ Backend build test complete!

💡 Next steps:
   - Deploy with: ./deploy-prod.sh
   - Or test locally: ./dev.sh up
```

### Failure (Import Error)

```
❌ Web3.py: FAILED
   Error: cannot import name 'ExtraDataToPOAMiddleware' from 'web3.middleware'

❌ Import tests failed!
```

## When to Use

### Before Deployment
```bash
# Always test before deploying to production
./dev.sh test-build

# If tests pass, deploy
./deploy-prod.sh
```

### After Code Changes
```bash
# After modifying blockchain files
./dev.sh test-build

# After updating requirements.txt
./dev.sh test-build
```

### Debugging Import Issues
```bash
# If production deployment fails with import errors
./dev.sh test-build

# Check specific import
docker compose -f docker-compose.dev.yml run --rm --no-deps backend python -c "
from app.blockchain.base_web3 import BaseWeb3Client
print('Import successful!')
"
```

## Troubleshooting

### Build Fails

**Problem:** Docker build fails
```bash
# Clear cache and rebuild
./dev.sh clear-cache
./dev.sh test-build
```

### Import Errors Persist

**Problem:** Imports fail even after fixes
```bash
# Check requirements.txt has web3>=6.0.0
cat backend/requirements.txt | grep web3

# Rebuild without cache
./dev.sh rebuild-clean
./dev.sh test-build
```

### Web3.py Version Wrong

**Problem:** Shows Web3.py v5 instead of v6
```bash
# Check requirements.txt
cat backend/requirements.txt | grep "web3"

# Should show: web3>=6.0.0,<7.0.0
# Update if needed, then rebuild
./dev.sh rebuild-clean
```

### Connection Test Fails

**Problem:** POA middleware injection works but connection fails
```
⚠️  Connection test: Network unavailable (OK for build test)
```

**Solution:** This is OK! It means:
- Imports work ✅
- POA middleware works ✅
- Network is unreachable (expected if offline)

The build is still valid for deployment.

## Advanced Usage

### Test Specific Import
```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend python -c "
from web3.middleware import geth_poa_middleware
print('Middleware:', geth_poa_middleware)
print('Type:', type(geth_poa_middleware))
"
```

### Check All Middleware
```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend python -c "
from web3 import Web3
from web3.middleware import geth_poa_middleware

w3 = Web3(Web3.HTTPProvider('http://example.com'))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

print('Middleware layers:')
for i, mw in enumerate(w3.middleware_onion):
    print(f'{i}: {mw}')
"
```

### Test With Live Connection
```bash
docker compose -f docker-compose.dev.yml run --rm backend python -c "
from web3 import Web3
from web3.middleware import geth_poa_middleware

w3 = Web3(Web3.HTTPProvider('https://api.infra.mainnet.somnia.network/'))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

if w3.is_connected():
    print(f'✅ Connected to SOMNIA')
    print(f'Chain ID: {w3.eth.chain_id}')
    print(f'Latest block: {w3.eth.block_number}')
else:
    print('❌ Connection failed')
"
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Test Backend Build
  run: |
    chmod +x dev.sh
    ./dev.sh test-build
```

## Related Commands

```bash
# Full development cycle
./dev.sh clear-cache        # Clear old builds
./dev.sh rebuild-clean      # Clean rebuild
./dev.sh test-build         # Test the build
./dev.sh up                 # Start development

# Production deployment
./dev.sh test-build         # Verify build works
./deploy-prod.sh            # Deploy to production
```

## Exit Codes

- `0` - All tests passed ✅
- `1` - Build failed or import errors ❌

Use in scripts:
```bash
#!/bin/bash
if ./dev.sh test-build; then
    echo "✅ Build valid, deploying..."
    ./deploy-prod.sh
else
    echo "❌ Build failed, aborting deployment"
    exit 1
fi
```

## Files Tested

The test validates these critical files:

1. `backend/app/blockchain/base_web3.py`
2. `backend/app/domains/blockchain/base_web3.py`
3. `backend/app/domains/finance/services/care_token_service.py`
4. `backend/app/blockchain/edu_chain/nft_client.py`
5. `backend/app/blockchain/somnia/oracle_client.py`
6. `backend/app/blockchain/somnia/care_token_client.py`
7. `backend/app/main.py` (entire FastAPI app)

## Performance

- **First run:** ~2-5 minutes (full build)
- **With cache:** ~30-60 seconds (incremental build)
- **Import tests:** ~5-10 seconds

## Support

If tests fail:
1. Check error message carefully
2. Review `docs/WEB3PY_V6_AUDIT_REPORT.md`
3. Review `docs/URGENT_WEB3_IMPORT_FIX.md`
4. Ensure all files have `# type: ignore` on geth_poa_middleware imports

---

**Status:** ✅ Ready to use  
**Last Updated:** November 1, 2025  
**Web3.py Version:** 6.20.4
