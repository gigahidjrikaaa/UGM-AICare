# UGM-AICare development and research boundaries

Recorded November 5, 2026.

## Completed bachelor's thesis

The bachelor's thesis is completed and submitted, and the author has been awarded the degree. Its canonical record is the separate [thesis repository](https://github.com/gigahidjrikaaa/bachelors_thesis_DEIE_giga), with archival tag `bachelors-thesis-submitted-v1`. The authoritative PDF is `Skripsi Giga - Wisuda.pdf`; its hash is recorded in that repository's `THESIS_RECORD.json`.

The original thesis title is **Transforming University Mental Health Support: An Agentic AI Framework for Proactive Intervention and Resource Management**. Older evaluation documentation may contain earlier titles and research-question numbering. The submitted manuscript takes precedence.

## Ownership of materials

| Material | Canonical home | Treatment |
|---|---|---|
| Submitted manuscript, final PDF and academic appendices | Thesis repository | Preserve; record errata separately |
| Historical evaluation notebooks, scenario files and saved outputs | Existing `backend/research_evaluation/` paths | Retain paths and historical bytes; label results as historical |
| Application source, migrations, operational docs and regression tests | UGM-AICare | Continue development and validation |
| CCSE protocol, frozen labels, replay and invariant tools | `docs/evaluation/` and `backend/research_evaluation/ccse/` | Follow-on research, separately versioned and evaluated |
| Future publications | Initially a clearly scoped study directory | Create a separate research repository when independent publication/reproduction needs justify it |

No datasets or evaluation files were relocated during this separation. References and imports remain valid. Legacy instructions may describe obsolete APIs or dependencies; they are historical instructions, not a current deployment guide.

## Evidence and claims

Historical thesis results apply only to the study's documented corpus, model, prompts and implementation. They are not current performance guarantees or clinical validation. The exact evaluated application commit has not been established; nearby commits must not be substituted.

New results must record: study identifier and protocol version; application commit and dirty-tree status or patch hash; model/provider identifiers; prompt and corpus hashes; environment/dependency versions; run date, configuration and seeds where relevant; raw outputs and analysis; reviewer status; limitations. Never overwrite historical outputs to make them match newer behavior.

## Development milestones

1. Establish a reproducible application release after reconciling local changes with upstream.
2. Validate safety, access control, migrations and complete student/counselor workflows.
3. Establish new evaluation baselines against a pinned implementation.
4. Advance CCSE as a separate study with counselor-reviewed labels and model/failover experiments.

These are future work, not additional requirements for the already completed degree.

## CCSE status

CCSE is follow-on research. Existing scaffolding and unit tests do not constitute completed model-parity experiments or an enforced promotion gate. Label review and provisional thresholds are identified in its own provenance and configuration files. See [study README](../../backend/research_evaluation/ccse/README.md).
