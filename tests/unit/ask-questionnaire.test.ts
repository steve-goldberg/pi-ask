import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

import { readDraftFile } from "../../.pi/extensions/ask/storage.js";
import { runQuestionnaire } from "../../.pi/extensions/ask/questionnaire.js";

const definition = {
  title: "Example",
  questions: [
    { id: "one", question: "Question one?", multiline: false },
    { id: "two", question: "Question two?", multiline: false },
  ],
};

describe("runQuestionnaire", () => {
  it("keeps the temp draft on cancel with the latest in-progress answers", async () => {
    const root = mkdtempSync(join(tmpdir(), "ask-runner-"));
    const draftPath = join(root, "ask.json");

    const ctx = {
      cwd: root,
      ui: {
        custom: vi.fn(async () => ({
          status: "cancelled" as const,
          answers: {
            one: "Alpha",
            two: "",
          },
        })),
      },
    };

    const result = await runQuestionnaire(ctx as unknown as Pick<ExtensionCommandContext, "cwd" | "ui">, {
      definition,
      draftPath,
    });

    expect(result).toEqual({
      status: "cancelled",
      draftPath,
      answers: {
        one: "Alpha",
        two: "",
      },
    });
    expect(existsSync(draftPath)).toBe(true);
    expect(readDraftFile(draftPath)).toMatchObject({
      title: "Example",
      responses: [
        { id: "one", answer: "Alpha" },
        { id: "two", answer: "" },
      ],
    });
  });

  it("keeps the completed draft until the caller decides cleanup on submit", async () => {
    const root = mkdtempSync(join(tmpdir(), "ask-runner-"));
    const draftPath = join(root, "ask.json");

    const ctx = {
      cwd: root,
      ui: {
        custom: vi.fn(async () => ({
          status: "submitted" as const,
          answers: {
            one: "Alpha",
            two: "Beta",
          },
        })),
      },
    };

    const result = await runQuestionnaire(ctx as unknown as Pick<ExtensionCommandContext, "cwd" | "ui">, {
      definition,
      draftPath,
    });

    expect(result).toEqual({
      status: "submitted",
      draftPath,
      answers: {
        one: "Alpha",
        two: "Beta",
      },
      payload: {
        title: "Example",
        responses: [
          { id: "one", question: "Question one?", answer: "Alpha" },
          { id: "two", question: "Question two?", answer: "Beta" },
        ],
      },
    });
    expect(existsSync(draftPath)).toBe(true);
    expect(readDraftFile(draftPath)).toMatchObject({
      title: "Example",
      responses: [
        { id: "one", answer: "Alpha" },
        { id: "two", answer: "Beta" },
      ],
    });
  });
});
