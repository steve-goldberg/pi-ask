import { describe, expect, it } from "vitest";

import { DEFAULT_GRILL_ME_QUESTIONNAIRE } from "../../.pi/extensions/grill-me/questions.js";
import { validateQuestionnaireDefinition } from "../../.pi/extensions/grill-me/types.js";

describe("default grill-me questions", () => {
  it("matches the planned built-in questionnaire", () => {
    expect(DEFAULT_GRILL_ME_QUESTIONNAIRE.title).toBe("Design Clarification");
    expect(DEFAULT_GRILL_ME_QUESTIONNAIRE.questions).toHaveLength(10);
    expect(DEFAULT_GRILL_ME_QUESTIONNAIRE.questions.map((question) => question.id)).toEqual([
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
    expect(() => validateQuestionnaireDefinition(DEFAULT_GRILL_ME_QUESTIONNAIRE)).not.toThrow();
  });
});
