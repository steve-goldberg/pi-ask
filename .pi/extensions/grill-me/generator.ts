import { complete } from "@mariozechner/pi-ai";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import {
  buildGroundedQuestionGenerationPrompt,
  createThinContextQuestionnaireDefinition,
  resolveGroundedQuestionnaireContext,
  type GroundedQuestionnaireContext,
  type ResolveGroundingOptions,
} from "./grounding.js";
import { DEFAULT_GRILL_ME_QUESTIONNAIRE } from "./questions.js";
import type {
  QuestionnaireDefinition,
  QuestionnaireDefinitionSource,
  QuestionnaireProvenance,
  ResolvedQuestionnaireDefinition,
} from "./types.js";
import { validateQuestionnaireDefinition } from "./types.js";

const QUESTION_GENERATOR_SYSTEM_PROMPT = `You generate short, targeted clarification questionnaires for an interactive terminal UI.

Return ONLY a JSON object with this exact shape:
{
  "title": "string",
  "questions": [
    {
      "id": "string",
      "question": "string",
      "multiline": false,
      "recommendation": "optional string"
    }
  ]
}

Rules:
- Generate 3 to 7 questions when possible.
- Use only the grounded context that is explicitly provided in the prompt.
- Do not ask file-specific questions unless the file content is present in the prompt.
- Ask only for information that is still ambiguous from the grounded context.
- Do not ask for information already clearly present in the grounded context.
- Keep each question concrete and answerable in one short line.
- Order questions to minimize context switching.
- multiline must always be false.
- recommendation is optional and should only be included when it genuinely helps the user answer quickly.
- Return JSON only, with no markdown fence and no explanatory text.`;

const MAX_GENERATED_QUESTIONS = 7;
const DEFAULT_TITLE = "Design Clarification";

export interface ResolveQuestionnaireDefinitionOptions extends ResolveGroundingOptions {
  definition?: QuestionnaireDefinition;
  fallbackDefinition?: QuestionnaireDefinition;
}

export async function resolveQuestionnaireDefinition(
  ctx: Pick<ExtensionContext, "cwd" | "model" | "modelRegistry" | "sessionManager" | "signal">,
  options: ResolveQuestionnaireDefinitionOptions = {},
): Promise<ResolvedQuestionnaireDefinition> {
  if (options.definition) {
    validateQuestionnaireDefinition(options.definition);
    return {
      definition: options.definition,
      source: "provided",
      provenance: {
        source: "provided",
        grounding: ["provided definition"],
        artifactsUsed: [],
        contextSufficiency: "not_applicable",
      },
    };
  }

  const groundedContext = resolveGroundedQuestionnaireContext(ctx, {
    rawRequest: options.rawRequest,
    focus: options.focus,
    artifacts: options.artifacts,
  });

  if (groundedContext.contextSufficiency === "thin") {
    const definition = createThinContextQuestionnaireDefinition(groundedContext);
    validateQuestionnaireDefinition(definition);
    return {
      definition,
      source: "generated",
      provenance: createProvenance("generated", groundedContext),
    };
  }

  const generated = await generateQuestionnaireDefinitionFromContext(ctx, groundedContext);
  if (generated) {
    return {
      definition: generated,
      source: "generated",
      provenance: createProvenance("generated", groundedContext),
    };
  }

  const fallbackDefinition = options.fallbackDefinition ?? DEFAULT_GRILL_ME_QUESTIONNAIRE;
  validateQuestionnaireDefinition(fallbackDefinition);
  return {
    definition: fallbackDefinition,
    source: "fallback",
    provenance: createProvenance("fallback", groundedContext),
  };
}

export async function generateQuestionnaireDefinitionFromContext(
  ctx: Pick<ExtensionContext, "model" | "modelRegistry" | "signal">,
  groundedContext: GroundedQuestionnaireContext,
): Promise<QuestionnaireDefinition | undefined> {
  const prompt = buildGroundedQuestionGenerationPrompt(groundedContext);
  if (!prompt || !ctx.model) {
    return undefined;
  }

  const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
  if (!auth.ok) {
    return undefined;
  }

  try {
    const response = await complete(
      ctx.model,
      {
        systemPrompt: QUESTION_GENERATOR_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
            timestamp: Date.now(),
          },
        ],
      },
      {
        apiKey: auth.apiKey,
        headers: auth.headers,
        signal: ctx.signal,
      },
    );

    const text = response.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n")
      .trim();

    return parseGeneratedQuestionnaireDefinition(text);
  } catch {
    return undefined;
  }
}

export function parseGeneratedQuestionnaireDefinition(text: string): QuestionnaireDefinition | undefined {
  if (!text.trim()) {
    return undefined;
  }

  try {
    const json = extractJsonObject(text);
    const parsed = JSON.parse(json) as unknown;
    return normalizeGeneratedQuestionnaireDefinition(parsed);
  } catch {
    return undefined;
  }
}

function extractJsonObject(text: string): string {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not find JSON object in generator output.");
  }

  return text.slice(start, end + 1);
}

function normalizeGeneratedQuestionnaireDefinition(input: unknown): QuestionnaireDefinition | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const raw = input as {
    title?: unknown;
    questions?: unknown;
  };

  if (!Array.isArray(raw.questions)) {
    return undefined;
  }

  const seenIds = new Set<string>();
  const questions = raw.questions
    .slice(0, MAX_GENERATED_QUESTIONS)
    .flatMap((question, index) => normalizeGeneratedQuestion(question, index, seenIds));

  const definition: QuestionnaireDefinition = {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : DEFAULT_TITLE,
    questions,
  };

  try {
    validateQuestionnaireDefinition(definition);
    return definition;
  } catch {
    return undefined;
  }
}

function normalizeGeneratedQuestion(
  input: unknown,
  index: number,
  seenIds: Set<string>,
): QuestionnaireDefinition["questions"] {
  if (!input || typeof input !== "object") {
    return [];
  }

  const raw = input as {
    id?: unknown;
    question?: unknown;
    recommendation?: unknown;
  };

  if (typeof raw.question !== "string" || !raw.question.trim()) {
    return [];
  }

  const id = createQuestionId(raw.id, raw.question, index, seenIds);
  const recommendation = typeof raw.recommendation === "string" && raw.recommendation.trim()
    ? raw.recommendation.trim()
    : undefined;

  return [
    {
      id,
      question: raw.question.trim(),
      multiline: false,
      ...(recommendation ? { recommendation } : {}),
    },
  ];
}

function createQuestionId(
  rawId: unknown,
  question: string,
  index: number,
  seenIds: Set<string>,
): string {
  const base = typeof rawId === "string" && rawId.trim() ? rawId : question;
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || `question_${index + 1}`;

  let candidate = slug;
  let suffix = 2;
  while (seenIds.has(candidate)) {
    candidate = `${slug}_${suffix}`;
    suffix += 1;
  }
  seenIds.add(candidate);
  return candidate;
}

function createProvenance(
  source: QuestionnaireDefinitionSource,
  groundedContext: GroundedQuestionnaireContext,
): QuestionnaireProvenance {
  const grounding = new Set(groundedContext.grounding);
  if (source === "fallback") {
    grounding.add("fallback questionnaire");
  }

  return {
    source,
    grounding: [...grounding],
    artifactsUsed: groundedContext.artifactsUsed.map((artifact) => artifact.path),
    contextSufficiency: groundedContext.contextSufficiency,
  };
}

export function getQuestionnaireSourceLabel(source: QuestionnaireDefinitionSource): string {
  if (source === "provided") return "provided";
  if (source === "generated") return "generated";
  return "fallback";
}
