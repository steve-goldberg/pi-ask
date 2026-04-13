# Ask Rename Execution Checklist

Rename scope: **naming only**. No functionality, behavior, or logic changes.

## Canonical rename map

- `grill-me` → `ask`
- `/grill-me` → `/ask`
- `grill_me` → `ask`
- `GrillMe*` → `Ask*`
- `grillMe` → `ask`
- `DEFAULT_GRILL_ME_*` → `DEFAULT_ASK_*`
- `grill-me-plan.md` → `ask-plan.md`
- `grillme-progress.json` → `ask-progress.json`
- `.pi/extensions/grill-me/` → `.pi/extensions/ask/`
- `.pi/tmp/grill-me.json` → `.pi/tmp/ask.json`
- `tests/*grill-me*` → `tests/*ask*`

---

## 1. Rename top-level files

- [ ] Rename `grill-me-plan.md` → `ask-plan.md`
- [ ] Rename `grillme-progress.json` → `ask-progress.json`

## 2. Rename extension directory

- [ ] Rename `.pi/extensions/grill-me/` → `.pi/extensions/ask/`
- [ ] Move these files into `.pi/extensions/ask/`:
  - [ ] `index.ts`
  - [ ] `types.ts`
  - [ ] `storage.ts`
  - [ ] `questions.ts`
  - [ ] `questionnaire.ts`
  - [ ] `ui.ts`
  - [ ] `generator.ts`
  - [ ] `grounding.ts`

## 3. Update top-level docs and trackers

### `README.md`
- [ ] Replace product naming `grill-me` → `ask`
- [ ] Replace `grill-me / ask` wording with `ask`
- [ ] Update extension paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update command `/grill-me` → `/ask`
- [ ] Update tool `grill_me` → `ask`
- [ ] Update `grill-me-plan.md` → `ask-plan.md`
- [ ] Update `grillme-progress.json` → `ask-progress.json`
- [ ] Remove wording that says the old focused filename is being retained

### `PRD.md`
- [ ] Replace product naming `grill-me` → `ask`
- [ ] Replace `grill-me / ask` wording with `ask`
- [ ] Update `/grill-me` → `/ask`
- [ ] Update `grill_me` → `ask`
- [ ] Update `grill-me-plan.md` → `ask-plan.md`
- [ ] Update `grillme-progress.json` → `ask-progress.json`

