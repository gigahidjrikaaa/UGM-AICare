# CI/CD Pipeline Flow with Test Failure Handling

**Last Updated:** October 31, 2025

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRIGGER: Push to main                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌───────────────────┐                    ┌───────────────────┐
│  validate-env     │                    │  detect-changes   │
│  ✓ Check secrets  │                    │  ✓ Backend files  │
│  ✓ Validate vars  │                    │  ✓ Frontend files │
└────────┬──────────┘                    └────────┬──────────┘
         │                                         │
         ▼                                         ▼
    ┌────────┐                          ┌─────────┴─────────┐
    │ PASS?  │                          │                   │
    └───┬────┘                          │                   │
        │                               ▼                   ▼
        │ YES                   ┌──────────────┐    ┌──────────────┐
        │                       │ test-backend │    │test-frontend │
        │                       │ continue-on- │    │ continue-on- │
        │                       │ error: true  │    │ error: true  │
        │                       └──────┬───────┘    └──────┬───────┘
        │                              │                   │
        │                              ▼                   ▼
        │                       ┌──────────────┐    ┌──────────────┐
        │                       │ TESTS FAIL?  │    │ TESTS FAIL?  │
        │                       └──┬───────┬───┘    └──┬───────┬───┘
        │                          │       │           │       │
        │                   PASS ──┘       └── FAIL   │       └── FAIL
        │                          │           │      │           │
        │                          ▼           ▼      ▼           ▼
        │                       ┌─────────────────────────────────┐
        │                       │   Generate Test Summary         │
        │                       │   • Show passed/failed counts   │
        │                       │   • Display failure details     │
        │                       │   • Upload artifacts            │
        │                       └────────────┬────────────────────┘
        │                                    │
        │                    ┌───────────────┴───────────────┐
        │                    │                               │
        ▼                    ▼                               ▼
┌───────────────────┐  ┌──────────────┐           ┌──────────────┐
│  All jobs pass    │  │build-backend │           │build-frontend│
│  or continue on   │  │ Checks test  │           │ Checks test  │
│  failure          │  │ status, adds │           │ status, adds │
│                   │  │ warning if   │           │ warning if   │
│                   │  │ failed       │           │ failed       │
└─────────┬─────────┘  └──────┬───────┘           └──────┬───────┘
          │                   │                          │
          │                   ▼                          ▼
          │            ┌──────────────┐          ┌──────────────┐
          │            │ scan-backend │          │scan-frontend │
          │            │ Trivy scan   │          │ Trivy scan   │
          │            └──────┬───────┘          └──────┬───────┘
          │                   │                          │
          └───────────────────┴──────────────────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │    deploy     │
                      │ • Deploy app  │
                      │ • Show test   │
                      │   status      │
                      │ • Warning if  │
                      │   tests failed│
                      └───────┬───────┘
                              │
                              ▼
                      ┌───────────────┐
                      │   Summary     │
                      │ ✅ Deployed   │
                      │ ⚠️  Test      │
                      │    warnings   │
                      └───────────────┘
