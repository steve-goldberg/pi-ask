# pi-ralph.md

## Pi-Native Ralph Loop for Reliable Feature-by-Feature Delivery

This document preserves the **Ralph execution-loop** portion of the product direction for this repository.

- `pi-ralph.md` defines the Ralph loop vision, non-negotiables, and execution model.
- `grill-me-plan.md` defines the grounded clarification/context collection product.
- `progress.json` defines the implementation roadmap and work breakdown for building the repository.

---

## 1. Product vision

Build a **pi-native long-running coding harness** inspired by Ralph loop and related harness learnings, with the following core behavior:

- work through a structured feature list
- complete **one feature at a time**
- keep **fresh context per attempt**
- separate **coding** from **testing**
- only mark a feature complete when required gates pass
- show simple live progress and loop state inside pi

The system should feel minimal, practical, and reliable rather than flashy.

---

## 2. Primary goal

Create a project-local pi extension system that can:

1. read a structured feature manifest
2. pick the next ready feature based on dependencies
3. launch a fresh **coder** attempt for that feature
4. launch required **tester** runs based on manifest-defined test types
5. retry failed attempts up to configured limits
6. commit exactly once when a feature passes all required gates
7. move to the next feature automatically or under operator control
8. expose current progress/state through lightweight pi UI

---

## 3. Non-negotiables

### 3.1 One feature at a time
The system must enforce serial execution.

- no batching multiple features in one coding attempt
- no parallel feature implementation in v1
- one feature is the unit of progress

### 3.2 Fresh context per attempt
The coder and testers must run in fresh pi invocations/sessions.

- no long-lived coding context across many features
- retries must also start fresh
- the controller may be long-lived, but workers should not be

### 3.3 Clean role separation
The system must enforce a strict separation of responsibilities.

- **coder**: may edit code, may not own pass/fail
- **tester**: may test/read/evaluate, may not edit code
- **controller**: owns orchestration, retries, status transitions, and commit-on-pass

### 3.4 Structured source of truth
The actual runtime harness should rely on machine-readable manifest data.

- feature routing and test selection must not depend on parsing prose
- required test types must be explicit and deterministic
- feature metadata and dependencies belong in `features.json`

### 3.5 Acceptance is programmatic
A feature is complete only when the controller confirms all required gates have passed.

- the coder does not self-certify completion
- tester roles do not edit state directly
- the controller owns pass/fail transitions

### 3.6 Minimal UI
UI should be useful but simple.

- footer status
- widgets and/or toggleable side panel
- no fancy dashboard dependency for v1

---

## 4. Product scope

## 4.1 In scope

### Core loop
- feature selection from manifest
- dependency-aware readiness
- fresh coder attempts
- manifest-driven tester dispatch
- retry handling
- blocked/failed states
- pass/fail state transitions
- single commit per passed feature

### Roles
- coder role
- backend tester role
- Playwright/browser tester role

### Manifest-driven testing
Each feature declares its required tests in structured form.

Examples:
- lint
- typecheck
- unit
- backend
- playwright

Each test type maps deterministically to either:
- a direct command runner, or
- a specific tester role/profile

### Lightweight operator controls
- status
- next/start/stop
- settings
- panel toggle

## 4.2 Out of scope for v1
- parallel feature execution
- complex multi-agent reviewer swarms
- persistent long-term agent memory
- elaborate web dashboards
- native pie-chart-heavy analytics UI
- automatic PRD generation from scratch without human steering

---

## 5. Architecture overview

## 5.1 Control plane
A pi extension acts as the long-running controller.

Responsibilities:
- read config and manifest
- choose next feature
- launch workers/testers
- track attempts and outcomes
- update progress UI
- commit on pass

## 5.2 Execution plane
Fresh pi coding runs implement one feature attempt at a time.

Responsibilities:
- read the feature spec and relevant docs
- make code changes
- stop after that attempt

Constraints:
- does not certify pass/fail
- does not own verification state
- should not own final commit logic

## 5.3 Verification plane
Required tests run after coding through deterministic commands and/or read-only tester roles.

Responsibilities:
- validate feature behavior
- report pass/fail
- never edit code

---

## 6. Runtime files and responsibilities

## 6.1 `pi-ralph.md`
The Ralph loop product vision for this repository.

## 6.2 `grill-me-plan.md`
The grounded clarification/context collection product direction for this repository.

## 6.3 `progress.json`
The implementation roadmap for building this repository.

Use it for:
- feature/work breakdown
- sequencing
- planned files
- implementation progress

## 6.4 `.pi/ralph/features.json`
The **runtime manifest template/target** for the actual Ralph system.

Use it for:
- roles
- test type mappings
- feature graph
- spec references
- test references
- runtime source of truth for an actual project using the harness

---

## 7. Manifest design principles

The runtime `features.json` should be the structured source of truth for feature execution.

It should define:
- feature id
- title
- dependencies
- status
- feature spec path
- required tests
- test type per test entry
- optional test spec path

Markdown files should hold human-readable guidance, not routing logic.

- feature `spec.md` explains what to build
- `test-*.md` explains what done looks like for a tester
- `features.json` decides which tests must run

This preserves both:
- deterministic orchestration
- rich human-readable instructions

---

## 8. Coding vs testing model

### Coder
- reads feature spec
- edits code
- works on one feature attempt only

### Tester
- reads test spec
- executes read-only checks and/or browser verification
- may use role-specific tools like Playwright/browser skills
- cannot edit code

### Controller
- owns the loop
- decides next action
- retries on failure
- resets to base SHA when appropriate
- creates exactly one commit when the full feature passes

---

## 9. Commit and retry philosophy

The desired behavior is:

- record a clean base SHA before an attempt
- let the coder modify the working tree
- run required tests
- on failure: reset to base SHA and retry if allowed
- on success: commit once

This is intentionally cleaner than letting the coder create provisional commits and then rolling them back.

---

## 10. UI philosophy

The UI should be informative, lightweight, and always secondary to correctness.

Desired v1 display elements:
- current feature id/title
- loop state (idle, coding, testing, passed, failed, blocked)
- counts by status
- attempt count
- token/cost summaries when available
- simple reviewable progress indicators

Preferred placements:
- footer
- widget area
- toggleable right-side overlay panel

---

## 11. Intended operator experience

The operator should be able to:

1. define a product direction and feature plan
2. let the controller work through features one at a time
3. inspect lightweight status in pi
4. adjust settings and steering as needed
5. trust that failed attempts do not silently advance the graph
6. trust that frontend/full-stack work cannot pass without the required declared tests

---

## 12. Success criteria

This project succeeds when:

- the loop can execute over a real feature list
- each feature attempt is isolated
- test routing is deterministic from manifest data
- coders never act as testers
- testers never edit code
- passing a feature creates one clean commit
- failure causes retry or stop, not silent advancement
- the UI is simple but sufficient for operator confidence

---

## 13. Summary

This repository is building a **pi-native, disciplined, feature-by-feature coding harness**.

Core identity:
- structured manifest-driven orchestration
- fresh context per attempt
- strict coder/tester separation
- deterministic gates
- minimal but useful pi UI

For the actual build sequence and implementation details, see:

- `progress.json`
