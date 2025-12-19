# Deployment Checklist for CVE-2025-66478 Fix

## 1. Verify Local Changes
- [x] `frontend/package.json` updated to:
    - `next`: `16.0.7`
    - `react`: `19.2.1`
    - `react-dom`: `19.2.1`
- [x] `frontend/package-lock.json` regenerated (via `npm install`).
- [x] `frontend/Dockerfile` updated (memory limit increased, turbopack disabled).
- [x] `docker-compose.prod.yml` updated (memory limits increased).

## 2. Commit and Push
Run the following commands in your terminal:

```bash
cd UGM-AICare
git add frontend/package.json frontend/package-lock.json frontend/Dockerfile docker-compose.prod.yml
git commit -m "fix: patch CVE-2025-66478 (Next.js 16.0.7, React 19.2.1) and fix prod build"
git push origin main
```

## 3. Deploy in Coolify
1. Go to your Coolify dashboard.
2. Open the **UGM-AICare** project.
3. Select the **frontend** service (or the main application if deployed together).
4. Click **Deploy** (or wait for the webhook if configured).
5. Monitor the logs. The build should now pass without `ERESOLVE` errors.

## 4. Verification
After deployment:
1. Visit `https://aicare.sumbu.xyz`.
2. Verify the application loads correctly.
3. Check logs for any runtime errors.
