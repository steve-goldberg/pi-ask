# ask

A small TypeScript workspace centered on the **`ask`** grounded clarification extension for pi.

## Current status

This repo now tracks the **ask** product only.

The implemented extension lives under:

- `.pi/extensions/ask/index.ts`
- `.pi/extensions/ask/types.ts`
- `.pi/extensions/ask/storage.ts`
- `.pi/extensions/ask/questions.ts`
- `.pi/extensions/ask/questionnaire.ts`
- `.pi/extensions/ask/ui.ts`
- `.pi/extensions/ask/generator.ts`
- `.pi/extensions/ask/grounding.ts`

The Ralph execution-loop planning files have been split out to the sibling `ralphi/` folder.

Quality gates currently pass:

- `npm run lint`
- `npm run typecheck`
- `npm test`

## What ask does

`ask` provides:

- a manual `/ask` command
- an agent-callable `ask` tool
- explicit artifact grounding from mentioned or supplied files
- thin-context honesty when grounding is weak
- provenance for how questions were generated
- wrapped Editor-based answering
- `@file` autocomplete in the questionnaire UI
- debounced draft persistence with failure-safe cleanup

## Project docs

- `PRD.md` — repo entrypoint for the ask product
- `ask-plan.md` — product direction and longer-term context collection vision
- `progress.json` — current progress entrypoint for this repo
- `ask-progress.json` — focused progress tracker for the ask product

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
