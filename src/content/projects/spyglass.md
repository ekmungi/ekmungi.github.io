---
# Project page: Spyglass. Software, code private, so no repository link.
# Summary and text come from the code of version 0.32.0, checked on 2026-10-30. Spyglass is under heavy development.
title: "Spyglass"
kind: software
summary: "A research dashboard that collects the feeds I follow, keeps the items that are relevant to me and learns from my ratings what I like to read."
status: "Code private"
private: true
diagram:
  file: "spyglass.svg"
  caption: "A language model reads the title and short description of every item for the relevance check, and Spyglass fetches and summarizes only the items that pass. The vectors and the vote stay on my computer. However, category suggestions, the brief and Claude's notes come from hosted models."
# Sources behind the methods and services the code uses, checked against arXiv, Crossref and the live pages on 2026-10-30.
references:
  - title: "Arctic-Embed: Scalable, Efficient, and Accurate Text Embedding Models"
    url: "https://arxiv.org/abs/2405.05374"
    authors: "Merrick, Xu, Nuti and Campos"
    source: "arXiv, 2024"
    use: "The small embedding model that runs on my computer and turns an article into a vector comes from this family."
  - title: "Nearest neighbor pattern classification"
    url: "https://doi.org/10.1109/TIT.1967.1053964"
    authors: "Cover and Hart"
    source: "IEEE Transactions on Information Theory, 1967"
    use: "The idea behind the vote among my nearest rated articles, which shifts the relevance of an item."
  - title: "Reader API"
    url: "https://jina.ai/reader/"
    authors: "Jina AI"
    source: "Product page, 2026"
    use: "The hosted reader service that Spyglass tries before it uses a local browser to fetch an article."
  - title: "Model Context Protocol specification, version 2025-11-25"
    url: "https://modelcontextprotocol.io/specification/2025-11-25"
    authors: "Model Context Protocol project"
    source: "Specification, 2025"
    use: "The protocol through which the linked Claude session reads and acts on Spyglass's items."
  - title: "Run Claude Code programmatically"
    url: "https://code.claude.com/docs/en/headless"
    authors: "Anthropic"
    source: "Claude Code documentation, 2026"
    use: "How Spyglass starts the hidden Claude Code runs that write and file detailed notes in the background."
---

**Spyglass is under heavy development.** This page describes version 0.32.0. A redesign is under way, in which Claude will do more of the work and Spyglass will mainly show the results. Parts of what follows will therefore change.

## The problem

I follow more blogs, newsletters and research feeds than I can read, and most of what arrives each day is not worth reading. Sorting it by hand takes longer than reading the few items that matter. An AI model that read every item in full would cost more than the reading is worth.

## How it is built

Spyglass runs as a local service. It collects new items from RSS and Atom feeds and from bookmarks saved in Raindrop, and it keeps them in a SQLite library with full-text search. Before any costly step, a language model reached through OpenRouter reads only the title and the short description of every item and scores it against a written interest profile. Items that score below a threshold are not processed further. In the automatic pass, the full text is fetched only for the items that remain, and one further call confirms the score, writes a summary and tags, and picks a category from a fixed list. The fetch tries the next method only when a site appears to block the current one. It starts with a plain request, then sends a request that presents itself as a browser, then tries a hosted reader service (Jina AI, 2026), and finally uses a local headless browser. Spyglass records which method worked for each site. Later fetches from that site therefore skip the methods that failed.

A second layer learns which articles I like, and its vectors and vote run entirely on my computer. A small embedding model from the Arctic-Embed family (Merrick et al., 2024) turns the title and summary of each article into a vector. Spyglass uses these vectors for a list of similar articles, and they also adjust relevance. The score of an item is shifted by a vote among the articles I have rated with a thumbs up or down. The vote counts up to ten of those articles, and only those whose vectors are close to the item, which is the idea behind nearest-neighbour classification (Cover and Hart, 1967). Closer neighbours count for more, and a rating loses half its weight every thirty days. An item with no close neighbours keeps exactly the model's score. When an item has no category, the model first tries to place it in an existing one. Among the items that remain, dense groups show up in the same vectors. For each such group, one short model call proposes the name of a new category, and the name then waits to be accepted or discarded.

The same language model writes the daily brief. There is one brief for every publication day, with a short written story of the relevant articles and a list of the less relevant ones. Claude is used for the work that needs judgement and access to the vault. One Claude desktop session at a time is linked to Spyglass through its MCP server (Model Context Protocol project, 2025). Through that link, I can point the session at items by their short codes. For a detailed note on one item, Spyglass starts a hidden Claude Code run in the background (Anthropic, 2026). That run may use only Spyglass's own tools and read inside the vault. It ignores any personal Claude settings, and any other action is refused without asking me. Spyglass saves the note in the vault. When I choose to file it, a second run on a smaller model files it in the right folder. A separate Claude session takes the papers I share in a chat channel, files each one with a short debrief and reports back to Spyglass.

## What it does

- It collects feeds and bookmarks into one library, with full-text search and a status for every feed.
- A language model scores each item against the interest profile before the full text is fetched, and it then summarizes, tags and categorizes the items worth reading.
- My thumbs up and down shift the scores of similar items, and an embedding model on my computer finds related articles.
- A daily brief for each publication day tells the story of the relevant articles and lists the less relevant ones.
- Claude writes detailed notes on the items I choose and files them in my Obsidian vault, in background runs limited to the tools Spyglass allows.
- An Obsidian plugin starts the service and opens the dashboard in a window of its own.
