(After first edit this file, delete the instruction)
# Architecture Documentation Prompt

Create and maintain a complete architecture document for this project.

## Goals

- Explain the system purpose, major runtime components, and the boundaries between them.
- Describe the request and data flows from clients through handlers, domain logic, persistence, and external services.
- Identify public and private services, shared infrastructure, background workers, and deployment-facing components.
- Document important ownership rules: which package or service owns each responsibility, state transition, database table, event stream, and scheduled job.
- Call out security boundaries, trust assumptions, authentication and authorization points, failure handling, and graceful-shutdown behavior.
- Explain the relationships between the browser, desktop client, APIs, PostgreSQL, proxies, and any asynchronous or live-event mechanisms.

## Requirements

1. Base every statement on the current source code and configuration. Do not invent components, endpoints, dependencies, or guarantees.
2. Include a concise system overview followed by sections for components, runtime flows, data ownership, security boundaries, deployment, and operational concerns.
3. Link to relevant source files, configuration files, migrations, and focused documentation using repository-relative Markdown links.
4. Describe important invariants and compatibility constraints, including legacy behavior that must remain supported.
5. Distinguish current behavior from proposed or future behavior.
6. Keep terminology consistent with the codebase and define project-specific terms on first use.
7. Update the document when architecture changes; do not leave stale diagrams or obsolete package descriptions.

## Output

Return Markdown that is useful to a developer who is new to the repository. Prefer tables and short lists for component inventories, and use Mermaid diagrams when a visual is clearer than prose. Every diagram must have a short explanation and must agree with the surrounding text.