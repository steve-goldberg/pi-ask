# PRD.md

This repository now has **two related but independent product tracks**:

1. **`grill-me-plan.md`** — the grounded clarification and context collection product
2. **`pi-ralph.md`** — the Ralph-style execution loop and feature delivery product

`progress.json` is now the umbrella progress entrypoint, while `grillme-progress.json` and `ralph-progress.json` hold the focused implementation roadmaps for the two product tracks.

## How to use these docs

- Read **`grill-me-plan.md`** for the context collection, questioning, template, and workflow direction.
- Read **`pi-ralph.md`** for the feature-loop, coder/tester/controller, manifest, and execution direction.
- Read **`progress.json`** for the umbrella progress entrypoint.
- Read **`grillme-progress.json`** for the grounded clarification implementation sequence and status.
- Read **`ralph-progress.json`** for the Ralph loop implementation sequence and status.

## Why this split exists

The repository direction became two distinct products:

- **`grill-me`** is a reusable context collection engine
- **`ralph`** is a feature-by-feature execution harness

They may share contracts such as `features.json`, but they should not be treated as the same extension or the same product.

This file is now the umbrella entrypoint that links to the split product docs.
