# feat/minimal-schema — Plan

## Background

In astrolabe category theory, obj only has $h$ (identifier) and an open info record.
Current code hardcodes assumptions that obj has name, sort, statement, proof, intuition,
notes, position, created_at, updated_at. These field semantics should be defined by
functors, not hardcoded in signature storage.

## Goal

Backend code goes from "hardcoded obj fields" to "functors interpret fields".
signature_storage only does $(O, M, h)$ CRUD, doesn't care what keys are inside obj/mor.

## Investigation (completed)

192 locations with hardcoded field assumptions across backend and frontend.
See conversation for full survey.

## Phases

### Phase 1: signature_storage.py — make field-agnostic
- create_obj: only generate hex₁₂ id, return `{}`
- create_mor: only generate hex₁₂ id, require source and target, return `{"source": ..., "target": ...}`
- update: accept arbitrary key-value, direct merge
- delete VALID_STATUSES, _forbidden set, position merge logic
- delete name/sort non-empty validation
- keep migration logic (kind → sort, relation → sort) for backward compat

### Phase 2: new functors/math_domain/
- MATH_DOMAIN_DEFAULTS = {"name": "Untitled", "sort": "insight", "status": "stated", ...}
- apply_defaults(obj) fills missing keys with defaults
- server.py create obj flow: storage generates id → math_domain fills defaults → user fields override

### Phase 3: new functors/timestamp/
- on_create(record): writes created_at and updated_at
- on_update(record): updates updated_at
- server.py calls these on create/update

### Phase 4: position — simplify
- position stays in obj as a regular key, delete special merge logic
- no separate layout.json needed

### Phase 5: server.py Pydantic models
- ObjRequest/ObjUpdateRequest accept arbitrary dict
- MorRequest only hardcodes source and target, rest is arbitrary
- API handlers pass dict through to storage + functors

### Phase 6: frontend types
- KnowledgeObj → Record<string, any> + id: string
- KnowledgeMor → Record<string, any> + id, source, target: string
- Components do optional handling: obj.name ?? "", obj.sort ?? "unknown"

## Execution order

Phase 1-3 first, test. Phase 4-6 after confirmation.

## Invariants

- signature.json content unchanged
- API endpoint paths unchanged
- Existing user data unaffected
- Backward compatible: old fields preserved, code just stops requiring them
