# Documentation conventions for this repo

This file is read by `scripts/generate_docs_incremental.py` and
`scripts/generate_docs_baseline.py` and embedded verbatim into every LLM
prompt they send. Keep it concise — every doc file generated in a run
re-sends this whole file.

Note this is a plain script + LLM-completion pipeline, not an autonomous
agent — the scripts decide *what's in scope* deterministically (git diff,
`docs/_meta/manifest.json` lookup) so a small/free model is never trusted
with that judgment call. The model's only job is drafting the prose for
one doc file at a time, following the rules below.

## What lives where

- `docs/features/` — one markdown file per user-facing feature/module, e.g.
  `docs/features/policy-renewal.md`. This is the "user guide" layer.
- `docs/api/openapi.json` — machine-generated OpenAPI spec (see below). Do not
  hand-edit descriptions here directly; edit `docs/api/descriptions.yaml`
  instead and re-run the enrichment script.
- `docs/_meta/manifest.json` — maps source paths to the doc file(s) they feed.
  Update this whenever you create a new doc file or point an existing one at
  a new source folder.

## Feature doc format

Each file in `docs/features/` must have this structure:

```md
# <Feature name>

**Status:** <in-development|beta|released> (~<percent>% complete)
**Last updated:** <ISO date> — from commit <short sha>

## What it does
2-4 sentences, written for a non-engineer (support/PM audience).

## Where it lives in the UI
Screen/route names, entry points.

## Key flows
Numbered steps for the 1-3 main user journeys.

## Known limitations / in-progress
Anything partially built. Don't hide this — flag it explicitly.
```

Every `<angle-bracket>` above is a placeholder — replace each with a real
value and never copy the placeholder text itself into the output (e.g.
don't write the literal string "in-development|beta|released"; pick one).
Drop the "(~<percent>% complete)" part entirely if you can't estimate one
rather than guessing.

## How a run is scoped

Handled by the scripts, not left to model judgment:

1. `generate_docs_incremental.py` diffs `<base>..<head>` and looks up
   `docs/_meta/manifest.json` to find which doc files the changed source
   paths map to — only those get regenerated, plus new entries for any
   genuinely new feature folder with no doc yet.
2. Each doc file is regenerated in its own LLM call, given only its own
   mapped diff — not the rest of the repo. Don't invent content about
   unrelated files; you won't be shown any.
3. If asked to update an existing doc, only touch what the given diff
   actually affects — preserve every other section verbatim. If something
   looks stale but is outside the diff you were given, leave a
   `<!-- TODO(docs): ... -->` comment instead of rewriting it.
4. Never hand-write or invent schema content in `docs/api/openapi.json`
   yourself — the scripts run the repo's own `npm run generate:openapi`
   and `enrich_openapi.py` outside of what you're asked to draft. See
   "One-time backend setup" below for what that requires per repo.

## One-time backend setup

Every backend repo must expose `npm run generate:openapi` in its
package.json before the scripts above will find anything to regenerate
(wire it up during that repo's first baseline run if it's missing — see
`scripts/generate-openapi.js` and `scripts/generate-openapi.zod-variant.js`
in this scaffold for the two variants used across this org; ship only the
one that matches the repo). Frontend and mobile repos skip this entirely —
no API to generate.

- Express + `swagger-jsdoc` (insurance_be_v2, hr_be, bsrealtyllc-be-v2,
  auth_be_v2): the repo already builds and exports a complete OpenAPI
  document for `swagger-ui-express` to mount live (e.g. `src/swagger.ts` →
  `export default swaggerJsdoc(options)`). The generator script just builds
  the repo and requires that module's default export, then writes it to
  `docs/api/openapi.json`. Confirm the actual export path per repo — don't
  assume it matches hr_be's.
- Express + `zod-to-openapi` (education-backend): same idea, but the
  generator script calls that repo's existing `generateOpenApiDocument(...)`
  instead of requiring a swagger-jsdoc export.

After `npm run generate:openapi` regenerates the schema, the scripts run
`python scripts/enrich_openapi.py docs/api/openapi.json`, which merges in
`summary`/`description` fields from `docs/api/descriptions.yaml`, drafting
new ones with the configured LLM only for operations with no entry there
yet. Never hand-edit `descriptions.yaml` during an automated run — a human
does that in a follow-up PR to override a draft.

## Output

Enforced by the workflow, not left to model judgment:

- Never pushed to `main` directly — always a branch (`docs/update-<short-sha>`
  or `docs/baseline-<short-sha>`) and a PR with the `automated-docs` label.
- The PR body's one-paragraph "what changed and why" summary is a separate,
  small LLM call the script makes after drafting the doc files — given the
  diff and which doc files were touched. Keep it factual and specific
  enough that a reviewer doesn't have to open the diff to know what to
  expect.
