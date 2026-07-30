# Roadmap

A bank of feature ideas for the folder-structure tool. Ideas start here as rough notes — no commitment implied. When one gets picked up, move it to **In Progress** and log the work in `PROJECT_PROGRESS.md`.

## Ideas

_Nothing yet._

## In Progress

### File details / annotations

**Added:** 2026-07-30 · **Status:** Implemented 2026-07-30, pending browser QA

Add a short comment/description to any file or folder (what it's for, conventions, gotchas). Comments use the `# comment` suffix notation the parser already tolerates (tree-parsers.js strips them today).

**UI (revised 2026-07-30 after first build)** — floating pill, not inline text:

- The comment renders in a floating pill to the right of its row, visible only while the row is selected; as an overlay it never affects tree geometry or overlaps child rows (every row owns its horizontal line)
- The pill carries its own toolbar and is the single comment control (revised again same day: the chip's chat button was redundant and removed). In edit mode the pill shows on every selected row, collapsed to just its chat button until a comment exists; the button toggles chat ↔ check while editing
- Inline input inside the pill; Enter saves, Esc cancels; `maxlength` 80, single line
- Open folders: pill floats past the connector arm so the elbow stays visible
- Rows with a comment show the full pill (text + toolbar) whenever selected

**Toggles:**

- Paste/import: "Strip comments" toggle, default **on** (today's behavior); off = captured as annotations
- Export: "Include comments" toggle, default **off**; only relevant when the diagram has comments
- Nicety: when pasted text contains comments, prompt "Comments detected — keep them?" so they aren't lost silently

**Export formats:**

- All four formats use the `  # comment` suffix (markdown too — the em-dash variant couldn't round-trip through the parser, so it was dropped during implementation)
- No column alignment (keeps the grammar simple)
- Round-trip property preserved: parser captures exactly what the serializer emits; share/embed links always carry comments

## Done

_Nothing yet._
