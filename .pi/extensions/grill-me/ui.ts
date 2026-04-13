import { statSync } from "node:fs";
import { delimiter, join } from "node:path";

import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Component, Focusable, TUI } from "@mariozechner/pi-tui";
import {
  CombinedAutocompleteProvider,
  Editor,
  Key,
  matchesKey,
  truncateToWidth,
  wrapTextWithAnsi,
  type EditorTheme,
} from "@mariozechner/pi-tui";

import type { QuestionnaireAnswers, QuestionnaireDefinition } from "./types.js";

export interface ReviewAnswerItem {
  type: "answer";
  questionIndex: number;
}

export interface ReviewSubmitItem {
  type: "submit";
}

export interface ReviewCancelItem {
  type: "cancel";
}

export type ReviewItem = ReviewAnswerItem | ReviewSubmitItem | ReviewCancelItem;

export interface QuestionnaireUiState {
  mode: "question" | "review";
  questionIndex: number;
  answers: QuestionnaireAnswers;
  reviewSelectionIndex: number;
  returnToReview: boolean;
}

export interface QuestionnaireUiResult {
  status: "cancelled" | "submitted";
  answers: QuestionnaireAnswers;
}

export interface PersistOptions {
  flush?: boolean;
}

export function createQuestionnaireUiState(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswers = {},
): QuestionnaireUiState {
  return {
    mode: "question",
    questionIndex: 0,
    answers: ensureAnswerShape(definition, answers),
    reviewSelectionIndex: 0,
    returnToReview: false,
  };
}

export function ensureAnswerShape(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswers = {},
): QuestionnaireAnswers {
  const next: QuestionnaireAnswers = {};
  for (const question of definition.questions) {
    next[question.id] = answers[question.id] ?? "";
  }
  return next;
}

export function getReviewItems(definition: QuestionnaireDefinition): ReviewItem[] {
  return [
    ...definition.questions.map<ReviewAnswerItem>((_question, questionIndex) => ({
      type: "answer",
      questionIndex,
    })),
    { type: "submit" },
    { type: "cancel" },
  ];
}

export function withAnswer(
  definition: QuestionnaireDefinition,
  state: QuestionnaireUiState,
  answer: string,
): QuestionnaireUiState {
  const question = definition.questions[state.questionIndex];
  return {
    ...state,
    answers: {
      ...state.answers,
      [question.id]: answer,
    },
  };
}

export function advanceAfterSave(
  definition: QuestionnaireDefinition,
  state: QuestionnaireUiState,
): QuestionnaireUiState {
  if (state.returnToReview) {
    return {
      ...state,
      mode: "review",
      returnToReview: false,
      reviewSelectionIndex: state.questionIndex,
    };
  }

  if (state.questionIndex >= definition.questions.length - 1) {
    return {
      ...state,
      mode: "review",
      reviewSelectionIndex: 0,
    };
  }

  return {
    ...state,
    questionIndex: state.questionIndex + 1,
  };
}

export function goToPreviousQuestion(state: QuestionnaireUiState): QuestionnaireUiState {
  return {
    ...state,
    mode: "question",
    questionIndex: Math.max(0, state.questionIndex - 1),
    returnToReview: false,
  };
}

export function moveReviewSelection(
  definition: QuestionnaireDefinition,
  state: QuestionnaireUiState,
  delta: number,
): QuestionnaireUiState {
  const lastIndex = getReviewItems(definition).length - 1;
  return {
    ...state,
    reviewSelectionIndex: Math.min(lastIndex, Math.max(0, state.reviewSelectionIndex + delta)),
  };
}

export function activateReviewSelection(
  definition: QuestionnaireDefinition,
  state: QuestionnaireUiState,
): { state: QuestionnaireUiState; action?: "submit" | "cancel" } {
  const item = getReviewItems(definition)[state.reviewSelectionIndex];

  if (item.type === "submit") {
    return { state, action: "submit" };
  }

  if (item.type === "cancel") {
    return { state, action: "cancel" };
  }

  return {
    state: {
      ...state,
      mode: "question",
      questionIndex: item.questionIndex,
      returnToReview: true,
    },
  };
}

export function createQuestionnaireEditorTheme(theme: Theme): EditorTheme {
  return {
    borderColor: (text) => theme.fg("accent", text),
    selectList: {
      selectedPrefix: (text) => theme.fg("accent", text),
      selectedText: (text) => theme.fg("accent", text),
      description: (text) => theme.fg("muted", text),
      scrollInfo: (text) => theme.fg("dim", text),
      noMatch: (text) => theme.fg("warning", text),
    },
  };
}

