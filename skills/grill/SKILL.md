---
name: grill
description: Interview the user in focused ask-tool rounds to clarify a fuzzy plan, feature, or decision. Use when the user asks to be grilled, interviewed, or helped to settle requirements. Do not use for a closed spec, a simple question, or automatically before every implementation.
license: MIT
---

<objective>
Reach a shared understanding through a conversation. This skill uses only the
`ask` tool and the agent's normal context-reading tools; no other skill is required.
</objective>

<quick_start>
For a request such as "grill me about the rollout plan", read the relevant
context, ask only unresolved questions through `ask`, then summarize agreement.
</quick_start>

<workflow>

1. Read the relevant conversation, explicitly mentioned artifacts, and the minimum
   code needed to understand the request. Never ask what the available context
   already answers, or claim grounding in files you have not read.
2. Identify the unresolved goal, constraints, terms, and consequential decisions.
   Focus on what materially affects the outcome; do not interview about every
   minor implementation choice. If context is thin, clarify the goal first.
3. Call `ask` with one to four focused questions. One call is one round. Wait for
   the returned answers before choosing any follow-up questions.
4. Incorporate the answers. An Out of scope answer closes that thread; do not
   re-ask it. If the batch is cancelled, stop the interview and do not treat
   partial answers as final decisions.
5. Repeat only while a meaningful ambiguity remains and the user wants to
   continue. Do not repeat settled questions. Keep the interview within the
   current conversation; there is no durable interview state or resume command.
6. Close with a concise summary of agreed decisions, remaining uncertainties,
   and a suggested next step. Do not start implementation without user direction.

</workflow>

<question_quality>

- Follow the registered `ask` schema rather than inventing a second contract.
- Each question has two to four caller-provided options. Single-selection
  questions require `recommendationIndex`; multiple-selection questions require
  `selectionMode: "multiple"` and nonempty `recommendedIndices` instead.
- Explain the practical consequences of consequential choices and give a brief
  reason for the recommendation. Avoid technology names without tradeoffs.
- Write prompts, tab labels, and option copy in the user's language. Keep ids
  and option values in English. Labels must fit the tool's limits.
- Do not add Out of scope or custom-answer options; the tool supplies them.
- Recommendations are advice, not accepted decisions. Wait for user submission.
- The tool needs Pi's interactive TUI. If it is unavailable, explain that limit
  and ask in ordinary conversation instead; never fabricate questionnaire answers.

</question_quality>

<output_boundary>
Summarize the interview in the conversation. Create or update files only
when the user requests it.
</output_boundary>

<success_criteria>
The user has answered or explicitly set aside the meaningful ambiguities,
or stopped the interview. The summary distinguishes agreement from uncertainty;
no artifact or implementation was produced without a request.
</success_criteria>
