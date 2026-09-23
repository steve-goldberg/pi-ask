# Upstream attribution

The questionnaire modules in `extensions/ask/`, their original test cases, and
parts of the interview guidance in `skills/grill/SKILL.md` are derived from
[RMRdeveloper/sideroom-pi](https://github.com/RMRdeveloper/sideroom-pi), version
8.8.0, commit `c246a077394a3955e4b8a4e0f5b024981fa6f2f7`.

The upstream MIT license and copyright notice are retained in `LICENSE`.

Extraction changes: renamed `sideroom_ask` to `ask`, removed required external
skills and unrelated workflow directives, made `grill` self-contained and
conversation-only by default, and adapted/extended tests for this repository.
No other Sideroom extensions or skills are included. Future upstream fixes can
be compared against the recorded commit without merging the entire package.
