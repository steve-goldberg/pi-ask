import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  extractExplicitArtifactsFromCommandArgs,
  resolveGroundedQuestionnaireContext,
} from "../../.pi/extensions/grill-me/grounding.js";

function createSessionManager(messages: Array<{ role: string; text: string }>) {
  return {
    getSessionName: () => "Grounding Session",
    getBranch: () => messages.map((message) => ({
      type: "message" as const,
      message: {
        role: message.role,
        content: [{ type: "text", text: message.text }],
      },
    })),
  };
}

describe("grill-me grounding", () => {
  it("extracts explicit artifact hints from slash-command args", () => {
    const root = mkdtempSync(join(tmpdir(), "grill-me-grounding-"));
    writeFileSync(join(root, "plan.json"), "{}\n");
    writeFileSync(join(root, "PRD.md"), "# PRD\n");
    writeFileSync(join(root, "README.md"), "# README\n");

    expect(
      extractExplicitArtifactsFromCommandArgs(
        "refine grounding using @plan.json and @PRD.md with README.md as fallback",
        root,
      ),
    ).toEqual(["plan.json", "PRD.md", "README.md"]);
  });

  it("preserves the raw request while reading explicit artifacts and combining them with session context", () => {
    const root = mkdtempSync(join(tmpdir(), "grill-me-grounding-"));
    writeFileSync(join(root, "plan.json"), '{"goal":"Read explicit artifacts before asking file-specific questions."}\n');

    const result = resolveGroundedQuestionnaireContext(
      {
        cwd: root,
        sessionManager: createSessionManager([
          {
            role: "user",
            text:
              "We need to tighten the grounding behavior so the questionnaire reads real files instead of pretending to know what the plan says in fresh sessions.",
          },
          {
            role: "assistant",
            text:
              "The next round should combine explicit artifacts with conversation context and stay honest when there is not enough grounding.",
          },
        ]),
      } as never,
      {
        rawRequest: "compare @plan.json to the current flow and find the grounding gap",
        artifacts: ["plan.json"],
      },
    );

    expect(result.rawRequest).toBe("compare @plan.json to the current flow and find the grounding gap");
    expect(result.contextSufficiency).toBe("sufficient");
    expect(result.grounding).toEqual(expect.arrayContaining(["explicit artifacts", "session context"]));
    expect(result.requestedArtifacts).toEqual(["plan.json"]);
    expect(result.artifactsUsed).toEqual([
      {
        path: "plan.json",
        resolvedPath: expect.stringContaining("plan.json"),
        content: expect.stringContaining("Read explicit artifacts before asking file-specific questions."),
      },
    ]);
    expect(result.sessionExcerpt).toContain("We need to tighten the grounding behavior");
  });

  it("marks fresh, weak sessions as thin when no explicit artifacts were read", () => {
    const root = mkdtempSync(join(tmpdir(), "grill-me-grounding-"));

    const result = resolveGroundedQuestionnaireContext(
      {
        cwd: root,
        sessionManager: createSessionManager([
          {
            role: "user",
            text: "Help me with the plan.",
          },
        ]),
      } as never,
      {
        rawRequest: "compare @plan.json and @PRD.md to find what the extension is missing",
      },
    );

    expect(result.rawRequest).toBe("compare @plan.json and @PRD.md to find what the extension is missing");
    expect(result.contextSufficiency).toBe("thin");
    expect(result.grounding).toEqual(expect.arrayContaining(["session context", "thin-context generation"]));
    expect(result.artifactsUsed).toEqual([]);
  });
});
