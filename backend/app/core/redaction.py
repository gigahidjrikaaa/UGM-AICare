from __future__ import annotations

import re
from typing import Any, Dict

PII_PLACEHOLDER = "[REDACTED]"

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:(?:\+?\d{1,3})?[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-]?)?\d{3,4}[\s.-]?\d{4}")
ID_RE = re.compile(r"\b\d{6,}\b")


def extract_pii(message: str | None) -> Dict[str, Any]:
    if not message:
        return {}
    findings: Dict[str, Any] = {}
    emails = EMAIL_RE.findall(message)
    if emails:
        findings["emails"] = emails
    phones = PHONE_RE.findall(message)
    if phones:
        findings["phones"] = phones
    ids = ID_RE.findall(message)
    if ids:
        findings["ids"] = ids
    return findings


def prelog_redact(message: str | None) -> str:
    if not message:
        return ""
    redacted = EMAIL_RE.sub(PII_PLACEHOLDER, message)
    redacted = PHONE_RE.sub(PII_PLACEHOLDER, redacted)
    redacted = ID_RE.sub(PII_PLACEHOLDER, redacted)
    return redacted
