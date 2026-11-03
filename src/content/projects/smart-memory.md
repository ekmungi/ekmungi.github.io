---
# Project page: Smart Memory. Software, code private, so no repository link.
# Summary and text come from the published code, checked on 2026-10-30, and from the project's own notes on where it stands.
title: "Smart Memory"
kind: software
summary: "An experiment in memory for AI assistants, in which a later Claude session can recall what an earlier one worked out."
status: "Code private"
private: true
diagram:
  file: "smart-memory.svg"
  caption: "Sessions are broken into typed memory cards on my computer, and hosted models do the extraction and compute the vectors. A consolidation step, run on demand, distils the current conclusions for each project. Claude sessions search the cards and the conclusions through MCP, and what the searches surface decides which memories are promoted and which are archived."
# Research on memory for language-model agents, two existing approaches the project sits beside, and one commercial service.
# Checked against arXiv, the gist and the live site on 2026-10-30.
references:
  - title: "Generative Agents: Interactive Simulacra of Human Behavior"
    url: "https://arxiv.org/abs/2304.03442"
    authors: "Park et al."
    source: "arXiv, 2023"
    use: "The memory stream, which keeps many small records of what happened, retrieves them by relevance and distils them into higher-level conclusions."
  - title: "MemGPT: Towards LLMs as Operating Systems"
    url: "https://arxiv.org/abs/2310.08560"
    authors: "Packer et al."
    source: "arXiv, 2023"
    use: "Memory kept outside the context window, which the model can search when it needs it."
  - title: "Zep: A Temporal Knowledge Graph Architecture for Agent Memory"
    url: "https://arxiv.org/abs/2501.13956"
    authors: "Rasmussen et al."
    source: "arXiv, 2025"
    use: "Memory for facts that change over time. The distilled layer handles the same problem by superseding older statements."
  - title: "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory"
    url: "https://arxiv.org/abs/2504.19413"
    authors: "Chhikara et al."
    source: "arXiv, 2025"
    use: "An existing memory layer that extracts, consolidates and retrieves the important points of conversations."
  - title: "llm-wiki"
    url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
    authors: "Karpathy"
    source: "Idea file, 2026"
    use: "The LLM-wiki approach that my Jeeves system follows, in which a model keeps a curated set of linked notes instead of searching raw records."
  - title: "Supermemory"
    url: "https://supermemory.ai/"
    authors: "Supermemory"
    source: "Product site, 2026"
    use: "A commercial memory service for AI assistants and one of the existing offerings that overlap with this project."
---

**Smart Memory is a learning project and a work in progress.** The first version works, and most of a redesign is built. Where it belongs among my tools is still an open question.

## The problem

Unless someone writes it down, what one Claude session works out is mostly lost to the next session and to the other Claude apps. To pick up a design discussion from last week, I have to reread the whole conversation. Conclusions reached in one session are also easily contradicted in another.

## How it is built

Smart Memory treats past conversations as material to learn from, so that nobody has to reread them. When I start an ingest run, it reads the Claude Code sessions that have been idle for three hours, and a low-cost hosted model breaks each session into small, typed memory cards: facts, decisions, preferences and actions. The first version matched a search against a single summary of a whole session. Now every card has its own vector, so a search can match the one point that was made. This design follows the memory stream of Generative Agents, which keeps many small records of what happened, retrieves them by recency, importance and relevance, and distils them into higher-level reflections (Park et al., 2023). It also follows the wider idea of memory outside a model's context window that the model can search when it needs to (Packer et al., 2023). SQLite on my computer holds the cards and their vectors. Claude Code and Claude Desktop reach them through an MCP server, where a memory can also be saved by hand as a note. An evaluation harness and scale tests measured how well the cards were recalled before they became the default.

The redesign adds a second layer on top of the cards. Each card stays as evidence. A consolidation step, which I run on demand, groups the facts by the project their session belongs to and distils one current conclusion for each group. When a later conversation reverses an earlier statement, the older statement stays as evidence but no longer comes up beside the conclusion that replaced it. Zep handles the same problem of changing facts with a time-aware knowledge graph (Rasmussen et al., 2025). Decisions, preferences and actions also stay as evidence, but the step does not distil them, because my vault records already hold their current version. Linking each conclusion to the vault note it concerns, in addition to its project, is designed but not yet built. Every search writes the memories it brings up to a usage log, and the log decides what is promoted and what is archived. Conclusions drawn from several sessions, or surfaced often, are promoted. Those that no search has surfaced for three months are archived, and their evidence is kept.

I have not yet settled the use case. Commercial services such as Supermemory and Mem0 already extract memories from conversations and serve them back (Chhikara et al., 2025). My Jeeves system keeps curated knowledge in the LLM-wiki style, in which a model maintains linked notes instead of searching raw records (Karpathy, 2026). Smart Memory sits between the two, and I am still learning where it helps. A harder question is when and how saved memories should enter a new session. The assistant should get the one conclusion that matters without noise from everything else. Answering this may need a custom harness that decides what to load before the assistant starts, and that is the part I am still working out.

## What it does

- When I run it, it reads finished Claude Code sessions and breaks them into typed memory cards with a vector for every card.
- Through an MCP server, Claude Code and Claude Desktop can search the cards, open a past session, find related sessions and save a memory by hand.
- On demand, a consolidation step distils one current conclusion per project from the facts, and a reversed statement stops coming up beside its replacement.
- Conclusions that recur across sessions or keep coming up in searches are promoted. Those that no search has surfaced for three months are archived.
- It runs on my computer and uses hosted models to extract and distil the cards and to compute the vectors for the cards and for every search.