### `progress.json`
- [ ] Change `"name": "grill-me"` → `"name": "ask"`
- [ ] Update description text to `ask`
- [ ] Rename section key `grillMe` → `ask`
- [ ] Update section title `Interactive /grill-me questionnaire extension` → `Interactive /ask questionnaire extension`
- [ ] Update all `/grill-me` strings → `/ask`
- [ ] Update all `grill_me` strings → `ask`
- [ ] Update submission wrapper `Here are my answers from /grill-me:` → `/ask`
- [ ] Update draft path `.pi/tmp/grill-me.json` → `.pi/tmp/ask.json`
- [ ] Update file path references `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update test path references `tests/*grill-me*` → `tests/*ask*`
- [ ] Update plan/tracker filename references:
  - [ ] `grill-me-plan.md` → `ask-plan.md`
  - [ ] `grillme-progress.json` → `ask-progress.json`
- [ ] Update work item titles/goals/descriptions where old naming appears

### `ask-progress.json` (renamed from `grillme-progress.json`)
- [ ] Apply the same content renames as `progress.json`

### `ask-plan.md` (renamed from `grill-me-plan.md`)
- [ ] Change title `# grill-me plan` → `# ask plan`
- [ ] Replace product naming `grill-me` → `ask`
- [ ] Update `/grill-me` → `/ask`
- [ ] Update `grill_me` → `ask`
- [ ] Update filename references:
  - [ ] `grill-me-plan.md` → `ask-plan.md`
  - [ ] `grillme-progress.json` → `ask-progress.json`
- [ ] Leave functionality/product-direction content otherwise unchanged

## 4. Update extension source files

### `.pi/extensions/ask/index.ts`
- [ ] Update imports from local renamed files if needed
- [ ] Rename `DEFAULT_GRILL_ME_QUESTIONNAIRE` → `DEFAULT_ASK_QUESTIONNAIRE`
- [ ] Rename imported type `GrillMeToolResultDetails` → `AskToolResultDetails`
- [ ] Rename `GrillMeToolParameters` → `AskToolParameters`
- [ ] Rename exported function `grillMeExtension` → `askExtension`
- [ ] Update registered command name `grill-me` → `ask`
- [ ] Update registered tool name `grill_me` → `ask`
- [ ] Update tool label `Grill Me` → `Ask`
- [ ] Update all descriptions/prompt snippets/guidelines from old naming to new naming
- [ ] Update all notify/error strings `/grill-me` → `/ask`
- [ ] Update draft-path strings `.pi/tmp/grill-me.json` → `.pi/tmp/ask.json`

### `.pi/extensions/ask/types.ts`
- [ ] Rename interface `GrillMeToolResultDetails` → `AskToolResultDetails`
- [ ] Update wrapped submit message `Here are my answers from /grill-me:` → `/ask`

### `.pi/extensions/ask/storage.ts`
- [ ] Rename constant `DEFAULT_GRILL_ME_DRAFT_PATH` → `DEFAULT_ASK_DRAFT_PATH`
- [ ] Update default draft path `.pi/tmp/grill-me.json` → `.pi/tmp/ask.json`
- [ ] Update `resolveDraftPath()` default argument to use `DEFAULT_ASK_DRAFT_PATH`

### `.pi/extensions/ask/questions.ts`
- [ ] Rename constant `DEFAULT_GRILL_ME_QUESTIONNAIRE` → `DEFAULT_ASK_QUESTIONNAIRE`
- [ ] Keep question content unchanged

### `.pi/extensions/ask/generator.ts`
- [ ] Update import `DEFAULT_GRILL_ME_QUESTIONNAIRE` → `DEFAULT_ASK_QUESTIONNAIRE`
- [ ] Update fallback constant usage accordingly

### `.pi/extensions/ask/grounding.ts`
- [ ] Update recommendation example `@grillme-progress.json` → `@ask-progress.json`
- [ ] Update recommendation example `@grill-me-plan.md` → `@ask-plan.md`

### `.pi/extensions/ask/questionnaire.ts`
- [ ] Update local import paths only if needed after folder rename
- [ ] No behavior changes

### `.pi/extensions/ask/ui.ts`
- [ ] Update local import paths only if needed after folder rename
- [ ] No behavior changes

## 5. Rename test files

### Integration tests
- [ ] Rename `tests/integration/grill-me-command.test.ts` → `tests/integration/ask-command.test.ts`
- [ ] Rename `tests/integration/grill-me-submit.test.ts` → `tests/integration/ask-submit.test.ts`
- [ ] Rename `tests/integration/grill-me-tool.test.ts` → `tests/integration/ask-tool.test.ts`

### Unit tests
- [ ] Rename `tests/unit/grill-me-generator.test.ts` → `tests/unit/ask-generator.test.ts`
- [ ] Rename `tests/unit/grill-me-grounding.test.ts` → `tests/unit/ask-grounding.test.ts`
- [ ] Rename `tests/unit/grill-me-questionnaire.test.ts` → `tests/unit/ask-questionnaire.test.ts`
- [ ] Rename `tests/unit/grill-me-questions.test.ts` → `tests/unit/ask-questions.test.ts`
- [ ] Rename `tests/unit/grill-me-storage.test.ts` → `tests/unit/ask-storage.test.ts`
- [ ] Rename `tests/unit/grill-me-types.test.ts` → `tests/unit/ask-types.test.ts`
- [ ] Rename `tests/unit/grill-me-ui-state.test.ts` → `tests/unit/ask-ui-state.test.ts`

## 6. Update integration test contents

### `tests/integration/ask-command.test.ts`
- [ ] Update mocked import paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update suite name `"/grill-me command"` → `"/ask command"`
- [ ] Update expected registered command `"grill-me"` → `"ask"`
- [ ] Update notification strings `/grill-me ...` → `/ask ...`
- [ ] Update draft path `/repo/.pi/tmp/grill-me.json` → `/repo/.pi/tmp/ask.json`
- [ ] Update temp directory prefix `grill-me-command-` → `ask-command-`

### `tests/integration/ask-submit.test.ts`
- [ ] Update mocked import paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update suite name `"/grill-me submit flow"` → `"/ask submit flow"`
- [ ] Update wrapped message `Here are my answers from /grill-me:` → `/ask`
- [ ] Update notification strings `/grill-me ...` → `/ask ...`
- [ ] Update draft path `/repo/.pi/tmp/grill-me.json` → `/repo/.pi/tmp/ask.json`

### `tests/integration/ask-tool.test.ts`
- [ ] Update mocked import paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update suite name `"grill_me tool"` → `"ask tool"`
- [ ] Update registered tool name `"grill_me"` → `"ask"`
- [ ] Update draft path `/repo/.pi/tmp/grill-me.json` → `/repo/.pi/tmp/ask.json`

## 7. Update unit test contents

### `tests/unit/ask-generator.test.ts`
- [ ] Update import paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update suite name `"grill-me generator"` → `"ask generator"`
- [ ] Update temp directory prefix `grill-me-generator-` → `ask-generator-`
- [ ] Update fixture key `grillMe` → `ask`
- [ ] Update recommendation example text:
  - [ ] `@grillme-progress.json` → `@ask-progress.json`
  - [ ] `@grill-me-plan.md` → `@ask-plan.md`
- [ ] Update constant name `DEFAULT_GRILL_ME_QUESTIONNAIRE` → `DEFAULT_ASK_QUESTIONNAIRE`

### `tests/unit/ask-grounding.test.ts`
- [ ] Update import path `.pi/extensions/grill-me/grounding.js` → `.pi/extensions/ask/grounding.js`
- [ ] Update suite name `"grill-me grounding"` → `"ask grounding"`
- [ ] Update temp directory prefix `grill-me-grounding-` → `ask-grounding-`

### `tests/unit/ask-questionnaire.test.ts`
- [ ] Update import paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update temp directory prefix `grill-me-runner-` → `ask-runner-`
- [ ] Update explicit draft filename `grill-me.json` → `ask.json`

### `tests/unit/ask-questions.test.ts`
- [ ] Update import paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update suite name `"default grill-me questions"` → `"default ask questions"`
- [ ] Update constant name `DEFAULT_GRILL_ME_QUESTIONNAIRE` → `DEFAULT_ASK_QUESTIONNAIRE`

### `tests/unit/ask-storage.test.ts`
- [ ] Update import path `.pi/extensions/grill-me/storage.js` → `.pi/extensions/ask/storage.js`
- [ ] Update suite name `"grill-me storage"` → `"ask storage"`
- [ ] Update default draft path expectation `/repo/.pi/tmp/grill-me.json` → `/repo/.pi/tmp/ask.json`
- [ ] Update temp directory prefix `grill-me-storage-` → `ask-storage-`

### `tests/unit/ask-types.test.ts`
- [ ] Update import path `.pi/extensions/grill-me/types.js` → `.pi/extensions/ask/types.js`
- [ ] Update suite name `"grill-me types"` → `"ask types"`
- [ ] Update wrapped submit message expectation `/grill-me` → `/ask`

### `tests/unit/ask-ui-state.test.ts`
- [ ] Update import paths `.pi/extensions/grill-me/*` → `.pi/extensions/ask/*`
- [ ] Update suite name `"grill-me ui state"` → `"ask ui state"`
- [ ] Update temp directory prefix `grill-me-ui-` → `ask-ui-`

## 8. Global cleanup sweep

- [ ] Search for remaining `grill-me`
- [ ] Search for remaining `grill_me`
- [ ] Search for remaining `grillme`
- [ ] Search for remaining `GrillMe`
- [ ] Search for remaining `grillMe`
- [ ] Search for remaining `.pi/extensions/grill-me/`
- [ ] Search for remaining `.pi/tmp/grill-me.json`
- [ ] Search for remaining `grill-me-plan.md`
- [ ] Search for remaining `grillme-progress.json`

## 9. Verification

- [ ] Confirm new files exist:
  - [ ] `ask-plan.md`
  - [ ] `ask-progress.json`
  - [ ] `.pi/extensions/ask/*`
  - [ ] `tests/*ask*`
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Run `npm test`
- [ ] Confirm no functional diffs beyond naming/path/symbol/string updates

## 10. Suggested execution order

- [ ] Rename top-level files
- [ ] Rename extension directory
- [ ] Update extension source symbols/strings
- [ ] Update docs and trackers
- [ ] Rename tests
- [ ] Update test imports/strings/paths
- [ ] Run global cleanup sweep
- [ ] Run verification commands
