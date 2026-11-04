---
# Project page: AI Meeting Notes. Software, public on GitHub.
# Summary and text come from the repository's code (version 1.2.3), checked on 2026-10-30.
title: "AI Meeting Notes"
kind: software
summary: "An Obsidian plugin that records a meeting and writes a live transcript with speaker labels, which the meeting's notes embed."
status: "Public on GitHub"
repo: "https://github.com/ekmungi/ai-meeting-notes"
# Shown in a warning box at the top of the page, at Anant's request (2026-10-30).
notice:
  title: "Record only with everyone's consent"
  text: "Record a meeting only when every person in it has agreed to be recorded. Laws on recording conversations differ between countries, and you are responsible for following the ones that apply to you. The plugin will not record until you accept its own consent disclaimer in the settings. I accept no liability for any recording made without the consent of everyone involved."
# Views drawn from the plugin's code (settings, modals, file formats, status bar), with invented names, so nothing personal shows.
views:
  - file: "ai-meeting-notes-start.svg"
    caption: "When I start a recording, a quick switcher offers the meeting types, the saved presets and an option to add a new type."
  - file: "ai-meeting-notes-participants.svg"
    caption: "The participants picker lists the notes in the contacts folder, one note per person."
  - file: "ai-meeting-notes-recording.svg"
    caption: "During a meeting, the notes file is open with the transcript embedded below its headings, and the status bar shows how long the recording has run."
  - file: "ai-meeting-notes-settings.svg"
    caption: "The top of the settings tab shows the consent disclaimer, which must be accepted before the plugin records, and then the transcription settings. The settings for audio, output, silence detection, the floating indicator, meeting types and presets come further down."
diagram:
  file: "ai-meeting-notes.svg"
  caption: "The plugin captures and prepares the audio inside Obsidian. AssemblyAI's cloud service recognises the speech and labels the speakers, and the labelled turns return over the same connection into a transcript file, which the meeting's notes file embeds."
# AssemblyAI's own documentation and articles on the service the plugin uses, then the web standard its audio path is built on.
# Checked against the live pages on 2026-10-30.
references:
  - title: "Streaming Diarization and Multichannel"
    url: "https://www.assemblyai.com/docs/streaming/label-speakers-and-separate-channels"
    authors: "AssemblyAI"
    source: "AssemblyAI documentation, 2026a"
    use: "How live speaker labels work, why very short turns are marked PENDING, and the corrections that arrive when a session ends."
  - title: "What is speaker diarization and how does it work? (Complete 2026 guide)"
    url: "https://www.assemblyai.com/blog/what-is-speaker-diarization-and-how-does-it-work"
    authors: "Foster"
    source: "AssemblyAI blog, 2026"
    use: "Background on how a system finds who spoke when, through voice activity detection, segmentation, voice embeddings and clustering."
  - title: "Introducing Keyterms Prompting to Streaming STT: Never miss the words that matter most"
    url: "https://www.assemblyai.com/blog/streaming-keyterms-prompting"
    authors: "Bernstein"
    source: "AssemblyAI blog, 2025"
    use: "Key-term prompting, which the plugin fills with the names of the people in the contacts folder and the user's own terms."
  - title: "Streaming WebSocket API"
    url: "https://www.assemblyai.com/docs/streaming/api-spec/streaming-websocket"
    authors: "AssemblyAI"
    source: "AssemblyAI documentation, 2026b"
    use: "The streaming endpoint and its messages, and the turn-silence settings that the plugin's endpointing presets use."
  - title: "Web Audio API 1.1"
    url: "https://www.w3.org/TR/webaudio-1.1/"
    authors: "Adenot and Choi (editors)"
    source: "W3C Working Draft, 2026"
    use: "The AudioWorklet, whose input sums the two audio sources and which averages them to mono."
---

## The problem

When I take notes in a meeting, my attention is divided between listening and writing, and the notes still miss things. A separate recorder app keeps the transcript apart from my notes. On a video call, the other participants' voices come through the computer's sound output. When I wear headphones, a recorder that listens only to the microphone does not hear them.

## How it is built

AI Meeting Notes records two sources at the same time. One is the microphone. The other, on Windows, is the computer's own sound output, which carries the voices of the remote participants. For the microphone stream the plugin requests the browser's echo cancellation, which reduces how much of the speakers' output the microphone picks up a second time. Both streams feed an AudioWorklet, the Web Audio component that processes sound on the audio rendering thread and keeps that work off the page's main loop (Adenot and Choi, 2026). Web Audio sums the two sources and the worklet averages them to mono. From that mono signal, the plugin cuts frames of 100 milliseconds of 16-bit audio at 16 kHz. Three parts of the plugin read these frames: the streaming client, an optional recorder that saves a local WAV file, and a silence monitor. I chose to detect silence by loudness. A voice detector was the alternative, but the mixed microphone and system audio defeated the voice-detection thresholds. At the start of every session, the silence monitor calibrates its noise floor from the first three seconds.

From the worklet, the frames travel over a WebSocket to AssemblyAI's streaming service (AssemblyAI, 2026b). My API key stays on my computer, encrypted by Electron's secure storage, and the plugin sends it only to AssemblyAI's token service. The WebSocket connection is opened with a short-lived token, not with the key. Two settings, key terms and endpointing presets, shape what comes back. Key terms make names and jargon more likely to be recognised correctly, and the plugin builds them from the names of the people in the contacts folder and a list of my own words (Bernstein, 2025). Endpointing presets set how long a pause must last before the service closes a turn. A shorter setting gives faster live text, and a longer one splits fewer sentences at pauses. Speaker diarization, the task of working out who spoke when, also runs on the service. It groups stretches of speech by the voice embeddings they produce (Foster, 2026). Live labels are least reliable early in a meeting and on very short turns. AssemblyAI marks those short turns as PENDING, and the plugin never writes PENDING as a speaker label. When the session ends, the service sends corrected labels (AssemblyAI, 2026a). Because the plugin assigns labels when it renders the transcript, it can rewrite the whole transcript with the corrections. If the network drops for a short time, a 15-second buffer holds the audio while the plugin reconnects. If the reconnection fails, transcription ends for that session.

The notes and the transcript are ordinary Markdown files in the vault. Every meeting has two of them. The notes file is built from a template and carries the date, the start time and the participants in its frontmatter. The transcript file fills while the meeting runs, and since the notes file embeds it, the transcript grows below the notes. A preset sets the meeting type, the template and the participants in one step. A plain meeting type leads through a template picker and a participants picker. Participants come from a folder that holds one note per person, so the attendee list links to those notes. If I choose, the plugin merges the transcript into the notes file when recording stops. In February 2026 I built the first version as a Python backend with a separate desktop window that ran alongside the plugin. Version 1.0, released in June 2026, moved everything into the plugin. As a result, nothing else has to be installed or kept running.

## What it does

- It records the microphone and, on Windows, the computer's sound output, which captures the remote participants as well.
- While the meeting runs, a live transcript with speaker labels fills a transcript file that the meeting's notes file embeds.
- A preset sets up the notes in a few clicks, and so does a meeting type followed by the template and participants pickers.
- After a stretch of silence it shows a warning, and after two minutes of silence it stops recording. It can save a local WAV copy, recovers when a Bluetooth microphone drops out, and can pause and resume.
- AssemblyAI's streaming service handles speech recognition and speaker labelling with my own API key, which is stored encrypted on my computer. Everything else runs inside Obsidian.
