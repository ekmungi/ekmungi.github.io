---
# Project page: Spyglass. Software, code private, so no repository link.
# Summary and text come from the code of version 0.32.0, checked on 2026-10-30. Spyglass is under heavy development.
title: "Spyglass"
kind: software
summary: "A research dashboard that collects the feeds I follow, filters them by relevance and learns my taste."
status: "Code private"
private: true
diagram:
  file: "spyglass.svg"
  caption: "Every item's title and short description go to a language model for the relevance check, and only items that pass are fetched and summarized. The vectors and the vote stay on my computer, while category suggestions, the brief and Claude's notes use hosted models."
# Sources behind the methods and services the code uses, checked against arXiv, Crossref and the live pages on 2026-10-30.
references:
  - title: "Arctic-Embed: Scalable, Efficient, and Accurate Text Embedding Models"
    url: "https://arxiv.org/abs/2405.05374"
    authors: "Merrick, Xu, Nuti and Campos"
    source: "arXiv, 2024"
    use: "The family of the small embedding model that runs on my computer and turns each article into a vector."
  - title: "Nearest neighbor pattern classification"
    url: "https://doi.org/10.1109/TIT.1967.1053964"
    authors: "Cover and Hart"
    source: "IEEE Transactions on Information Theory, 1967"
    use: "The idea behind the vote of my nearest rated articles, which shifts each item's relevance."
  - title: "Reader API"
    url: "https://jina.ai/reader/"
    authors: "Jina AI"
    source: "Product page, 2026"
    use: "The hosted reader service that the fetch ladder tries before falling back to a local browser."
  - title: "Model Context Protocol specification, version 2025-11-25"
    url: "https://modelcontextprotocol.io/specification/2025-11-25"
    authors: "Model Context Protocol project"
    source: "Specification, 2025"
    use: "The protocol through which the linked Claude session reads and acts on Spyglass's items."
  - title: "Run Claude Code programmatically"
    url: "https://code.claude.com/docs/en/headless"
    authors: "Anthropic"
    source: "Claude Code documentation, 2026"
    use: "The hidden Claude Code runs that write and file detailed notes in the background."
---

**Spyglass is under heavy development.** This page describes version 0.32.0. A redesign is under way in which Claude does more of the work and Spyglass mainly shows the results, so parts of what follows will change.

## The problem

I follow more blogs, newsletters and research feeds than I can read, and most of what arrives each day is not worth my time. Sorting it by hand takes longer than reading the few items that matter, and asking an AI model to read everything in full would cost more than the reading is worth.

## How it is built

Spyglass runs as a local service that collects new items from RSS and Atom feeds and from bookmarks saved in Raindrop, and keeps them in a SQLite library with full-text search. Every item is judged before anything expensive happens. A language model, reached through OpenRouter, first reads only the title and the short description and scores the item against a written interest profile. Items below a threshold stop there. In the automatic pass, only the rest have their full text fetched, and one further call confirms the score, writes a summary and tags, and picks a category from a fixed list. Fetching the full text tries the next step only when a site seems to block the current one: a plain request, then a request that presents itself as a browser, then a hosted reader service (Jina AI, 2026), and finally a local headless browser. Spyglass remembers which step worked for each site, so later fetches from that site skip the steps that failed.

The second layer learns what I like, and its vectors and vote run entirely on my computer. A small embedding model from the Arctic-Embed family (Merrick et al., 2024) turns each article's title and summary into a vector, and those vectors power a list of similar articles. They also adjust relevance. Each item's score is shifted by a vote of the articles I have rated with a thumbs up or down, counting up to ten of them and only those whose vectors are close to the item, which is the idea behind nearest-neighbour classification (Cover and Hart, 1967). Closer neighbours count for more, and a rating loses half its weight every thirty days. An item with no close neighbours keeps exactly the model's score. For an uncategorized item, the model first tries to place it in an existing category. Dense groups among the items that remain show up in the same vectors, and one short model call proposes a name for each new category, which then waits to be accepted or discarded.

The daily brief comes from the same language model: one brief per publication day, with a short written story of the relevant articles and a list of the less relevant ones. Claude comes in where judgement and access to the vault matter. One Claude desktop session at a time is linked to Spyglass through its MCP server (Model Context Protocol project, 2025), so I can point Claude at items by their short codes. For a detailed note on one item, Spyglass starts a hidden Claude Code run in the background (Anthropic, 2026). That run may use only Spyglass's own tools and read inside the vault, ignores any personal Claude settings, and is refused anything else without being asked. Spyglass saves the note in the vault, and when I choose to file it, a second run on a smaller model files it in the right folder. A separate Claude session takes the papers I share in a chat channel, files each one with a short debrief, and reports back to Spyglass.

## What it does

- It collects my feeds and bookmarks into one library, with full-text search and a status for every feed.
- A language model scores each item against my interests before the full text is fetched, then summarizes, tags and categorizes the items worth reading.
- My thumbs up and down shift the scores of similar items, and an embedding model on my computer finds related articles.
- A daily brief per publication day tells the story of the relevant articles and lists the less relevant ones.
- Claude writes detailed notes on the items I choose and files them in my Obsidian vault, in background runs limited to the tools Spyglass allows.
- An Obsidian plugin starts the service and opens the dashboard in a window of its own.
