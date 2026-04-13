# ask

A small TypeScript workspace centered on the **`grill-me`** grounded clarification extension for pi.

## Current status

This repo now tracks the **grill-me / ask** product only.

The implemented extension lives under:

- `.pi/extensions/grill-me/index.ts`
- `.pi/extensions/grill-me/types.ts`
- `.pi/extensions/grill-me/storage.ts`
- `.pi/extensions/grill-me/questions.ts`
- `.pi/extensions/grill-me/questionnaire.ts`
- `.pi/extensions/grill-me/ui.ts`
- `.pi/extensions/grill-me/generator.ts`
- `.pi/extensions/grill-me/grounding.ts`

The Ralph execution-loop planning files have been split out to the sibling `ralphi/` folder.

Quality gates currently pass:

- `npm run lint`
- `npm run typecheck`
- `npm test`

## What grill-me does

`grill-me` provides:

- a manual `/grill-me` command
- an agent-callable `grill_me` tool
- explicit artifact grounding from mentioned or supplied files
- thin-context honesty when grounding is weak
- provenance for how questions were generated
- wrapped Editor-based answering
- `@file` autocomplete in the questionnaire UI
- debounced draft persistence with failure-safe cleanup

## Project docs

- `PRD.md` — repo entrypoint for the ask / grill-me product
- `grill-me-plan.md` — product direction and longer-term context collection vision
- `progress.json` — current progress entrypoint for this repo
- `grillme-progress.json` — same focused tracker retained under its original filename

Temporary split note:

- `.pi/ralph/features.json` is intentionally still present here and in `ralphi/`; it will be split further later.

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
