# CSS Architecture — Target Design & Migration Plan

This document is the reference for how `hr_fe`'s CSS should be organized: an
ITCSS-style layered architecture using native CSS `@layer`. It records the
**target structure**, how today's files map onto it, and the **audit already
completed** on the token layer.

---

## 1. The rule (applies to every layer, no exceptions)

> **Before adding anything to a CSS file, ask: "Is this an import, or is this
> a rule?"**
> - Import → belongs in the root manifest (`global.css`)
> - Rule (any selector with `{ }`) → belongs in exactly one layer file, never
>   in the manifest

The root `global.css` should eventually contain **only** the `@layer` order
declaration and `@import` statements — no CSS rules of its own.

## 2. Layer order

```css
@layer tokens, base, layout, components, utilities;
```

Later layers win regardless of import order or selector specificity — this
is what native `@layer` buys you over the current plain-import setup, where
cascade order silently depends on which `<link>`/`@import` comes last.

---

## 3. Target folder structure

```
src/styles/
  tokens/
    color.primitives.css       ← raw Figma ramps (hex values, node-ID comments)
    color.semantic.css         ← app meaning, mapped to primitives via var()
    typography.primitives.css  ← font families, raw type scale
    typography.semantic.css    ← Figma type-role sizes/line-heights (display/headline/title/body/label)
    spacing.css                ← raw spacing scale
    radius.css                 ← NEW — doesn't exist yet, see §5
    shadow.css                 ← NEW — doesn't exist yet, see §5
    index.css                  ← barrel: imports the 7 files above

  base/
    reset.css                  ← box-sizing, margin/padding zero
    elements.css                ← html, body, a, button, input/textarea/select base rules
    index.css

  layout/
    app-shell.css               ← .app-shell, .main-content, .sidebar*, .page-header
    grid.css                    ← .grid-2, .grid-3, .stat-grid
    index.css

  components/
    button.css                  ← already buttons.css, just relocated
    card.css                    ← .card, .card-title, .card-link
    stat-card.css
    kpi-card.css
    badge.css                   ← .badge*, .status-dot*
    pill.css
    form.css                    ← .form-*, .search-bar*, .select-compact*
    table.css
    avatar.css
    tag.css
    empty-state.css
    divider.css
    progress-bar.css
    modal.css
    drawer.css
    icon.css                    ← .icon-mask
    index.css

  utilities/
    spacing.css                 ← .mt-4, .mb-4, .gap-2, .gap-3, .gap-4
    display.css                 ← .flex, .flex-col, .items-center, .justify-*, .ml-auto
    text.css                    ← .text-muted, .text-sm, .font-semibold, .truncate, .no-underline
    type-scale.css               ← the .text-5xl…/.type-display-lg… RULES currently in typography.css
    index.css

  global.css                    ← @layer order + @import lines only, nothing else
```

`layout.tsx` changes from 5 imports down to **one**:
```ts
import './styles/global.css';
```

### A note on Next.js and this structure

Splitting into many files gives **organizational clarity and safe cascade
order** — it does **not** give per-component code-splitting. Next.js only
allows global CSS to be imported from `layout.tsx`, so every file above still
ships in one bundle to every page, same as today. True per-component loading
would require CSS Modules (a bigger, separate change). Don't expect a
bundle-size win from this migration — that's not what it's for.

### `login-page.css` is a special case

`.login-page`, `.login-card`, `.login-error`, etc. are genuinely page-specific
— they don't belong in any shared layer by the letter of the rule. Two
options: (a) leave them as a `components/login-page.css` exception since Next's
global-CSS constraint gives no clean alternative without CSS Modules, or
(b) convert just this one page to a CSS Module (`login.module.css`) since it's
a single, self-contained page. Recommend (a) for now, revisit if more
single-page style blocks accumulate.

---

## 4. How today's files map onto this

