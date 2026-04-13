# PRD.md

This repository now tracks a single product: **the `grill-me` grounded clarification extension**.

## How to use these docs

- Read **`grill-me-plan.md`** for the product direction and context collection model.
- Read **`progress.json`** for the current implementation roadmap and status.
- Read **`grillme-progress.json`** if you want the same tracker under its original focused filename.

## Repo boundary

- This repo owns **`grill-me` / `ask`**.
- The Ralph execution-loop docs and roadmap were split to the sibling **`ralphi/`** folder.
- **`.pi/ralph/features.json`** is intentionally still present here for now and will be split independently later.

## Current state

Implementation progress in this repo is still centered on `grill-me`:

- reusable questionnaire engine
- `/grill-me` command
- `grill_me` tool
- artifact-aware grounding
- thin-context questioning
- provenance
- Editor-based answering with `@file` autocomplete
- tested draft persistence and submit behavior

The main remaining planned item is still quick/deep question budgets.
