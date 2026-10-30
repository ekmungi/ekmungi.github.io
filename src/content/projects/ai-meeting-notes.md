---
# Project page: AI Meeting Notes. Software, public on GitHub.
# Summary and text come from the repository's code (version 1.2.3), checked on 2026-10-30.
title: "AI Meeting Notes"
kind: software
summary: "Obsidian plugin that records a meeting and writes a live transcript with speaker labels, embedded in the meeting's notes."
status: "Public on GitHub"
repo: "https://github.com/ekmungi/ai-meeting-notes"
# Shown in a warning box at the top of the page, at Anant's request (2026-10-30).
notice:
  title: "Record only with everyone's consent"
  text: "Record a meeting only when every person in it has agreed to be recorded. Laws on recording conversations differ between countries, and you are responsible for following the ones that apply to you. The plugin will not record until you accept its own consent disclaimer in the settings. I accept no liability for any recording made without the consent of everyone involved."
# Views drawn from the plugin's code (settings, modals, file formats, status bar), with invented names, so nothing personal shows.
views:
  - file: "ai-meeting-notes-start.svg"
    caption: "Starting a recording opens a quick switcher with the meeting types, the saved presets and an option to add a new type."
  - file: "ai-meeting-notes-participants.svg"
    caption: "The participants picker lists one note per person from the contacts folder."
  - file: "ai-meeting-notes-recording.svg"
    caption: "During a meeting the notes file opens with the transcript embedded below its headings, and the status bar shows the recording time."
  - file: "ai-meeting-notes-settings.svg"
    caption: "The top of the settings tab: the consent disclaimer, which must be accepted before the plugin records, then the transcription settings. Audio, output, silence detection, the floating indicator, meeting types and presets follow further down."
diagram:
  file: "ai-meeting-notes.svg"
  caption: "Audio is captured and prepared inside Obsidian. Speech recognition and speaker labelling run in AssemblyAI's cloud, and the labelled turns come back over the same connection into a transcript file that the meeting's notes file embeds."
# AssemblyAI's own documentation and articles on the service the plugin uses, then the web standard its audio path is built on.
# Checked against the live pages on 2026-10-30.
references:
  - title: "Streaming Diarization and Multichannel"
    url: "https://www.assemblyai.com/docs/streaming/label-speakers-and-separate-channels"
    authors: "AssemblyAI"
    source: "AssemblyAI documentation, 2026a"
    use: "How live speaker labels work, why very short turns are marked PENDING, and the corrections sent when a session ends."
  - title: "What is speaker diarization and how does it work? (Complete 2026 guide)"
    url: "https://www.assemblyai.com/blog/what-is-speaker-diarization-and-how-does-it-work"
    authors: "Foster"
    source: "AssemblyAI blog, 2026"
    use: "Background on finding who spoke when: voice activity detection, segmentation, voice embeddings and clustering."
  - title: "Introducing Keyterms Prompting to Streaming STT: Never miss the words that matter most"
    url: "https://www.assemblyai.com/blog/streaming-keyterms-prompting"
    authors: "Bernstein"
    source: "AssemblyAI blog, 2025"
    use: "Key-term prompting, which the plugin fills with the names of the people in the contacts folder and the user's own terms."
  - title: "Streaming WebSocket API"
    url: "https://www.assemblyai.com/docs/streaming/api-spec/streaming-websocket"
    authors: "AssemblyAI"
    source: "AssemblyAI documentation, 2026b"
    use: "The streaming endpoint, its messages and the turn-silence settings behind the plugin's endpointing presets."
  - title: "Web Audio API 1.1"
    url: "https://www.w3.org/TR/webaudio-1.1/"
    authors: "Adenot and Choi (editors)"
    source: "W3C Working Draft, 2026"
    use: "The AudioWorklet, whose input sums the two audio sources and which averages them to mono."
---

## The problem

Taking notes in a meeting splits my attention between listening and writing, and the notes still miss things. A separate recorder app leaves the transcript outside my notes. On a video call the other participants' voices come through the computer's sound output, which a recorder that listens only to the microphone misses when I wear headphones.

## How it is built

AI Meeting Notes records two sources at once: the microphone and, on Windows, the computer's own sound output, which carries the remote participants' voices. For the microphone stream, the plugin requests the browser's echo cancellation, which reduces how much of the speakers' output it picks up a second time. Both streams feed an AudioWorklet, the Web Audio component that processes sound on the audio rendering thread rather than in the page's main loop (Adenot and Choi, 2026). Web Audio sums the two sources, the worklet averages them to mono, and the plugin cuts the result into frames of 100 milliseconds of 16-bit audio at 16 kHz. Three parts of the plugin read these frames: the streaming client, an optional recorder that saves a local WAV file, and a silence monitor. I chose to detect silence by loudness rather than with a voice detector, because the mixed microphone and system audio defeated voice-detection thresholds. Its noise floor is calibrated from the first three seconds of each session.

From the worklet, the frames travel over a WebSocket to AssemblyAI's streaming service (AssemblyAI, 2026b). The plugin keeps my API key on my computer, encrypted by Electron's secure storage, and sends it only to AssemblyAI's token service. A short-lived token, not the key, opens the WebSocket connection. Two settings shape what comes back. Key terms, built from the names of the people in the contacts folder and a list of my own words, make names and jargon more likely to be recognised correctly (Bernstein, 2025). Endpointing presets set how long a pause must last before the service closes a turn, which trades fast live text against sentences split at pauses. Speaker diarization, the task of working out who spoke when, also runs on the service, which groups stretches of speech by the voice embeddings they produce (Foster, 2026). Live labels are least reliable early in a meeting and on very short turns, which AssemblyAI marks as PENDING and the plugin never writes as a speaker. When the session ends, the service sends corrected labels (AssemblyAI, 2026a). Because the plugin assigns labels when it renders the transcript, it can rewrite the whole transcript with the corrections. During a short network drop, a 15-second buffer holds the audio while the plugin reconnects. If the reconnection fails, transcription ends for that session.

The notes and the transcript are ordinary Markdown files in the vault. Each meeting gets two files: a notes file built from a template, with the date, the start time and the participants in its frontmatter, and a transcript file that fills while the meeting runs. Because the notes file embeds the transcript, the transcript appears below the notes as it grows. A preset sets the meeting type, the template and the participants in one step, while a plain meeting type leads through a template picker and a participants picker. Participants come from a folder with one note per person, so the attendee list links to those notes. If I choose, the plugin merges the transcript into the notes file when recording stops. I built the first version, in February 2026, as a Python backend with a separate desktop window alongside the plugin. Version 1.0, released in June 2026, moved everything into the plugin, so nothing else has to be installed or kept running.

## What it does

- It records the microphone and, on Windows, the computer's sound output, so the remote participants are captured as well.
- A live transcript with speaker labels appears while the meeting runs, in a transcript file that the meeting's notes file embeds.
- A preset, or a meeting type followed by the template and participants pickers, sets up the notes in a few clicks.
- It warns after a stretch of silence and stops on its own after two minutes of it. It can save a local WAV copy, recovers when a Bluetooth microphone drops out, and can pause and resume.
- Speech recognition and speaker labelling run on AssemblyAI's streaming service with my own API key, which is stored encrypted on my computer. Everything else runs inside Obsidian.
