(After first edit this file, delete the instruction)
# Backlog Documentation Prompt

Create and maintain a practical, implementation-ready backlog for this project.

## Goals

- Capture unfinished work, known defects, technical debt, documentation gaps, and operational improvements.
- Make each item specific enough that a developer can understand the desired outcome without reconstructing the request from scattered notes.
- Preserve the project's architecture, security model, compatibility requirements, and user-facing behavior.

## Requirements

For every backlog item, include:

- **Title:** a short, action-oriented summary.
- **Problem or opportunity:** what is missing, broken, risky, or worth improving.
- **Desired outcome:** the observable result that defines completion.
- **Scope:** the affected services, packages, pages, clients, migrations, configuration, or documentation.
- **Acceptance criteria:** testable success conditions, including validation, authorization, error handling, and compatibility cases where relevant.
- **Dependencies and risks:** prerequisites, migration concerns, rollout risks, and any behavior that must not regress.
- **Verification:** the focused tests, checks, or manual flows that should be run.
- **Priority:** explain the urgency using impact, user value, security, reliability, and effort rather than an unexplained label.

## Writing rules

1. Base items on the current repository and its authoritative documentation.
2. Do not duplicate completed work or describe speculative implementation details as facts.
3. Separate independent tasks and identify dependencies explicitly.
4. Prefer small deliverables that can be reviewed and verified independently.
5. For security, data-loss, account-lifecycle, or schema work, state the required safeguards and rollback or recovery considerations.
6. Mark questions and decisions that require product or operator input instead of silently choosing a behavior.
7. Keep completed items out of the active backlog, or clearly label them in a history section.
8. If there is no any backlog to write just don't leave it blank is fine

## Output

Return Markdown organized by priority or workstream. Use checkboxes for actionable items and keep each item self-contained. Include a short “How to use this backlog” section if the document will be used by multiple contributors.