let cachedFdBinary: string | null | undefined;

export function resolveQuestionnaireFdBinary(): string | null {
  if (cachedFdBinary !== undefined) {
    return cachedFdBinary;
  }

  const executableNames = process.platform === "win32"
    ? ["fd.exe", "fdfind.exe", "fd.cmd", "fdfind.cmd"]
    : ["fd", "fdfind"];

  for (const pathEntry of (process.env.PATH ?? "").split(delimiter)) {
    if (!pathEntry) {
      continue;
    }

    for (const executableName of executableNames) {
      const candidate = join(pathEntry, executableName);
      try {
        if (statSync(candidate).isFile()) {
          cachedFdBinary = candidate;
          return candidate;
        }
      } catch {
        // Keep looking.
      }
    }
  }

  cachedFdBinary = null;
  return null;
}

export function createQuestionnaireAutocompleteProvider(cwd: string): CombinedAutocompleteProvider {
  return new CombinedAutocompleteProvider([], cwd, resolveQuestionnaireFdBinary());
}

function isEditorNewLineInput(data: string): boolean {
  return data === "\n" ||
    data === "\x1b\r" ||
    data === "\x1b[13;2~" ||
    (data.length > 1 && data.charCodeAt(0) === 10) ||
    (data.length > 1 && data.includes("\x1b") && data.includes("\r"));
}

function percentageFor(questionIndex: number, totalQuestions: number): number {
  return Math.round(((questionIndex + 1) / totalQuestions) * 100);
}

function renderWrapped(lines: string[], value: string, width: number): void {
  for (const line of wrapTextWithAnsi(value, Math.max(1, width))) {
    lines.push(line);
  }
}

function dimEmpty(theme: Theme): string {
  return theme.fg("dim", "(empty)");
}

export class QuestionnaireComponent implements Component, Focusable {
  private readonly editor: Editor;
  private readonly stateChanged = () => {
    this.tui.requestRender();
  };

  private state: QuestionnaireUiState;
  private _focused = false;

  constructor(
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly cwd: string,
    private readonly definition: QuestionnaireDefinition,
    initialAnswers: QuestionnaireAnswers,
    private readonly onPersist: (answers: QuestionnaireAnswers, options?: PersistOptions) => void,
    private readonly onDone: (result: QuestionnaireUiResult) => void,
  ) {
    this.state = createQuestionnaireUiState(definition, initialAnswers);
    this.editor = new Editor(tui, createQuestionnaireEditorTheme(theme));
    this.editor.disableSubmit = true;
    this.editor.setAutocompleteProvider(createQuestionnaireAutocompleteProvider(this.cwd));
    this.editor.setText(this.currentAnswer());
    this.editor.onChange = () => {
      this.syncEditorToState();
      this.stateChanged();
    };
    this.onPersist(this.state.answers, { flush: true });
  }

  get focused(): boolean {
    return this._focused;
  }

  set focused(value: boolean) {
    this._focused = value;
    this.editor.focused = value;
  }

  invalidate(): void {
    this.editor.invalidate();
  }

  render(width: number): string[] {
    return this.state.mode === "review" ? this.renderReview(width) : this.renderQuestion(width);
  }

  handleInput(data: string): void {
    if (this.state.mode === "review") {
      this.handleReviewInput(data);
      return;
    }

    this.handleQuestionInput(data);
  }

  private currentQuestion() {
    return this.definition.questions[this.state.questionIndex];
  }

  private currentAnswer(): string {
    const question = this.currentQuestion();
    return this.state.answers[question.id] ?? "";
  }

  private syncEditorToState(options?: PersistOptions): void {
    this.state = withAnswer(this.definition, this.state, this.editor.getExpandedText());
    this.onPersist(this.state.answers, options);
  }

  private persistCurrentState(options?: PersistOptions): void {
    this.onPersist(this.state.answers, options);
  }

  private loadCurrentAnswerIntoEditor(): void {
    this.editor.setText(this.currentAnswer());
  }

  private handleQuestionInput(data: string): void {
    if (matchesKey(data, Key.escape)) {
      this.syncEditorToState({ flush: true });
      this.onDone({ status: "cancelled", answers: this.state.answers });
      return;
    }

    if (matchesKey(data, Key.shift("tab"))) {
      this.syncEditorToState({ flush: true });
      this.state = goToPreviousQuestion(this.state);
      this.loadCurrentAnswerIntoEditor();
      this.stateChanged();
      return;
    }

    if (matchesKey(data, Key.enter) && !isEditorNewLineInput(data)) {
      if (this.editor.isShowingAutocomplete()) {
        this.editor.handleInput(data);
        this.stateChanged();
        return;
      }

      this.syncEditorToState({ flush: true });
      this.state = advanceAfterSave(this.definition, this.state);
      if (this.state.mode === "question") {
        this.loadCurrentAnswerIntoEditor();
      }
      this.stateChanged();
      return;
    }

    this.editor.handleInput(data);
    this.stateChanged();
  }

