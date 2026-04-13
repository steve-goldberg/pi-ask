import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import type {
  QuestionnaireContextSufficiency,
  QuestionnaireDefinition,
  QuestionnaireGroundingKind,
} from "./types.js";

const MAX_CONTEXT_ENTRIES = 14;
const MAX_SESSION_CONTEXT_CHARS = 12_000;
const MIN_STRONG_SESSION_CONTEXT_CHARS = 220;
const MIN_STRONG_SESSION_CONTEXT_MESSAGES = 2;
const MAX_ARTIFACT_PROMPT_CHARS_PER_FILE = 24_000;
const MAX_TOTAL_ARTIFACT_PROMPT_CHARS = 36_000;

export interface ResolveGroundingOptions {
  rawRequest?: string;
  focus?: string;
  artifacts?: string[];
}

export interface GroundedArtifact {
  path: string;
  resolvedPath: string;
  content: string;
}

export interface GroundedQuestionnaireContext {
  rawRequest?: string;
  sessionName?: string;
  sessionExcerpt?: string;
  sessionMessageCount: number;
  requestedArtifacts: string[];
  artifactsUsed: GroundedArtifact[];
  grounding: QuestionnaireGroundingKind[];
  contextSufficiency: Exclude<QuestionnaireContextSufficiency, "not_applicable">;
}

export function extractExplicitArtifactsFromCommandArgs(args: string, cwd: string): string[] {
  const artifacts: string[] = [];
  const seen = new Set<string>();

  const addIfFileExists = (candidate: string) => {
    const cleaned = cleanArtifactCandidate(candidate);
    if (!cleaned || seen.has(cleaned) || !looksLikeArtifactPath(cleaned) || !pathExistsAsFile(cwd, cleaned)) {
      return;
    }

    seen.add(cleaned);
    artifacts.push(cleaned);
  };

  const mentionRegex = /(?:^|\s)@(?:"([^"]+)"|'([^']+)'|([^\s]+))/g;
  for (const match of args.matchAll(mentionRegex)) {
    addIfFileExists(match[1] ?? match[2] ?? match[3] ?? "");
  }

  for (const token of args.split(/\s+/)) {
    const cleaned = cleanArtifactCandidate(token);
    if (!cleaned || cleaned.startsWith("@")) {
      continue;
    }
    addIfFileExists(cleaned);
  }

  return artifacts;
}

export function resolveGroundedQuestionnaireContext(
  ctx: Pick<ExtensionContext, "cwd" | "sessionManager">,
  options: ResolveGroundingOptions = {},
): GroundedQuestionnaireContext {
  const rawRequest = options.rawRequest?.trim() || options.focus?.trim() || undefined;
  const requestedArtifacts = normalizeRequestedArtifacts(options.artifacts ?? []);
  const artifactsUsed = readExplicitArtifacts(ctx.cwd, requestedArtifacts);
  const session = buildSessionContext(ctx.sessionManager.getBranch());

  const sessionContextAvailable = Boolean(session.excerpt);
  const sessionStrongEnough = isSessionContextSufficient(session.excerpt, session.messageCount);
  const contextSufficiency: GroundedQuestionnaireContext["contextSufficiency"] =
    artifactsUsed.length > 0 || sessionStrongEnough ? "sufficient" : "thin";

  const grounding = new Set<QuestionnaireGroundingKind>();
  if (artifactsUsed.length > 0) {
    grounding.add("explicit artifacts");
  }
  if (sessionContextAvailable) {
    grounding.add("session context");
  }
  if (contextSufficiency === "thin") {
    grounding.add("thin-context generation");
  }

  return {
    rawRequest,
    sessionName: ctx.sessionManager.getSessionName(),
    sessionExcerpt: session.excerpt || undefined,
    sessionMessageCount: session.messageCount,
    requestedArtifacts,
    artifactsUsed,
    grounding: [...grounding],
    contextSufficiency,
  };
}

export function buildGroundedQuestionGenerationPrompt(context: GroundedQuestionnaireContext): string | undefined {
  const lines: string[] = [
    "Build a concise clarification questionnaire for the current conversation.",
  ];

  if (context.sessionName) {
    lines.push(`Session name: ${context.sessionName}`);
  }

  if (context.rawRequest) {
    lines.push(`Original request: ${context.rawRequest}`);
  }

  if (context.artifactsUsed.length > 0) {
    lines.push("Explicit artifacts read before question generation:");
    for (const artifact of context.artifactsUsed) {
      lines.push(`Artifact: ${artifact.path}\n${artifact.content}`);
    }
  }

  if (context.sessionExcerpt) {
    lines.push("Recent conversation context:");
    lines.push(context.sessionExcerpt);
  }

  if (lines.length <= 1) {
    return undefined;
  }

  return lines.join("\n\n");
}

export function createThinContextQuestionnaireDefinition(context: GroundedQuestionnaireContext): QuestionnaireDefinition {
  const outcomeQuestion = context.rawRequest
    ? `For “${context.rawRequest}”, what do you want this clarification round to produce?`
    : "What do you want this clarification round to produce?";
  const artifactRecommendation = context.requestedArtifacts.length > 0
    ? `I could not ground on the provided artifact hints yet: ${context.requestedArtifacts.join(", ")}. Give the exact file path that should anchor this round.`
    : "Mention a concrete file path like @progress.json or @PRD.md if an artifact should anchor this round.";

  return {
    title: context.rawRequest ? "Grounded Clarification Kickoff" : "Clarification Kickoff",
    questions: [
      {
        id: "outcome",
        question: outcomeQuestion,
        multiline: false,
      },
      {
        id: "artifact",
        question: "Which artifact or file should I base this on first?",
        multiline: false,
        recommendation: artifactRecommendation,
      },
      {
        id: "ambiguity",
        question: "What decision, ambiguity, or risk matters most right now?",
        multiline: false,
      },
    ],
  };
}

