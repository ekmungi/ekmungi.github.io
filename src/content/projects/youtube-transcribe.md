---
# Project page: YouTube Transcribe. Software, public on GitHub.
# Summary and text come from the repository's code (plugin 0.5.0, engine 0.14.0), checked on 2026-10-30.
title: "YouTube Transcribe"
kind: software
summary: "Turns YouTube videos and playlists into Markdown notes, one per video, from YouTube's own captions."
status: "Public on GitHub"
repo: "https://github.com/ekmungi/youtube-transcribe"
# Views drawn from the plugin's and the engine's code, with an invented example video, so nothing personal shows.
views:
  - file: "youtube-transcribe-prompt.svg"
    caption: "The prompt takes a video or playlist link, pre-filled from the clipboard when it holds one."
  - file: "youtube-transcribe-note.svg"
    caption: "A saved note: the video's details as properties, then the transcript as paragraphs with a timestamp every five minutes."
  - file: "youtube-transcribe-playlist.svg"
    caption: "After a playlist, a notice counts the new and the already saved notes and names the videos that failed."
  - file: "youtube-transcribe-settings.svg"
    caption: "The settings tab: where the command lives, where notes go, and whether to open the new note."
diagram:
  file: "youtube-transcribe.svg"
  caption: "Both front ends run the same command. For a single video it returns a saved note at once, and otherwise it fetches the video's details and best caption track from YouTube and writes a new note."
# The library and the services the engine relies on, and background on YouTube's automatic captions.
# Checked against GitHub, YouTube Help, Crossref and the Claude Code documentation on 2026-10-30.
references:
  - title: "yt-dlp: a feature-rich command-line audio/video downloader"
    url: "https://github.com/yt-dlp/yt-dlp"
    authors: "yt-dlp contributors"
    source: "GitHub, 2026"
    use: "The library the engine uses to read a video's details and caption tracks without downloading the video."
  - title: "Use automatic captioning"
    url: "https://support.google.com/youtube/answer/6373554"
    authors: "Google"
    source: "YouTube Help, 2026"
    use: "How YouTube's automatic captions are made and why they can misrepresent speech, which is why each note records where its captions came from."
  - title: "Large scale deep neural network acoustic modeling with semi-supervised training data for YouTube video transcription"
    url: "https://doi.org/10.1109/ASRU.2013.6707758"
    authors: "Liao, McDermott and Senior"
    source: "IEEE ASRU 2013"
    use: "Background on how Google trained speech recognition models to transcribe YouTube videos."
  - title: "Extend Claude with skills"
    url: "https://code.claude.com/docs/en/skills"
    authors: "Anthropic"
    source: "Claude Code documentation, 2026"
    use: "How a skill tells Claude Code when to run the yt-transcribe command and how."
---

## The problem

Much of what I learn comes from talks, lectures and interviews on YouTube, and it stays inside the videos. Finding one point again means scrubbing through an hour of video, and an AI assistant working in my notes cannot read a video at all.

## How it is built

YouTube Transcribe builds each note from the captions that YouTube already publishes, so it never downloads the video or its audio and runs no speech recognition of its own. The engine reads the video's details and caption tracks through yt-dlp, an open-source video downloader for thousands of sites, which it calls as a Python library (yt-dlp contributors, 2026). A video can carry several tracks, and the engine tries them in a fixed order: captions written by a person in English, then YouTube's automatic English captions when the video is in English or its language is unknown, then the original language, written before automatic, then any other written track. An automatic translation into English comes only as a last resort. I chose that order because automatic captions come from speech recognition, which can misrepresent speech with strong accents or background noise (Google, 2026; Liao, McDermott and Senior, 2013). Each note therefore records whether its captions were written by a person or generated, and their language. Translations, the last resort, are recorded as automatic English captions. YouTube refuses caption requests that arrive too quickly, so the engine tries a refused request up to four times with growing waits and skips the remaining tracks once two of them have been refused. A video without any captions gets no transcript. Until version 0.13.0 of the engine, a user could choose to send the audio to a paid speech-recognition service instead, and I removed that option so that captions are the only source.

Caption segments arrive as short fragments with line breaks in mid-phrase, and the engine joins them into prose. It starts a new paragraph once the current one passes about 500 characters and adds a timestamp marker every five minutes, so any passage can be traced back to its place in the video. The frontmatter holds the title, channel, address, video ID, date, duration, caption source and caption language, and tags the note as a YouTube transcript. Because the video ID is part of the file name, a second request for the same video finds the saved note before anything is fetched. Each video in a playlist becomes a note of its own. Running the playlist again reads the playlist's videos again, but fetches captions and writes notes only for the ones still missing. From the command line, saved transcripts can also be listed and searched by their text.

One engine serves two front ends. The Obsidian plugin is a thin interface: it runs the yt-transcribe command with a request for a machine-readable result, then reports the outcome and opens the new note. Claude Code reaches the same command through a skill, a short instruction file whose description tells Claude when to use it and whose body says which command to run (Anthropic, 2026). Until October 2026 the engine also ran as an MCP server, a background process that Claude Code called. I removed it in version 0.14.0, because a command that saves the note and then exits does the same job without leaving anything running. On its first run in a session, the plugin checks the engine's version and warns when it is too old.

## What it does

- It transcribes a single video or a whole playlist from a link, typed into a prompt or read straight from the clipboard.
- Each video becomes a Markdown note with the video's details as properties, readable paragraphs and a timestamp every five minutes.
- It does not save a video twice in the same transcript folder, and a playlist that partly failed can be run again to fill in what is missing.
- Claude Code can run it through a skill, and on the command line saved transcripts can be listed and searched.
- The engine runs on my computer and needs no paid service or account, only a public video with captions. The plugin works in Obsidian's desktop app.
