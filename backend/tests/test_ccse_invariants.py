"""Tests for the CCSE hard-invariant evaluator and replay runner helpers.

These tests exercise Section 4 of
docs/evaluation/CHANGE_CONTROL_SAFETY_ENVELOPE.md without touching the network:
replay rows are synthesized from the frozen labels file.
"""

import json
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
CCSE_DIR = BACKEND_DIR / "research_evaluation" / "ccse"
sys.path.insert(0, str(CCSE_DIR))

import invariants as ccse  # noqa: E402
import replay_runner  # noqa: E402


def _load_labels() -> dict:
    return json.loads(ccse.DEFAULT_LABELS_PATH.read_text(encoding="utf-8"))


def _load_config() -> dict:
    return json.loads(ccse.DEFAULT_CONFIG_PATH.read_text(encoding="utf-8"))


def _label_entries(labels_payload: dict, min_severity: str = "high") -> list[dict]:
    threshold = ccse.severity_rank(min_severity)
    return [
        entry
        for entry in labels_payload["labels"]
        if ccse.severity_rank(entry["severity"]) >= threshold
    ]


def _pick(entries: list[dict], language: str | None = None, n: int = 1) -> list[dict]:
    selected = [entry for entry in entries if language is None or entry["language"] == language]
    assert len(selected) >= n, f"corpus lacks {n} {language or 'any'}-language high scenarios"
    return selected[:n]


def _row(
    model: str,
    label: dict,
    detected_risk: str,
    **overrides,
) -> dict:
    row = {
        "model": model,
        "provider": "google",
        "scenario_id": label["id"],
        "is_crisis": bool(label.get("source_is_crisis")),
        "label_severity": label["severity"],
        "language": label["language"],
        "evaluated_turn_index": 0,
        "detected_risk": detected_risk,
        "detected_severity": ccse.normalize_detected_severity(detected_risk),
        "response_text": "response",
        "crisis_resources_surfaced": True,
        "counselor_alert_created": True,
        "audit_annotation_written": True,
        "alert_ids": ["1"],
        "audit_ids": ["1"],
        "elapsed_s": 1.0,
        "cost_usd": 0.001,
        "appropriateness_score": None,
        "harmful": None,
        "instrument_indicated": None,
        "instrument_item9_skipped": None,
        "error": None,
    }
    row.update(overrides)
    return row


def test_detected_severity_mapping():
    assert ccse.normalize_detected_severity("critical") == "imminent"
    assert ccse.normalize_detected_severity("medium") == "moderate"
    assert ccse.normalize_detected_severity("HIGH") == "high"
    assert ccse.normalize_detected_severity("banana") == "none"
    assert ccse.normalize_detected_severity(None) == "none"


def test_response_surfaces_crisis_resources():
    assert ccse.response_surfaces_crisis_resources("Hubungi 0851-0111-0800 sekarang")
    assert ccse.response_surfaces_crisis_resources("Call 119 ext. 8 or 112")
    assert ccse.response_surfaces_crisis_resources("SEJIWA siap membantu")
    assert not ccse.response_surfaces_crisis_resources("Let's do a breathing exercise")
    assert not ccse.response_surfaces_crisis_resources(None)


def test_inv1_passes_with_full_recall():
    labels_payload = _load_labels()
    config = _load_config()
    rows = [
        _row("m", label, "critical" if label["severity"] == "imminent" else "high")
        for label in _label_entries(labels_payload)
    ]
    result = ccse.evaluate_inv1(
        rows, ccse.index_labels(labels_payload), config["hard_invariants"]["INV-1"]
    )
    assert result["status"] == ccse.STATUS_PASS
    assert result["metrics"]["blocking_false_negatives"] == 0
    assert result["metrics"]["per_language"]["en"]["recall"] == 1.0
    assert result["metrics"]["per_language"]["id"]["recall"] == 1.0


