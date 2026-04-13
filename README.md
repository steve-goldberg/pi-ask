# pi-ralph

A small TypeScript workspace for building **pi-native extensions** around a disciplined, feature-by-feature coding loop inspired by Ralph-style harnesses.

This repo currently has two related tracks:

1. **Long-term product goal:** a project-local Ralph controller for one-feature-at-a-time delivery.
2. **Current implemented extension:** a reusable grounded clarification system exposed as **`/grill-me`** and **`grill_me`**.

## Current status

The most complete part of this repo today is the **`grill-me`** extension under:

- `.pi/extensions/grill-me/index.ts`
- `.pi/extensions/grill-me/types.ts`
- `.pi/extensions/grill-me/storage.ts`
- `.pi/extensions/grill-me/questions.ts`
- `.pi/extensions/grill-me/questionnaire.ts`
- `.pi/extensions/grill-me/ui.ts`
- `.pi/extensions/grill-me/generator.ts`
- `.pi/extensions/grill-me/grounding.ts`

The broader Ralph controller described in `PRD.md` and `progress.json` is still mostly roadmap work.

Quality gates currently pass:

- `npm run lint`
- `npm run typecheck`
- `npm test`

## What `grill-me` now does

The current implementation is no longer just a static questionnaire.

It supports:

- **manual command flow** via `/grill-me`
- **agent-invoked flow** via `grill_me`
- **explicit artifact grounding** from user- or agent-supplied files
- **no default artifact set**
- **raw request preservation** separate from extracted artifact paths
- **thin-context honesty** with exploratory/outcome-first questions
- **provenance** in tool details and command launch context
- **wrapped Editor-based answering** instead of a single-line input
- **`@file` autocomplete** inside the questionnaire UI
- **debounced draft persistence** with failure-safe cleanup semantics

## How to use it

### Manual command

```text
/grill-me
/grill-me clarify auth edge cases
/grill-me refine the extension behavior using @progress.json and @PRD.md
```

Behavior:

- opens an interactive questionnaire in the TUI
- reads explicitly mentioned artifacts when they are provided
- combines grounded artifacts with session context when available
- preserves the original user phrasing as part of generation context
- falls back to thin-context exploratory questions when grounding is weak
- lets the user review and edit answers before submit
- sends the final answers back into the active session as a normal user message

### Agent-callable tool

Tool name:

```text
grill_me
```

Behavior:

- lets the agent ask a bounded clarification round mid-workflow
- supports optional `focus`, `artifacts`, and `definition`
- returns structured answers directly in the same turn
- includes provenance metadata in tool details

If `definition` is supplied, it remains a **first-class bypass**:

- no grounding
- no generation
- run the provided questionnaire directly

## Key implementation details

### Grounding model

Question generation now prefers:

1. provided questionnaire definition
2. explicit artifacts plus session context
3. session context alone when sufficient
4. thin-context exploratory generation
5. bundled fallback questionnaire

Important constraint:

- `grill-me` does **not** auto-load `PRD.md`, `README.md`, or `progress.json` by convention

### Input UX

The answer field now uses `Editor` from `@mariozechner/pi-tui`.

Current behavior:

- `Enter` saves and advances
- `Shift+Enter` inserts a newline inside the answer
- `Shift+Tab` goes to the previous question
- `Escape` cancels and keeps the draft
- long answers stay visible through wrapped rendering
- typing `@` supports file autocomplete rooted at the current working directory

### Draft persistence

Draft answers are stored at:

- `.pi/tmp/grill-me.json`

Behavior:

- overwrite on start
- debounced persistence while typing
- force flush on navigation boundaries and submit/cancel
- keep draft on cancel
- remove draft only after successful handoff
- keep draft if handoff fails

## Project docs

### `PRD.md`

`PRD.md` defines the product vision and non-negotiable behavior for the repo.

### `progress.json`

`progress.json` is the implementation roadmap and status tracker.

It now reflects recent `grill-me` progress, including:

- grounded artifact loading
- thin-context handling
- provenance support
- Editor UX completion
- recent synced commits via `progressTracking`

### `.pi/ralph/features.json`

This is the future runtime manifest template for the Ralph loop itself.

## Immediate next work

According to `progress.json`, the main remaining planned `grill-me` item is:

- **G015** — quick/deep question budgets

Also worth watching during dogfooding:

- grounded question **quality refinement** even when the grounding architecture is technically correct

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run lint
npm run typecheck
npm test
```

## Summary

If you are opening this repo cold, the simplest mental model is:

- **The vision** is a pi-native Ralph controller.
- **The implemented piece today** is a reusable grounded clarification extension called **`grill-me`**.
- **The active tracking file** is now **`progress.json`**.
- **The next planned `grill-me` feature** is quick/deep question budgets, with further dogfood-driven quality refinement likely after that.
