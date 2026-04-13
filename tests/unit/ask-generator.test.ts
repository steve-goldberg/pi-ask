import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const completeMock = vi.fn();

vi.mock("@mariozechner/pi-ai", () => ({
  complete: completeMock,
}));

function createStrongSessionBranch() {
  return [
    {
      type: "message",
      message: {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "We are refining a planning workflow for a project-local pi extension. The immediate goal is to improve the clarification flow so it reads explicit artifacts first, avoids fake-specific questions in thin sessions, and reports what grounding it used before asking the user anything deeper.",
          },
        ],
      },
    },
    {
      type: "message",
      message: {
        role: "assistant",
        content: [
          {
            type: "text",
            text:
              "I should anchor the next clarification round on real artifacts when they are provided, combine that with recent conversation context, and only ask artifact-specific questions if those files were actually read. I also need provenance so the user can see what the questionnaire was based on.",
          },
        ],
      },
    },
  ];
}

function createContext(root: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd: root,
    model: { id: "test-model", provider: "test" },
    signal: undefined,
    modelRegistry: {
      getApiKeyAndHeaders: vi.fn(async () => ({ ok: true, apiKey: "key", headers: { Authorization: "Bearer key" } })),
    },
    sessionManager: {
      getSessionName: () => "Planner Session",
      getBranch: () => createStrongSessionBranch(),
    },
    ...overrides,
  };
}

describe("ask generator", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses a provided definition without calling the model", async () => {
    const root = mkdtempSync(join(tmpdir(), "ask-generator-"));
    const { resolveQuestionnaireDefinition } = await import("../../.pi/extensions/ask/generator.js");

    const providedDefinition = {
      title: "Provided",
      questions: [{ id: "scope", question: "What is in scope?", multiline: false }],
    };

    const result = await resolveQuestionnaireDefinition(createContext(root) as never, {
      definition: providedDefinition,
    });

    expect(result).toEqual({
      definition: providedDefinition,
      source: "provided",
      provenance: {
        source: "provided",
        grounding: ["provided definition"],
        artifactsUsed: [],
        contextSufficiency: "not_applicable",
      },
    });
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("keeps the raw request intact while separately grounding on explicit artifacts", async () => {
    const root = mkdtempSync(join(tmpdir(), "ask-generator-"));
    writeFileSync(
      join(root, "progress.json"),
      JSON.stringify(
        {
          sections: {
            ask: {
              goal: "Ground question generation on explicit artifacts before asking file-specific questions.",
              findings: [
                "Current generation only uses session context and optional focus.",
                "Thin sessions can trigger fake-specific questions about unseen files.",
              ],
            },
          },
        },
        null,
        2,
      ),
    );

    completeMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              title: "Grounded Plan Clarification",
              questions: [
                {
                  id: "gap",
                  question: "Which grounding gap in progress.json must we fix first?",
                  multiline: false,
                },
                {
                  id: "proof",
                  question: "What should prove that explicit artifact grounding is working?",
                  multiline: false,
                },
              ],
            },
            null,
            2,
          ),
        },
      ],
    });

    const { resolveQuestionnaireDefinition } = await import("../../.pi/extensions/ask/generator.js");
    const ctx = createContext(root);

    const result = await resolveQuestionnaireDefinition(ctx as never, {
      rawRequest: "compare @progress.json to the current flow and find the grounding gap",
      artifacts: ["progress.json"],
    });

    expect(result.source).toBe("generated");
    expect(result.definition).toEqual({
      title: "Grounded Plan Clarification",
      questions: [
        { id: "gap", question: "Which grounding gap in progress.json must we fix first?", multiline: false },
        {
          id: "proof",
          question: "What should prove that explicit artifact grounding is working?",
          multiline: false,
        },
      ],
    });
    expect(result.provenance).toEqual({
      source: "generated",
      grounding: expect.arrayContaining(["explicit artifacts", "session context"]),
      artifactsUsed: ["progress.json"],
      contextSufficiency: "sufficient",
    });
    expect(completeMock).toHaveBeenCalledTimes(1);
    expect(completeMock.mock.calls[0]?.[1]).toMatchObject({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: expect.stringContaining("Artifact: progress.json"),
            },
          ],
        },
      ],
    });
    expect(completeMock.mock.calls[0]?.[1]?.messages?.[0]?.content?.[0]?.text).toContain(
      "Original request: compare @progress.json to the current flow and find the grounding gap",
    );
    expect(completeMock.mock.calls[0]?.[1]?.messages?.[0]?.content?.[0]?.text).toContain(
      "Ground question generation on explicit artifacts before asking file-specific questions.",
    );
    expect(completeMock.mock.calls[0]?.[1]?.messages?.[0]?.content?.[0]?.text).not.toContain("Explicit focus:");
  });

  it("uses the raw request unchanged in thin-context exploratory questions instead of mangling file mentions", async () => {
    const root = mkdtempSync(join(tmpdir(), "ask-generator-"));
    const { resolveQuestionnaireDefinition } = await import("../../.pi/extensions/ask/generator.js");

    const result = await resolveQuestionnaireDefinition(
      createContext(root, {
        sessionManager: {
          getSessionName: () => "Fresh Session",
          getBranch: () => [
            {
              type: "message",
              message: {
                role: "user",
                content: [{ type: "text", text: "Help me tighten the plan." }],
              },
            },
          ],
        },
      }) as never,
      { rawRequest: "compare @progress.json and @PRD.md to find what the extension is missing" },
    );

    expect(result).toEqual({
      source: "generated",
      definition: {
        title: "Grounded Clarification Kickoff",
        questions: [
          {
            id: "outcome",
            question: "For “compare @progress.json and @PRD.md to find what the extension is missing”, what do you want this clarification round to produce?",
            multiline: false,
          },
          {
            id: "artifact",
            question: "Which artifact or file should I base this on first?",
            multiline: false,
            recommendation:
              "Mention a concrete file path like @ask-progress.json or @ask-plan.md if an artifact should anchor this round.",
          },
          {
            id: "ambiguity",
            question: "What decision, ambiguity, or risk matters most right now?",
            multiline: false,
          },
        ],
      },
      provenance: {
        source: "generated",
        grounding: expect.arrayContaining(["session context", "thin-context generation"]),
        artifactsUsed: [],
        contextSufficiency: "thin",
      },
    });
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("falls back only after grounded generation is unavailable", async () => {
    const root = mkdtempSync(join(tmpdir(), "ask-generator-"));
    writeFileSync(join(root, "PRD.md"), "# PRD\n\nExplicitly ground the next clarification round on this file.\n");

    const { DEFAULT_ASK_QUESTIONNAIRE } = await import("../../.pi/extensions/ask/questions.js");
    const { resolveQuestionnaireDefinition } = await import("../../.pi/extensions/ask/generator.js");

    const result = await resolveQuestionnaireDefinition(
      createContext(root, { model: undefined }) as never,
      {
        rawRequest: "clarify the grounding requirements using @PRD.md",
        artifacts: ["PRD.md"],
      },
    );

    expect(result).toEqual({
      definition: DEFAULT_ASK_QUESTIONNAIRE,
      source: "fallback",
      provenance: {
        source: "fallback",
        grounding: expect.arrayContaining(["explicit artifacts", "session context", "fallback questionnaire"]),
        artifactsUsed: ["PRD.md"],
        contextSufficiency: "sufficient",
      },
    });
    expect(completeMock).not.toHaveBeenCalled();
  });
});