def test_inv1_fails_on_en_false_negative():
    labels_payload = _load_labels()
    config = _load_config()
    entries = _label_entries(labels_payload)
    en_label = _pick(entries, "en")[0]
    rows = [
        _row(
            "m",
            label,
            "low" if label["id"] == en_label["id"] else "high",
        )
        for label in entries
    ]
    result = ccse.evaluate_inv1(
        rows, ccse.index_labels(labels_payload), config["hard_invariants"]["INV-1"]
    )
    assert result["status"] == ccse.STATUS_FAIL
    assert result["metrics"]["blocking_false_negatives"] == 1
    assert result["violations"][0]["scenario_id"] == en_label["id"]


def test_inv1_mixed_false_negative_is_reported_not_blocking():
    labels_payload = _load_labels()
    config = _load_config()
    entries = _label_entries(labels_payload)
    mixed_label = _pick(entries, "mixed")[0]
    rows = [
        _row("m", label, "low" if label["id"] == mixed_label["id"] else "high")
        for label in entries
    ]
    result = ccse.evaluate_inv1(
        rows, ccse.index_labels(labels_payload), config["hard_invariants"]["INV-1"]
    )
    assert result["status"] == ccse.STATUS_PASS
    assert result["metrics"]["per_language"]["mixed"]["false_negatives"] == 1
    assert result["metrics"]["per_language"]["mixed"]["blocking"] is False


def test_inv1_error_row_counts_as_false_negative():
    labels_payload = _load_labels()
    config = _load_config()
    entries = _label_entries(labels_payload)
    target = _pick(entries, "id")[0]
    rows = [
        _row(
            "m",
            label,
            "high",
            error="ReadTimeout" if label["id"] == target["id"] else None,
        )
        for label in entries
    ]
    result = ccse.evaluate_inv1(
        rows, ccse.index_labels(labels_payload), config["hard_invariants"]["INV-1"]
    )
    assert result["status"] == ccse.STATUS_FAIL
    assert result["metrics"]["blocking_false_negatives"] == 1


def test_inv2_requires_full_escalation_evidence():
    labels_payload = _load_labels()
    config = _load_config()
    label = _pick(_label_entries(labels_payload))[0]

    passing = ccse.evaluate_inv2(
        [_row("m", label, "high")], config["hard_invariants"]["INV-2"]
    )
    assert passing["status"] == ccse.STATUS_PASS

    missing_audit = ccse.evaluate_inv2(
        [_row("m", label, "high", audit_annotation_written=False)],
        config["hard_invariants"]["INV-2"],
    )
    assert missing_audit["status"] == ccse.STATUS_FAIL
    assert missing_audit["violations"][0]["missing"] == ["audit_annotation_written"]

    unknown = ccse.evaluate_inv2(
        [_row("m", label, "high", counselor_alert_created=None)],
        config["hard_invariants"]["INV-2"],
    )
    assert unknown["status"] == ccse.STATUS_NOT_EVALUATED


def test_inv2_ignores_non_crisis_classified_rows():
    labels_payload = _load_labels()
    config = _load_config()
    label = _pick(_label_entries(labels_payload))[0]
    result = ccse.evaluate_inv2(
        [_row("m", label, "low", crisis_resources_surfaced=None)],
        config["hard_invariants"]["INV-2"],
    )
    assert result["status"] == ccse.STATUS_NOT_EVALUATED
    assert result["metrics"]["crisis_classified_turns"] == 0


def test_inv3_harmful_and_unscored_handling():
    labels_payload = _load_labels()
    config = _load_config()
    label = _pick(_label_entries(labels_payload))[0]

    scored = ccse.evaluate_inv3(
        [
            _row("m", label, "high", appropriateness_score=5),
            _row("m", label, "high", appropriateness_score=4),
        ],
        config["hard_invariants"]["INV-3"],
    )
    assert scored["status"] == ccse.STATUS_PASS

    harmful = ccse.evaluate_inv3(
        [_row("m", label, "high", appropriateness_score=1)],
        config["hard_invariants"]["INV-3"],
    )
    assert harmful["status"] == ccse.STATUS_FAIL
    assert harmful["metrics"]["harmful_responses"] == 1

    unscored = ccse.evaluate_inv3(
        [
            _row("m", label, "high", appropriateness_score=5),
            _row("m", label, "high"),
        ],
        config["hard_invariants"]["INV-3"],
    )
    assert unscored["status"] == ccse.STATUS_NOT_EVALUATED


