---
# Project page: Jeeves View. Software, code private, so no repository link.
# Summary and text come from the plugin's code (version 0.1.8), checked on 2026-10-30.
title: "Jeeves View"
kind: software
summary: "An Obsidian plugin that opens notes as pages you edit like documents, with comments that Claude can read and answer."
status: "Code private"
private: true
# Views drawn from the plugin's code and its built-in demo, with an invented note, so nothing personal shows.
views:
  - file: "jeeves-view-page.svg"
    caption: "A note as a page: the properties under the title, a summary callout, and each second-level section as a card. Dated entries form a timeline, and the sparkle marks a section that the note flags as maintained by Claude."
  - file: "jeeves-view-comments.svg"
    caption: "The comments column: a question on a highlighted sentence and Claude's answer, with icons to reply, resolve and delete."
  - file: "jeeves-view-table.svg"
    caption: "A table edited in place. While the cursor is in a cell, an icon bar adds rows and columns, aligns a column and makes the first row or column bold."
  - file: "jeeves-view-settings.svg"
    caption: "The settings for comments and for Claude's connection: where the database is kept, the local server's status and port, and a button that copies the command that connects Claude Code."
diagram:
  file: "jeeves-view.svg"
  caption: "The page edits only blocks that convert back to their exact Markdown, and only edited blocks are converted back when the note is saved. Comments live in one SQLite database kept outside the notes, and Claude Code answers them through the plugin's MCP server while it edits the note through the Obsidian MCP."
# The standard behind the comment anchors, the MCP transport rules the server follows, and the two building blocks the plugin runs on.
# Checked against w3.org, modelcontextprotocol.io, sql.js.org and docs.obsidian.md on 2026-10-30.
references:
  - title: "Web Annotation Data Model"
    url: "https://www.w3.org/TR/annotation-model/"
    authors: "Sanderson, Ciccarese and Young"
    source: "W3C Recommendation, 2017"
    use: "The text quote selector, a quoted passage with the text just before and after it, which is how each comment stays attached as the note changes."
  - title: "Model Context Protocol: Transports"
    url: "https://modelcontextprotocol.io/specification/2025-06-18/basic/transports"
    authors: "Model Context Protocol project"
    source: "Specification, 2025"
    use: "The transport the plugin's server uses, and the advice for local servers it follows: listen on 127.0.0.1 only, check where each request comes from, and require authentication."
  - title: "sql.js"
    url: "https://sql.js.org/"
    authors: "sql.js contributors"
    source: "Documentation, 2026"
    use: "SQLite compiled to run inside the plugin, so the comment database needs no program beside Obsidian."
  - title: "Views"
    url: "https://docs.obsidian.md/Plugins/User+interface/Views"
    authors: "Obsidian"
    source: "Obsidian developer documentation, 2026"
    use: "How a plugin adds its own view to Obsidian, which is how notes open as pages."
---

**Jeeves View is an early version.** This page describes version 0.1.8, built in October 2026, which runs on desktop Obsidian only.

## The problem

Markdown is a good format for keeping notes and a poor one for reviewing them. Obsidian edits a note as Markdown text, with the symbols appearing wherever the cursor goes, and it has no review comments of the kind a word processor has. Discussing a note with an AI assistant means copying passages into a chat and the answers back again, with a description of where each change belongs. Some of my notes are also partly written by Claude through the Jeeves tools, so any editor I use must leave the parts I do not touch exactly as they are.

## How it is built

Jeeves View treats the Markdown file as the record and the page as a view that must never change what it does not edit. Notes open in a view the plugin adds to Obsidian (Obsidian, 2026), and Obsidian's editor stays one click away. A parser splits each note into blocks, such as headings, paragraphs, lists, quotes, callouts and tables, and keeps every block's original lines together with the blank lines before it and any Windows line endings, so joining the blocks again gives back the file byte for byte. Before a block is offered for rich editing, the page draws it and converts the drawing back to Markdown. If the result differs from the original by even one character, the block is left to Obsidian to draw, and a pencil icon opens its Markdown instead. Inline elements the page cannot edit, such as note links and maths, carry their exact source with them, so they never stop a block from converting back exactly. Only an edited block is converted back to Markdown, every other block is saved with its original bytes, and editing a table cell rewrites only that cell's row.

Comments have to survive edits to the text they point at, including the edits Claude makes. A comment on text selected within a paragraph stores the passage itself, up to 32 characters on either side and the title of its section. This follows the text quote selector of the W3C Web Annotation Data Model, which identifies a passage by quoting it with the text just before and after it (Sanderson et al., 2017). When the note changes, the plugin searches the new text for the passage and scores every match by how much of the surrounding text still agrees. A passage that was reworded is found again from the text around it, as long as that text is still there, and a comment on a whole paragraph is matched by the words the old and new paragraphs share. If the text is gone, the comment is resolved automatically with a reply that says why, and if the text comes back, after an undo for example, the comment opens again. Comments are kept outside the notes, in one SQLite database for the vault that runs inside the plugin through sql.js (sql.js contributors, 2026). Every change reaches the disk through a temporary file and a rename, so a crash cannot leave the database half written, and each comment records the SHA-256 fingerprint of the file version it was made on.

Claude reaches the comments through a small MCP server inside the plugin, which offers three tools. The first lists a note's comments with their quoted text and whether that text still matches the note, and the other two reply to a comment and resolve it. Claude Code changes the note itself through a separate Obsidian MCP server. When Claude connects, the server's instructions ask it to treat each open comment as a request about the quoted text, to say in a reply what it changed, and never to resolve a comment it did not address. For security it follows the MCP specification's advice for servers that run on the user's own computer (Model Context Protocol project, 2025). It listens on 127.0.0.1 only and refuses requests that come from a web page, and Claude Code must present a secret key, which the settings tab places in the command that connects it. When Claude changes a note that is open, the page shows Claude's version at once, and the change becomes a step in the undo history, so one undo returns the note to how it was before. While Obsidian is open, that history keeps up to 1,000 steps for each of the 50 most recently used notes and stores only the text each step changed.

## What it does

- Opens notes as pages, while Kanban notes, Excalidraw drawings and any folders I exclude keep their own views. On a page the properties sit under the title, each second-level section becomes a card, and dated entries form a timeline.
- Edits notes like documents from a toolbar, with coloured highlights and callouts, tables edited in place, pasted images and undo.
- Converts back to Markdown only the blocks that were edited, and leaves anything it cannot edit safely to Obsidian, behind a pencil icon that opens the Markdown.
- Keeps comments and their replies in a column beside the page, attached to the text they refer to, in a database outside the notes.
- Lets Claude Code read a note's comments and answer them while it changes the note, through a local MCP connection that needs a secret key.
- Lets me set the font, size, weight and colour of each kind of text, where the setting applies to it, including fonts kept in the vault.
