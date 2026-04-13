import type { ExtensionCommandContext, ExtensionContext } from "@mariozechner/pi-coding-agent";

import {
  createDraftPersistenceManager,
  overwriteDraftFile,
  resolveDraftPath,
} from "./storage.js";
import type { QuestionnaireDefinition, QuestionnaireRunResult } from "./types.js";
import { createSubmissionPayload, validateQuestionnaireDefinition } from "./types.js";
import { QuestionnaireComponent, type PersistOptions, type QuestionnaireUiResult } from "./ui.js";

export interface RunQuestionnaireOptions {
  definition: QuestionnaireDefinition;
  draftPath?: string;
  debounceMs?: number;
}

export async function runQuestionnaire(
  ctx: Pick<ExtensionCommandContext | ExtensionContext, "cwd" | "ui">,
  options: RunQuestionnaireOptions,
): Promise<QuestionnaireRunResult> {
  const { definition } = options;
  validateQuestionnaireDefinition(definition);

  const draftPath = options.draftPath ?? resolveDraftPath(ctx.cwd);
  let answers: Record<string, string> = {};

  overwriteDraftFile(draftPath, definition, answers);
  const persistence = createDraftPersistenceManager({
    filePath: draftPath,
    definition,
    debounceMs: options.debounceMs,
  });

  try {
    const result = await ctx.ui.custom<QuestionnaireUiResult>((tui, theme, _keybindings, done) => {
      return new QuestionnaireComponent(
        tui,
        theme,
        ctx.cwd,
        definition,
        answers,
        (nextAnswers, persistOptions?: PersistOptions) => {
          answers = { ...nextAnswers };
          if (persistOptions?.flush) {
            persistence.flush(answers);
            return;
          }
          persistence.schedule(answers);
        },
        done,
      );
    });

    answers = { ...result.answers };
    persistence.flush(answers);

    if (result.status === "cancelled") {
      return {
        status: "cancelled",
        draftPath,
        answers,
      };
    }

    return {
      status: "submitted",
      draftPath,
      answers,
      payload: createSubmissionPayload(definition, answers),
    };
  } finally {
    persistence.dispose();
  }
}
