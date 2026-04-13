import { beforeEach, describe, expect, it, vi } from "vitest";

const completeMock = vi.fn();

vi.mock("@mariozechner/pi-ai", () => ({
  complete: completeMock,
}));

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    model: { id: "test-model", provider: "test" },
    signal: undefined,
    modelRegistry: {
      getApiKeyAndHeaders: vi.fn(async () => ({ ok: true, apiKey: "key", headers: { Authorization: "Bearer key" } })),
    },
    sessionManager: {
      getSessionName: () => "Planner Session",
      getBranch: () => [
        {
          type: "message",
          message: {
            role: "user",
            content: [{ type: "text", text: "We need to clarify the auth flow and first release scope." }],
          },
        },
        {
          type: "message",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "I need to know the login requirements and edge cases." }],
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("grill-me generator", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses a provided definition without calling the model", async () => {
    const { resolveQuestionnaireDefinition } = await import("../../.pi/extensions/grill-me/generator.js");

    const providedDefinition = {
      title: "Provided",
      questions: [{ id: "scope", question: "What is in scope?", multiline: false }],
    };

    const result = await resolveQuestionnaireDefinition(createContext() as never, {
      definition: providedDefinition,
    });

    expect(result).toEqual({
      definition: providedDefinition,
      source: "provided",
    });
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("generates a dynamic questionnaire from session context and focus", async () => {
    completeMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              title: "Auth Clarification",
              questions: [
                { id: "login_method", question: "Which login methods must v1 support?", multiline: false },
                { id: "roles", question: "Which user roles matter in the first release?", multiline: false },
              ],
            },
            null,
            2,
          ),
        },
      ],
    });

    const { resolveQuestionnaireDefinition } = await import("../../.pi/extensions/grill-me/generator.js");
    const ctx = createContext();

    const result = await resolveQuestionnaireDefinition(ctx as never, {
      focus: "clarify auth edge cases",
    });

    expect(result.source).toBe("generated");
    expect(result.definition).toEqual({
      title: "Auth Clarification",
      questions: [
        { id: "login_method", question: "Which login methods must v1 support?", multiline: false },
        { id: "roles", question: "Which user roles matter in the first release?", multiline: false },
      ],
    });
    expect(completeMock).toHaveBeenCalledTimes(1);
    expect(completeMock.mock.calls[0]?.[1]).toMatchObject({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: expect.stringContaining("clarify auth edge cases"),
            },
          ],
        },
      ],
    });
  });

  it("falls back to the bundled questionnaire when generation is unavailable", async () => {
    const { DEFAULT_GRILL_ME_QUESTIONNAIRE } = await import("../../.pi/extensions/grill-me/questions.js");
    const { resolveQuestionnaireDefinition } = await import("../../.pi/extensions/grill-me/generator.js");

    const result = await resolveQuestionnaireDefinition(
      createContext({ model: undefined }) as never,
      { focus: "clarify scope" },
    );

    expect(result).toEqual({
      definition: DEFAULT_GRILL_ME_QUESTIONNAIRE,
      source: "fallback",
    });
    expect(completeMock).not.toHaveBeenCalled();
  });
});
