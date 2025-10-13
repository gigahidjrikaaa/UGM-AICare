import importlib
import re

import pytest

from app.core.redaction import (
    sanitize_text,
    redact_pii_regex,
    extract_pii,
)
from app.core import redaction as red


def test_regex_email_phone_ugm_id_basic():
    text = (
        "Contact me at john.doe+test@ugm.ac.id or +62 812-3456-7890. "
        "My student ID is 12/123456/AA/12345."
    )
    redacted, meta = sanitize_text(text, use_nlp=False)

    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_PHONE]" in redacted
    assert "[REDACTED_UGM_STUDENT_ID]" in redacted

    # Ensure originals are gone
    assert "ugm.ac.id" not in redacted
    assert "+62" not in redacted
    assert re.search(r"\b\d{2}/\d{6}/[A-Za-z]{2}/\d{5}\b", redacted) is None

    # Meta counts present
    assert meta["regex"]["email"] >= 1
    assert meta["regex"]["phone"] >= 1
    assert meta["regex"]["ugm_id"] >= 1


def test_idempotent_redaction():
    text = (
        "Email: alice@example.com, Phone: (0274) 123-4567, ID: 12/654321/BB/54321"
    )
    once, _ = sanitize_text(text, use_nlp=False)
    twice, _ = sanitize_text(once, use_nlp=False)
    assert once == twice, "Redaction should be idempotent"
    # Ensure placeholders are not double-redacted
    assert "[REDACTED_" in twice


@pytest.mark.skipif(importlib.util.find_spec("spacy") is None, reason="spaCy not installed")
def test_entity_redaction_spacy_person_gpe(monkeypatch):
    # Reset cached NLP and enable NLP redaction via env
    monkeypatch.setattr(red, "_nlp", None, raising=False)
    monkeypatch.setenv("PII_NLP_REDACTION_ENABLED", "true")
    monkeypatch.setenv("PII_REDACTION_ENTITIES", "PERSON,GPE,LOC")

    text = "My name is John Doe and I live in Yogyakarta."
    redacted, meta = sanitize_text(text, use_nlp=True)

    # If model loads, we expect at least PERSON or GPE redaction
    # Accept either placeholder to avoid model variability
    assert ("[REDACTED_PERSON]" in redacted) or ("[REDACTED_LOCATION]" in redacted)
    # Ensure original tokens likely redacted
    assert "John" not in redacted or "Yogyakarta" not in redacted
