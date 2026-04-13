# ask plan

## Extracted product requirements from `PRD.md`

The following sections preserve the original `ask`-specific product wording extracted from `PRD.md`.

### From product vision

- actively close ambiguity by asking the **right grounded clarification questions at the right time**

A key product goal is not just execution, but **shared understanding**: the tool should help the human and the agent converge on the same understanding of the codebase, the task, and the intended outcome before unnecessary implementation drift happens.

### From product scope / planning support

A separate but related grounded clarification system (`/ask` command and `ask` tool) will help refine plans, specs, and feature intent through structured Q/A.

Its purpose is to:
- ask targeted clarification questions one at a time
- ground those questions in explicit artifacts and available session context when possible
- avoid pretending to know unseen context when grounding is thin
- return structured answers that can be reused for planning, spec refinement, and later feature implementation

### From `/ask` grounded clarification companion

This repository also includes a related planning goal:

Build a reusable pi-native grounded clarification system exposed both as:
- `/ask` for human-invoked interactive clarification
- `ask` for agent-invoked clarification inside a workflow

#### Core purpose
The end goal is a tool that knows the **right questions to ask at the right time** to gather the **right context**, so the human and the agent can reach a **shared understanding** of:
- the codebase
- the task
- the intended outcome
- the open ambiguities that still need resolution

#### Product behavior
`/ask` should not just be a static questionnaire.

It should:
- ask one question at a time in a compact native-feeling pi UI
- support quick review/edit/submit before handoff
- use structured Q/A so answers are reusable by later planning and implementation workflows
- prefer explicit grounding from mentioned artifacts plus available session context
- honestly detect thin context and ask exploratory or outcome-first questions rather than pretending it has grounding it does not have
- use a bundled fallback questionnaire only as a last resort
- surface provenance so the operator can understand what the clarification round was based on

#### Workflow role
`/ask` is a supporting planning primitive, not the same thing as the Ralph execution loop.

Its job is to improve planning quality and reduce drift before or during execution by making clarification intentional, structured, and grounded.

#### Design boundaries
For v1 and near-term planning:
- one clarification round should be explicit and bounded
- follow-up rounds should be controlled by the surrounding workflow, not hidden inside the extension
- structured answers should be suitable for updating `PRD.md`, per-feature markdown, and future planning artifacts

### From intended operator experience

- be asked for clarification only when it is useful and grounding-appropriate
- trust that the system is helping the human and agent stay aligned instead of drifting into mismatched assumptions

### From success criteria

- the clarification system asks useful, grounded questions instead of generic ones
- the human and the agent can reliably reach shared understanding before implementation drift sets in

### From summary

- grounded clarification that improves shared understanding between the human and the agent

---

## Core idea

`ask` should evolve into a **general-purpose context collection system** for agentic work.

Its job is not just to ask ad hoc clarification questions. Its job is to **collect the right context in a structured way** so the human and the agent can reach shared understanding before planning, spec writing, or implementation begins.

A core problem this solves:

- what I think I want is often incomplete
- what I actually want is often discovered through questioning
- sometimes I do not yet know what I want
- agentic coding quality depends heavily on having clear specs, constraints, and decisions up front

So the purpose of `ask` is to **close context gaps early and intentionally**.

---

## Product direction

`ask` should become a **template-driven interview engine**.

Instead of only generating questions dynamically, it should also support **prepared recipes of questions** for common workflows.

Examples:

- new project setup
- frontend app planning
- backend API planning
- full-stack app planning
- AI agent workflow planning
- Python workflow design
- FastAPI service setup
- TypeScript API setup
- feature planning for a `features.json` manifest
- page/layout/component planning
- database and schema planning
- design system / component library selection

These templates would make the questioning process:

- faster
- more consistent
- more grounded
- easier to repeat across projects
- easier to turn into reliable outputs

---

## Positioning

`ask` should be treated as an independent extension/product.

It is **not the same thing as Ralph**.

- `ask` = collects context
- planner/spec workflows = transform context into docs/manifests
- `ralph` = consumes structured planning artifacts and executes a feature loop

`ralph` is only **one consumer** of `ask`.

A `features.json` planning template is just one example template that `ask` could walk the user through.

That means:

- I may want `ask` without `ralph`
- I may want `ask` for planning docs, prompts, or workflows unrelated to `ralph`
- the shared contract between them can simply be the `features.json` format

---

## End goal