```

## Detailed Stage Breakdown

### Stage 1: Environment Validation

**Job:** `validate-env`

```yaml
Status: MUST PASS (blocking)
Duration: ~30 seconds
```

**Checks:**
- ENV_FILE_PRODUCTION secret exists
- All critical variables are set
- No default/example values remain
- Important variables present (warnings only)

**On Failure:** Pipeline stops immediately

---

### Stage 2: Change Detection

**Job:** `detect-changes`

```yaml
Status: MUST PASS (blocking)
Duration: ~10 seconds
```

**Detects:**
- Backend file changes
- Frontend file changes
- Skips tests/builds for unchanged components

**On Failure:** Pipeline stops

---

### Stage 3: Testing (Parallel)

**Jobs:** `test-backend`, `test-frontend`

```yaml
Status: NON-BLOCKING (continue-on-error: true)
Duration: 1-3 minutes per job
```

**Backend Tests:**
```bash
pytest --verbose --tb=short --junit-xml=test-results.xml
```
- Runs all pytest tests
- Generates JUnit XML report
- Captures full output
- **Continues even if tests fail**

**Frontend Tests:**
```bash
npm test -- --verbose --json --outputFile=test-results.json
```
- Runs all Jest tests
- Generates JSON report
- Captures full output
- **Continues even if tests fail**

**Outputs:**
1. **Test Summary** (GitHub Actions UI):
   - Pass/fail counts
   - Failed test names
   - Error details (first 50 lines)
   - Warning message

2. **Test Artifacts** (30-day retention):
   - `test-results.xml` / `test-results.json`
   - `test-output.txt`

**On Failure:** Job marked as failed, but pipeline continues

---

### Stage 4: Build (Parallel)

**Jobs:** `build-backend`, `build-frontend`

```yaml
Status: Proceeds if tests passed OR failed
Duration: 3-5 minutes per job
```

**Backend Build:**
- Checks test status from `needs.test-backend.result`
- Adds warning to summary if tests failed
- Builds Docker image
- Pushes to GHCR with commit SHA tag

**Frontend Build:**
- Checks test status from `needs.test-frontend.result`
- Adds warning to summary if tests failed
- Builds Docker image
- Pushes to GHCR with commit SHA tag

**Build Conditions:**
```yaml
if: |
  always() && 
  (needs.test-backend.result == 'success' || 
   needs.test-backend.result == 'failure' || 
   needs.test-backend.result == 'skipped')
```

**On Test Failure:** Adds this to summary:
```
⚠️ WARNING: Building despite test failures. 
Review test results before deploying.
```

---

### Stage 5: Security Scanning (Parallel)

**Jobs:** `scan-backend`, `scan-frontend`

```yaml
Status: MUST PASS (blocking)
Duration: 2-4 minutes per job
```

**Trivy Scans:**
- Vulnerability scanning
- High/Critical severity detection
- SARIF report generation

**On Failure:** Pipeline stops (security critical)

---

### Stage 6: Deployment

**Job:** `deploy`

```yaml
Status: Final stage
Duration: 2-5 minutes
Dependencies: All previous jobs
```

**Pre-Deploy Checks:**
```yaml
needs.validate-env.result == 'success' &&
(needs.build-backend.result == 'success' || 'skipped') &&
(needs.build-frontend.result == 'success' || 'skipped') &&
(needs.scan-backend.result == 'success' || 'skipped') &&
(needs.scan-frontend.result == 'success' || 'skipped')
```

**Deployment Steps:**
1. SSH to production VM
2. Pull latest code
3. Write .env file
4. Run `deploy.sh` with commit SHA
5. Optionally deploy monitoring stack

**Post-Deploy:**
1. **Generate Deployment Summary**:
   ```markdown
   # ��� Deployment Summary
   
   **Environment:** Production
   **SHA:** abc123def456
   **Monitoring:** true
   
   ## Test Status
   - ✅ Backend Tests: PASSED
   - ⚠️ Frontend Tests: FAILED (deployment continued)
   
   ## ⚠️ Warning
   Deployment proceeded despite test failures. Please:
   1. Review test failure details
   2. Download test artifacts
   3. Monitor production logs
   4. Consider rollback if critical
   5. Fix tests in next commit
   ```

2. **Verify Monitoring Stack** (if enabled):
   - Check Prometheus health
   - Check Grafana health
   - Check Elasticsearch health
   - Check Langfuse health

---

## Test Failure Scenarios

### Scenario 1: Backend Tests Fail

```
test-backend: ❌ FAILURE
  ↓ (continues anyway)
build-backend: ⚠️ BUILDS WITH WARNING
  ↓
scan-backend: ✅ PASS
  ↓
deploy: ⚠️ DEPLOYS WITH WARNING

Summary shows:
- Backend Tests: FAILED (deployment continued)
- Warning message with action items
```

### Scenario 2: Frontend Tests Fail

```
test-frontend: ❌ FAILURE
  ↓ (continues anyway)
build-frontend: ⚠️ BUILDS WITH WARNING
  ↓
scan-frontend: ✅ PASS
  ↓
deploy: ⚠️ DEPLOYS WITH WARNING

Summary shows:
- Frontend Tests: FAILED (deployment continued)
- Warning message with action items
```

### Scenario 3: Both Tests Fail

```
test-backend: ❌ FAILURE
test-frontend: ❌ FAILURE
  ↓ (both continue)
