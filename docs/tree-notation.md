---
title: "Tree Notation"
subtitle: "Box-drawing characters, formats, and naming"
description: "Reference for the characters and text formats used to represent folder structures — what users can paste in and copy out."
section: "Project"
order: 5
---

> Claude: Treat this document as authoritative for parser/serializer work.

This is the reference bank for how folder structures are written as text — the characters, their names, the de facto standard grammar, and the input/output formats the tool supports.

---

## The Characters: Box-Drawing Characters

The glyphs used in tree diagrams are Unicode **box-drawing characters** (block U+2500–U+257F). In tree-drawing tools they're informally called **tree branch characters** or **connectors**.

| Glyph | Unicode | Official Unicode name | Tree role | Project SVG |
|-------|---------|----------------------|-----------|-------------|
| `─` | U+2500 | Box Drawings Light Horizontal | Horizontal arm (always doubled: `──`) | — |
| `│` | U+2502 | Box Drawings Light Vertical | Sibling continuation — a branch passing through | `tree_sibling.svg` |
| `├` | U+251C | Box Drawings Light Vertical and Right | **Non-last child** — entry with siblings below (a "tee") | `tree_non-last-child.svg` |
| `└` | U+2514 | Box Drawings Light Up and Right | **Last child** — final entry in a folder (a "corner" / "elbow") | `tree_last-child.svg` |
| `┐` | U+2510 | Box Drawings Light Down and Left | **First child** — the drop from a parent into its children. Used in our cascading diagram only; standard vertical tree text doesn't need it | `tree_first-child.svg` |

ASCII fallback equivalents (for maximum-compatibility output):

| Unicode | ASCII |
|---------|-------|
| `│` | `\|` |
| `├──` | `\|--` |
| `└──` | `` `-- `` (or `\--`) |

---

## The De Facto Standard: `tree` Output Grammar

There is no formal spec — the universal convention is the output format of the Unix `tree` command:

```text
project/
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
└── docs/
    └── setup.md
```

Grammar rules:

- **Each depth level is one 4-character unit:** `│   ` (an ancestor has more children below) or four spaces (the ancestor was a last child)
- **`├── `** prefixes a non-last child; **`└── `** prefixes the last child
- **Directories end with a trailing `/`** — this is load-bearing: it's how an empty folder is still recognisably a folder
- The **root** sits alone on the first line
- **Spaces, not tabs**
- Folders sort before files (`tree --dirsfirst`) — matches what people expect visually
- Inline comments after `#` are common: `├── theme.css  # brand tokens`
- In markdown, wrap the block in a fenced code block (```` ```text ````)

This format is also the best one to hand to an LLM — models have seen millions of `tree` blocks in training data and parse it natively.

---

## Input Formats (paste-in)

The parser should auto-detect and accept all of these:

1. **Unicode tree** — as above (`├──`, `└──`, `│`)
2. **ASCII tree** — same structure with `|--`, `` `-- ``, `+--`
3. **Plain indentation** — names indented with spaces or tabs, trailing `/` on folders; what people type by hand
4. **Markdown nested list** — `- assets/` with indented sub-items; common in docs and Notion
5. **Path list** — one path per line (`assets/css/style.css`), i.e. `find` / `git ls-files` output

Detection heuristics: box-drawing chars → tree; `|--`/`` `-- `` → ASCII tree; leading `-`/`*` → markdown list; `/` mid-line without indentation → path list; otherwise → indentation.

---

## Output Formats (copy-out)

All serializers are pure functions of the same node tree, so paste → edit → copy round-trips losslessly.

**1. Unicode tree** (default, AI-ready):

```text
root/
├── folder-a/
│   └── file.txt
└── folder-b/
```

**2. ASCII tree** (older tooling, plain-ASCII environments):

```text
root/
|-- folder-a/
|   `-- file.txt
`-- folder-b/
```

**3. Markdown nested list:**

```text
- root/
  - folder-a/
    - file.txt
  - folder-b/
```

**4. Path list:**

```text
root/folder-a/file.txt
root/folder-b/
```

**5. Shell commands** (creates the structure for real):

```text
mkdir -p root/folder-a root/folder-b
touch root/folder-a/file.txt
```

**6. JSON** (`{name, type, children}`) — for tool interchange.

---

## Diagram ↔ Notation Mapping

The visual diagram (per the Figma design) is a **cascading column layout**: each open folder spawns a child column to its right. The connectors map to the notation roles like this:

- Open folder label → arm out and down (`┐` / `tree_first-child.svg`) into the top of its child column
- Child with siblings below → `├` (`tree_non-last-child.svg`)
- Final child → `└` (`tree_last-child.svg`)
- Rows passing a continuing branch → `│` (`tree_sibling.svg`)

The copy-out text is always the standard **vertical** tree grammar above, regardless of the cascading visual layout — the diagram is a view, the notation is the interchange format.

---

## Sources & Further Reading

- [How to Represent Folder Trees in Docs and Code — Jack Bishop](https://www.jackbishop.co/posts/representing-folder-trees-docs-code)
- [Represent a directory tree structure in markdown (gist)](https://gist.github.com/genadyp/ffc112df6c8b368127e3cbb37465d452)
- [Generate markdown-friendly directory trees (gist)](https://gist.github.com/whoisryosuke/813186b07e6c9e4d23593041827a6530)
- [The `tree` → LLM trick](https://blog.willsmidlein.com/posts/2025/feb/10/tree-llm-trick/)
- [gptree — CLI that combines a file tree with file contents for LLM context](https://github.com/travisvn/gptree)
- [kit — LLM context best practices](https://kit.cased.com/core-concepts/llm-context-best-practices/)
- [Unicode box-drawing block (U+2500–U+257F)](https://en.wikipedia.org/wiki/Box-drawing_characters)
- [WAI-ARIA tree view pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) — accessibility model for the interactive diagram
