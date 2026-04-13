import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { extractExplicitArtifactsFromCommandArgs } from "./grounding.js";
import { resolveQuestionnaireDefinition } from "./generator.js";
import { DEFAULT_GRILL_ME_QUESTIONNAIRE } from "./questions.js";
import { runQuestionnaire } from "./questionnaire.js";
import { removeDraftFile } from "./storage.js";
import {
  formatQuestionnaireProvenance,
  formatSubmissionJson,
  formatSubmissionMessage,
  type GrillMeToolResultDetails,
} from "./types.js";

const QuestionnaireQuestionSchema = Type.Object({
  id: Type.String({ description: "Unique question id" }),
  question: Type.String({ description: "Question shown to the user" }),
  multiline: Type.Optional(Type.Boolean({ description: "Forward-compatible field; ignored by the current UI" })),
  recommendation: Type.Optional(Type.String({ description: "Optional recommendation shown alongside the question" })),
});

const QuestionnaireDefinitionSchema = Type.Object({
  title: Type.String({ description: "Questionnaire title" }),
  questions: Type.Array(QuestionnaireQuestionSchema, { description: "Questions to ask the user" }),
});

const GrillMeToolParameters = Type.Object({
  focus: Type.Optional(Type.String({ description: "Optional focus area to steer the clarification questions" })),
  artifacts: Type.Optional(
    Type.Array(Type.String({ description: "Explicit file or artifact path to ground on before generation" })),
  ),
  definition: Type.Optional(QuestionnaireDefinitionSchema),
});

export default function grillMeExtension(pi: ExtensionAPI) {
  pi.registerCommand("grill-me", {
    description: "Ask a grounded clarification questionnaire in the TUI and submit the answers back into this session.",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/grill-me requires interactive TUI mode.", "error");
        return;
      }

      if (!ctx.isIdle()) {
        ctx.ui.notify("/grill-me can only run when pi is idle.", "warning");
        return;
      }

      try {
        const artifacts = extractExplicitArtifactsFromCommandArgs(args, ctx.cwd);
        const resolution = await resolveQuestionnaireDefinition(ctx, {
          focus: args.trim() || undefined,
          artifacts,
          fallbackDefinition: DEFAULT_GRILL_ME_QUESTIONNAIRE,
        });

        ctx.ui.notify(`Opening /grill-me. ${formatQuestionnaireProvenance(resolution.provenance)}`, "info");

        const result = await runQuestionnaire(ctx, {
          definition: resolution.definition,
        });

        if (result.status === "cancelled") {
          ctx.ui.notify("/grill-me cancelled. Draft kept in .pi/tmp/grill-me.json.", "info");
          return;
        }

        const message = formatSubmissionMessage(result.payload);

        try {
          pi.sendUserMessage(message);
        } catch (error) {
          const handoffMessage = error instanceof Error ? error.message : String(error);
          ctx.ui.notify(
            `/grill-me finished but could not hand answers back into the session. Draft kept in .pi/tmp/grill-me.json. ${handoffMessage}`,
            "error",
          );
          return;
        }

        try {
          removeDraftFile(result.draftPath);
        } catch {
          ctx.ui.notify(
            "/grill-me answers submitted, but the draft file could not be removed.",
            "warning",
          );
          return;
        }

        ctx.ui.notify("/grill-me answers submitted to the active session.", "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`/grill-me failed: ${message}`, "error");
      }
    },
  });

  pi.registerTool({
    name: "grill_me",
    label: "Grill Me",
    description:
      "Ask the user a short interactive grounded clarification questionnaire in the TUI and return structured answers. Use this instead of dumping a long wall of clarification questions into chat.",
    promptSnippet:
      "Ask the user a short interactive grounded clarification questionnaire in the TUI and return structured answers.",
    promptGuidelines: [
      "Use grill_me when you need multiple clarification answers from the user and a one-question-at-a-time TUI flow would be better than writing a long question block in chat.",
      "Pass focus when you need to steer the questions toward a specific ambiguity, feature area, or decision.",
      "Pass artifacts when you want the questionnaire grounded on explicit files or artifact paths before generation.",
      "Pass definition only when you already know the exact questions to ask and want to reuse the questionnaire runner directly.",
    ],
    parameters: GrillMeToolParameters,
    async execute(_toolCallId, params, _signal, onUpdate, ctx) {
      if (!ctx.hasUI) {
        throw new Error("grill_me requires interactive TUI mode.");
      }

      onUpdate?.({
        content: [{ type: "text", text: "Opening clarification questionnaire..." }],
        details: {},
      });

      const resolution = await resolveQuestionnaireDefinition(ctx, {
        focus: params.focus,
        artifacts: params.artifacts,
        definition: params.definition,
        fallbackDefinition: DEFAULT_GRILL_ME_QUESTIONNAIRE,
      });

      const result = await runQuestionnaire(ctx, {
        definition: resolution.definition,
      });

      if (result.status === "cancelled") {
        return {
          content: [{ type: "text", text: "User cancelled the questionnaire." }],
          details: {
            status: "cancelled",
            source: resolution.provenance.source,
            grounding: resolution.provenance.grounding,
            artifactsUsed: resolution.provenance.artifactsUsed,
            contextSufficiency: resolution.provenance.contextSufficiency,
            draftPath: result.draftPath,
            answers: result.answers,
          } satisfies GrillMeToolResultDetails,
        };
      }

      try {
        removeDraftFile(result.draftPath);
      } catch {
        // Keep success path intact even if cleanup fails.
      }

      return {
        content: [{ type: "text", text: formatSubmissionJson(result.payload) }],
        details: {
          status: "submitted",
          source: resolution.provenance.source,
          grounding: resolution.provenance.grounding,
          artifactsUsed: resolution.provenance.artifactsUsed,
          contextSufficiency: resolution.provenance.contextSufficiency,
          draftPath: result.draftPath,
          answers: result.answers,
          payload: result.payload,
        } satisfies GrillMeToolResultDetails,
      };
    },
  });
}
