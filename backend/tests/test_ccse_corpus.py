"""Gate tests for the CCSE corpus, severity labels, and freeze ledger.

These tests guard Section 8 step 1 of
docs/evaluation/CHANGE_CONTROL_SAFETY_ENVELOPE.md: the severity-labeled
crisis corpus that the change-control gate (INV-1) is anchored to.

Editing the corpus, labels, or gate config requires re-running
backend/research_evaluation/ccse/freeze_corpus.py, which updates the hash
ledger asserted by test_freeze_ledger_exists_and_matches.
"""

import json
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
CCSE_DIR = BACKEND_DIR / "research_evaluation" / "ccse"
sys.path.insert(0, str(CCSE_DIR))

import freeze_corpus  # noqa: E402


@pytest.fixture(scope="module")
def docs():
    corpus = json.loads(freeze_corpus.CORPUS_PATH.read_text(encoding="utf-8"))
    labels = json.loads(freeze_corpus.LABELS_PATH.read_text(encoding="utf-8"))
    config = json.loads(freeze_corpus.CONFIG_PATH.read_text(encoding="utf-8"))
    return corpus, labels, config


def test_labels_validate_against_corpus(docs):
    corpus, labels, config = docs
    assert freeze_corpus.validate(corpus, labels, config) == []


def test_freeze_ledger_exists_and_matches(docs):
    assert freeze_corpus.FREEZE_PATH.exists(), (
        "corpus_freeze.json missing — run backend/research_evaluation/ccse/freeze_corpus.py"
    )
    freeze = json.loads(freeze_corpus.FREEZE_PATH.read_text(encoding="utf-8"))
    frozen_files = {
        "corpus": freeze_corpus.CORPUS_PATH,
        "labels": freeze_corpus.LABELS_PATH,
        "gate_config": freeze_corpus.CONFIG_PATH,
    }
    for key, path in frozen_files.items():
        assert freeze["files"][key]["sha256"] == freeze_corpus.sha256(path), (
            f"{key} changed since freeze — re-run freeze_corpus.py"
        )


def test_hard_gate_threshold_wired_to_inv1(docs):
    _, _, config = docs
    inv1 = config["hard_invariants"]["INV-1"]
    assert inv1["severity_threshold"] == "high"
    assert inv1["max_false_negatives"] == 0
    assert inv1["language_subsets"] == ["en", "id"]
    assert config["gate_subset_fast"]["invariants"] == ["INV-1", "INV-2", "INV-3"]
