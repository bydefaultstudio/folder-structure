---
title: "AI Prompt"
subtitle: "Asking an AI for a paste-ready tree"
description: "A copy-paste prompt that makes any AI output a folder structure this tool imports cleanly, plus the parser behaviour behind each rule."
section: "Project"
order: 6
---

> Claude: The rules here must match `assets/js/tree-parsers.js`. If the parser changes, change this page, `docs/tree-notation.md` and the copy in `assets/js/tree-prompt.js` together — the app ships no markdown, so that module holds a duplicate of the prompt block below and a smoke test asserts the two are byte-identical.

Models produce folder trees readily, but they improvise: two-space indents, bare `README`, a stray comment line, a summary paragraph underneath. Each of those changes what the parser builds. This page is the prompt that removes the guesswork — hand it to any model alongside your actual request, and the output pastes into the tool without cleanup.

`docs/tree-notation.md` documents every format the parser accepts. This page picks **one** of them — the Unicode tree — and states it as a contract, because a prompt that offers choices gets inconsistent output.

---

## The Prompt

````text
Output a folder structure as text, following this contract exactly.

Output nothing but the tree — no preamble, no explanation, no summary
afterwards. Wrap it in a ```text code fence.

Format (Unix `tree` grammar, Unicode box-drawing characters):

```text
project/
├── assets/
│   ├── css/
│   │   └── style.css  # brand tokens
│   └── js/
├── docs/
│   └── setup.md
└── index.html
```

Rules:

1.  One item per line. Never two items on one line.
2.  A single root on the first line, at column 0, with no connector.
3.  Folders always end with `/`, including empty ones. The trailing
    slash is the only reliable folder marker.
4.  Files must carry an extension. A name with no `/` and no `.` is
    read as a folder — `README`, `LICENSE`, `Makefile` and `.gitignore`
    all import as folders. Write `README.md`, `LICENSE.txt` and so on
    wherever the distinction matters.
5.  Use `├── ` for every child except the last one in its folder, and
    `└── ` for the last one. One space after the dashes.
6.  Indent in units of exactly 4 characters, one unit per level:
    `│   ` (vertical bar plus three spaces) where an ancestor still has
    items below it, or four spaces where it does not. Spaces only,
    never tabs. Any other width silently collapses levels together.
7.  List folders before files, alphabetically within each group. Order
    is preserved exactly as written.
8.  Comments are optional and belong on the same line as their item,
    after two spaces and a `#`:  `style.css  # brand tokens`
    One per line, running to the end of the line.
9.  Never put a comment on its own line, and never start a name with
    `#`. Both corrupt the structure.
10. Never use `/` inside a name, and never write a space followed by
    `#` or `←` inside a name.
11. Use only these glyphs: `├── `, `└── `, `│   `. No other
    box-drawing variants, no emoji, no icons, no trailing whitespace.
````

Paste it, then add your request underneath — *"Structure for a small marketing site"*, *"map this repo"*, *"a photography client's delivery folders"*.

You do not have to copy it from this page. The import dialog carries a **Copy Prompt** button beside *Import*, which puts the same text on the clipboard — so the round trip is: open Import → Copy Prompt → paste into a chat with your request → paste the reply back into the same dialog.

---

## Why Each Rule Exists

Every rule below traces to real parser behaviour in `assets/js/tree-parsers.js`, verified against the parser rather than inferred from it.

### Extensions decide file vs folder (rule 4)

`makeNode` classifies a name in two steps: a trailing `/` means folder; failing that, a dot with characters either side means file; **anything else is a folder**. So this input:

```text
project/
├── README
├── LICENSE
├── .gitignore
└── index.html
```

imports as three *folders* and one file. `.gitignore` catches people out — its only dot is at position 0, with nothing before it, so it fails the extension test. There is no notation that forces a file type onto an extensionless name; either give it an extension in the prompt, or switch the type in the app after import.

### Indent width is load-bearing (rule 6)

Depth is computed as `Math.round(indexOfConnector / 4) + 1`. At four characters per level the arithmetic is exact. At two, levels start colliding from the third one down — a grandchild lands as a sibling of its own parent:

```text
project/          →   project/
├── a/                  a/
  ├── b/                  b/
    └── c.txt             c.txt   ← flattened, not inside b/
```

### Comments need whitespace before the marker (rules 8–10)

A comment starts at the **first marker preceded by whitespace** and runs to end of line. The markers are `#`, `←`, `⟵` and `<-`; the prompt asks for `#` because it is the one the tool emits, so a `#` tree round-trips unchanged. The arrows are there for trees you did not commission — models annotate unprompted, and a padded `← note` column is the shape they reach for:

```text
WEBSITE                    ← was Design System
└── Layout                 ← two pages merged
```

That imports as `WEBSITE` and `Layout` carrying annotations, and exports as `#` comments. You do not need to ask for it; you only need to know that a name may not contain a space followed by an arrow.

Two consequences worth naming:

- A line that is *only* a comment, indented, is captured then discarded — the line becomes empty and is dropped. A comment line at column 0 has no whitespace before its `#`, so it is not a comment at all: `# Notes for later` imports as a folder named `# Notes for later`.
- A name starting with `#` is unsafe in tree notation specifically, because the `├── ` connector always puts a space in front of the name. `├── #hashtag/  # note` is read as the connector plus a comment, and the row vanishes entirely.

### What the prompt does not need to police

These are handled during normalization, so there is no value in spending prompt tokens on them:

| Input | Handled by |
| --- | --- |
| ` ```text ` fences around the block | Fence lines are skipped |
| Blank lines between rows | Dropped |
| CRLF line endings, non-breaking spaces | Normalized to `\n` and plain spaces |
| Heavy or rounded box glyphs (`┃ ┣ ┗ ━ ╰`) | Folded to their light equivalents |
| Trailing whitespace | Trimmed |

Rule 11 still asks for the light glyphs — normalization is a safety net, not a reason to leave the output loose.

---

## Variations

**When you want annotations.** Comments are kept on import by default; the import dialog offers a *Keep inline comments* checkbox when it detects any, so you can strip them for a given import instead. Add to the prompt: *"Add a short `# comment` to every folder explaining what belongs in it."*

**When mapping a real repository.** Add: *"Include only files that are committed — no `node_modules/`, build output, or dotfiles that tooling generates. Cap the depth at four levels."* Without a cap, models list every leaf and the diagram becomes unreadable.

**When another format suits better.** The parser also auto-detects markdown lists, path lists, ASCII trees and plain indentation. Swap the format block in the prompt for one of the examples in `docs/tree-notation.md`. The rules on trailing slashes, extensions and comments apply to all of them; only rule 6 is specific to the tree formats.