  private handleReviewInput(data: string): void {
    if (matchesKey(data, Key.escape)) {
      this.persistCurrentState({ flush: true });
      this.onDone({ status: "cancelled", answers: this.state.answers });
      return;
    }

    if (matchesKey(data, Key.up)) {
      this.state = moveReviewSelection(this.definition, this.state, -1);
      this.stateChanged();
      return;
    }

    if (matchesKey(data, Key.down)) {
      this.state = moveReviewSelection(this.definition, this.state, 1);
      this.stateChanged();
      return;
    }

    if (matchesKey(data, Key.enter)) {
      const activation = activateReviewSelection(this.definition, this.state);
      this.state = activation.state;

      if (activation.action === "cancel") {
        this.persistCurrentState({ flush: true });
        this.onDone({ status: "cancelled", answers: this.state.answers });
        return;
      }

      if (activation.action === "submit") {
        this.persistCurrentState({ flush: true });
        this.onDone({ status: "submitted", answers: this.state.answers });
        return;
      }

      this.loadCurrentAnswerIntoEditor();
      this.stateChanged();
    }
  }

  private renderQuestion(width: number): string[] {
    const question = this.currentQuestion();
    const lines: string[] = [];
    const totalQuestions = this.definition.questions.length;
    const progress = percentageFor(this.state.questionIndex, totalQuestions);

    lines.push(truncateToWidth(this.theme.fg("accent", this.theme.bold(this.definition.title)), width));
    lines.push(
      truncateToWidth(
        this.theme.fg(
          "muted",
          `Question ${this.state.questionIndex + 1} of ${totalQuestions} • ${progress}% complete`,
        ),
        width,
      ),
    );
    lines.push(truncateToWidth(this.theme.fg("borderMuted", "─".repeat(Math.max(1, width))), width));
    lines.push("");

    renderWrapped(lines, this.theme.bold(question.question), width);

    if (question.recommendation) {
      lines.push("");
      renderWrapped(lines, this.theme.fg("muted", `Recommendation: ${question.recommendation}`), width);
    }

    lines.push("");
    lines.push(truncateToWidth(this.theme.fg("muted", "Answer"), width));
    for (const line of this.editor.render(Math.max(1, width))) {
      lines.push(line);
    }
    lines.push("");
    renderWrapped(lines, this.theme.fg("dim", "Enter save & next • Shift+Enter newline • Shift+Tab previous • Esc cancel"), width);
    renderWrapped(lines, this.theme.fg("dim", "Tab autocomplete • type @ for file mentions"), width);

    return lines;
  }

  private renderReview(width: number): string[] {
    const lines: string[] = [];
    const items = getReviewItems(this.definition);

    lines.push(truncateToWidth(this.theme.fg("accent", this.theme.bold(this.definition.title)), width));
    lines.push(truncateToWidth(this.theme.fg("muted", "Review answers"), width));
    lines.push(truncateToWidth(this.theme.fg("borderMuted", "─".repeat(Math.max(1, width))), width));
    lines.push("");

    items.forEach((item, index) => {
      const selected = index === this.state.reviewSelectionIndex;
      const prefix = selected ? this.theme.fg("accent", "› ") : "  ";

      if (item.type === "answer") {
        const question = this.definition.questions[item.questionIndex];
        const answer = this.state.answers[question.id];
        const answerText = answer.trim() ? answer : dimEmpty(this.theme);
        const questionLine = `${prefix}${question.question}`;
        const answerLine = `  ${selected ? this.theme.fg("accent", "↳ ") : "↳ "}${answerText}`;

        renderWrapped(lines, questionLine, width);
        renderWrapped(lines, answerLine, width);
        lines.push("");
        return;
      }

      const label = item.type === "submit" ? "Submit" : "Cancel";
      const styled = selected ? this.theme.fg("accent", label) : label;
      lines.push(truncateToWidth(`${prefix}${styled}`, width));
    });

    lines.push("");
    lines.push(
      truncateToWidth(this.theme.fg("dim", "↑↓ select • Enter confirm • Esc cancel"), width),
    );

    return lines;
  }
}
