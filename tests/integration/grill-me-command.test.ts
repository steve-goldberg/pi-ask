import { describe, expect, it, vi } from "vitest";

const runQuestionnaireMock = vi.fn();

vi.mock("../../.pi/extensions/grill-me/questionnaire.js", () => ({
  runQuestionnaire: runQuestionnaireMock,
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
  it("registers the project-local command", async () => {
    const pi = {
      registerCommand: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    expect(pi.registerCommand).toHaveBeenCalledWith(
      "grill-me",
      expect.objectContaining({ description: expect.stringContaining("questionnaire") }),
    );
  });

  it("rejects non-interactive usage", async () => {
    const pi = {
      registerCommand: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext({ hasUI: false });

    await command.handler("", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith("/grill-me requires interactive TUI mode.", "error");
    expect(runQuestionnaireMock).not.toHaveBeenCalled();
  });

  it("rejects busy-agent usage", async () => {
    const pi = {
      registerCommand: vi.fn(),
      sendUserMessage: vi.fn(),
    };

    const module = await import("../../.pi/extensions/grill-me/index.js");
    module.default(pi as never);

    const [, command] = pi.registerCommand.mock.calls[0];
    const ctx = createContext({ isIdle: () => false });

    await command.handler("", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith("/grill-me can only run when pi is idle.", "warning");
    expect(runQuestionnaireMock).not.toHaveBeenCalled();
  });
});
