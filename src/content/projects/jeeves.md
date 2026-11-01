---
# Project page: Jeeves. Software, code private, so no repository link.
# Text checked against the plugin's code (version 3.1.0) and its vault project on 2026-10-31.
title: "Jeeves"
kind: software
summary: "A Claude Code plugin of 31 skills that holds the methods I use across my ventures and keeps their records in Obsidian."
status: "Code private"
private: true
# Views drawn from the review viewer's code and the project-load steps, with an invented project, so nothing personal shows.
views:
  - file: "jeeves-overview.svg"
    caption: "The overview page that document-building generates for a work folder, listing every document with its summary, status, version and dates."
  - file: "jeeves-comment.svg"
    caption: "A document in the reading view, with a comment on a highlighted passage and Claude's answer in the comments panel."
  - file: "jeeves-load.svg"
    caption: "Starting work on a project in Claude Code. The query skill reads one line for each open record and the newest decisions, then reports the stage, the open work, the newest decision and the next step."
diagram:
  file: "jeeves.svg"
  caption: "Each venture has its own skills, and the layers below hold what the skills share: protocols and methods, the vault skills and the Obsidian vault."
# The two Claude Code pages the plugin is built on, and the published ideas that shaped three of its parts.
# Checked against code.claude.com, Crossref, karpathy.github.io, gist.github.com, fortelabs.com and the markitdown repository on 2026-10-31.
references:
  - title: "Plugins overview"
    url: "https://code.claude.com/docs/en/plugins"
    authors: "Anthropic"
    source: "Claude Code documentation, 2026"
    use: "How a plugin packages skills, hooks and supporting files into one unit that installs together, which is how Jeeves is delivered."
  - title: "Extend Claude with skills"
    url: "https://code.claude.com/docs/en/skills"
    authors: "Anthropic"
    source: "Claude Code documentation, 2026"
    use: "Claude Code keeps skill descriptions in context and loads a skill's instructions when it is used and its reference files only when a step needs them, so the 31 skills take little room until one is used."
  - title: "Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models"
    url: "https://doi.org/10.18653/v1/2024.naacl-long.347"
    authors: "Shao, Jiang, Kanell, Xu, Khattab and Lam"
    source: "NAACL, 2024"
    use: "STORM researches a topic from several perspectives before it writes, and it is the premise of the storm-research skill and its council of expert lenses."
  - title: "A Recipe for Training Neural Networks"
    url: "https://karpathy.github.io/2019/04/25/recipe/"
    authors: "Karpathy"
    source: "Blog post, 2019"
    use: "An end-to-end evaluation skeleton with simple baselines before any real model, which research-architect builds first."
  - title: "llm-wiki"
    url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
    authors: "Karpathy"
    source: "Idea file, 2026"
    use: "A model that keeps a curated set of linked notes instead of searching raw records, which is how the vault skills treat the vault."
  - title: "The PARA Method"
    url: "https://fortelabs.com/blog/para/"
    authors: "Forte"
    source: "Forte Labs article, 2023"
    use: "The vault's four main top-level folders: projects, areas, resources and the archive."
  - title: "MarkItDown"
    url: "https://github.com/microsoft/markitdown"
    authors: "Microsoft"
    source: "Open-source software, 2024"
    use: "The converter that turns PDFs, slide decks and Office files into the Markdown copies the model reads."
---

**Jeeves is the Claude Code plugin I use in all of my ventures.** This page describes version 3.1.0, which I released on 31 October 2026.

## The problem

My work runs across four ventures: AI product strategy for medical devices, research and learning, writing and publishing, and building my own tools. Every one of them has its own methods and its own records. A general AI assistant starts each conversation without those methods or the decisions made before, and its answers stay in that chat.

## Why it is a strategic initiative

My strategy is to write each method down once, as a skill, and to use that skill in every venture that needs the method. Writing a skill takes longer than answering one question, and the extra time is repaid whenever another venture uses the skill. What I decide to keep goes into my vault, where later work can find it. The development of Jeeves itself runs on its vault records. By October 2026 its project held 118 decisions and 46 specifications, and its larger releases are planned from them.

