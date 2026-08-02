/* ─────────────────────────────
   TREE PROMPT
   ─────────────────────────────
   The canonical AI prompt, offered from the import dialog so a user
   can hand it to any model and paste the reply straight back in.
   This text is a verbatim copy of the prompt block in
   docs/tree-prompt.md — that page explains why each rule exists and
   which parser behaviour it guards. Change them together, and only
   alongside assets/js/tree-parsers.js.
   Data only: no DOM, no behaviour. app.js owns the copy button.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';

  var TEXT = [
    "Output a folder structure as text, following this contract exactly.",
    "",
    "Output nothing but the tree — no preamble, no explanation, no summary",
    "afterwards. Wrap it in a ```text code fence.",
    "",
    "Format (Unix `tree` grammar, Unicode box-drawing characters):",
    "",
    "```text",
    "project/",
    "├── assets/",
    "│   ├── css/",
    "│   │   └── style.css  # brand tokens",
    "│   └── js/",
    "├── docs/",
    "│   └── setup.md",
    "└── index.html",
    "```",
    "",
    "Rules:",
    "",
    "1.  One item per line. Never two items on one line.",
    "2.  A single root on the first line, at column 0, with no connector.",
    "3.  Folders always end with `/`, including empty ones. The trailing",
    "    slash is the only reliable folder marker.",
    "4.  Files must carry an extension. A name with no `/` and no `.` is",
    "    read as a folder — `README`, `LICENSE`, `Makefile` and `.gitignore`",
    "    all import as folders. Write `README.md`, `LICENSE.txt` and so on",
    "    wherever the distinction matters.",
    "5.  Use `├── ` for every child except the last one in its folder, and",
    "    `└── ` for the last one. One space after the dashes.",
    "6.  Indent in units of exactly 4 characters, one unit per level:",
    "    `│   ` (vertical bar plus three spaces) where an ancestor still has",
    "    items below it, or four spaces where it does not. Spaces only,",
    "    never tabs. Any other width silently collapses levels together.",
    "7.  List folders before files, alphabetically within each group. Order",
    "    is preserved exactly as written.",
    "8.  Comments are optional and belong on the same line as their item,",
    "    after two spaces and a `#`:  `style.css  # brand tokens`",
    "    One per line, running to the end of the line.",
    "9.  Never put a comment on its own line, and never start a name with",
    "    `#`. Both corrupt the structure.",
    "10. Never use `/` inside a name, and never write a space followed by",
    "    `#` or `←` inside a name.",
    "11. Use only these glyphs: `├── `, `└── `, `│   `. No other",
    "    box-drawing variants, no emoji, no icons, no trailing whitespace."
  ].join('\n');

  function initTreePrompt() {
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.prompt = { TEXT: TEXT };
    console.log('tree-prompt.js v' + VERSION + ' initialised');
  }

  initTreePrompt();
})();
