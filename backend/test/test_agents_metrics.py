import requests
import os
import json

BASE_URL = os.environ.get("BACKEND_BASE_URL", "http://127.0.0.1:8000")
METRICS_URL = f"{BASE_URL}/api/v1/agents/metrics"
RUNS_URL = f"{BASE_URL}/api/v1/agents/command"

# NOTE: This is a lightweight integration-style test; it assumes the server is running locally.
# It will dispatch a few commands (if endpoint available) then query metrics.

def maybe_dispatch(agent: str, action: str):
    payload = {"agent": agent, "action": action, "data": {"test": True}}
    try:
        r = requests.post(RUNS_URL, json=payload, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        return None
    return None


def test_metrics_endpoint_basic():
    # First attempt to fetch metrics even if no runs
    resp = requests.get(METRICS_URL, timeout=10)
    assert resp.status_code == 200, f"Unexpected status code {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "perAgent" in data and "global" in data, f"Malformed response: {data}"
    # Basic shape checks
    ga = data["global"]
    for key in ["total", "running", "succeeded", "failed", "cancelled"]:
        assert key in ga, f"Global metrics missing key {key}"


def test_metrics_after_dispatch():
    # Try creating some runs (best-effort; ignore failures if command endpoint not wired for all agents)
    for agent in ["triage", "intervention", "analytics"]:
        maybe_dispatch(agent, "classify")
    resp = requests.get(METRICS_URL, timeout=10)
    assert resp.status_code == 200, f"Metrics endpoint not reachable: {resp.status_code}"
    data = resp.json()
    per_agent = data.get("perAgent", {})
    # We expect at least keys present (counts may be zero depending on async completion timing)
    for agent in ["triage", "intervention", "analytics"]:
        if agent in per_agent:
            agent_metrics = per_agent[agent]
            for key in ["total", "running", "succeeded", "failed", "cancelled", "lastCompleted"]:
                assert key in agent_metrics, f"Agent {agent} metrics missing key {key}"

if __name__ == "__main__":
    # Allow running manually
    print("Running metrics tests manually...")
    test_metrics_endpoint_basic()
    test_metrics_after_dispatch()
    print("Done.")