## How it is built

Jeeves is a Claude Code plugin and installs as one package (Anthropic, 2026a). Each skill is a folder. Its main file opens with a short description, and its reference files sit beside it. Claude Code holds only the descriptions in context, loads a skill's instructions when the skill is used, and opens a reference file when a step calls for it (Anthropic, 2026b). My global Claude Code instructions hold a router that names the skill that starts each kind of work. That is how a question about a regulatory pathway reaches the regulatory expert, and how a decision I want recorded reaches the skill that writes vault records. Several skills used to repeat the same steps. Release 3.0.0 moved those steps into shared files: a protocol for the experts, a protocol for the skills that run projects, methods for reading a paper and surveying a field, and a domain pack on AI medical devices. An expert loads the domain pack whenever a topic falls in that field.

Under their shared protocol, an expert interviews me and restates the request before it begins, questions the assumptions behind it, and consults another expert when a claim falls outside its own field. Work on a medical device always brings in the clinical, regulatory and technical experts whose fields its claims touch. The storm-research skill takes its premise from STORM, in which questions asked from several perspectives gather broader material for an article than questions asked from one (Shao et al., 2024). It casts three to five expert lenses for a topic, researches them in parallel and maps where they disagree. Independent verifiers then check the citations that its main findings rest on, before the skill writes the briefing. The research-architect skill builds the evaluation and a simple baseline end to end before any real model exists, as Karpathy's recipe for training neural networks advises (Karpathy, 2019), and every later result is measured against that baseline. Most stages of a project skill end in a gate, a check that can fail, and many of these checks are tested scripts. Until the check passes or I override it in writing, the next stage waits.

My Obsidian vault is built on Karpathy's LLM-wiki idea, in which the model maintains a set of linked Markdown notes and answers from them (Karpathy, 2026). Its folders are arranged by the PARA method into projects, areas, resources and an archive (Forte, 2023). In the vault's map note, every folder has a description of what it holds, and the skills look folders up there by purpose. Each kind of note is written by one skill, which keeps its links intact. Most of these writes go through the Obsidian MCP server. Some files, such as the record indexes and the Markdown copies of binary files, are written directly by the Jeeves engine. A project's work is a chain of linked records that starts with a research note and ends with a plan. When I say that I want to work on a project, Jeeves loads about 2,000 words on where it stands. MarkItDown, Microsoft's converter, makes a Markdown copy of each PDF or Office file filed in the vault (Microsoft, 2024), and the model reads that copy.

## What it does

- Product strategy for AI medical devices draws on five experts: product-manager, clinical-expert, regulatory-expert, market-researcher and technical-researcher. When a roadmap depends on a regulatory pathway, for example, product-manager consults regulatory-expert.
- A research or learning project runs in research-partner, which guides it from the first question to the interpretation of the results. A question about a single paper goes to technical-researcher. When a paper is worth reproducing, paper-implementation turns it into a checked experiment, and colab-research runs the experiments that go to Google Colab. For a larger research system, research-architect designs blocks that are built and measured one at a time. Briefings come from storm-research, whose main citations are checked by independent verifiers, and from notebooklm-grounding, which answers only from a project's own sources and cites them without a separate check.
- In writing and publishing, scientific-writing drafts a manuscript only after I approve its story and outline. HTML documents come from document-building, and I comment on them in a review page where Claude answers the comments. Slide decks come from presentation-building and short messages from executive-communication, while excalidraw and mermaid draw the diagrams.
- For my own tools, the vault records carried most of the projects on this site from research to a specification and a plan. The heavy-work skill paces long jobs within the weekly usage limit, and fable-mode takes high-stakes work through five stages, all of which end in a check. Once a month, improve-self reviews how the skills were used and suggests fixes.
- The vault skills serve all four ventures: ingest files meetings and documents, manage writes the records, query loads a project when I start work on it, map keeps the folder map, and maintain reports what has gone stale. After I install or update Jeeves, I run install-templates in each vault to add the note templates that the records use.
