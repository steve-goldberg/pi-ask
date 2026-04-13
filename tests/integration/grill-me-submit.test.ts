import { describe, expect, it, vi } from "vitest";

const runQuestionnaireMock = vi.fn();

vi.mock("../../.pi/extensions/grill-me/questionnaire.js", () => ({
  runQuestionnaire: runQuestionnaireMock,
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
  it("sends the wrapped JSON payload back into the active session", async () => {
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
      message:
        'Here are my answers from /grill-me:\n\n{\n  "title": "Design Clarification",\n  "responses": [\n    {\n      "id": "problem",\n      "question": "What are we building, in one concrete sentence?",\n      "answer": "Build a planner"\n    }\n  ]\n}',
    });

    const pi = {
      registerCommand: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext();

    await command.handler("", ctx);

    expect(runQuestionnaireMock).toHaveBeenCalledWith(ctx, {
      definition: expect.objectContaining({ title: "Design Clarification" }),
    });
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      'Here are my answers from /grill-me:\n\n{\n  "title": "Design Clarification",\n  "responses": [\n    {\n      "id": "problem",\n      "question": "What are we building, in one concrete sentence?",\n      "answer": "Build a planner"\n    }\n  ]\n}',
    );
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
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext();

    await command.handler("", ctx);

    expect(pi.sendUserMessage).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith("/grill-me cancelled. Draft kept in .pi/tmp/grill-me.json.", "info");
  });
});
