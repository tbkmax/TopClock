(After first edit this file, delete the instruction)
# Changelog Documentation Prompt

## Goals

- Explain meaningful changes in language appropriate for the people affected by them.
- Make upgrades, migrations, compatibility changes, fixes, and security-relevant changes easy to find.
- Provide enough context for operators and developers to understand whether an action is required.

## Requirements

1. Follow Keep a Changelog-style organization unless the project already establishes another convention.
2. Group entries under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security` as applicable.
3. Describe the impact and observable behavior, not internal implementation details alone.
4. For breaking changes, database migrations, configuration changes, endpoint changes, client compatibility changes, or operational changes, include upgrade instructions and required user or operator action.
5. Call out security fixes without exposing exploit details, credentials, private data, or unsafe reproduction steps.
6. Link entries to relevant issues, pull requests, source files, migration files, or documentation when those links are available.
7. Do not claim a fix or feature is complete unless it is present in the repository and verified.
8. Keep entries concise, accurate, and free of duplicate wording. Preserve prior release history when adding new entries.
9.  Should have time which is "YYYY-MM-DD"
10. create the doc folder for the dir is also consider as a change

## Output

Return Markdown with a short summary for each section. Include a “Migration and upgrade notes” subsection when a change requires action, and state explicitly when no operator action is required.

---

## Format

### Tag (Added, Changed...)

#### YYYY-MM-DD - Change what
- simply describe it 