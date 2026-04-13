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

function createContext() {
  return {
    hasUI: true,
    isIdle: () => true,
    cwd: "/repo",
    ui: {
      notify: vi.fn(),
    },
  };
}

describe("/grill-me submit flow", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resolveQuestionnaireDefinitionMock.mockResolvedValue({
      source: "generated",
      definition: {
        title: "Design Clarification",
        questions: [{ id: "problem", question: "What are we building?", multiline: false }],
      },
      provenance: {
        source: "generated",
        grounding: ["session context"],
        artifactsUsed: [],
        contextSufficiency: "sufficient",
      },
    });
  });

  it("sends the wrapped JSON payload back into the active session and only then removes the draft", async () => {
    runQuestionnaireMock.mockResolvedValueOnce({
      status: "submitted",
      draftPath: "/repo/.pi/tmp/grill-me.json",
      answers: {
        problem: "Build a planner",
      },
      payload: {
        title: "Design Clarification",
        responses: [
          {
            id: "problem",
            question: "What are we building, in one concrete sentence?",
            answer: "Build a planner",
          },
        ],
      },
    });

    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext();

    await command.handler("", ctx);

    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      'Here are my answers from /grill-me:\n\n{\n  "title": "Design Clarification",\n  "responses": [\n    {\n      "id": "problem",\n      "question": "What are we building, in one concrete sentence?",\n      "answer": "Build a planner"\n    }\n  ]\n}',
    );
    expect(removeDraftFileMock).toHaveBeenCalledWith("/repo/.pi/tmp/grill-me.json");
    expect(ctx.ui.notify).toHaveBeenCalledWith("/grill-me answers submitted to the active session.", "info");
  });

  it("keeps the draft and does not send a user message on cancel", async () => {
    runQuestionnaireMock.mockResolvedValueOnce({
      status: "cancelled",
      draftPath: "/repo/.pi/tmp/grill-me.json",
      answers: {
        problem: "Partial answer",
      },
    });

    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext();

    await command.handler("", ctx);

    expect(pi.sendUserMessage).not.toHaveBeenCalled();
    expect(removeDraftFileMock).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith("/grill-me cancelled. Draft kept in .pi/tmp/grill-me.json.", "info");
  });

  it("keeps the draft when session handoff fails", async () => {
    runQuestionnaireMock.mockResolvedValueOnce({
      status: "submitted",
      draftPath: "/repo/.pi/tmp/grill-me.json",
      answers: {
        problem: "Build a planner",
      },
      payload: {
        title: "Design Clarification",
        responses: [
          {
            id: "problem",
            question: "What are we building, in one concrete sentence?",
            answer: "Build a planner",
          },
        ],
      },
    });

    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(() => {
        throw new Error("handoff failed");
      }),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext();

    await command.handler("", ctx);

    expect(removeDraftFileMock).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "/grill-me finished but could not hand answers back into the session. Draft kept in .pi/tmp/grill-me.json. handoff failed",
      "error",
    );
  });
});
