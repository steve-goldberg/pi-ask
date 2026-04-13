import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { DEFAULT_GRILL_ME_QUESTIONNAIRE } from "./questions.js";
import { runQuestionnaire } from "./questionnaire.js";

export default function grillMeExtension(pi: ExtensionAPI) {
  pi.registerCommand("grill-me", {
    description: "Ask the built-in design clarification questionnaire and submit the answers back into this session.",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/grill-me requires interactive TUI mode.", "error");
        return;
      }

      if (!ctx.isIdle()) {
        ctx.ui.notify("/grill-me can only run when pi is idle.", "warning");
        return;
      }

      try {
        const result = await runQuestionnaire(ctx, {
          definition: DEFAULT_GRILL_ME_QUESTIONNAIRE,
        });

        if (result.status === "cancelled") {
          ctx.ui.notify("/grill-me cancelled. Draft kept in .pi/tmp/grill-me.json.", "info");
          return;
        }

        pi.sendUserMessage(result.message);
        ctx.ui.notify("/grill-me answers submitted to the active session.", "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`/grill-me failed: ${message}`, "error");
      }
    },
  });
}
