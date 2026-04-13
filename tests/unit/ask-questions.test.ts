import { describe, expect, it } from "vitest";

import { DEFAULT_ASK_QUESTIONNAIRE } from "../../.pi/extensions/ask/questions.js";
import { validateQuestionnaireDefinition } from "../../.pi/extensions/ask/types.js";

describe("default ask questions", () => {
  it("matches the planned built-in questionnaire", () => {
    expect(DEFAULT_ASK_QUESTIONNAIRE.title).toBe("Design Clarification");
    expect(DEFAULT_ASK_QUESTIONNAIRE.questions).toHaveLength(10);
    expect(DEFAULT_ASK_QUESTIONNAIRE.questions.map((question) => question.id)).toEqual([
      "problem",
      "user",
      "pain",
      "scope",
      "out_of_scope",
      "constraints",
      "stack",
      "risks",
      "done",
      "first_step",
    ]);
  });

  it("has a valid reusable questionnaire definition", () => {
    expect(() => validateQuestionnaireDefinition(DEFAULT_ASK_QUESTIONNAIRE)).not.toThrow();
  });
});
