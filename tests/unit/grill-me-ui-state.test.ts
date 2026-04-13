import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { visibleWidth } from "@mariozechner/pi-tui";
import { describe, expect, it, vi } from "vitest";

import {
  activateReviewSelection,
  advanceAfterSave,
  createQuestionnaireUiState,
  getReviewItems,
  goToPreviousQuestion,
  moveReviewSelection,
  QuestionnaireComponent,
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

const singleQuestionDefinition = {
  title: "Example",
  questions: [{ id: "one", question: "Question one?", multiline: false }],
};

function createTheme() {
  return {
    fg: (_color: string, text: string) => text,
    bg: (_color: string, text: string) => text,
    bold: (text: string) => text,
    italic: (text: string) => text,
    strikethrough: (text: string) => text,
  } as never;
}

function createComponent(options: {
  cwd?: string;
  definition?: typeof singleQuestionDefinition;
  initialAnswers?: Record<string, string>;
} = {}) {
  const cwd = options.cwd ?? mkdtempSync(join(tmpdir(), "grill-me-ui-"));
  const persisted: Array<Record<string, string>> = [];
  const onDone = vi.fn();
  const component = new QuestionnaireComponent(
    {
      requestRender: vi.fn(),
      terminal: { rows: 40 },
    } as never,
    createTheme(),
    cwd,
    options.definition ?? singleQuestionDefinition,
    options.initialAnswers ?? {},
    (answers) => {
      persisted.push({ ...answers });
    },
    onDone,
  );

  return { component, persisted, onDone, cwd };
}

function typeText(component: QuestionnaireComponent, text: string) {
  for (const char of text) {
    component.handleInput(char);
  }
}

function getInternalEditor(component: QuestionnaireComponent): { isShowingAutocomplete(): boolean } {
  return (component as unknown as { editor: { isShowingAutocomplete(): boolean } }).editor;
}

const ESC = String.fromCharCode(27);
const ANSI_ESCAPE_PATTERN = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, "g");

function normalizeRenderedText(lines: string[]): string {
  return lines
    .join("\n")
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

  it("renders long answers in wrapped editor lines instead of letting them disappear off-screen", () => {
    const longAnswer =
      "This answer should stay visible instead of scrolling off-screen when it wraps across multiple editor lines.";
    const { component } = createComponent({
      initialAnswers: { one: longAnswer },
    });

    const width = 28;
    const lines = component.render(width);
    const normalized = normalizeRenderedText(lines);

    expect(lines.every((line) => visibleWidth(line) <= width)).toBe(true);
    expect(normalized).toContain("This answer should stay visible instead of scrolling off-screen");
    expect(normalized).toContain("when it wraps across multiple editor lines.");
  });

  it("persists wrapped multi-line edits as plain strings", () => {
    const { component, persisted } = createComponent();

    typeText(component, "First line that is long enough to wrap in the editor.");
    component.handleInput("\n");
    typeText(component, "Second line with more detail.");

    expect(persisted.at(-1)?.one).toBe(
      "First line that is long enough to wrap in the editor.\nSecond line with more detail.",
    );

    const rendered = normalizeRenderedText(component.render(30));
    expect(rendered).toContain("First line that is long enough to wrap in the editor.");
    expect(rendered).toContain("Second line with more detail.");
  });

  it("inserts @ file mentions through editor autocomplete rooted at the questionnaire cwd", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "grill-me-ui-"));
    writeFileSync(join(cwd, "progress.json"), "{}\n");

    const { component, persisted } = createComponent({ cwd });

    typeText(component, "Use @pro");
    component.handleInput("\t");

    await vi.waitFor(() => {
      expect(persisted.at(-1)?.one).toContain("@progress.json");
    });

    expect(persisted.at(-1)?.one).toBe("Use @progress.json ");
  });

  it("dismisses autocomplete on escape before cancelling the questionnaire", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "grill-me-ui-"));
    writeFileSync(join(cwd, "progress.json"), "{}\n");
    writeFileSync(join(cwd, "profile.json"), "{}\n");

    const { component, persisted, onDone } = createComponent({ cwd });
    const editor = getInternalEditor(component);

    typeText(component, "Use @pro");
    component.handleInput("\t");

    await vi.waitFor(() => {
      expect(editor.isShowingAutocomplete()).toBe(true);
    });

    component.handleInput(ESC);

    expect(onDone).not.toHaveBeenCalled();
    expect(editor.isShowingAutocomplete()).toBe(false);
    expect(persisted.at(-1)?.one).toBe("Use @pro");

    component.handleInput(ESC);

    expect(onDone).toHaveBeenCalledWith({
      status: "cancelled",
      answers: { one: "Use @pro" },
    });
  });
});
