#!/usr/bin/env python3
"""
One-time (or re-baseline) full doc generation, run manually via
docs-baseline.yml. Walks the repo's tracked source files, groups them into
feature buckets, and asks the LLM to draft one docs/features/*.md per
bucket from scratch — plus docs/_meta/manifest.json so future incremental
runs (generate_docs_incremental.py) know what maps to what.

Honest limitation: this is a mechanical, bounded-context pass — not the
same thing as an agentic tool that reads the repo file-by-file with
judgment. Grouping is heuristic (routes/controllers/handlers group by
filename; everything else groups by top-level directory) and large
buckets get truncated to fit a smaller/free model's context window.
Expect to hand-edit the result, especially the first time on a new repo.

Usage:
    python scripts/generate_docs_baseline.py
"""

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

import llm_client

REPO_ROOT = Path(__file__).resolve().parent.parent
CLAUDE_MD_PATH = REPO_ROOT / "CLAUDE.md"
MANIFEST_PATH = REPO_ROOT / "docs" / "_meta" / "manifest.json"

IGNORED_DIR_PARTS = {
    "node_modules", "dist", "build", "coverage", ".git", ".github",
    "docs", "uploads", "vendor", "__pycache__", ".venv", "venv",
    "scripts",  # this scaffold's own tooling, not product source
    "android", "ios",  # commonly vendored/generated native shells, not hand-written features
}
IGNORED_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "CLAUDE.md", "README.md"}
ROUTE_LIKE_DIRS = {"routes", "controllers", "handlers", "api"}
MAX_BUCKET_CHARS = 40_000  # per-feature context cap for a free-tier model
MAX_BUCKET_FILES = 60  # a bucket bigger than this is almost certainly a mis-grouped vendor/generated dir


def sh(*args: str) -> str:
    return subprocess.run(args, cwd=REPO_ROOT, check=True, capture_output=True, text=True).stdout


def tracked_files() -> list[str]:
    files = sh("git", "ls-files").splitlines()
    out = []
    for f in files:
        path = Path(f)
        if len(path.parts) == 1:
            continue  # root-level files are config/meta (Dockerfile, .gitignore, tsconfig.json, ...), never a feature
        if any(p in IGNORED_DIR_PARTS for p in path.parts):
            continue
        if path.name in IGNORED_FILES:
            continue
        out.append(f)
    return out


def bucket_files(files: list[str]) -> dict[str, list[str]]:
    """Returns manifest_key -> list of file paths in that bucket."""
    buckets: dict[str, list[str]] = {}
    for f in files:
        path = Path(f)
        if len(path.parts) >= 2 and path.parts[-2] in ROUTE_LIKE_DIRS:
            key = f  # exact file — one route/controller module per feature
        else:
            top = path.parts[0]
            key = f"{top}/{path.parts[1]}/" if top == "src" and len(path.parts) > 2 else f"{top}/"
        buckets.setdefault(key, []).append(f)

    oversized = [k for k, v in buckets.items() if len(v) > MAX_BUCKET_FILES]
    for k in oversized:
        print(f"  ! skipping bucket {k} — {len(buckets[k])} files, likely mis-grouped vendor/generated content", file=sys.stderr)
        del buckets[k]

    return buckets


def doc_path_for(key: str) -> str:
    slug = Path(key.rstrip("/")).stem.replace("_", "-").lower()
    return f"docs/features/{slug}.md"


def bucket_context(files: list[str]) -> str:
    parts = []
    total = 0
    for f in files:
        try:
            text = (REPO_ROOT / f).read_text(errors="ignore")
        except OSError:
            continue
        chunk = f"--- {f} ---\n{text}\n"
        if total + len(chunk) > MAX_BUCKET_CHARS:
            parts.append(f"--- {f} --- (truncated, file too large for this pass)")
            continue
        parts.append(chunk)
        total += len(chunk)
    return "\n".join(parts)


