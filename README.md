# Ask

One Pi question tool and one optional interview skill. No boards, coding-rule
checks, persona, background model calls, automatic artifact writing, or session
hooks.

## Install

Requires Node 22.19+ and Pi with the current `@earendil-works` extension API
(tested with Pi 0.84.4).

```sh
npm ci
pi install /absolute/path/to/ask-sideroom
```

Start a new Pi session or reload after installation. Disable the old ask
extension and the full Sideroom package if installed: this package replaces
rather than configures them. Existing sessions keep their loaded extensions
until reloaded; installing Ask does not remove another package's board.

For a temporary tool-only trial:

```sh
pi -e ./extensions/ask/index.ts
```

The package manifest discovers exactly one extension and `skills/grill`.
Use `/skill:grill <topic>` for an explicit interview, or ask the agent to grill
you. The skill is optional: agents can call `ask` directly for a single batch.

## Tool contract

```json
{
  "questions": [{
    "id": "scope",
    "label": "Scope",
    "prompt": "Who should receive the first rollout?",
    "options": [
      { "value": "pilot", "label": "One team", "description": "Limit risk while validating." },
      { "value": "all", "label": "Everyone", "description": "Broader feedback, larger impact." }
    ],
    "recommendationIndex": 0
  }]
}
```

- One to four questions; two to four options each.
- Single selection requires a zero-based `recommendationIndex`.
- Multiple selection uses `selectionMode: "multiple"` and nonempty zero-based
  `recommendedIndices` instead. At least one option must be selected.
- Optional tab labels have a 16-character limit; option labels have a
  60-character limit. Invalid input is rejected, not truncated.
- The UI always adds **Out of scope** and a **custom answer** editor.
- A single question submits when answered. Batches use question tabs and a
  review/submit tab; answers can be revisited before submission.
- Arrow keys move, number keys select, and Space toggles multiple choices.
  Enter confirms. Tab switches batch tabs. Escape cancels; in the custom
  editor, Escape first returns to options.
- Results include formatted text and structured `details` containing questions,
  answers, and `cancelled`. Answer selection indexes are **one-based**.
  Cancellation may include partial answers; they are not submitted decisions.
- TUI-only: print, JSON, and RPC modes return a UI-unavailable message with
  `cancelled: true`. Validation failures likewise return cancelled details.
- No draft files, state files, network calls, hidden question generation, or
  automatic follow-up rounds. The calling agent owns context and continuation.

## Grill

The standalone grill skill reads relevant context, asks focused rounds, and
summarizes agreement and remaining uncertainty. It does not automatically
implement, write glossary/ADR files, or override other skills. Artifact writing
requires an explicit request. It has no durable resume/status/export lifecycle.

## Migration from the original ask

This is an intentional replacement, not a compatibility layer:

- `ask({ definition: ... })` is replaced by `ask({ questions: ... })` above.
- Text-only questions become choices with a custom-answer escape hatch.
- The old `/ask` command is removed; use the tool or `/skill:grill`.
- Temporary drafts, file-mention autocomplete, hidden grounding/generation,
  and the old runtime are removed. No old data is automatically migrated.
- Old planning trackers and Ralph files are removed from this branch; their
  history remains in Git. The dirty `ask-skill-refactor` worktree is separate.

The questionnaire is extracted from Sideroom 8.8.0. Its selection, validation,
submission, and cancellation behavior is retained; its tool is renamed `ask`
and its unrelated prompt directives are removed. See [NOTICE.md](NOTICE.md).

## Development

```sh
npm ci
npm run check
npm run test:unit
npm run test:integration
npm pack --dry-run
```

`check` runs ESLint, TypeScript, and Vitest, including real questionnaire
keyboard/rendering tests and package/skill contract checks. Pi loads TypeScript
directly, so no compiled build is needed. Tests are outside the published
extension tree and cannot be discovered as extensions.
