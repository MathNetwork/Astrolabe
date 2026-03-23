"""
Astrolabe file format validation.

Validates the astrolabe.json structure:
  { "<hash>": { "ref": [str, ...], "record": { ... } }, ... }
"""


def validate_entry(hash_id: str, entry: object) -> bool:
    """Validate a single astrolabe entry."""
    if not isinstance(entry, dict):
        return False
    if "ref" not in entry or "record" not in entry:
        return False

    ref = entry["ref"]
    if not isinstance(ref, list) or len(ref) < 1:
        return False
    if not all(isinstance(r, str) for r in ref):
        return False

    if not isinstance(entry["record"], dict):
        return False

    # Atom constraint: |ref| = 1 implies ref[0] == own hash
    if len(ref) == 1 and ref[0] != hash_id:
        return False

    return True


def validate_astrolabe(data: object) -> bool:
    """Validate an entire astrolabe.json structure."""
    if not isinstance(data, dict):
        return False
    for hash_id, entry in data.items():
        if not validate_entry(hash_id, entry):
            return False
    return True
