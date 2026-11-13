<h1>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/images/readme-header_dark.svg">
  <img alt="folder-structure" src="assets/images/readme-header_light.svg" height="48">
</picture>
</h1>

**Visualise any folder tree.** Paste a folder structure as text and see it as an interactive diagram — or build one visually from scratch — then copy clean, AI-ready tree text for Claude and other tools.

**Use it now: [folder-structure.bydefault.studio](https://folder-structure.bydefault.studio)**

Describing a folder structure in plain text is fiddly: indentation breaks, formats vary, and it's hard to see the shape of what you're describing. This tool makes the structure unambiguous — see it as a tree, edit it directly, and export a text representation any person or AI tool can understand and act on.

## When to use it

- **Scaffolding a project with AI** — design the structure visually, copy it out, and paste it into Claude (or any AI tool) so it creates exactly the folders and files you want
- **Making sense of an AI's suggestion** — paste the tree an AI gave you and explore it as a diagram before committing to it
- **Documenting a codebase** — turn a messy hand-typed tree into a clean, consistent diagram for your README, docs, or wiki
- **Planning with people** — sketch a structure live with a team or client, then share it as a link

## How it works

### 1. Paste anything in

The import auto-detects five text formats:

- **Unicode trees** — the classic `tree` command output (`├──`, `└──`, `│`)
- **ASCII trees** — the same structure in plain ASCII (`|--`, `` `-- ``)
- **Plain indentation** — names indented with spaces or tabs, `/` on folders
- **Markdown nested lists** — `- assets/` with indented sub-items, as found in docs and Notion
- **Path lists** — one path per line, like `find` or `git ls-files` output

Inline comments survive the trip: `# note`, `← note`, and `<- note` annotations are all recognised and kept as editable annotations on the diagram (or stripped on import, if you prefer).

### 2. Edit visually

The diagram is a cascading tree — each open folder spawns a column of its children. On any row you can:

- **Add** folders and files, at the same level or nested inside
- **Rename** in place
- **Move and re-nest** entries, or convert a folder to a file and back
- **Comment** — every entry can carry a short annotation, shown in a pill beside it
- **Delete** — with undo, so nothing is lost to a slip

Plus expand/collapse all, zoom and fit-to-view, full undo/redo, per-extension file icons, dark mode, and complete keyboard navigation (the diagram follows the WAI-ARIA tree pattern). Your work autosaves in the browser between visits.

### 3. Copy clean text out

Six formats, all generated from the same tree, all round-trip safe:

**Unicode tree** — the default, and the best format to hand to an AI:

```
my-project/
├── index.html
└── assets/
    ├── css/
    │   └── style.css  # brand tokens
    └── js/
        └── app.js
```

**ASCII tree** — for older tooling and plain-ASCII environments:

```
my-project/
|-- index.html
`-- assets/
    `-- css/
```

**Markdown nested list** — for docs and Notion. **Path list** — one path per line. **JSON** — for tool interchange. And **shell commands**, which create the structure for real:

```
mkdir -p my-project/assets/css
touch my-project/index.html my-project/assets/css/style.css
```

Comments are included or omitted with a single toggle.

### Extras

- **AI prompt** — the import dialog offers a copy-ready prompt that makes any AI return a paste-ready structure in the exact format the tool expects
- **Share links** — the whole structure is encoded into the URL itself; send the link and the recipient gets the full editable tree
- **Embeds** — a read-only embed view for Notion, docs, and websites, with an optional forced light/dark theme

## Private by design

There is no backend. Nothing you paste or build is uploaded, stored, or seen by anyone — the app is pure client-side HTML, CSS, and JavaScript, your work persists only in your own browser, and a shared structure travels only inside the link itself.

## License

Copyright © 2026 By Default Studio.

The source is public so you can see how it works, but it is **not open source**: it's licensed under [PolyForm Strict 1.0.0](LICENSE), which permits noncommercial use only and does not permit distributing the software or making changes or new works based on it.

---

**By Default Studio** — [bydefault.studio](https://bydefault.studio)
