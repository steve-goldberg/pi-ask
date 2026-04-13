# PRD.md

This repository now tracks a single product: **the `ask` grounded clarification extension**.

## How to use these docs

- Read **`ask-plan.md`** for the product direction and context collection model.
- Read **`progress.json`** for the current implementation roadmap and status.
- Read **`ask-progress.json`** for the focused ask tracker.

## Repo boundary

- This repo owns **`ask`**.
- The Ralph execution-loop docs and roadmap were split to the sibling **`ralphi/`** folder.
- **`.pi/ralph/features.json`** is intentionally still present here for now and will be split independently later.

## Current state

Implementation progress in this repo is still centered on `ask`:

- reusable questionnaire engine
- `/ask` command
- `ask` tool
- artifact-aware grounding
- thin-context questioning
- provenance
- Editor-based answering with `@file` autocomplete
- tested draft persistence and submit behavior

The main remaining planned item is still quick/deep question budgets.