The end goal is a tool that knows the **right questions to ask at the right time** to gather the **right context**, so the human and the agent stay aligned in their shared understanding of:

- the codebase
- the desired outcome
- the constraints
- the stack
- the tradeoffs
- the unresolved ambiguities

`ask` should help transform vague intent into structured, actionable input.

---

## Template-driven model

`ask` should support **question templates**, likely in **YAML**.

Why YAML:

- easy for humans to read and edit
- expressive enough for structured definitions
- LLM-friendly
- easy to version in git
- easier to annotate with instructions than plain JSON

A template should define:

- metadata
- purpose
- question flow
- answer types
- optional recommendations/help text
- placeholders/variables populated from answers
- post-submit instructions for what to do with the answers

---

## Template capabilities

A template should be able to express things like:

### 1. Question recipes

Questions may be:

- open-ended
- short text
- paragraph text
- single-select / multiple choice
- multi-select
- yes/no
- conditional follow-up questions
- stack-specific branches

Example areas:

- frontend / backend / full-stack
- React / Next.js / FastAPI / Python workflow / agent system
- database choice
- ORM choice
- component library choice
- page list
- layout decisions
- style direction
- auth strategy
- deployment target
- testing approach

### 2. Conditional branching

Templates should be able to branch based on earlier answers.

Example:

- if project type = frontend, ask pages/layout/components/design questions
- if project type = backend, ask API/database/auth/testing questions
- if project type = AI agent, ask loop/orchestration/tools/evals/questions

### 3. Structured outputs

Templates should produce structured outputs that can be reused.

Examples:

- populated YAML
- normalized JSON
- markdown summary
- feature manifest draft
- spec draft
- implementation brief

### 4. Post-submit instructions

Templates should be able to define what happens next.

For example:

- write a spec file
- generate a `features.json`
- update `PRD.md`
- create a feature markdown file
- produce a prompt for another workflow
- trigger a skill / workflow / planner step

This is where template placeholders become powerful.

---

## Suggested template shape

A template should probably include sections like:

- `id`
- `title`
- `description`
- `purpose`
- `questions`
- `branches`
- `output`
- `instructions`
- `consumers`

And questions should support fields like:

- `id`
- `label`
- `type`
- `required`
- `options`
- `recommendation`
- `when`
- `placeholder`
- `default`

This does not need to be finalized yet, but that is the direction.

---

## Example: Ralph consumer template

One template type could be:

- `features-json-planner`

It would ask questions like:

- what kind of product is this?
- what stack is fixed?
- what database do you want?
- what UI/component library do you want?
- what major features should exist?
- what is the order/dependency of those features?
- what test types should each feature require?

Then it could output:

- a drafted `features.json`
- per-feature markdown files
- a PRD/spec summary

That output could then be handed to `ralph`.

---

## Why this matters

All agentic coding quality depends on good instructions and good context.

The more consistently `ask` can collect:

- goals
- constraints
- preferences
- architecture decisions
- scope boundaries
- acceptance expectations

…the better every downstream workflow becomes.

That includes:

- planning
- spec writing
- implementation
- testing
- orchestration

So `ask` should be viewed as a **context acquisition layer** for agentic systems.

---

## Relationship to dynamic grounding

The current grounded question generation work still matters.

Template-based questioning should not replace grounding. Instead, `ask` should eventually support both:

1. **grounded dynamic questioning** when context exists and the agent needs targeted clarification
2. **template-driven questioning** when the user wants a structured planning workflow

That means the long-term product likely has two complementary modes:

- **dynamic mode**: ask grounded questions from current context/artifacts
- **template mode**: run a prepared question recipe for a known workflow

Both modes serve the same higher-level goal: **collect context intentionally and reuse it downstream**.

---

## Near-term design principle

Do not over-couple `ask` to a single workflow.

Instead:

- keep it generic
- let templates define domain-specific flows
- let downstream consumers decide what to do with the answers

This keeps `ask` reusable across many planning and execution systems.

---

## Summary

`ask` is evolving from a clarification command into a **template-capable context collection engine**.

Its purpose is to:

- ask the right questions
- reduce ambiguity
- reveal hidden preferences and gaps
- create shared understanding between the human and the agent
- produce structured outputs usable by other workflows

`ralph` is one consumer of this system, not its definition.

The long-term direction is:

- grounded dynamic clarification
- template-driven interview recipes
- structured outputs
- workflow-specific handoff instructions
- reusable context collection for agentic software development
