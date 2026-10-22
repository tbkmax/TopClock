 (After first edit this file, delete the instruction)
 # Workflow Diagram Documentation Prompt

 Use Mermaid to draw and explain the workflows and relationships that are important to understanding this project.

 ## Required diagram form

 The documentation may use the following Mermaid diagram forms:

 - Class diagrams
 - Sequence diagrams
 - State diagrams
 - Entity-relationship diagrams
 - State-machine charts

 Class diagrams are required. The other diagram types are conditional: do not draw a diagram that does not clarify the behavior or structure being documented.

 ## Requirements

 1. Base every diagram on the current source code, database schema, configuration, and documented contracts. Do not invent classes, fields, states, actors, tables, or transitions.
 2. For every diagram, include a short heading, a Mermaid code block, and a plain-language explanation of what the reader should learn from it.
 3. Use the Mermaid syntax that best represents the subject:
    - Use `classDiagram` for important types, interfaces, ownership, and relationships.
    - Use `sequenceDiagram` for request, event, authentication, transaction, or shutdown flows.
    - Use `stateDiagram-v2` for lifecycle states and valid transitions.
    - Use `erDiagram` for persisted entities, keys, and relevant cardinalities.
    - Use a state-machine chart when event-driven behavior has explicit guards, actions, or transition rules that need more detail than prose.
 4. Keep diagrams readable: show only meaningful fields, methods, actors, tables, and transitions; split an overcrowded diagram into focused diagrams.
 5. Label important arrows, guards, conditions, ownership relationships, and failure paths. Include authorization, persistence, retries, and error responses where they affect the workflow.
 6. Make names match the repository exactly enough that a developer can locate the corresponding code. Link the diagram explanation to relevant source files and documentation.
 7. Include normal, validation, authorization, failure, cancellation, and shutdown paths when they are part of the behavior.
 8. State assumptions, omitted details, and boundaries below each diagram. Distinguish durable state from in-memory or client-local state.
 9. Keep every diagram synchronized with the implementation and update or remove stale diagrams when the workflow changes.

 ## Output

 Return Markdown. Start with a brief overview of the workflow, then include the required class diagram and only the additional Mermaid diagrams that materially improve understanding. Explain how the diagrams relate to one another and identify the source of truth for each relationship or transition.