"""Validate and freeze the CCSE gate corpus, labels, and gate config.

This is Section 8 step 1 of docs/evaluation/CHANGE_CONTROL_SAFETY_ENVELOPE.md:
the severity-labeled crisis corpus the change-control gate is anchored to.

It validates label/corpus consistency against gate_config.json, then writes
corpus_freeze.json (the hash ledger) pinning the exact bytes of all three
artifacts. Any edit to the corpus, labels, or config requires a re-freeze.

Usage:
    backend/.venv/Scripts/python.exe backend/research_evaluation/ccse/freeze_corpus.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

CCSE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CCSE_DIR.parents[1]
REPO_ROOT = BACKEND_DIR.parent

CORPUS_PATH = BACKEND_DIR / "research_evaluation" / "rq1_crisis_detection" / "conversation_scenarios.json"
LABELS_PATH = CCSE_DIR / "corpus_labels.json"
CONFIG_PATH = CCSE_DIR / "gate_config.json"
FREEZE_PATH = CCSE_DIR / "corpus_freeze.json"

VALID_SEVERITIES = ["none", "low", "moderate", "high", "imminent"]
VALID_LANGUAGES = ["en", "id", "mixed"]
CRISIS_SEVERITIES = ("moderate", "high", "imminent")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _rel(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT)).replace("\\", "/")


def validate(corpus: list, labels_doc: dict, config: dict) -> list[str]:
    errors: list[str] = []
    labels = labels_doc["labels"]
    corpus_by_id = {s["id"]: s for s in corpus}
    label_by_id = {l["id"]: l for l in labels}

    expected = config["corpus"]
    if len(labels) != expected["expected_scenarios"]:
        errors.append(f"labels count {len(labels)} != expected {expected['expected_scenarios']}")
    if len(label_by_id) != len(labels):
        errors.append("duplicate label ids present")

    missing = sorted(set(corpus_by_id) - set(label_by_id))
    extra = sorted(set(label_by_id) - set(corpus_by_id))
    if missing:
        errors.append(f"missing labels: {missing}")
    if extra:
        errors.append(f"unknown label ids: {extra}")

    for label in labels:
        lid = label["id"]
        if label["severity"] not in VALID_SEVERITIES:
            errors.append(f"{lid}: invalid severity {label['severity']!r}")
        if label["language"] not in VALID_LANGUAGES:
            errors.append(f"{lid}: invalid language {label['language']!r}")

        source = corpus_by_id.get(lid)
        if source is None:
            continue
        if source["is_crisis"] != label["source_is_crisis"]:
            errors.append(f"{lid}: source_is_crisis mismatch vs corpus")

        user_turns = sum(1 for t in source["turns"] if t["role"] == "user")
        onset = label["risk_onset_user_turn_index"]
        if label["source_is_crisis"]:
            if label["severity"] not in CRISIS_SEVERITIES:
                errors.append(f"{lid}: crisis scenario must be moderate/high/imminent, got {label['severity']!r}")
            if onset is None or not (0 <= onset < user_turns):
                errors.append(f"{lid}: risk_onset_user_turn_index {onset!r} out of range for {user_turns} user turns")
        else:
            if label["severity"] != "low":
                errors.append(f"{lid}: non-crisis seed scenario must be severity 'low'")
            if onset is not None:
                errors.append(f"{lid}: non-crisis scenario must have null risk_onset_user_turn_index")

    severity_counts = {sev: sum(1 for l in labels if l["severity"] == sev) for sev in VALID_SEVERITIES}
    if severity_counts != expected["expected_severity_counts"]:
        errors.append(f"severity counts {severity_counts} != expected {expected['expected_severity_counts']}")

    crisis_count = sum(1 for s in corpus if s["is_crisis"])
    if crisis_count != expected["expected_crisis"]:
        errors.append(f"corpus crisis count {crisis_count} != expected {expected['expected_crisis']}")

    hard = [l for l in labels if l["severity"] in ("high", "imminent")]
    if len(hard) != expected["expected_hard_gate_scenarios"]:
        errors.append(f"hard-gate scenario count {len(hard)} != expected {expected['expected_hard_gate_scenarios']}")
    hard_languages = {l["language"] for l in hard}
    for lang in config["hard_invariants"]["INV-1"]["language_subsets"]:
        if lang not in hard_languages:
            errors.append(f"INV-1 subset {lang!r} has no severity>=high scenarios")

    return errors


def main() -> int:
    corpus = load_json(CORPUS_PATH)
    labels_doc = load_json(LABELS_PATH)
    config = load_json(CONFIG_PATH)

    errors = validate(corpus, labels_doc, config)
    if errors:
        print("FREEZE BLOCKED - validation errors:")
        for error in errors:
            print(f"  - {error}")
        return 1

    labels = labels_doc["labels"]
    severity_counts = {sev: sum(1 for l in labels if l["severity"] == sev) for sev in VALID_SEVERITIES}
    language_counts = {lang: sum(1 for l in labels if l["language"] == lang) for lang in VALID_LANGUAGES}

    freeze = {
        "freeze_version": config["config_version"],
        "frozen_at": datetime.now(timezone.utc).isoformat(),
        "spec": config["spec"],
        "files": {
            "corpus": {
                "path": _rel(CORPUS_PATH),
                "sha256": sha256(CORPUS_PATH),
                "bytes": CORPUS_PATH.stat().st_size,
            },
            "labels": {
                "path": _rel(LABELS_PATH),
                "sha256": sha256(LABELS_PATH),
                "bytes": LABELS_PATH.stat().st_size,
            },
            "gate_config": {
                "path": _rel(CONFIG_PATH),
                "sha256": sha256(CONFIG_PATH),
                "bytes": CONFIG_PATH.stat().st_size,
            },
        },
        "counts": {
            "scenarios": len(corpus),
            "crisis": sum(1 for s in corpus if s["is_crisis"]),
            "severity": severity_counts,
            "language": language_counts,
        },
        "review_status": labels_doc["review_status"],
        "validation": "passed",
    }
    FREEZE_PATH.write_text(json.dumps(freeze, indent=2) + "\n", encoding="utf-8")

    print(f"Frozen: {_rel(FREEZE_PATH)}")
    print(f"  corpus  sha256={freeze['files']['corpus']['sha256']}")
    print(f"  labels  sha256={freeze['files']['labels']['sha256']}")
    print(f"  config  sha256={freeze['files']['gate_config']['sha256']}")
    print(f"  severity={severity_counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
