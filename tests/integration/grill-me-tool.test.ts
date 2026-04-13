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

function createToolContext(overrides: Record<string, unknown> = {}) {
  return {
    hasUI: true,
    cwd: "/repo",
    signal: undefined,
    model: { id: "model", provider: "test" },
    modelRegistry: {
      getApiKeyAndHeaders: vi.fn(),
    },
    sessionManager: {
      getBranch: vi.fn(() => []),
      getSessionName: vi.fn(() => undefined),
    },
    ui: {},
    ...overrides,
  };
}

describe("grill_me tool", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("registers an agent-callable clarification tool with guidance metadata", async () => {
    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    expect(pi.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "grill_me",
        promptSnippet: expect.stringContaining("grounded clarification questionnaire"),
        promptGuidelines: expect.arrayContaining([
          expect.stringContaining("multiple clarification answers"),
          expect.stringContaining("Pass artifacts"),
        ]),
      }),
    );
  });

  it("returns structured answers and provenance as the tool result in the same turn", async () => {
    resolveQuestionnaireDefinitionMock.mockResolvedValueOnce({
      source: "generated",
      definition: {
        title: "Auth Clarification",
        questions: [{ id: "login_method", question: "Which login methods must v1 support?", multiline: false }],
      },
      provenance: {
        source: "generated",
        grounding: ["explicit artifacts", "session context"],
        artifactsUsed: ["plan.json"],
        contextSufficiency: "sufficient",
      },
    });
    runQuestionnaireMock.mockResolvedValueOnce({
      status: "submitted",
      draftPath: "/repo/.pi/tmp/grill-me.json",
      answers: {
        login_method: "Email + GitHub",
      },
      payload: {
        title: "Auth Clarification",
        responses: [
          {
            id: "login_method",
            question: "Which login methods must v1 support?",
            answer: "Email + GitHub",
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

    const [tool] = pi.registerTool.mock.calls[0];
    const onUpdate = vi.fn();
    const ctx = createToolContext();

    const result = await tool.execute(
      "tool-call-id",
      { focus: "auth edge cases", artifacts: ["plan.json"] },
      undefined,
      onUpdate,
      ctx,
    );

    expect(resolveQuestionnaireDefinitionMock).toHaveBeenCalledWith(ctx, {
      focus: "auth edge cases",
      artifacts: ["plan.json"],
      definition: undefined,
      fallbackDefinition: expect.objectContaining({ title: "Design Clarification" }),
    });
    expect(runQuestionnaireMock).toHaveBeenCalledWith(ctx, {
      definition: {
        title: "Auth Clarification",
        questions: [{ id: "login_method", question: "Which login methods must v1 support?", multiline: false }],
      },
    });
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text:
            '{\n  "title": "Auth Clarification",\n  "responses": [\n    {\n      "id": "login_method",\n      "question": "Which login methods must v1 support?",\n      "answer": "Email + GitHub"\n    }\n  ]\n}',
        },
      ],
      details: {
        status: "submitted",
        source: "generated",
        grounding: ["explicit artifacts", "session context"],
        artifactsUsed: ["plan.json"],
        contextSufficiency: "sufficient",
        draftPath: "/repo/.pi/tmp/grill-me.json",
        answers: {
          login_method: "Email + GitHub",
        },
        payload: {
          title: "Auth Clarification",
          responses: [
            {
              id: "login_method",
              question: "Which login methods must v1 support?",
              answer: "Email + GitHub",
            },
          ],
        },
      },
    });
    expect(onUpdate).toHaveBeenCalledWith({
      content: [{ type: "text", text: "Opening clarification questionnaire..." }],
      details: {},
    });
    expect(removeDraftFileMock).toHaveBeenCalledWith("/repo/.pi/tmp/grill-me.json");
  });

  it("returns a non-error cancel result, provenance, and keeps the draft on cancellation", async () => {
    resolveQuestionnaireDefinitionMock.mockResolvedValueOnce({
      source: "generated",
      definition: {
        title: "Clarification Kickoff",
        questions: [{ id: "scope", question: "What is in scope?", multiline: false }],
      },
      provenance: {
        source: "generated",
        grounding: ["thin-context generation"],
        artifactsUsed: [],
        contextSufficiency: "thin",
      },
    });
    runQuestionnaireMock.mockResolvedValueOnce({
      status: "cancelled",
      draftPath: "/repo/.pi/tmp/grill-me.json",
      answers: {
        scope: "",
      },
    });

    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [tool] = pi.registerTool.mock.calls[0];
    const result = await tool.execute(
      "tool-call-id",
      { focus: "scope" },
      undefined,
      undefined,
      createToolContext(),
    );

    expect(result).toEqual({
      content: [{ type: "text", text: "User cancelled the questionnaire." }],
      details: {
        status: "cancelled",
        source: "generated",
        grounding: ["thin-context generation"],
        artifactsUsed: [],
        contextSufficiency: "thin",
        draftPath: "/repo/.pi/tmp/grill-me.json",
        answers: {
          scope: "",
        },
      },
    });
    expect(removeDraftFileMock).not.toHaveBeenCalled();
  });
});
