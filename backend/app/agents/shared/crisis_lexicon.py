"""Canonical crisis-detection lexicon (single source of truth).

Every crisis keyword/regex used across the platform MUST come from this
module. Before this module existed, five divergent vocabularies coexisted
(aika/constants.py, sta/classifiers.py, the decision-prompt prose, tool
descriptions, screening_awareness), and the deterministic escalation net
could only catch a fraction of the phrases the system itself taught the
LLM to watch for (e.g. "gantung diri" was in the prompt but not in the
deterministic list).

Consumers:
- ``app.agents.aika.message_classifier.detect_crisis_keywords`` (deterministic
  safety net in the Aika decision node) — delegates here.
- ``app.agents.sta.classifiers`` (rule-based STA prescreen) — imports here.
- ``app.agents.aika.prompt_builder`` — renders the in-prompt keyword list
  from the same registry, so the model is told to watch exactly what the
  deterministic net can catch.

Design rules:
- Keywords are lowercase substrings matched against a lowercased message.
  Err toward inclusion for explicit self-harm/suicide vocabulary; false
  positives only cost an unnecessary escalation, false negatives cost a
  missed crisis.
- Patterns are compiled regexes for morphological variants that substring
  matching cannot cover ("want to die", "can't take it anymore", ...).
- This module must stay stdlib-only and import-light: it runs on the hot
  path of every message.
"""
from __future__ import annotations

import re

__all__ = [
    "CRISIS_KEYWORDS",
    "CRISIS_PATTERNS",
    "detect_crisis_keywords",
    "has_crisis_signal",
    "render_keywords_for_prompt",
]

# ---------------------------------------------------------------------------
# Substring keywords (lowercase; matched against lowercased text)
# ---------------------------------------------------------------------------

# Explicit suicide / death-wish vocabulary
_EXPLICIT_SUICIDE: tuple[str, ...] = (
    # English
    "suicide",
    "suicidal",
    "kill myself",
    "end my life",
    "ending it all",
    "wish i was dead",
    "wish i were dead",
    "better off dead",
    "better off without me",
    "world without me",
    "don't want to live",
    "dont want to live",
    "can't go on",
    "cant go on",
    # Indonesian
    "bunuh diri",
    "mengakhiri hidup",
    "tidak ingin hidup",       # covers "...tidak ingin hidup lagi"
    "tidak mau hidup",
    "ga mau hidup",
    "gak mau hidup",
    "enggak mau hidup",
    "ingin mati",
    "pengen mati",
    "mau mati",
    "lebih baik mati",
    "mati saja",
    "mati aja",
)

# Self-harm vocabulary (methods and acts)
_SELF_HARM: tuple[str, ...] = (
    # English
    "self-harm",
    "self harm",
    "cut my wrists",
    "slit my wrists",
    "cutting myself",
    "jump off",
    "jump from building",
    "hanging myself",
    "overdose",
    # Indonesian
    "menyakiti diri",
    "melukai diri",
    "lukai diri",
    "menusuk diri",
    "nyayat diri",
    "sayat diri",
    "mutilasi diri",
    "gantung diri",
    "loncat dari gedung",      # "meloncat dari gedung" contains "loncat ..."
    "lonjong dari gedung",
)

# Farewell / final-message indicators
_FAREWELL: tuple[str, ...] = (
    "goodbye note",
    "goodbye letter",
    "suicide note",
    "final message",
    "surat perpisahan",
    "pesan terakhir",
)

CRISIS_KEYWORDS: tuple[str, ...] = (
    _EXPLICIT_SUICIDE + _SELF_HARM + _FAREWELL
)

# ---------------------------------------------------------------------------
# Regex patterns (morphological variants substring matching cannot cover)
# ---------------------------------------------------------------------------

_CRISIS_PATTERN_SOURCES: tuple[str, ...] = (
    r"\b(want|wanna|wish)(?:ed)?\s+(?:to\s+)?(die|be\s+dead)\b",   # want to die / wanna die
    r"\b(don'?t|do\s*not)\s+want\s+to\s+live\b",                    # don't want to live
    r"\b(can'?t|cant|cannot)\s+(take|do)\s+(it|this)\s+(anymore|any\s+more)\b",
    r"\b(end|ending)\s+(my|this)?\s*(life|it\s+all)\b",             # end my life / ending it all
    r"\b(kill|killing)\s+my?self\b",                                # kill(ing) myself
    r"\b(ready|prepared)\s+to\s+die\b",                             # ready to die
    r"\bno\s+reason\s+to\s+live\b",                                 # no reason to live
    r"\bmau\s+mati\b",                                              # mau mati
    r"\b(ingin|pengen|pengin)\s+mati\b",                            # ingin/pengen mati
    r"\b(ga|gak|enggak|nggak)\s+mau\s+hidup\b",                     # ga/gak mau hidup
    r"\btidak\s+(mau|ingin)\s+hidup\b",                             # tidak mau/ingin hidup
    r"\b(meloncat|loncat|lonjong)\s+dari\s+(gedung|menara|jembatan)\b",
    r"\bgantung\s+diri\b",
)

CRISIS_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern, re.IGNORECASE) for pattern in _CRISIS_PATTERN_SOURCES
)

# ---------------------------------------------------------------------------
# Detection API
# ---------------------------------------------------------------------------

def detect_crisis_keywords(text: str) -> list[str]:
    """Return every crisis signal found in *text* (case-insensitive).

    Keyword hits are returned verbatim; regex hits are returned as
    ``"pattern:<source>"`` descriptors so callers can log *which* signal
    fired. An empty list means no crisis signals were detected.

    >>> detect_crisis_keywords("I want to bunuh diri")
    ['bunuh diri']
    >>> detect_crisis_keywords("aku pengen mati")
    ['pengen mati', 'pattern:...mati...']
    >>> detect_crisis_keywords("just feeling a bit stressed")
    []
    """
    lowered = (text or "").lower()
    hits = [kw for kw in CRISIS_KEYWORDS if kw in lowered]
    hits.extend(
        f"pattern:{pattern.pattern}" for pattern in CRISIS_PATTERNS if pattern.search(text or "")
    )
    return hits


def has_crisis_signal(text: str) -> bool:
    """Fast boolean variant of :func:`detect_crisis_keywords`.

    >>> has_crisis_signal("mau gantung diri")
    True
    >>> has_crisis_signal("halo apa kabar")
    False
    """
    lowered = (text or "").lower()
    if any(kw in lowered for kw in CRISIS_KEYWORDS):
        return True
    return any(pattern.search(text or "") for pattern in CRISIS_PATTERNS)


def render_keywords_for_prompt(limit: int = 80) -> str:
    """Render the crisis keyword registry for injection into prompts.

    The default renders the FULL registry: the prompt tells the model which
    keywords matter, so the LLM's instructions must cover exactly what the
    deterministic escalation net can catch — never a truncated subset.
    """
    shown = CRISIS_KEYWORDS[:limit]
    lines = ", ".join(shown)
    suffix = ", …" if len(CRISIS_KEYWORDS) > limit else ""
    return lines + suffix
