import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { QuestionnaireAnswers, QuestionnaireDefinition, QuestionnaireDraft } from "./types.js";
import { createDraft } from "./types.js";

export const DEFAULT_GRILL_ME_DRAFT_PATH = ".pi/tmp/grill-me.json";

export function resolveDraftPath(cwd: string, relativePath = DEFAULT_GRILL_ME_DRAFT_PATH): string {
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

export function removeDraftFile(filePath: string): void {
  rmSync(filePath, { force: true });
}

export function readDraftFile(filePath: string): QuestionnaireDraft {
  return JSON.parse(readFileSync(filePath, "utf8")) as QuestionnaireDraft;
}