| Target file | Current source |
|---|---|
| `tokens/color.primitives.css` | `colors.css`, as-is |
| `tokens/color.semantic.css` | top block of `globals.css` (already audited, see §6) |
| `tokens/typography.primitives.css` | `typography.css` — `--font-heading`, `--font-body`, `--text-*` only |
| `tokens/typography.semantic.css` | `typography.css` — `--display-*`, `--headline-*`, `--title-*`, `--body-*`, `--label-*` only |
| `utilities/type-scale.css` | `typography.css` — the `.text-*` / `.type-*` **class rules** (these are rules, not tokens — they don't belong in `tokens/` at all) |
| `tokens/spacing.css` | `spacing.css`, as-is |
| `tokens/radius.css`, `tokens/shadow.css` | **new** — see §5 |
| `base/reset.css`, `base/elements.css` | top of `globals.css` (`*,*::before`, `html,body`, `a`, `button`, `input/textarea/select`) |
| `layout/app-shell.css` | `globals.css` — `.app-shell`, `.main-content`, `.sidebar*`, `.page-header` |
| `layout/grid.css` | `globals.css` — `.grid-2`, `.grid-3`, `.stat-grid` |
| `components/button.css` | `buttons.css`, relocated |
| `components/*.css` | remaining ~700 lines of `globals.css` (card/kpi-card/badge/pill/form/table/avatar/tag/empty-state/divider/progress-bar/modal/drawer/icon) |
| `utilities/*.css` | `globals.css` — the `.flex`, `.gap-*`, `.text-muted`, `.truncate` etc. block |

---

## 5. Gaps this migration surfaces (found during the audit, not yet fixed)

- **`--radius-*` and `--shadow-*` have no primitive file at all today.** Unlike
  colors/spacing/typography, they were never extracted with Figma-node
  citations — they just sit in `globals.css`'s top block. Creating
  `tokens/radius.css` / `tokens/shadow.css` is the first time these get a real
  source of truth, not just a relocation.
- **`typography.css` conflates three things**: primitives, semantic role
  tokens, and actual utility-class rules. It needs a 3-way split, not 2 — the
  `.text-*`/`.type-*` classes must move to `utilities/`, not a tokens file,
  since tokens files should only ever contain `:root { --var: value; }`.

---

## 6. Audit already completed (this session)

Before any file-splitting, the existing token *values* in `globals.css` were
checked against Figma and against `colors.css`/`typography.css`. Four fixes
were applied, all verified via a running dev server (`npm run dev`, checked
`/`, `/leaves`, `/employees` for clean compiles and `200` responses after each
change):

| Token(s) | Was | Fixed to | Basis |
|---|---|---|---|
| `--color-primary`, `-hover`, `-focus-border`, `-disabled` | Hardcoded hex duplicates | `var(--teal-*)` | Confirmed byte-identical to the teal ramp — zero visual change, pure de-duplication |
| `--color-success/warning/error/info` | Hardcoded hex not matching any ramp step | `var(--success/warning/error/info-normal)` | Verified live against Figma nodes `6:2796`, `6:2929`, `6:3062`, `6:3195` — values had genuinely drifted from the design system; this is a real (intentional) color change across ~75 usages |
| `--color-bg/surface/border/text-muted` | Hardcoded hex, close-but-not-equal to any ramp step | Nearest matching `var(--gray-*/--soft-white-*)` step | No exact match exists (unlike Primary/Status); reconciled to nearest step per your instruction |
| `--font-family` | `'Inter', 'Roboto', ...` | `var(--font-body)` | Inter/Roboto were **never loaded** anywhere in the project (only Plus Jakarta Sans + IBM Plex Sans are loaded via `next/font` in `layout.tsx`) — the whole app was silently falling back to each visitor's OS system font instead of the real Figma typeface |

**Not yet started:** the file-splitting/layering migration described in §3–§5
above. That's the next phase, and it's a pure reorganization (no more value
corrections expected) — safe to do incrementally, one layer at a time, with a
dev-server check after each step.

---

## 7. Suggested migration order

1. **Tokens** (smallest, cleanest — mostly already correct after §6)
2. **Base** (reset + base elements — tiny, low-risk)
3. **Layout** (app shell/sidebar/grids)
4. **Components** (the bulk of the work — ~700 lines to split into ~15 files)
5. **Utilities** (spacing/display/text + the typography rule classes)
6. Collapse `global.css` down to the `@layer` + `@import` manifest, update
   `layout.tsx` to the single import

Each phase should end with the same verification used throughout this
session: `npm run dev`, hit `/`, `/leaves`, `/employees`, confirm clean
compile and `200`s, before moving to the next phase.
