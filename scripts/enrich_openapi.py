"""
Enrich a framework-generated OpenAPI spec with human-readable summaries.

Why this exists: the schema itself (paths, params, response shapes) should
always come from your framework's own generator (swagger-jsdoc,
zod-to-openapi, etc.), never from an LLM guessing at your code. This script
only fills in the `summary`/`description` fields, and it treats
docs/api/descriptions.yaml as the persistent source of truth for them:

- An operation already present in descriptions.yaml keeps its entry as-is
  (a human wrote or approved it) — no LLM call, no cost, every run.
- An operation with no entry yet gets a draft from the configured LLM, which is then
  saved into descriptions.yaml so it becomes the persisted, human-editable
  version going forward.

This is what makes "edit descriptions.yaml, don't hand-edit openapi.json"
in CLAUDE.md actually true: openapi.json is regenerated from the framework
schema + descriptions.yaml on every run, so hand-edits to openapi.json
itself would just get overwritten.

Usage:
    python scripts/enrich_openapi.py docs/api/openapi.json

Requires: LLM_API_KEY / LLM_BASE_URL / LLM_MODEL in the environment (see
scripts/llm_client.py), plus the `requests` and `pyyaml` pip packages.
"""

import json
import sys
from pathlib import Path

import yaml

import llm_client


def operation_key(path: str, method: str, op: dict) -> str:
    """Stable key into descriptions.yaml for one operation.

    Prefers operationId (stable across param/response tweaks); falls back
    to "METHOD path" for schemas that don't set one.
    """
    return op.get("operationId") or f"{method.upper()} {path}"


def draft_description(client, path: str, method: str, op: dict) -> dict:
    """Ask the model for a short summary/description for one operation.

    Only this operation's own schema fragment is sent — not the rest of
    the spec — which keeps this cheap regardless of total endpoint count,
    and small enough for a small self-hosted model to handle comfortably.
    """
    prompt = f"""You are writing end-user-facing API docs.

Endpoint: {method.upper()} {path}
Existing raw schema for this operation (JSON):
{json.dumps(op, indent=2)[:4000]}

Write:
1. A one-line "summary" (<12 words).
2. A 2-3 sentence "description" a frontend engineer unfamiliar with this
   endpoint could use to integrate against it correctly.

Respond as JSON only: {{"summary": "...", "description": "..."}}"""

    text = llm_client.complete(client, prompt, max_tokens=300)
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        print(f"  ! could not parse draft for {method.upper()} {path}, leaving blank", file=sys.stderr)
        return {"summary": op.get("summary", ""), "description": op.get("description", "")}


def main(spec_path: str) -> None:
    spec_file = Path(spec_path)
    descriptions_path = spec_file.parent / "descriptions.yaml"

    with spec_file.open() as f:
        spec = json.load(f)

    overrides: dict = {}
    if descriptions_path.exists():
        with descriptions_path.open() as f:
            overrides = yaml.safe_load(f) or {}

    client = llm_client.get_client()

    paths = spec.get("paths", {})
    total = sum(
        1 for methods in paths.values() for method in methods if method in ("get", "post", "put", "patch", "delete")
    )
    done = 0
    drafted = 0

    for path, methods in paths.items():
        for method, op in methods.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue
            done += 1
            key = operation_key(path, method, op)

            if key in overrides:
                entry = overrides[key]
            else:
                entry = draft_description(client, path, method, op)
                overrides[key] = entry
                drafted += 1
                print(f"[{done}/{total}] drafted {method.upper()} {path}")

            op["summary"] = entry.get("summary", op.get("summary", ""))
            op["description"] = entry.get("description", op.get("description", ""))

    with spec_file.open("w") as f:
        json.dump(spec, f, indent=2)

    with descriptions_path.open("w") as f:
        yaml.safe_dump(overrides, f, sort_keys=True, allow_unicode=True)

    print(
        f"Done. {total} operations total, {drafted} newly drafted. "
        f"Wrote {spec_file} and {descriptions_path}."
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python scripts/enrich_openapi.py <path-to-openapi.json>")
        sys.exit(1)
    main(sys.argv[1])
