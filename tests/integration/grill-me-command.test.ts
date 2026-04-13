import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveQuestionnaireDefinitionMock = vi.fn();
const runQuestionnaireMock = vi.fn();
const removeDraftFileMock = vi.fn();

vi.mock("../../.pi/extensions/grill-me/generator.js", () => ({
  resolveQuestionnaireDefinition: resolveQuestionnaireDefinitionMock,
}));

vi.mock("../../.pi/extensions/grill-me/questionnaire.js", () => ({
  runQuestionnaire: runQuestionnaireMock,
}));

vi.mock("../../.pi/extensions/grill-me/storage.js", () => ({
  removeDraftFile: removeDraftFileMock,
}));

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    hasUI: true,
    isIdle: () => true,
    cwd: "/repo",
    ui: {
      notify: vi.fn(),
    },
    ...overrides,
  };
}

describe("/grill-me command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("registers the project-local command", async () => {
    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    expect(pi.registerCommand).toHaveBeenCalledWith(
      "grill-me",
      expect.objectContaining({ description: expect.stringContaining("grounded clarification questionnaire") }),
    );
  });

  it("rejects non-interactive usage", async () => {
    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext({ hasUI: false });

    await command.handler("", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith("/grill-me requires interactive TUI mode.", "error");
    expect(resolveQuestionnaireDefinitionMock).not.toHaveBeenCalled();
    expect(runQuestionnaireMock).not.toHaveBeenCalled();
  });

  it("rejects busy-agent usage", async () => {
    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext({ isIdle: () => false });

    await command.handler("", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith("/grill-me can only run when pi is idle.", "warning");
    expect(resolveQuestionnaireDefinitionMock).not.toHaveBeenCalled();
    expect(runQuestionnaireMock).not.toHaveBeenCalled();
  });

  it("passes optional focus args and explicit artifact hints into grounded resolution", async () => {
    resolveQuestionnaireDefinitionMock.mockResolvedValueOnce({
      source: "generated",
      definition: {
        title: "Auth Clarification",
        questions: [{ id: "one", question: "What auth method?", multiline: false }],
      },
      provenance: {
        source: "generated",
        grounding: ["explicit artifacts", "session context"],
        artifactsUsed: ["plan.json", "PRD.md"],
        contextSufficiency: "sufficient",
      },
    });
    runQuestionnaireMock.mockResolvedValueOnce({
      status: "cancelled",
      draftPath: "/repo/.pi/tmp/grill-me.json",
      answers: { one: "" },
    });

    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const root = mkdtempSync(join(tmpdir(), "grill-me-command-"));
    writeFileSync(join(root, "plan.json"), "{}\n");
    writeFileSync(join(root, "PRD.md"), "# PRD\n");

    const ctx = createContext({ cwd: root });

    await command.handler("clarify auth edge cases using @plan.json and @PRD.md", ctx);

    expect(resolveQuestionnaireDefinitionMock).toHaveBeenCalledWith(ctx, {
      focus: "clarify auth edge cases using @plan.json and @PRD.md",
      artifacts: ["plan.json", "PRD.md"],
      fallbackDefinition: expect.objectContaining({ title: "Design Clarification" }),
    });
    expect(runQuestionnaireMock).toHaveBeenCalledWith(ctx, {
      definition: {
        title: "Auth Clarification",
        questions: [{ id: "one", question: "What auth method?", multiline: false }],
      },
    });
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Opening /grill-me. Grounding: explicit artifacts, session context • Artifacts: plan.json, PRD.md • Context: sufficient",
      "info",
    );
  });
});
