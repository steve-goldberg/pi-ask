export interface QuestionnaireQuestion {
  id: string;
  question: string;
  multiline?: boolean;
  recommendation?: string;
}

export interface QuestionnaireDefinition {
  title: string;
  questions: QuestionnaireQuestion[];
}

export type QuestionnaireAnswers = Record<string, string>;

export interface QuestionnaireResponse {
  id: string;
  question: string;
  answer: string;
}

export interface QuestionnaireDraft {
  title: string;
  updatedAt: string;
  responses: QuestionnaireResponse[];
}

export interface QuestionnaireSubmissionPayload {
  title: string;
  responses: QuestionnaireResponse[];
}

export interface QuestionnaireCancelledResult {
  status: "cancelled";
  draftPath: string;
  answers: QuestionnaireAnswers;
}

export interface QuestionnaireSubmittedResult {
  status: "submitted";
  draftPath: string;
  answers: QuestionnaireAnswers;
  payload: QuestionnaireSubmissionPayload;
  message: string;
}

export type QuestionnaireRunResult = QuestionnaireCancelledResult | QuestionnaireSubmittedResult;

export function validateQuestionnaireDefinition(definition: QuestionnaireDefinition): void {
  if (!definition.title.trim()) {
    throw new Error("Questionnaire title must not be empty.");
  }

  if (definition.questions.length === 0) {
    throw new Error("Questionnaire must include at least one question.");
  }

  const seen = new Set<string>();
  for (const question of definition.questions) {
    if (!question.id.trim()) {
      throw new Error("Question ids must not be empty.");
    }

    if (!question.question.trim()) {
      throw new Error(`Question ${question.id} must not be empty.`);
    }

    if (seen.has(question.id)) {
      throw new Error(`Duplicate question id: ${question.id}`);
    }
    seen.add(question.id);
  }
}

export function createSubmissionPayload(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswers,
): QuestionnaireSubmissionPayload {
  return {
    title: definition.title,
    responses: definition.questions.map((question) => ({
      id: question.id,
      question: question.question,
      answer: answers[question.id] ?? "",
    })),
  };
}

export function createDraft(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswers,
  updatedAt = new Date().toISOString(),
): QuestionnaireDraft {
  return {
    updatedAt,
    ...createSubmissionPayload(definition, answers),
  };
}

export function formatSubmissionMessage(payload: QuestionnaireSubmissionPayload): string {
  return `Here are my answers from /grill-me:\n\n${JSON.stringify(payload, null, 2)}`;
}
