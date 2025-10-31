# CI/CD Test Behavior

**Last Updated:** October 31, 2025

## Overview

The CI/CD pipeline has been configured to **continue deployment even when tests fail**, while providing comprehensive test result summaries. This allows for rapid iteration while maintaining visibility into test health.

---

## 🔄 Pipeline Behavior

### Test Execution

1. **Backend Tests** (`test-backend` job):
   - Runs `pytest` with detailed output
   - **Continues on failure** using `continue-on-error: true`
   - Generates test summary in GitHub Actions UI
   - Uploads test results as artifacts (retained for 30 days)

2. **Frontend Tests** (`test-frontend` job):
   - Runs `npm test` with JSON output
   - **Continues on failure** using `continue-on-error: true`
   - Generates test summary in GitHub Actions UI
   - Uploads test results as artifacts (retained for 30 days)

### Build Phase

- **Build jobs will proceed** even if tests fail
- Build status summary indicates if tests failed
- Images are built and pushed to GHCR with the commit SHA

### Deployment Phase

- **Deployment proceeds** to production even with test failures
- Deployment summary includes test status for both backend and frontend
- Clear warnings are displayed when deploying with failing tests

---

## 📊 Test Result Summaries

### GitHub Actions UI

Each test job generates a detailed summary accessible via the "Summary" tab:

**Backend Test Summary includes:**
- ✅ Passed test count
- ❌ Failed test count
- ⚠️ Error count
- List of failed tests
- Error details (first 50 lines)

**Frontend Test Summary includes:**
- ✅ Passed test count
- ❌ Failed test count
- 📊 Total test count
- List of failed tests
- Error messages

**Deployment Summary includes:**
- Overall test status (passed/failed/skipped)
- Warning if tests failed
- Action items for failed tests
- Deployed component versions
- Deployment timestamp

---

## 📦 Test Artifacts

Test results are automatically uploaded and can be downloaded for detailed analysis:

**Backend Artifacts:**
- `backend-test-results/test-results.xml` - JUnit XML format
- `backend-test-results/test-output.txt` - Full pytest output

**Frontend Artifacts:**
- `frontend-test-results/test-results.json` - Jest JSON report
- `frontend-test-results/test-output.txt` - Full test output

**How to Download:**
1. Go to the GitHub Actions run
2. Scroll to "Artifacts" section at the bottom
3. Click on artifact name to download
4. Artifacts are retained for **30 days**

---

## ⚠️ When Tests Fail

### Immediate Actions

1. **Review Test Summary:**
   - Check the test summary in the Actions UI
   - Identify which tests failed and why

2. **Download Artifacts:**
   - Get full test output for detailed debugging
   - Share with team if needed

3. **Monitor Production:**
   - Watch logs closely after deployment
   - Check for related errors in production

4. **Assess Impact:**
   - Determine if failures affect critical functionality
   - Decide if rollback is necessary

### Rollback Procedure

If deployed code is problematic:

```bash
# Via GitHub Actions UI
1. Go to Actions → CI/CD Pipeline
2. Click "Run workflow"
3. Enter the rollback_sha (previous working commit)
4. Click "Run workflow"

# Via SSH (emergency)
ssh user@production-server
cd /path/to/UGM-AICare
./deploy-prod.sh rollback <previous-sha>
```

### Fix and Redeploy

```bash
# 1. Fix the failing tests locally
npm test                    # Frontend
cd backend && pytest        # Backend

# 2. Commit and push
git add .
git commit -m "fix: resolve test failures"
git push origin main

# 3. Pipeline automatically runs and deploys
```

---

## 🎯 Best Practices

### For Developers

1. **Run Tests Locally:**
   ```bash
   # Before pushing to main
   cd backend && pytest -v
   cd frontend && npm test
   ```

2. **Check Test Summary:**
   - Always review test results in GitHub Actions
   - Don't ignore warnings in deployment summary

3. **Fix Tests Promptly:**
   - Treat test failures as high priority
   - Don't let broken tests accumulate

4. **Use Artifacts:**
   - Download artifacts for complex failures
   - Share artifacts when asking for help

### For DevOps/Maintainers

1. **Monitor Test Health:**
   - Track test failure trends
   - Set up alerts for persistent failures

2. **Review Deployment Summaries:**
   - Check if tests are consistently failing
   - Escalate if failures affect critical paths

3. **Adjust Pipeline If Needed:**
   - Consider making critical tests blocking
   - Update test configurations as project evolves

4. **Maintain Test Quality:**
   - Keep tests fast and reliable
   - Remove flaky tests or fix them

---

## 🔧 Configuration

### Make Specific Tests Blocking

If you want certain critical tests to block deployment:

```yaml
# In .github/workflows/ci.yml
- name: Run critical backend tests
  run: pytest tests/critical/ --maxfail=1
  # No continue-on-error - will fail the job
```

### Disable Continue-on-Error

To make tests block deployment:

```yaml
# Remove or set to false
- name: Run backend tests (pytest)
  id: backend-tests
  continue-on-error: false  # Tests must pass
```

### Adjust Artifact Retention

```yaml
- name: Upload Backend Test Results
  uses: actions/upload-artifact@v4
  with:
    retention-days: 90  # Keep for 90 days instead of 30
```

---

## 📈 Test Metrics

### Recommended Monitoring

Track these metrics over time:

- **Test Pass Rate:** % of pipeline runs with all tests passing
- **Mean Time To Fix:** Time from test failure to fix
- **Flaky Test Rate:** Tests that intermittently fail
- **Test Coverage:** % of code covered by tests
- **Test Execution Time:** Duration of test jobs

### GitHub Actions Insights

View pipeline health:
1. Go to Actions → CI/CD Pipeline
2. Click "..." menu → View workflow insights
3. Review success rates and execution times

---

## 🚨 Emergency Procedures

### All Tests Failing

```bash
# 1. Check if it's an infrastructure issue
# View recent runs in GitHub Actions

# 2. Check test environment setup
# Review test job logs for setup errors

# 3. Compare with last successful run
# Look for environment or dependency changes

# 4. Temporarily disable problematic tests
# Add skip decorators while investigating
```

### Production Issues After Deploy

```bash
# 1. Immediate rollback
# Use workflow_dispatch with rollback_sha

# 2. Investigate correlation
# Compare failed tests with production errors

# 3. Hot-fix if needed
# Fix critical issue and push directly to main

# 4. Post-mortem
# Document what happened and how to prevent
```

---

## 📚 Related Documentation

- [Production Monitoring Guide](./PRODUCTION_MONITORING_GUIDE.md)
- [Development Workflow](./development-workflow.md)
- [Deployment Checklist](./VM_DEPLOYMENT_CHECKLIST.md)

---

## ❓ FAQ

**Q: Why do tests continue even when they fail?**
A: To enable rapid iteration and avoid blocking deployments for non-critical test failures. Teams can review failures and fix them in subsequent commits.

**Q: Is it safe to deploy with failing tests?**
A: It depends on the failure. Always review the test summary and assess impact before proceeding.

**Q: How do I make a test blocking?**
A: Remove `continue-on-error: true` from the test step, or create a separate critical test job without that flag.

**Q: Can I see test results without opening GitHub Actions?**
A: Yes, check the commit status in your PR or on the main branch. Test summaries are also visible in the Actions UI.

**Q: How long are test artifacts kept?**
A: 30 days by default. You can adjust this in the workflow file.

---

**Maintained By:** UGM-AICare DevOps Team  
**Last Review:** October 31, 2025
