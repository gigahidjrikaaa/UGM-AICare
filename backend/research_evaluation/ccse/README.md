# CCSE — follow-on research

**Status: draft research scaffolding; separate from the completed bachelor's thesis.**

CCSE studies whether model changes and provider failovers preserve crisis-safety behavior in UGM-AICare. The [study specification](../../../docs/evaluation/CHANGE_CONTROL_SAFETY_ENVELOPE.md) defines the intended experiments and safety invariants.

## Existing artifacts

- `CORPUS_PROVENANCE.md`: provenance, licensing and pending counselor review.
- `corpus_labels.json`, `corpus_freeze.json`, `gate_config.json`: draft labels, frozen hashes and thresholds.
- `freeze_corpus.py`, `replay_runner.py`, `invariants.py`: corpus freezing, replay and invariant evaluation.
- `../../tests/test_ccse_corpus.py` and `../../tests/test_ccse_invariants.py`: regression tests for the tooling.

The frozen corpus references historical thesis scenarios; reuse does not make CCSE part of the submitted thesis. Preserve frozen artifacts and create a new version when labels or configuration change.

## Work still required

1. Obtain licensed-counselor review of labels and scope.
2. Pin the application, model, prompts, corpus and environment for each experiment.
3. Run baseline cross-model and controlled failover experiments; retain raw evidence and manifests in new run directories.
4. Calibrate provisional soft thresholds from measurements.
5. Integrate and verify promotion gating before describing the gate as enforced.

Replay can contact a live backend, switch its model and create evaluation records. Use an isolated evaluation deployment and dedicated accounts; it is not an offline unit test.

Passing tooling tests establishes tooling behavior, not crisis recall, clinical effectiveness or model parity. See [research boundaries](../../../docs/research/RESEARCH_BOUNDARIES.md) for evidence requirements.
