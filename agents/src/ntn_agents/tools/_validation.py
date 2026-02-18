"""Input validation helpers for agent tools."""

import re

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def validate_uuid(value: str, name: str = "id") -> str:
    """Validate that *value* looks like a UUID and return it.

    Raises ``ValueError`` if the value does not match the canonical UUID format.
    This prevents path-traversal or injection via f-string URL construction.
    """
    if not _UUID_RE.match(value):
        raise ValueError(f"{name} is not a valid UUID: {value!r}")
    return value
