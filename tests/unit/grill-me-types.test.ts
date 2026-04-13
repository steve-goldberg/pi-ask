import { describe, expect, it } from "vitest";

import {
  createDraft,
  createSubmissionPayload,
  formatSubmissionJson,
  formatSubmissionMessage,
  validateQuestionnaireDefinition,
} from "../../.pi/extensions/grill-me/types.js";

const definition = {
  title: "Example",
  questions: [
    { id: "one", question: "Question one?", multiline: false },
    { id: "two", question: "Question two?", multiline: false },
  ],
};

describe("grill-me types", () => {
  it("creates ordered submission payloads", () => {
    expect(
      createSubmissionPayload(definition, {
        two: "Second",
        one: "First",
      }),
    ).toEqual({
      title: "Example",
      responses: [
        { id: "one", question: "Question one?", answer: "First" },
        { id: "two", question: "Question two?", answer: "Second" },
      ],
    });
  });

  it("creates drafts with timestamps", () => {
    expect(createDraft(definition, { one: "Alpha", two: "Beta" }, "2026-04-13T00:00:00.000Z")).toEqual({
      title: "Example",
      updatedAt: "2026-04-13T00:00:00.000Z",
      responses: [
        { id: "one", question: "Question one?", answer: "Alpha" },
        { id: "two", question: "Question two?", answer: "Beta" },
      ],
    });
  });

  it("formats submission json and the wrapped submit message", () => {
    const payload = {
      title: "Example",
      responses: [{ id: "one", question: "Question one?", answer: "First" }],
    };

    expect(formatSubmissionJson(payload)).toBe(
      '{\n  "title": "Example",\n  "responses": [\n    {\n      "id": "one",\n      "question": "Question one?",\n      "answer": "First"\n    }\n  ]\n}',
    );

    expect(formatSubmissionMessage(payload)).toBe(
      'Here are my answers from /grill-me:\n\n{\n  "title": "Example",\n  "responses": [\n    {\n      "id": "one",\n      "question": "Question one?",\n      "answer": "First"\n    }\n  ]\n}',
    );
  });

  it("rejects duplicate question ids", () => {
    expect(() =>
      validateQuestionnaireDefinition({
        title: "Duplicate",
        questions: [
          { id: "dup", question: "One", multiline: false },
          { id: "dup", question: "Two", multiline: false },
        ],
      }),
    ).toThrow("Duplicate question id: dup");
  });
});
