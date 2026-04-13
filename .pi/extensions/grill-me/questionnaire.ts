import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

import { resolveDraftPath, removeDraftFile, overwriteDraftFile, updateDraftFile } from "./storage.js";
import type { QuestionnaireDefinition, QuestionnaireRunResult } from "./types.js";
import { createSubmissionPayload, formatSubmissionMessage, validateQuestionnaireDefinition } from "./types.js";
import { QuestionnaireComponent, type QuestionnaireUiResult } from "./ui.js";

export interface RunQuestionnaireOptions {
  definition: QuestionnaireDefinition;
  draftPath?: string;
}

export async function runQuestionnaire(
  ctx: Pick<ExtensionCommandContext, "cwd" | "ui">,
  options: RunQuestionnaireOptions,
): Promise<QuestionnaireRunResult> {
  const { definition } = options;
  validateQuestionnaireDefinition(definition);

  const draftPath = options.draftPath ?? resolveDraftPath(ctx.cwd);
  let answers: Record<string, string> = {};

  overwriteDraftFile(draftPath, definition, answers);

  const result = await ctx.ui.custom<QuestionnaireUiResult>((tui, theme, _keybindings, done) => {
    return new QuestionnaireComponent(
      tui,
      theme,
      definition,
      answers,
      (nextAnswers) => {
        answers = { ...nextAnswers };
        updateDraftFile(draftPath, definition, answers);
      },
      done,
    );
  });

  if (result.status === "cancelled") {
    answers = { ...result.answers };
    updateDraftFile(draftPath, definition, answers);
    return {
      status: "cancelled",
      draftPath,
      answers,
    };
  }

  answers = { ...result.answers };
  const payload = createSubmissionPayload(definition, answers);
  const message = formatSubmissionMessage(payload);
  removeDraftFile(draftPath);

  return {
    status: "submitted",
    draftPath,
    answers,
    payload,
    message,
  };
}
