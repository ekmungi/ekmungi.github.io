---
# Project page: Smart Search. Software, public on GitHub.
# Summary and text come from the repository's code (version 0.15.1), checked on 2026-10-29.
title: "Smart Search"
kind: software
summary: "Local search over documents and Obsidian notes, which AI agents can query and cite."
status: "Public on GitHub"
repo: "https://github.com/ekmungi/smart-search"
diagram:
  file: "smart-search.svg"
  caption: "Indexing fills two stores from the chosen folders. A search reads both and fuses the matches, then reranks them and returns each passage with its source file."
# The papers behind the methods and models the code uses, in the order of the diagram, then the protocol the MCP server follows.
# Checked against Crossref, arXiv and modelcontextprotocol.io on 2026-10-30.
references:
  - title: "Arctic-Embed 2.0: Multilingual Retrieval Without Compromise"
    url: "https://arxiv.org/abs/2412.04506"
    authors: "Yu, Merrick, Nuti and Campos"
    source: "arXiv, 2024"
    use: "The model that embeds each passage, so a search can match it by meaning."
  - title: "Matryoshka Representation Learning"
    url: "https://arxiv.org/abs/2205.13147"
    authors: "Kusupati et al."
    source: "NeurIPS 2022"
    use: "The training method that lets Smart Search keep only the first 256 numbers of each embedding, which keeps the vector store small."
  - title: "The Probabilistic Relevance Framework: BM25 and Beyond"
    url: "https://doi.org/10.1561/1500000019"
    authors: "Robertson and Zaragoza"
    source: "Foundations and Trends in Information Retrieval, 2009"
    use: "BM25, the score the keyword index uses to rank its matches."
  - title: "Reciprocal rank fusion outperforms Condorcet and individual rank learning methods"
    url: "https://doi.org/10.1145/1571941.1572114"
    authors: "Cormack, Clarke and Büttcher"
    source: "SIGIR 2009"
    use: "The method that merges the keyword and meaning results into one list, with the constant k = 60 from the paper."
  - title: "Passage Re-ranking with BERT"
    url: "https://arxiv.org/abs/1901.04085"
    authors: "Nogueira and Cho"
    source: "arXiv, 2019"
    use: "The reranking step, in which a small model reads the query and each passage together and scores how well they match."
  - title: "The use of MMR, diversity-based reranking for reordering documents and producing summaries"
    url: "https://doi.org/10.1145/290941.291025"
    authors: "Carbonell and Goldstein"
    source: "SIGIR 1998"
    use: "Maximal marginal relevance, which moves passages that resemble ones already chosen further down the list."
  - title: "Model Context Protocol specification, version 2026-07-28"
    url: "https://modelcontextprotocol.io/specification/2026-07-28"
    authors: "Model Context Protocol project"
    source: "Specification, 2026"
    use: "The open protocol through which Claude Code calls Smart Search's tools."
---

## The problem

My notes, PDFs, Word documents and slide decks sit in different folders and formats. Finding one passage means remembering which file holds it and the exact words it used. An AI assistant working in my notes has the same problem, so it cannot say where a fact came from.

## How it is built

Keyword matching and meaning matching fail on different queries, so Smart Search keeps two indexes of the same passages. Most files are first split into passages, while spreadsheets and data files are indexed for keywords only. The keyword index ranks passages with BM25, the scoring function of the probabilistic relevance framework described by Robertson and Zaragoza (2009). BM25 favours query terms that are rare across the collection and frequent in the passage, which suits exact names and terms, but it cannot connect two phrasings of the same idea. The second index covers that case with a vector for each passage, computed by Arctic-Embed 2.0 (Yu et al., 2024), a model its authors trained for retrieval in English and in other languages. Passages with similar meaning end up close together in that vector space. Arctic-Embed 2.0 also supports Matryoshka representation learning (Kusupati et al., 2022), which concentrates the most useful information in the first dimensions of each vector so that a shortened vector keeps most of its retrieval quality. I therefore kept only the first 256 dimensions and normalised them again, which shrinks the index.

In the default hybrid mode, both indexes answer each query, and their ranked lists carry scores that cannot be compared: a BM25 score and a vector similarity sit on different scales. I merged the two lists with reciprocal rank fusion (Cormack, Clarke and Büttcher, 2009), which ignores the scores and uses ranks alone. Each list contributes 1/(k + rank) for a passage and the contributions are summed, so a passage that both indexes rank highly rises to the top. Cormack and colleagues reported that this simple rule outperformed Condorcet fusion and individual rank-learning methods, and I kept their constant, k = 60. A cross-encoder then reorders the fused list, following the approach that Nogueira and Cho (2019) introduced for passage ranking with BERT. Where the vector index compares two vectors computed separately, a cross-encoder reads the query and the passage together and can weigh how their words relate. Scoring every pair of query and passage this way would be slow, so the reranker sees only the short fused list. It uses a small two-layer BERT model trained on the MS MARCO passage-ranking data.

The last two steps reduce redundancy, which matters because an AI assistant that receives several near-identical passages spends its limited context on repetition. Long documents often produce such passages. Maximal marginal relevance (Carbonell and Goldstein, 1998) orders the results greedily, picking at each step the passage that best balances relevance to the query against similarity to the passages already chosen. I weighted relevance at 0.8 and gave any passage from a file already chosen a similarity of at least 0.5, so that repeats, and further passages from the same file, move down the list. A final cap keeps at most two passages from any one file, and every passage that remains carries the path of its source file for the assistant to cite.

AI assistants reach this pipeline through a Model Context Protocol (MCP) server that is part of Smart Search itself. MCP is an open protocol through which an AI application such as Claude Code calls the tools that an outside server provides (Model Context Protocol project, 2026). Smart Search's server is a thin relay. Claude Code starts it as a local process, and the relay passes its tool calls to Smart Search's local HTTP service, the same service behind the desktop app and the REST interface, so the assistant and the desktop app read and change one index. The relay loads no models of its own. Its eleven tools search the index, find notes similar to a given note, read a note, manage the watched folders and report the state of the index. Each result names its source file, with the section heading and page number where they are known, so that the assistant can cite it. Smart Search replaced my earlier Smart Search MCP, which could search only the vectors that the Smart Connections plugin had stored for Obsidian notes, using one small model and no keyword search.

## What it does

Smart Search is still in development. This page describes version 0.15.1.

- It indexes the folders I choose, an Obsidian vault included, and checks them for new and changed files each time it starts. Markdown, PDF, Word, PowerPoint, EPUB and HTML files are among the formats it reads.
- A search looks for meaning and for keywords at the same time, and a reranking step then puts the closest passage first.
- Every passage is returned with its source file, so an AI assistant can cite it.
- Claude Code reaches it through a built-in MCP server. I can also use it from a desktop app with a quick-search shortcut, a REST interface or the command line.
- Indexing and search run on my own computer. The two models download from Hugging Face the first time they are needed.
