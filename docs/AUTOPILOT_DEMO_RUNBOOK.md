# Autopilot Demo Runbook

This runbook executes a deterministic replay for Aika Autopilot and exports a verification artifact.

## Scope

- Creates one allowed autopilot action.
- Creates one approval-required autopilot action.
- Approves and executes both.
- Exports artifact JSON with action IDs, statuses, tx hashes, and explorer links.

## Prerequisites

- Backend dependencies installed.
- Database migrated up to include `autopilot_actions` table.
- Backend environment configured (`backend/.env`).
- Backend server running (default: `http://localhost:22001`).

## Important mode note

`AUTOPILOT_ONCHAIN_PLACEHOLDER=true` means tx hashes are synthetic placeholders.

- This is intended for hackathon demo stability.
- Backend logs include warning lines for each placeholder tx generation.
- Set `AUTOPILOT_ONCHAIN_PLACEHOLDER=false` only after real onchain execution handlers are implemented.

## Step 1: Ensure environment variables

In `backend/.env`:

- `AUTOPILOT_ENABLED=true`
- `AUTOPILOT_ONCHAIN_PLACEHOLDER=true` (demo mode)
- `AUTOPILOT_MAX_RETRIES=5`
- `AUTOPILOT_RETRY_BASE_SECONDS=30`

Optional:

- `AUTOPILOT_DEMO_USER_ID=<existing_user_id>`
- `AUTOPILOT_DEMO_EMAIL=<existing_user_email>`
- `AUTOPILOT_DEMO_API_BASE_URL=http://localhost:22001`
- `AUTOPILOT_DEMO_ACCESS_TOKEN=<bearer_token>`
- `AUTOPILOT_DEMO_AUTH_EMAIL=<admin_email>`
- `AUTOPILOT_DEMO_AUTH_PASSWORD=<admin_password>`

The replay script uses an existing account and does not create a new user record.
Execution mode is hybrid: deterministic action seeding via DB, then approval/proof verification through backend APIs.

## Step 2: Run migrations

From repository root:

```bash
cd backend
alembic upgrade head
```

## Step 3: Replay demo

From repository root:

```bash
python scripts/replay_autopilot_demo.py
```

Expected output:

- JSON payload printed to terminal.
- Artifact file generated at `docs/autopilot_demo_artifact.json`.

## Step 4: Verify API/UI

- Admin queue page: `/admin/autopilot`
- User proof timeline page: `/proof`

Backend endpoint checks:

- `GET /api/v1/admin/autopilot/actions`
- `GET /api/v1/proof/actions`

## Step 5: Verify artifact content

Open `docs/autopilot_demo_artifact.json` and confirm:

- Exactly two actions in `actions` array.
- One with `policy_decision=allow`.
- One with `policy_decision=require_approval`.
- Final status is `confirmed` for both.
- `tx_hash` is populated.

## Troubleshooting

- If action status stays `awaiting_approval`, approve it via admin queue and rerun script.
- If migration errors occur, re-run `alembic upgrade head` after checking DB connection vars.
- If tx hash exists but no explorer link, check chain ID mapping in `scripts/replay_autopilot_demo.py`.
