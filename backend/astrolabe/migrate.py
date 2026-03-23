"""
Migrate signature.json (obj/mor) → astrolabe.json (ref/record).

- obj → atom: ref = [own_id], record = all fields except id
- mor → 1-simplex: ref = [source, target], record = remaining fields
"""
import json
from pathlib import Path


def migrate_signature(signature: dict) -> dict:
    """Convert a signature dict {obj, mor} to astrolabe dict {hash: {ref, record}}."""
    astrolabe: dict = {}

    for obj_id, obj_data in signature.get("obj", {}).items():
        record = {k: v for k, v in obj_data.items() if k != "id"}
        astrolabe[obj_id] = {"ref": [obj_id], "record": record}

    for mor_id, mor_data in signature.get("mor", {}).items():
        source = mor_data["source"]
        target = mor_data["target"]
        record = {k: v for k, v in mor_data.items()
                  if k not in ("id", "source", "target")}
        astrolabe[mor_id] = {"ref": [source, target], "record": record}

    return astrolabe


def migrate_file(signature_path: str, output_path: str) -> dict:
    """Read signature.json, migrate, write astrolabe.json."""
    with open(signature_path, encoding="utf-8") as f:
        signature = json.load(f)

    astrolabe = migrate_signature(signature)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(astrolabe, indent=2, ensure_ascii=False), encoding="utf-8")

    return astrolabe