def build_prompt(claude_md: str, doc_path: str, context: str, today: str, short_sha: str) -> str:
    return f"""{claude_md}

---

Draft `{doc_path}` from scratch, following the Feature doc format above.
Use exactly "{today}" for **Last updated** and "{short_sha}" for the commit —
never invent a date or SHA of your own.

This is a best-effort baseline pass, not a full audit — write what's
reasonably inferable from the source below, and use the "Known
limitations / in-progress" section to flag anything genuinely unclear
rather than guessing confidently. "Where it lives in the UI" means: does a
person navigate to a screen for this? A backend API route, or frontend
infrastructure with no screen of its own (a shared context/store/lib/
component library), both get "N/A" — say what consumes it instead of
listing screens. Only list actual routes/screens for things a user
actually navigates to.

Source files for this feature:
```
{context}
```

Respond with ONLY the markdown content, no commentary, no code fences
around the whole file."""


def main() -> None:
    claude_md = CLAUDE_MD_PATH.read_text()
    buckets = bucket_files(tracked_files())
    if not buckets:
        print("No source files found to document.", file=sys.stderr)
        sys.exit(1)

    today = date.today().isoformat()
    short_sha = sh("git", "rev-parse", "--short", "HEAD").strip()

    client = llm_client.get_client()
    manifest: dict[str, list[str]] = {}
    index_entries: list[tuple[str, str]] = []
    failed: list[str] = []

    # One bucket failing (a flaky free-tier model, a transient provider
    # error) shouldn't throw away every other bucket that already
    # succeeded — collect failures and keep going, so a partial run still
    # produces a partial PR instead of nothing at all.
    for key, files in sorted(buckets.items()):
        doc_path = doc_path_for(key)

        try:
            context = bucket_context(files)
            prompt = build_prompt(claude_md, doc_path, context, today, short_sha)
            content = llm_client.complete(client, prompt, max_tokens=6000)
        except RuntimeError as e:
            print(f"  ! giving up on {doc_path}: {e}", file=sys.stderr)
            failed.append(doc_path)
            continue

        manifest.setdefault(key, []).append(doc_path)
        doc_file = REPO_ROOT / doc_path
        doc_file.parent.mkdir(parents=True, exist_ok=True)
        doc_file.write_text(content.strip() + "\n")

        title = content.strip().splitlines()[0].lstrip("#").strip() if content.strip() else Path(doc_path).stem
        index_entries.append((title, Path(doc_path).name))
        print(f"Wrote {doc_path} (from {len(files)} file(s))")

    if not index_entries:
        print("Every bucket failed — nothing was generated.", file=sys.stderr)
        sys.exit(1)

    if failed:
        print(f"\n{len(failed)} bucket(s) failed and were skipped: {', '.join(failed)}", file=sys.stderr)
        print("Re-running this workflow will regenerate everything from scratch (including buckets that already succeeded) — there's no partial-resume yet.", file=sys.stderr)

    index_path = REPO_ROOT / "docs" / "features" / "index.md"
    index_body = "\n".join(f"- [{title}]({name})" for title, name in sorted(index_entries))
    index_path.write_text(f"# Features\n\n{index_body}\n")
    print(f"Wrote {index_path.relative_to(REPO_ROOT)}")

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"Wrote {MANIFEST_PATH.relative_to(REPO_ROOT)}")

    package_json = REPO_ROOT / "package.json"
    if package_json.exists() and '"generate:openapi"' in package_json.read_text():
        print("Backend repo detected — generating OpenAPI spec.")
        subprocess.run(["npm", "run", "generate:openapi"], cwd=REPO_ROOT, check=True)
        subprocess.run(
            [sys.executable, str(REPO_ROOT / "scripts" / "enrich_openapi.py"), "docs/api/openapi.json"],
            cwd=REPO_ROOT,
            check=True,
        )


if __name__ == "__main__":
    main()
