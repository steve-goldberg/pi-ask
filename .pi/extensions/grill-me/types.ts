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

export type QuestionnaireDefinitionSource = "provided" | "generated" | "fallback";

export type QuestionnaireGroundingKind =
  | "provided definition"
  | "explicit artifacts"
  | "session context"
  | "thin-context generation"
  | "fallback questionnaire";

export type QuestionnaireContextSufficiency = "not_applicable" | "thin" | "sufficient";

export interface QuestionnaireProvenance {
  source: QuestionnaireDefinitionSource;
  grounding: QuestionnaireGroundingKind[];
  artifactsUsed: string[];
  contextSufficiency: QuestionnaireContextSufficiency;
}

export interface ResolvedQuestionnaireDefinition {
  definition: QuestionnaireDefinition;
  source: QuestionnaireDefinitionSource;
  provenance: QuestionnaireProvenance;
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
}

export type QuestionnaireRunResult = QuestionnaireCancelledResult | QuestionnaireSubmittedResult;

export interface GrillMeToolResultDetails {
  status: "cancelled" | "submitted";
  source: QuestionnaireDefinitionSource;
  grounding: QuestionnaireGroundingKind[];
  artifactsUsed: string[];
  contextSufficiency: QuestionnaireContextSufficiency;
  draftPath: string;
  answers: QuestionnaireAnswers;
  payload?: QuestionnaireSubmissionPayload;
}

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

export function formatSubmissionJson(payload: QuestionnaireSubmissionPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function formatSubmissionMessage(payload: QuestionnaireSubmissionPayload): string {
  return `Here are my answers from /grill-me:\n\n${formatSubmissionJson(payload)}`;
}

export function formatQuestionnaireProvenance(provenance: QuestionnaireProvenance): string {
  const grounding = provenance.grounding.join(", ");
  const artifacts = provenance.artifactsUsed.length > 0 ? provenance.artifactsUsed.join(", ") : "none";
  const contextSufficiency = provenance.contextSufficiency === "not_applicable"
    ? "n/a"
    : provenance.contextSufficiency;

  return `Grounding: ${grounding} • Artifacts: ${artifacts} • Context: ${contextSufficiency}`;
}
