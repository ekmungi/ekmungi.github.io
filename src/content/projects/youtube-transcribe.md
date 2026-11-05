---
# Project page: YouTube Transcribe. Software, public on GitHub.
# Summary and text come from the repository's code (plugin 0.5.0, engine 0.14.0), checked on 2026-10-30.
title: "YouTube Transcribe"
kind: software
summary: "A tool that turns YouTube videos and playlists into Markdown notes, one for each video, from the captions that YouTube already publishes."
status: "Public on GitHub"
repo: "https://github.com/ekmungi/youtube-transcribe"
# Views drawn from the plugin's and the engine's code, with an invented example video, so nothing personal shows.
views:
  - file: "youtube-transcribe-prompt.svg"
    caption: "The prompt asks for the link to a video or a playlist, and it fills in the link from the clipboard when the clipboard holds one."
  - file: "youtube-transcribe-note.svg"
    caption: "A saved note shows the video's details as properties, followed by the transcript in paragraphs with a timestamp every five minutes."
  - file: "youtube-transcribe-playlist.svg"
    caption: "After a playlist has finished, a notice gives the number of new notes and of notes that were already saved, and it names the videos that failed."
  - file: "youtube-transcribe-settings.svg"
    caption: "In the settings tab, the user sets the location of the command and the folder for new notes, and chooses whether the new note opens."
diagram:
  file: "youtube-transcribe.svg"
  caption: "Both front ends, the Obsidian plugin and Claude Code, run the same command. For a single video whose note is already saved, the command returns that note at once. Otherwise it fetches the video's details and its best caption track from YouTube and writes a new note."
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
    use: "YouTube explains how its automatic captions are made and why they can misrepresent speech. Because of that risk, each note records where its captions came from."
  - title: "Large scale deep neural network acoustic modeling with semi-supervised training data for YouTube video transcription"
    url: "https://doi.org/10.1109/ASRU.2013.6707758"
    authors: "Liao, McDermott and Senior"
    source: "IEEE ASRU 2013"
    use: "Background on how Google trained speech recognition models to transcribe YouTube videos."
  - title: "Extend Claude with skills"
    url: "https://code.claude.com/docs/en/skills"
    authors: "Anthropic"
    source: "Claude Code documentation, 2026"
    use: "How a skill tells Claude Code when and how to run the yt-transcribe command."
---

## The problem

Much of what I learn comes from talks, lectures and interviews on YouTube, and that material stays in the videos. Finding one point again means skipping back and forth through an hour of video. An AI assistant that works in my notes cannot read a video at all.

## How it is built

YouTube Transcribe builds each note from the captions that YouTube already publishes. Because it works from those captions, it never downloads the video or its audio and runs no speech recognition of its own. The engine reads a video's details and caption tracks through yt-dlp, an open-source video downloader for thousands of sites, which it calls as a Python library (yt-dlp contributors, 2026). A video can carry several caption tracks, and the engine tries them in a fixed order. English captions written by a person come first. YouTube's automatic English captions come next if the video is in English or its language is unknown. After those, the engine tries the original language, with written captions ahead of automatic ones, and then any other written track. An automatic translation into English is used only as a last resort. I chose this order because automatic captions come from speech recognition (Liao, McDermott and Senior, 2013), which can misrepresent speech when accents are strong or there is background noise (Google, 2026). For this reason, each note records whether its captions were written by a person or generated, and in which language. A translation is recorded as automatic English captions.

YouTube refuses caption requests that arrive too quickly. When a request is refused, the engine tries it up to four times, waiting longer before each attempt. Once two tracks have been refused, it skips the remaining ones. A video without any captions gets no transcript. Until version 0.13.0 of the engine, a user could choose to send the audio to a paid speech-recognition service instead. I removed that option because I wanted captions to be the only source.

Captions arrive from YouTube as short segments, with line breaks in the middle of phrases, and the engine joins the segments into prose. A new paragraph starts once the current one passes about 500 characters. For every five minutes of video, the engine adds a timestamp marker, which lets a reader trace any passage back to its place in the video. The frontmatter holds the title, channel, address, video ID, date, duration, caption source and caption language, and it tags the note as a YouTube transcript. Because the video ID is also part of the file name, a second request for the same video finds the saved note before anything is fetched. In a playlist, every video becomes a separate note. When the same playlist is run again, the engine reads its videos once more but fetches captions and writes notes only for those that are still missing. From the command line, saved transcripts can also be listed and searched by their text.

Two front ends, the Obsidian plugin and Claude Code, use one engine. The plugin does none of the transcription itself. It runs the yt-transcribe command with a request for a machine-readable result, then reports the outcome and opens the new note. Claude Code reaches the same command through a skill, a short instruction file. A skill's description tells Claude when to use it, and its body says which command to run (Anthropic, 2026). Until October 2026, the engine also ran as an MCP server, a background process that Claude Code called. I removed the server in version 0.14.0, because a command that saves the note and then exits does the same job and leaves nothing running. On its first run in a session, the plugin checks the engine's version and warns if the engine is too old.

## What it does

- It transcribes a single video or a whole playlist from a link that is typed into a prompt or read directly from the clipboard.
- Each video becomes a Markdown note that holds the video's details as properties and the transcript as readable paragraphs with a timestamp every five minutes.
- The note for a video is saved only once in a given transcript folder. If part of a playlist fails, the playlist can be run again to add the missing notes.
- Claude Code can run it through a skill, and saved transcripts can be listed and searched on the command line.
- The engine runs on my computer. It needs no paid service or account, only a public video with captions. The plugin works in Obsidian's desktop app.