export function isSessionContextSufficient(excerpt: string, messageCount: number): boolean {
  if (!excerpt.trim()) {
    return false;
  }

  return messageCount >= MIN_STRONG_SESSION_CONTEXT_MESSAGES && excerpt.length >= MIN_STRONG_SESSION_CONTEXT_CHARS;
}

function normalizeRequestedArtifacts(artifacts: string[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();

  for (const artifact of artifacts) {
    const cleaned = cleanArtifactCandidate(artifact);
    if (!cleaned || seen.has(cleaned)) {
      continue;
    }

    seen.add(cleaned);
    next.push(cleaned);
  }

  return next;
}

function readExplicitArtifacts(cwd: string, artifacts: string[]): GroundedArtifact[] {
  const next: GroundedArtifact[] = [];
  let remainingBudget = MAX_TOTAL_ARTIFACT_PROMPT_CHARS;

  for (const artifact of artifacts) {
    if (remainingBudget <= 0) {
      break;
    }

    const resolvedPath = resolve(cwd, artifact);
    let fileContents: string;
    try {
      const stats = statSync(resolvedPath);
      if (!stats.isFile()) {
        continue;
      }
      fileContents = readFileSync(resolvedPath, "utf8");
    } catch {
      continue;
    }

    if (!fileContents.trim() || fileContents.includes("\u0000")) {
      continue;
    }

    const clipped = clipArtifactContent(fileContents, Math.min(MAX_ARTIFACT_PROMPT_CHARS_PER_FILE, remainingBudget));
    if (!clipped) {
      continue;
    }

    remainingBudget -= clipped.length;
    next.push({
      path: artifact,
      resolvedPath,
      content: clipped,
    });
  }

  return next;
}

function clipArtifactContent(content: string, limit: number): string {
  if (limit <= 0) {
    return "";
  }

  if (content.length <= limit) {
    return content;
  }

  const suffix = "\n\n[truncated for prompt length]";
  const sliceLength = Math.max(0, limit - suffix.length);
  return `${content.slice(0, sliceLength)}${suffix}`;
}

function looksLikeArtifactPath(candidate: string): boolean {
  return /[./\\]/.test(candidate);
}

function cleanArtifactCandidate(candidate: string): string {
  return candidate
    .trim()
    .replace(/^@/, "")
    .replace(/^["'`([{<]+/, "")
    .replace(/["'`)\]}>.,;:!?]+$/, "");
}

function pathExistsAsFile(cwd: string, candidate: string): boolean {
  try {
    return statSync(resolve(cwd, candidate)).isFile();
  } catch {
    return false;
  }
}

function buildSessionContext(entries: ReturnType<ExtensionContext["sessionManager"]["getBranch"]>): {
  excerpt: string;
  messageCount: number;
} {
  const blocks: string[] = [];
  let messageCount = 0;

  for (const entry of entries.slice(-MAX_CONTEXT_ENTRIES)) {
    if (entry.type !== "message") {
      continue;
    }

    const message = entry.message as {
      role?: string;
      content?: unknown;
      toolName?: string;
    };

    if (message.role === "user") {
      const text = stringifyMessageContent(message.content);
      if (text) {
        blocks.push(`User:\n${text}`);
        messageCount += 1;
      }
      continue;
    }

    if (message.role === "assistant") {
      const text = stringifyAssistantContent(message.content);
      if (text) {
        blocks.push(`Assistant:\n${text}`);
        messageCount += 1;
      }
      continue;
    }

    if (message.role === "custom") {
      const text = stringifyMessageContent(message.content);
      if (text) {
        blocks.push(`Extension context:\n${text}`);
        messageCount += 1;
      }
      continue;
    }

    if (message.role === "toolResult") {
      const text = stringifyMessageContent(message.content);
      if (text) {
        const toolName = message.toolName ?? "tool";
        blocks.push(`Tool result (${toolName}):\n${text}`);
        messageCount += 1;
      }
    }
  }

  const excerpt = blocks.join("\n\n---\n\n");
  if (excerpt.length <= MAX_SESSION_CONTEXT_CHARS) {
    return { excerpt, messageCount };
  }

  return {
    excerpt: excerpt.slice(-MAX_SESSION_CONTEXT_CHARS),
    messageCount,
  };
}

function stringifyMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .flatMap((block) => {
      if (!block || typeof block !== "object") {
        return [];
      }

      const typedBlock = block as { type?: string; text?: string };
      if (typedBlock.type === "text" && typeof typedBlock.text === "string") {
        return [typedBlock.text.trim()];
      }

      return [];
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function stringifyAssistantContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .flatMap((block) => {
      if (!block || typeof block !== "object") {
        return [];
      }

      const typedBlock = block as { type?: string; text?: string; name?: string };
      if (typedBlock.type === "text" && typeof typedBlock.text === "string") {
        return [typedBlock.text.trim()];
      }

      if (typedBlock.type === "toolCall" && typeof typedBlock.name === "string") {
        return [`[tool call: ${typedBlock.name}]`];
      }

      return [];
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}