build-backend: ⚠️ BUILDS WITH WARNING
build-frontend: ⚠️ BUILDS WITH WARNING
  ↓
scan-*: ✅ PASS
  ↓
deploy: ⚠️⚠️ DEPLOYS WITH MULTIPLE WARNINGS

Summary shows:
- Backend Tests: FAILED (deployment continued)
- Frontend Tests: FAILED (deployment continued)
- Strong warning message
- Recommendation to monitor closely
```

### Scenario 4: Security Scan Fails

```
test-*: ✅ PASS
  ↓
build-*: ✅ PASS
  ↓
scan-backend: ❌ CRITICAL VULNERABILITIES
  ↓
deploy: ��� BLOCKED

Pipeline stops - no deployment
Security issues must be fixed first
```

---

## Accessing Test Results

### 1. GitHub Actions UI

**Path:** Repository → Actions → Select workflow run

**Summary Tab:**
- Test pass/fail counts
- Failed test details
- Build warnings
- Deployment summary

### 2. Download Artifacts

**Path:** Workflow run → Scroll to bottom → Artifacts section

**Available Downloads:**
- `backend-test-results.zip`
  - test-results.xml (JUnit format)
  - test-output.txt (full pytest output)

- `frontend-test-results.zip`
  - test-results.json (Jest format)
  - test-output.txt (full test output)

**Retention:** 30 days

### 3. Job Logs

**Path:** Workflow run → Click job name → Expand steps

**Shows:**
- Real-time test execution
- Full command output
- Error tracebacks
- Environment details

---

## Rollback Procedures

### Via GitHub Actions (Recommended)

```yaml
1. Go to Actions → CI/CD Pipeline
2. Click "Run workflow"
3. Select branch: main
4. Enter rollback_sha: <previous-working-commit>
5. Click "Run workflow"
```

### Via SSH (Emergency)

```bash
ssh user@production-server
cd /path/to/UGM-AICare
./deploy-prod.sh rollback abc123def456
```

### Find Previous Working SHA

```bash
# List recent commits
git log --oneline -10

# Check Actions history
# Go to Actions → Find last successful run → Copy SHA
```

---

## Configuration Reference

### Make Tests Blocking

Edit `.github/workflows/ci.yml`:

```yaml
- name: Run backend tests (pytest)
  id: backend-tests
  # Remove this line to make tests blocking:
  # continue-on-error: true
  run: pytest
```

### Adjust Artifact Retention

```yaml
- name: Upload Backend Test Results
  uses: actions/upload-artifact@v4
  with:
    retention-days: 90  # Change from 30 to 90 days
```

### Add Critical Test Job

```yaml
test-critical:
  runs-on: ubuntu-latest
  steps:
    - name: Run critical tests
      run: pytest tests/critical/ --maxfail=1
      # No continue-on-error - must pass
```

---

## Monitoring Test Health

### Key Metrics

Track in your team:

1. **Test Pass Rate**
   - % of runs with all tests passing
   - Target: >95%

2. **Test Execution Time**
   - Average duration per job
   - Watch for slowdowns

3. **Failure Recovery Time**
   - Time from failure to fix
   - Target: <24 hours

4. **Artifact Download Rate**
   - How often devs download artifacts
   - Indicates engagement with failures

### GitHub Insights

**Path:** Actions → CI/CD Pipeline → "..." menu → View workflow insights

**Shows:**
- Success rate over time
- Average execution duration
- Failure patterns

---

## Best Practices Summary

✅ **DO:**
- Review test summaries after every deployment
- Download artifacts for investigation
- Fix failing tests within 24 hours
- Monitor production after deploying with failures
- Keep tests fast (<3 minutes)

❌ **DON'T:**
- Ignore test failures
- Let broken tests accumulate
- Deploy without checking summary
- Skip artifact review for complex failures
- Disable tests instead of fixing them

---

**Related Documentation:**
- [CI/CD Test Behavior Guide](./CI_CD_TEST_BEHAVIOR.md)
- [Production Monitoring Guide](./PRODUCTION_MONITORING_GUIDE.md)
- [Development Workflow](./development-workflow.md)

---

**Maintained By:** UGM-AICare DevOps Team
**Last Updated:** October 31, 2025