def test_inv4_flags_skipped_gateway_item():
    labels_payload = _load_labels()
    config = _load_config()
    label = _pick(_label_entries(labels_payload))[0]

    skipped = ccse.evaluate_inv4(
        [_row("m", label, "high", instrument_indicated=True, instrument_item9_skipped=True)],
        config["hard_invariants"]["INV-4"],
    )
    assert skipped["status"] == ccse.STATUS_FAIL

    administered = ccse.evaluate_inv4(
        [_row("m", label, "high", instrument_indicated=True, instrument_item9_skipped=False)],
        config["hard_invariants"]["INV-4"],
    )
    assert administered["status"] == ccse.STATUS_PASS

    not_indicated = ccse.evaluate_inv4(
        [_row("m", label, "high", instrument_indicated=False)],
        config["hard_invariants"]["INV-4"],
    )
    assert not_indicated["status"] == ccse.STATUS_NOT_EVALUATED


def test_evaluate_run_per_model_and_e1_table():
    labels_payload = _load_labels()
    config = _load_config()
    entries = _label_entries(labels_payload)
    baseline = [_row("model-a", label, "high") for label in entries]
    regressed_id = entries[0]["id"]
    candidate = [
        _row("model-b", label, "low" if label["id"] == regressed_id else "high")
        for label in entries
    ]
    rows = baseline + candidate

    report = ccse.evaluate_run(rows, labels_payload, config)
    assert report["overall_status"] == ccse.STATUS_FAIL
    assert report["per_model"]["model-a"]["invariants"]["INV-1"]["status"] == ccse.STATUS_PASS
    assert report["per_model"]["model-b"]["invariants"]["INV-1"]["status"] == ccse.STATUS_FAIL

    e1 = {row["model"]: row for row in ccse.build_e1_table(rows, labels_payload, config)}
    assert e1["model-a"]["recall"] == 1.0
    assert e1["model-b"]["false_negatives"] == 1
    assert e1["model-b"]["recall"] < 1.0


def test_diff_runs_detects_new_false_negative():
    labels_payload = _load_labels()
    config = _load_config()
    label = _pick(_label_entries(labels_payload, "en"))[0]

    baseline = [_row("m", label, "high")]
    candidate = [_row("m", label, "low")]

    diff = ccse.diff_runs(baseline, candidate, labels_payload, config)
    assert diff["regressions"] == 1
    assert diff["fixed"] == 0
    assert diff["changes"][0]["became_false_negative"] is True

    restored = ccse.diff_runs(candidate, baseline, labels_payload, config)
    assert restored["regressions"] == 0
    assert restored["fixed"] == 1


def test_runner_model_spec_and_cost_helpers():
    specs = replay_runner.parse_model_specs("gemini:auto,glm-4.6|zai,gemma-4-31b")
    assert specs == [
        ("gemini:auto", "google"),
        ("glm-4.6", "zai"),
        ("gemma-4-31b", "google"),
    ]
    assert replay_runner.extract_cost({"usage": {"cost": 0.0012}}) == pytest.approx(0.0012)
    assert replay_runner.extract_cost({"cost_usd": "2.5"}) == pytest.approx(2.5)
    assert replay_runner.extract_cost({}) is None


def test_runner_freeze_verification_matches_repo():
    freeze = replay_runner.verify_freeze()
    assert freeze["freeze_version"]
    assert "corpus" in freeze["files"]
