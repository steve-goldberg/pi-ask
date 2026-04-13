import type { QuestionnaireDefinition } from "./types.js";

export const DEFAULT_GRILL_ME_QUESTIONNAIRE: QuestionnaireDefinition = {
  title: "Design Clarification",
  questions: [
    {
      id: "problem",
      question: "What are we building, in one concrete sentence?",
      multiline: false,
    },
    {
      id: "user",
      question: "Who is the primary user or operator of this system?",
      multiline: false,
    },
    {
      id: "pain",
      question: "What problem or pain point does this solve for them?",
      multiline: false,
    },
    {
      id: "scope",
      question: "What is definitely in scope for the first version?",
      multiline: false,
    },
    {
      id: "out_of_scope",
      question: "What is explicitly out of scope for now?",
      multiline: false,
    },
    {
      id: "constraints",
      question: "What non-negotiable constraints, rules, or preferences must be respected?",
      multiline: false,
    },
    {
      id: "stack",
      question: "What stack or platform decisions are already fixed?",
      multiline: false,
    },
    {
      id: "risks",
      question: "What are the biggest unknowns or risks right now?",
      multiline: false,
    },
    {
      id: "done",
      question: "What does done look like for this plan?",
      multiline: false,
    },
    {
      id: "first_step",
      question: "What should happen first once implementation begins?",
      multiline: false,
    },
  ],
};
