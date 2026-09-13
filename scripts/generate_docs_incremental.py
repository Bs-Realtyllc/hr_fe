#!/usr/bin/env python3
"""
Diff-scoped doc generation, run on every push to main (docs-update.yml).

Unlike the old claude-code-action setup, this script does NOT let the
model decide what's in scope — a small/free model can't be trusted with
that judgment call the way an agentic tool-use loop could. Instead the
script does the mechanical part itself (diff the two commits, look up
docs/_meta/manifest.json, gather exactly the changed files under each
mapped source path) and only asks the LLM to do the part that genuinely
needs generation: writing the doc prose for what changed.

Usage:
    python scripts/generate_docs_incremental.py --base <sha> --head <sha>

Exits 0 with no file changes if nothing doc-relevant changed — the calling
workflow checks `git status --porcelain` afterwards to decide whether to
open a PR at all.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

import llm_client

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "docs" / "_meta" / "manifest.json"
CLAUDE_MD_PATH = REPO_ROOT / "CLAUDE.md"
MAX_CONTEXT_CHARS = 40_000  # keep prompts small enough for a free-tier model's context window

# Outside the repo tree on purpose: the calling workflow's `git status
# --porcelain` check decides whether anything changed, so this must never
# show up as an untracked file inside the checkout.
PR_SUMMARY_PATH = Path("/tmp/docs_pr_summary.txt")


def sh(*args: str, check: bool = True) -> str:
    return subprocess.run(args, cwd=REPO_ROOT, check=check, capture_output=True, text=True).stdout


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        print(f"! {MANIFEST_PATH} not found — run the baseline workflow first.", file=sys.stderr)
        sys.exit(1)
    return json.loads(MANIFEST_PATH.read_text())


def changed_files(base: str, head: str) -> list[str]:
    out = sh("git", "diff", "--name-only", f"{base}..{head}")
    return [line for line in out.splitlines() if line.strip()]


def group_by_doc_file(files: list[str], manifest: dict) -> tuple[dict[str, list[str]], list[str]]:
    """Returns (doc_file -> matched source paths, files matching no manifest entry)."""
    by_doc: dict[str, list[str]] = {}
    unmatched: list[str] = []
    for f in files:
        matched_any = False
        for src_prefix, doc_files in manifest.items():
            if f.startswith(src_prefix):
                matched_any = True
                for doc_file in doc_files:
                    by_doc.setdefault(doc_file, []).append(f)
        if not matched_any:
            unmatched.append(f)
    return by_doc, unmatched


def new_feature_folders(unmatched: list[str]) -> dict[str, list[str]]:
    """Best-effort grouping of unmapped changed files by their top-level
    source directory, so genuinely new feature folders still get a doc
    instead of being silently skipped. Ignores non-source paths."""
    ignored_prefixes = ("docs/", ".github/", "scripts/", "node_modules/", "dist/", "build/")
    groups: dict[str, list[str]] = {}
    for f in unmatched:
        if f.startswith(ignored_prefixes) or "/" not in f:
            continue
        top = f.split("/")[0]
        groups.setdefault(top, []).append(f)
    return groups


def build_prompt(claude_md: str, doc_path: str, diff: str, existing_doc: str, is_new: bool) -> str:
    return f"""{claude_md}

---

You are updating exactly one file: `{doc_path}`.
{"This file does not exist yet — create it from scratch, following the Feature doc format above." if is_new else "Here is its current content:"}
{"" if is_new else f"```md{chr(10)}{existing_doc}{chr(10)}```"}

Here is the diff of the source files mapped to this doc (unified diff format):
```diff
{diff[:MAX_CONTEXT_CHARS]}
```

Write the COMPLETE new content for `{doc_path}` following the Feature doc
format exactly. Only update sections affected by this diff — preserve
everything else. Respond with ONLY the markdown content, no commentary, no
code fences around the whole file."""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    args = parser.parse_args()

    manifest = load_manifest()
    claude_md = CLAUDE_MD_PATH.read_text()
    files = changed_files(args.base, args.head)
    if not files:
        print("No changed files — nothing to do.")
        return

    by_doc, unmatched = group_by_doc_file(files, manifest)

    for top, folder_files in new_feature_folders(unmatched).items():
        doc_path = f"docs/features/{top.replace('_', '-')}.md"
        manifest[top + "/"] = [doc_path]
        by_doc.setdefault(doc_path, []).extend(folder_files)
        print(f"New feature folder detected: {top}/ -> {doc_path}")

    if not by_doc:
        print("Diff touches nothing doc-relevant. Exiting cleanly.")
        return

    client = llm_client.get_client()
    for doc_path, src_files in by_doc.items():
        doc_file = REPO_ROOT / doc_path
        is_new = not doc_file.exists()
        existing_doc = "" if is_new else doc_file.read_text()

        diff_parts = [sh("git", "diff", f"{args.base}..{args.head}", "--", f) for f in dict.fromkeys(src_files)]
        diff = "\n".join(diff_parts)

        prompt = build_prompt(claude_md, doc_path, diff, existing_doc, is_new)
        content = llm_client.complete(client, prompt, max_tokens=3000)

        doc_file.parent.mkdir(parents=True, exist_ok=True)
        doc_file.write_text(content.strip() + "\n")
        print(f"{'Created' if is_new else 'Updated'} {doc_path}")

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")

    all_diffs = "\n".join(sh("git", "diff", f"{args.base}..{args.head}", "--", f) for f in dict.fromkeys(files))
    summary_prompt = f"""Write a one-paragraph PR description summarizing what changed and why,
for the reviewer of a documentation update. Doc files touched: {', '.join(by_doc)}.

Diff that prompted this update:
```diff
{all_diffs[:MAX_CONTEXT_CHARS]}
```

Respond with ONLY the paragraph, no heading, no commentary."""
    summary = llm_client.complete(client, summary_prompt, max_tokens=300)
    PR_SUMMARY_PATH.write_text(summary.strip() + "\n")

    package_json = REPO_ROOT / "package.json"
    if package_json.exists() and '"generate:openapi"' in package_json.read_text():
        print("Backend repo detected — regenerating OpenAPI spec.")
        subprocess.run(["npm", "run", "generate:openapi"], cwd=REPO_ROOT, check=True)
        subprocess.run(
            [sys.executable, str(REPO_ROOT / "scripts" / "enrich_openapi.py"), "docs/api/openapi.json"],
            cwd=REPO_ROOT,
            check=True,
        )


if __name__ == "__main__":
    main()
