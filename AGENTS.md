# Repository guidance for agents

This is a Windows desktop clock. Vite builds two Alpine.js pages; Tauri 2 and Rust own the native windows, tray, settings persistence, and Windows input behavior. Read [README.md](README.md), then the nearest `doc/` directory before changing code. Source and configuration are authoritative if a document is stale.

## Find the right code

| Area | Responsibility |
| --- | --- |
| `index.html`, `settings.html`, `vite.config.js` | Page entry points and Vite build |
| `src/` | Clock and settings UI, styling, Tauri calls and events |
| `src-tauri/` | Tauri package, window configuration, capabilities and build setup |
| `src-tauri/src/` | Rust commands, persistent configuration, tray, click-through and pointer monitor |
| `scripts/` | Windows toolchain and Tauri command wrapper |

The clock's settings file lives in Tauri's app config directory. The sign-in launch setting uses the current user's Windows Run registry key. Keep the frontend command names, event names, serialized settings fields, and Tauri capabilities aligned when changing either side of a boundary. Preserve click-through behavior unless the user requests a change.

## Documentation in every code folder

Every maintained folder under `src/`, `src-tauri/`, or `scripts/` must have its **own** `doc/` folder containing `architecture.md`, `workflow_diagram.md`, `changelog.md`, and `backlog.md`. Apply this recursively: if `src/a/` or `src/a/b/` is added, each gets its own `doc/` folder, including asset and configuration subfolders. The repository root is exempt; its existing `doc/` folder is separate. Do not recurse into a `doc/` folder, dependencies, or generated output (`dist/`, `node_modules/`, `.tools/`, `src-tauri/target/`, and `src-tauri/gen/` are examples).

Use the four prompts in [`templates/doc/`](templates/doc/) when creating or maintaining those files. Fill them with facts about that folder's actual code and links to the relevant files; do not merely copy the prompts or keep their first-edit instruction. Keep each document scoped to its folder and link to a parent document for wider context. If a template asks for a diagram or section that would misrepresent the code, briefly explain why it does not apply.

Before editing a code folder, read its `doc/` files and the parent code folder's `doc/` files. After a meaningful change, update the affected folders' architecture and workflow descriptions, add a dated changelog entry in `YYYY-MM-DD` form, and update the backlog if work remains or an item was completed. Creating a `doc/` folder is itself a changelog entry. Keep entries about observable behavior and preserve existing history. Never treat backlog proposals as implemented behavior.

## Work and verification

- Preserve unrelated local edits. Check `git status --short` before modifying files.
- Use `npm run build` for frontend changes and `cargo test --manifest-path src-tauri/Cargo.toml` for Rust changes. Use `npm run tauri:dev` for interactive Windows behavior when needed.
- Check the clock, settings window, tray actions, Ctrl interactions, settings persistence, and position restore when changing their shared behavior.
- Keep documentation accurate to the current implementation; note any check that could not be run.
