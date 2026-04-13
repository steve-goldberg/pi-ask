# pi-ralph

A small TypeScript workspace for building **pi-native extensions** around a disciplined, feature-by-feature coding loop inspired by Ralph-style harnesses.

This repo currently has two related tracks:

1. **The long-term goal:** a project-local Ralph controller for one-feature-at-a-time delivery.
2. **The current implemented extension:** a reusable **`/grill-me`** clarification flow for pi.

## Current status

Right now, the most complete piece in this repo is the **`grill-me` extension** under:

- `.pi/extensions/grill-me/index.ts`
- `.pi/extensions/grill-me/types.ts`
- `.pi/extensions/grill-me/storage.ts`
- `.pi/extensions/grill-me/questions.ts`
- `.pi/extensions/grill-me/questionnaire.ts`
- `.pi/extensions/grill-me/ui.ts`
- `.pi/extensions/grill-me/generator.ts`

The broader Ralph controller described in `PRD.md` and `plan.json` is still largely a roadmap.

Quality gates currently pass:

- `npm run lint`
- `npm run typecheck`
- `npm test`

## What the built extension does

The implemented extension provides a **one-question-at-a-time TUI questionnaire** that can be used in two ways:

### 1. Manual command
```text
/grill-me
/grill-me clarify auth edge cases
```

Behavior:
- opens an interactive questionnaire in the TUI
- uses the current session context plus optional focus text to generate targeted questions
- falls back to a bundled default questionnaire if generation is unavailable
- lets the user review/edit answers before submitting
- sends the final answers back into the active session as a normal user message

### 2. Agent-callable tool
Tool name:
```text
grill_me
```

Behavior:
- lets the agent ask structured clarification questions mid-workflow
- returns answers directly as the tool result in the same turn
- supports an optional `focus` string
- also supports passing a full questionnaire `definition` directly

## Key extension features

### Dynamic question generation
The extension can generate short questionnaires from:
- recent session context
- session name
- optional focus text

If generation cannot run, it falls back to the bundled default question set in:
- `.pi/extensions/grill-me/questions.ts`

### Shared questionnaire engine
The TUI flow is reusable and lives in:
- `.pi/extensions/grill-me/questionnaire.ts`
- `.pi/extensions/grill-me/ui.ts`

It supports:
- one question at a time
- Enter to save and advance
- Shift+Tab to go back
- review screen with answer selection
- Enter to edit a prior answer
- selectable **Submit** and **Cancel** actions

### Draft persistence
Draft answers are stored at:
- `.pi/tmp/grill-me.json`

Behavior:
- draft is overwritten on start
- updates are persisted during the session
- persistence is debounced while typing
- force flush happens on navigation boundaries and submit/cancel
- cancel keeps the draft
- successful handoff removes the draft
- failed handoff keeps the draft

### Safer submit semantics
The extension avoids deleting the draft too early.

For the manual command:
- answers are handed back into the session first
- draft deletion happens only after successful handoff

For the tool:
- answers are returned as the tool result
- cleanup is attempted after success

## Repo structure

### Product and planning docs
- `PRD.md` — product vision for the full pi-native Ralph loop
- `plan.json` — implementation roadmap and work breakdown

### Current implemented extension
- `.pi/extensions/grill-me/*` — command, tool, generator, UI, storage, types

### Future Ralph runtime template
- `.pi/ralph/features.json` — manifest template for the future Ralph loop

### Test coverage
- `tests/unit/*` — types, storage, questions, UI state, questionnaire runner, generator
- `tests/integration/*` — command flow, submit flow, tool flow

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

## Understanding the roadmap

### `PRD.md`
`PRD.md` describes the bigger target system:
- a long-running controller
- fresh coder attempts per feature
- strict coder/tester separation
- deterministic gates
- simple live progress UI

### `plan.json`
`plan.json` contains two layers:

1. **`sections.grillMe`**
   - a detailed implementation plan for the clarification extension
2. **`features`**
   - the future Ralph harness roadmap (`F001`–`F014`)

## Important note: plan vs implementation drift

The codebase is ahead of part of the written `grillMe` plan.

Several items still marked as planned in `plan.json` are already present in the code, including:
- dynamic question generation
- optional focus args for `/grill-me`
- the agent-callable `grill_me` tool
- safer draft cleanup semantics
- debounced persistence

So one of the next useful tasks is to **reconcile `plan.json` with the actual implementation**.

## Recommended next steps

### Option A: Finish documenting and stabilizing `grill-me`
Good if the immediate goal is understanding and polishing what already exists.

Suggested steps:
1. update `plan.json` statuses to match the code
2. add usage examples and expected answer payloads to docs
3. document when to use `/grill-me` vs the `grill_me` tool
4. decide whether Part 2 should write clarifications back into `PRD.md` and feature docs automatically

### Option B: Resume the Ralph harness build
Good if `/grill-me` is considered “good enough for now.”

Suggested starting sequence from the plan:
1. `F001` bootstrap workspace status reconciliation
2. `F002` typed Ralph config/state loaders
3. `F003` manifest schema + dependency selectors
4. `F004` extension entrypoint + operator commands

## Example tool result shape

The `grill_me` tool returns structured answers like:

```json
{
  "title": "Auth Clarification",
  "responses": [
    {
      "id": "login_method",
      "question": "Which login methods must v1 support?",
      "answer": "Email + GitHub"
    }
  ]
}
```

## Summary

If you are opening this repo cold, the simplest mental model is:

- **The vision** is a pi-native Ralph controller.
- **The implemented piece today** is a reusable interactive clarification extension called **`grill-me`**.
- **The best immediate cleanup task** is updating the docs and plan so they reflect what has already been built.
