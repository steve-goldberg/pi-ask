import { describe, expect, it } from "vitest";

import {
  activateReviewSelection,
  advanceAfterSave,
  createQuestionnaireUiState,
  getReviewItems,
  goToPreviousQuestion,
  moveReviewSelection,
  withAnswer,
  type QuestionnaireUiState,
} from "../../.pi/extensions/grill-me/ui.js";

const definition = {
  title: "Example",
  questions: [
    { id: "one", question: "Question one?", multiline: false },
    { id: "two", question: "Question two?", multiline: false },
    { id: "three", question: "Question three?", multiline: false },
  ],
};

describe("grill-me ui state", () => {
  it("advances one question at a time and ends in review mode", () => {
    let state = createQuestionnaireUiState(definition);
    state = withAnswer(definition, state, "Alpha");
    state = advanceAfterSave(definition, state);
    expect(state).toMatchObject({ mode: "question", questionIndex: 1 });

    state = withAnswer(definition, state, "Beta");
    state = advanceAfterSave(definition, state);
    expect(state).toMatchObject({ mode: "question", questionIndex: 2 });

    state = withAnswer(definition, state, "Gamma");
    state = advanceAfterSave(definition, state);
    expect(state).toMatchObject({ mode: "review", reviewSelectionIndex: 0 });
  });

  it("returns to review immediately after editing an answer from review", () => {
    let state = createQuestionnaireUiState(definition, {
      one: "Alpha",
      two: "Beta",
      three: "Gamma",
    });
    state = {
      ...state,
      mode: "review",
      reviewSelectionIndex: 1,
    };

    const activation = activateReviewSelection(definition, state);
    state = activation.state;
    expect(state).toMatchObject({ mode: "question", questionIndex: 1, returnToReview: true });

    state = withAnswer(definition, state, "Beta updated");
    state = advanceAfterSave(definition, state);
    expect(state).toMatchObject({ mode: "review", reviewSelectionIndex: 1, returnToReview: false });
    expect(state.answers.two).toBe("Beta updated");
  });

  it("moves to previous questions with shift-tab semantics", () => {
    const state = goToPreviousQuestion({
      ...createQuestionnaireUiState(definition),
      questionIndex: 2,
    });

    expect(state.questionIndex).toBe(1);
    expect(goToPreviousQuestion(state).questionIndex).toBe(0);
    expect(goToPreviousQuestion(goToPreviousQuestion(state)).questionIndex).toBe(0);
  });

  it("builds review rows plus submit and cancel actions", () => {
    expect(getReviewItems(definition)).toEqual([
      { type: "answer", questionIndex: 0 },
      { type: "answer", questionIndex: 1 },
      { type: "answer", questionIndex: 2 },
      { type: "submit" },
      { type: "cancel" },
    ]);
  });

  it("navigates review selection with up and down", () => {
    let state: QuestionnaireUiState = {
      ...createQuestionnaireUiState(definition),
      mode: "review",
    };

    state = moveReviewSelection(definition, state, 2);
    expect(state.reviewSelectionIndex).toBe(2);

    state = moveReviewSelection(definition, state, 99);
    expect(state.reviewSelectionIndex).toBe(4);

    state = moveReviewSelection(definition, state, -99);
    expect(state.reviewSelectionIndex).toBe(0);
  });
});
