---
# Project page: Smart Memory. Software, code private, so no repository link.
# Summary and text come from the published code, checked on 2026-10-30, and from the project's own notes on where it stands.
title: "Smart Memory"
kind: software
summary: "An experiment in memory for AI assistants: what one Claude session works out, a later one can recall."
status: "Code private"
private: true
diagram:
  file: "smart-memory.svg"
  caption: "Sessions become typed memory cards on my computer, with hosted models for the extraction and the vectors. Consolidation, run on demand, distils current conclusions per project, Claude sessions search both through MCP, and what searches surface decides what is promoted and what is archived."
# Research on memory for language-model agents, two existing approaches the project sits beside, and one commercial service.
# Checked against arXiv, the gist and the live site on 2026-10-30.
references:
  - title: "Generative Agents: Interactive Simulacra of Human Behavior"
    url: "https://arxiv.org/abs/2304.03442"
    authors: "Park et al."
    source: "arXiv, 2023"
    use: "The memory stream: many small records of what happened, retrieved by relevance and distilled into higher-level conclusions."
  - title: "MemGPT: Towards LLMs as Operating Systems"
    url: "https://arxiv.org/abs/2310.08560"
    authors: "Packer et al."
    source: "arXiv, 2023"
    use: "Memory outside the context window that the model can search when it needs it."
  - title: "Zep: A Temporal Knowledge Graph Architecture for Agent Memory"
    url: "https://arxiv.org/abs/2501.13956"
    authors: "Rasmussen et al."
    source: "arXiv, 2025"
    use: "Memory for facts that change over time, the problem the distilled layer handles by superseding older statements."
  - title: "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory"
    url: "https://arxiv.org/abs/2504.19413"
    authors: "Chhikara et al."
    source: "arXiv, 2025"
    use: "An existing memory layer that extracts, consolidates and retrieves what matters from conversations."
  - title: "llm-wiki"
    url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
    authors: "Karpathy"
    source: "Idea file, 2026"
    use: "The LLM-wiki approach that my Jeeves system follows: a model keeps a curated set of linked notes instead of searching raw records."
  - title: "Supermemory"
    url: "https://supermemory.ai/"
    authors: "Supermemory"
    source: "Product site, 2026"
    use: "A commercial memory service for AI assistants, one of the existing offerings this project overlaps with."
---

**Smart Memory is a learning project and a work in progress.** The first version works and most of a redesign is built, but where it belongs among my tools is still an open question.

## The problem

What one Claude session works out is mostly lost to the next session, and to the other Claude apps, unless someone writes it down. A design discussion from last week cannot be picked up again without rereading the whole conversation, and a conclusion reached in one session is easily contradicted in another.

## How it is built

Smart Memory treats past conversations as material to learn from rather than text to reread. When I start an ingest run, it reads the Claude Code sessions that have been idle for three hours, and a low-cost hosted model breaks each one into small, typed memory cards: facts, decisions, preferences and actions. Each card gets its own vector, so a search matches the one point that was made instead of a blurred summary of a whole session, which is how the first version worked. This follows the memory stream of Generative Agents, which keeps many small records of what happened, retrieves them by recency, importance and relevance, and distils them into higher-level reflections (Park et al., 2023). It also follows the wider idea of memory outside a model's context window that the model can search when it needs to (Packer et al., 2023). SQLite on my computer holds the cards and their vectors, and Claude Code and Claude Desktop reach them through an MCP server, where a memory can also be saved by hand as a note. Before the cards became the default, an evaluation harness and scale tests measured how well they were recalled.

The redesign adds a second layer on top of the cards. Every card is kept as evidence. A consolidation step, which I run on demand, groups the facts by the project their session belongs to and distils one current conclusion for each group. When a later conversation reverses an earlier statement, the older statement stays as evidence but no longer comes up beside the conclusion that replaced it. Zep handles the same problem of changing facts with a time-aware knowledge graph (Rasmussen et al., 2025). The other three types of card are kept as evidence but not distilled, because my vault records already hold their current version. Linking each conclusion to the vault note it concerns, rather than only to its project, is designed but not yet built. A usage log records which memories searches bring up, so conclusions drawn from several sessions or surfaced often are promoted, and those no search has surfaced for three months are archived without losing their evidence.

What I have not settled is the use case. Commercial services such as Supermemory and Mem0 already pull memories out of conversations and serve them back (Chhikara et al., 2025), and the Jeeves system keeps curated knowledge in the LLM-wiki style, where a model maintains linked notes instead of searching raw records (Karpathy, 2026). Smart Memory sits between the two, and I am still learning where it helps. A harder question is when and how saved memories should enter a new session, so that the assistant gets the one conclusion that matters without noise from everything else. Answering it may need a custom harness that decides what to load before the assistant starts, and that is the part I am still working out.

## What it does

- When I run it, it reads finished Claude Code sessions and breaks each one into typed memory cards, each with its own vector.
- Claude Code and Claude Desktop can search the cards, open a past session, find related ones and save a memory by hand, through an MCP server.
- A consolidation step distils one current conclusion per project from the facts, and a reversed statement stops coming up beside its replacement.
- Conclusions that recur across sessions or keep coming up in searches are promoted, and ones no search has surfaced for three months are archived.
- It runs on my computer and uses hosted models to extract and distil the cards and to compute vectors for the cards and for every search.
