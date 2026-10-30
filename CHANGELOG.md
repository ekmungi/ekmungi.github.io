# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.4.1] - 2026-10-30

### Changed

- The YouTube Transcribe page has a new text: the problem, a "How it is built" section, and what it does. It also has four views of the plugin drawn from its code with an invented example video, a diagram of how a link becomes a note, and four references: yt-dlp, YouTube's help page on automatic captions, a Google paper on the speech recognition behind them, and the Claude Code documentation on skills. The page says plainly that transcripts come from YouTube's own captions, so a video without captions cannot be transcribed. An independent review against the code (plugin 0.5.0, engine 0.14.0) corrected nine claims before publishing.
- The settings views on the AI Meeting Notes and YouTube Transcribe pages show Obsidian's settings as a dialog with a close button only, as Obsidian draws them.

## [0.4.0] - 2026-10-30

### Added

- A project page can show views of the project's interface in a "What it looks like" frame, between the text and the "How it works" diagram. The project lists SVG files from `src/assets/diagrams/` under `views:`, each with a caption, and the page shows them two to a row on a wide screen. A view the folder does not hold stops the build.
- A project page can open with a warning box above everything else, set under `notice:` with a `title` and a `text`. The box uses three new colour tokens (`--warn-bg`, `--warn-rule`, `--warn-ink`), kept for warnings alone, and its text meets the same 4.5 to 1 contrast as the rest of the site.
- The AI Meeting Notes page opens with a warning box: record only with the consent of everyone in the meeting, and no liability is accepted for recordings made without it.
- The AI Meeting Notes page has a new text: the problem, a "How it is built" section, and what it does. It also has four views of the plugin drawn from its code with invented names, a diagram that shows where audio leaves the computer, and five references to AssemblyAI's documentation and articles and to the W3C Web Audio API. The old summary said the plugin writes an AI summary, which it does not, so the summary is corrected.

### Changed

- The Obsidian Database project page is removed.

### Fixed

- Every build, the dev server and the fixture builds now clear Astro's content cache (`--force`), so a change to a content schema reaches every entry. Before this, entries from unchanged files kept their old shape, and the local build failed the same way the first 0.3.0 deploy did.

## [0.3.1] - 2026-10-30

### Changed

- The Smart Search page explains its built-in MCP server: how Claude Code reaches the same index as the desktop app, which tools the server offers, and that Smart Search replaced the earlier Smart Search MCP. The MCP specification is added to its references.
- The separate Smart Search MCP project page is removed. That tool was retired when Smart Search replaced it in March 2026.

## [0.3.0] - 2026-10-30

### Added

- A project page can show a "How it works" diagram in a full-width frame below its text. The project names an SVG from `src/assets/diagrams/` with `diagram:` (a `file` and a `caption`), and the SVG is placed in the page as drawn, so its labels use the site's font. On a phone the diagram scrolls sideways inside its frame, and the page itself does not. A diagram the folder does not hold stops the build.
- A project page can end with a References frame, listing the papers the project builds on. Each one has a linked title, its authors and source, and a line on what the project takes from it. The project lists them under `references:`, and every reference needs a web address.
- The Smart Search page has a new text: the problem it solves, a "How it is built" section that explains how the six papers behind its methods shaped each step, what it does, a diagram of how it indexes files and answers a search, and the references. The text was checked against the code of version 0.15.1 by an independent review, and the references were checked against Crossref and arXiv.

### Changed

- Lists in a project's text keep the same line length as its paragraphs.
- Frame titles carry the class `frame-title`, so a heading inside the frame text is not mistaken for the frame's title.

### Fixed

- The publishing build no longer restores Astro's content cache from an earlier run. The cache kept project entries from before the `references` field existed, so the first push of this version failed to build while the tests passed.

## [0.2.1] - 2026-10-23

### Fixed

- The publishing build installed nothing, because `package-lock.json` lacked two entries (`@emnapi/core`, `@emnapi/runtime`) that newer npm versions require. The lockfile now has them, and a unit test checks that the lockfile resolves every dependency it declares.

## [0.2.0] - 2026-10-23

The site can go live before the portrait photo, the profile story and the first blog post exist.

### Changed

- Unfinished sections stay hidden in published pages. Without `public/images/photo.jpg` the landing page shows its text only. While the profile story is still a placeholder, the profile page leaves out the Story frame and At a glance uses the full row. Until the first post is published, the top menu, the landing page and the 404 page do not link to the blog. Each part appears on its own as soon as its content exists. The dev server and the test build still show the unfinished parts, marked with `data-placeholder`.
- The launch gate checks that nothing unfinished is visible: no `data-placeholder` marks, no draft or example titles, no link to a page that is not built, no link to the blog while no post is published, and no image with metadata. It no longer asks for a portrait photo, a published post or a written story.

## [0.1.0] - 2026-10-21

Astro rebuild. The old Jekyll site is replaced by a new Astro 7 site.

### Added

- A landing page with the portrait slot, short introduction and links to the sections.
- A profile page with an at-a-glance block, experience, publications, patents, mentoring and education, and one page for each research theme.
- A projects section with a list and one page for each project, covering research experiments and software, with a link to the repository only where the repository is public.
- A blog with a post list, one page for each post and one page for each tag. Tag pages are ordinary pages, so filtering works without JavaScript.
- The privacy policy at `/privacy.html`, with the text kept word for word.
- A top bar with one-line hints, a footer, the colour and type rules, and fonts served from the site's own files. Links inside running text are underlined, and the current top-bar link is marked by weight and an underline as well as colour. The stylesheet keeps its breakpoints in the `max-width` form, so the layout also works in Safari before 16.4.
- A meta description and the basic Open Graph tags (title, description, address and type) on every page, and a 404 page in the site's look.
- Paper titles in another language than English carry that language, so screen readers pronounce them correctly.
- Content files checked at build time: dates must be written `YYYY-MM-DD`, post and project titles and summaries must not be blank, and links to repositories outside the public list are refused.
- Privacy checks: the build is checked against private lists kept outside the repository. The check covers built pages, repository files and file names, and it also finds entries written with HTML entities or invisible characters.
- A launch gate, `npm run check:launch`, which fails while the production build still has placeholders, draft titles, no published post or no portrait photo, or while any image in the build or its sources carries metadata (Exif, XMP or IPTC in a JPEG, text or Exif chunks in a PNG, EXIF or XMP chunks in a WebP). `npm test` and `npm run test:ci` run the same image check.
- `npm run test:ci`, which runs the builds and every test that needs no private file.
- A GitHub Actions workflow that runs `npm run test:ci` and the launch gate and then publishes the site to GitHub Pages on a push to `master`. Only one publishing run happens at a time, the checkout keeps no access token, every action is pinned to a full commit SHA, Dependabot proposes updates weekly, and each job has only the permissions it needs.
- A README with instructions for adding posts and projects, previewing the site and running the checks.

### Removed

- The Jekyll site files and their build output.
