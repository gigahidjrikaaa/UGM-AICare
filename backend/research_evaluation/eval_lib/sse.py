from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Iterable, Iterator, Optional


@dataclass(frozen=True)
class SSEEvent:
    event: str
    data: str


def iter_sse_events(lines: Iterable[str]) -> Iterator[SSEEvent]:
    """Parse Server-Sent Events from an iterable of text lines.

    Supports the common format:
      event: metadata
      data: {"foo": "bar"}

    Also supports "legacy" payloads where only `data:` lines are present.
    """
    event_name: str = "message"
    data_lines: list[str] = []

    def flush() -> Optional[SSEEvent]:
        nonlocal event_name, data_lines
        if not data_lines:
            return None
        payload = "\n".join(data_lines)
        data_lines = []
        return SSEEvent(event=event_name, data=payload)

    for raw in lines:
        line = raw.rstrip("\n")
        if not line:
            out = flush()
            if out is not None:
                yield out
            event_name = "message"
            continue

        if line.startswith(":"):
            continue

        if line.startswith("event:"):
            event_name = line[len("event:") :].strip() or "message"
            continue

        if line.startswith("data:"):
            data_lines.append(line[len("data:") :].lstrip())
            continue

    out = flush()
    if out is not None:
        yield out


def try_parse_json(text: str) -> Optional[dict[str, Any]]:
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        return None
    if isinstance(value, dict):
        return value
    return None


def extract_first_metadata_dict(lines: Iterable[str]) -> Optional[dict[str, Any]]:
    """Notebook-compatible metadata extraction.

    The notebook scans SSE `data:` lines and treats the first JSON object
    containing `agents_invoked` as the metadata payload.
    """
    for event in iter_sse_events(lines):
        # New format: explicit metadata event
        if event.event == "metadata":
            parsed = try_parse_json(event.data)
            if parsed is not None:
                return parsed

        # Legacy: JSON embedded in message/final_response events too
        parsed = try_parse_json(event.data)
        if parsed is not None and "agents_invoked" in parsed:
            return parsed

    return None
