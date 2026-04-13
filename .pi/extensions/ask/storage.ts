import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { QuestionnaireAnswers, QuestionnaireDefinition, QuestionnaireDraft } from "./types.js";
import { createDraft } from "./types.js";

export const DEFAULT_ASK_DRAFT_PATH = ".pi/tmp/ask.json";
export const DEFAULT_DRAFT_PERSIST_DEBOUNCE_MS = 75;

export interface DraftPersistenceManager {
  schedule(answers: QuestionnaireAnswers): void;
  flush(answers: QuestionnaireAnswers): QuestionnaireDraft;
  dispose(): void;
}

export function resolveDraftPath(cwd: string, relativePath = DEFAULT_ASK_DRAFT_PATH): string {
  return resolve(cwd, relativePath);
}

export function writeDraftFile(filePath: string, draft: QuestionnaireDraft): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
}

export function overwriteDraftFile(
  filePath: string,
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswers = {},
): QuestionnaireDraft {
  const draft = createDraft(definition, answers);
  writeDraftFile(filePath, draft);
  return draft;
}

export function updateDraftFile(
  filePath: string,
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswers,
): QuestionnaireDraft {
  const draft = createDraft(definition, answers);
  writeDraftFile(filePath, draft);
  return draft;
}

export function createDraftPersistenceManager(options: {
  filePath: string;
  definition: QuestionnaireDefinition;
  debounceMs?: number;
}): DraftPersistenceManager {
  const { filePath, definition, debounceMs = DEFAULT_DRAFT_PERSIST_DEBOUNCE_MS } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastAnswers: QuestionnaireAnswers = {};

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    schedule(answers) {
      lastAnswers = { ...answers };
      clearTimer();
      timer = setTimeout(() => {
        timer = undefined;
        updateDraftFile(filePath, definition, lastAnswers);
      }, debounceMs);
    },
    flush(answers) {
      lastAnswers = { ...answers };
      clearTimer();
      return updateDraftFile(filePath, definition, lastAnswers);
    },
    dispose() {
      clearTimer();
    },
  };
}

export function removeDraftFile(filePath: string): void {
  rmSync(filePath, { force: true });
}

export function readDraftFile(filePath: string): QuestionnaireDraft {
  return JSON.parse(readFileSync(filePath, "utf8")) as QuestionnaireDraft;
}
