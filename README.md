# ekmungi.github.io

The personal website of Anant Vemuri, at https://ekmungi.github.io. It has a landing page, a profile with research themes, a projects section and a blog about AI in healthcare. The site is built with Astro 7.4.1 and is plain static pages: it works without JavaScript and loads its fonts from its own files.

## Set up and preview

You need Node 22.22 or newer. Install the dependencies once with `npm install`, then start the preview with `npm run dev`. The preview shows draft posts and draft projects, so you can see an entry while you write it.

## Unfinished parts stay hidden

The published site never shows a part that is not finished. Three parts appear on their own, with no other edit, as soon as their content exists:

- **The portrait photo.** Without the file `public/images/photo.jpg`, the landing page shows its text only, with no empty space for a photo. When the file is added, the photo appears beside the text.
- **The profile story.** While the text of `src/content/profile/profile.md` is still the placeholder (a paragraph marked with `data-placeholder`), the profile page leaves out its Story frame and At a glance uses the full width of its row. When the placeholder is replaced by the written story, the Story frame appears beside At a glance.
- **The blog.** While no post is published, the top menu and the landing page do not link to the blog. The page `/blog/` is still built, with its title and lede only, but nothing leads to it. The first published post (a file in `src/content/posts` without `draft: true`) brings the Blog link in the menu, a third link on the landing page, and the pages of the post and its tags.

`npm run dev` and the test build show all of these parts, with the unwritten text marked by `data-placeholder`, so you can see what is still missing while you write. A production build never contains a `data-placeholder` mark.

## Add a blog post

A post is one Markdown file in `src/content/posts`. The file name becomes the address: `my-new-post.md` appears at `/blog/my-new-post/`, so use lower-case words joined by hyphens.

```markdown
---
title: "The title of the post"
date: 2026-10-21
summary: "One or two sentences. They appear in the post list."
tags: ["endoscopy", "AI"]
---

The text of the post, written in Markdown.
```

- `title`, `date`, `summary` and `tags` are required. A post needs at least one tag, and a title or summary of only spaces fails the build.
- Write the date as `YYYY-MM-DD`, for example `2026-10-21`. Any other form fails the build.
- Tags are free text. Every tag gets its own page at `/blog/tags/<tag>/`, so you do not register a tag anywhere.
- Add `draft: true` to keep a post off the published pages. A draft shows in `npm run dev` and is left out of the production build.
- A draft is not private. This repository is public, so anyone can read a committed draft on GitHub. Keep private or unfinished writing outside the repository until it may be read, and commit it only then.

### Pictures in a post

Put the pictures of a post in `public/images/posts/`, with names that start with the post's file name, for example `public/images/posts/my-new-post-diagram.png`. Show a picture in the post with `![What the picture shows](/images/posts/my-new-post-diagram.png)`. Use JPEG, PNG or WebP, and remove all metadata first, as described for the portrait photo below.

`npm test`, `npm run test:ci` and `npm run check:launch` check every image in `public/`, in `src/` and in the build. They fail while an image still carries metadata (Exif, XMP or IPTC in a JPEG, text or Exif chunks in a PNG, EXIF or XMP chunks in a WebP), and they refuse GIF, AVIF, HEIC and TIFF images, whose metadata they cannot read.

## Add a project

A project is one Markdown file in `src/content/projects`. The file name becomes the address in the same way: `my-project.md` appears at `/projects/my-project/`.

```markdown
---
title: "The name of the project"
kind: software
summary: "One sentence about what it is."
status: "Public on GitHub"
repo: "https://github.com/ekmungi/smart-search"
---

The text of the project page, written in Markdown.
```

- `title`, `kind`, `summary` and `status` are required. `kind` is `research` or `software`. A title or summary of only spaces fails the build.
- `repo` is optional and must have exactly the form `https://github.com/ekmungi/<name>`, with a repository from the public list described below.
- A project whose code is not public sets `private: true` and has no `repo` link.
- A research experiment can carry a `colab` link (a notebook on Colab) and a dated `updates` list: each update is a `date` in `YYYY-MM-DD` form and a `text`.
- A project can show a "How it works" diagram below its text. Put the SVG in `src/assets/diagrams/`, with a name of lower-case letters, digits and hyphens, and name it in the project with `diagram:`, giving its `file` (for example `smart-search.svg`) and a one-sentence `caption`. The SVG is placed in the page as drawn, so its labels use the site's font. Give the SVG a `min-width` equal to its drawn width, so that on a phone it scrolls sideways inside its frame. A diagram file the folder does not hold fails the build.
- A project can open with a warning box above everything else, set under `notice:` with a `title` and a `text`. Keep it for warnings the reader must not miss, such as the need for consent before recording.
- A project can show views of its interface in a "What it looks like" frame, listed under `views:`. Each view has a `file` (an SVG in `src/assets/diagrams/`, named like a diagram) and a one-sentence `caption`. Draw each view 500 pixels wide with `min-width:500px`, so two fit side by side on a wide screen. Draw views from the project's code with invented names and data, so nothing personal shows.
- A project can end with the papers it builds on, listed under `references:`. Each reference has a `title`, a `url` (required, for example a `https://doi.org/` or `https://arxiv.org/abs/` address), `authors`, a `source` (where and when it appeared, for example `SIGIR 2009`) and a `use` (one sentence on what the project takes from the paper). They are shown in a References frame at the end of the page, in the order written.
- Add `draft: true` to keep the project off the published pages. As with posts, the file itself can still be read on GitHub once it is committed.

Research themes on the profile page live in `src/content/research`, and the profile text itself is `src/content/profile/profile.md`. Their header fields are defined in `src/content/schemas.ts`, and the build tells you which field is wrong. A paper or publication whose title is not in English names its language with `lang` (for example `lang: fr`), so screen readers pronounce it correctly, and may give an English `translation`, which is shown after the title in brackets.

## Check before every push

Run `npm test` and `npm run check:launch` before every push.

1. `npm test` builds the site (the public build, a test build that includes drafts, and a few small builds of invented content in the git-ignored folder `fixture-builds/`) and runs the unit, site and local tests, including the privacy checks. The tests read what each page must show from the content files, so they keep passing as you add, publish or delete posts and projects. It must pass.
2. `npm run test:ci` runs the same builds and every test that needs no private list (everything in `tests/unit` and `tests/site`). The publishing workflow runs it on GitHub, where the private lists do not exist. `npm test` already includes it, so you need it locally only to see what the workflow will see.
3. `npm run check:launch` builds the public site and checks that nothing unfinished is visible in it: no `data-placeholder` marks (unwritten text), no draft titles, no stand-in titles that start with "Example:", no link to a page that is not built, no link to the blog while no post is published, and no image with metadata in the build, `public/` or `src/`. It does not ask for a photo, a published post or a written story, because those parts stay hidden until they exist (see above). The messages list what is still visible. Do not make the site public while it fails.

Text that has not been written yet is marked with a `data-placeholder` attribute, and a published page never shows such a mark. Never fill a gap with invented text.

### The portrait photo

The photo is optional: the landing page shows it when the file `public/images/photo.jpg` exists and shows its text only until then. Photos taken with a phone usually carry metadata (EXIF) that can include the place and the time the picture was taken. Remove all metadata before you add the photo as `public/images/photo.jpg`. On Windows, right-click the file, choose Properties, open the Details tab, choose "Remove Properties and Personal Information" and create a copy with all possible properties removed. `npm run check:launch` fails while the file still contains Exif, XMP or IPTC metadata, and it also fails if the file is not a JPEG. For a PNG, which Windows cannot clean this way, export the picture again from an image editor with the option to include metadata switched off.

## Personal data never goes into this repository

This is a public repository and a public website. No home address, phone number, personal email address, date of birth, family detail or other private information may appear in a built page or in any committed file. That includes this README, the tests, the content files and commit messages.

The build is checked against two private lists kept outside the repository: `private/forbidden-terms.txt` and `private/avoided-wording.txt`, each with one entry per line. They stay on your computer: the `private/` folder is listed in `.gitignore`, and the test fails if either file is missing, tracked by git or not ignored. The test searches every built page, every file git tracks (or is about to track) and every file name for each entry of the first list, ignoring capitalisation, and it checks the built pages, this README and the CHANGELOG against the second list. When it finds an entry, it names the file and the line number in the list, and never the entry itself.

If you set up the repository on a new computer, create both files again from your own records before you run `npm test`. The test refuses a file that is empty or saved in the wrong encoding (save it as UTF-8). In the second list an entry matches whole words only, and an entry that ends in `*` matches every word that starts with it.

## Links to GitHub repositories

The site may link only to repositories that are public and on the allow-list `SITE.publicRepos` in `src/data/site.ts`. Content files that name any other repository under github.com/ekmungi fail the build, and the site tests check every built page again. To link to a new repository, first make it public, then add its name to `SITE.publicRepos`.

## Publishing

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages when something is pushed to the `master` branch, or when you start it by hand from the Actions tab. Before it builds the site for publishing, the workflow runs `npm run test:ci` and then `npm run check:launch`. A push to `master` therefore fails, and the live site stays as it is, while a test fails or the site is not ready to go live. The workflow cannot run the tests in `tests/local`, because they need the private lists, so running `npm test` before every push remains your responsibility. Only one publishing run happens at a time: a newer push waits for the running one to finish. The checkout step does not keep the access token, so no later step can push to the repository. For the workflow to publish, the repository's Pages setting must use "GitHub Actions" as its source. Every action in the workflow is pinned to a full commit SHA, and Dependabot (`.github/dependabot.yml`) opens a pull request each week when a pinned action has a newer version.

## Where things are

- `src/pages` holds the pages (`src/pages/404.astro` is the page GitHub Pages shows for an address that does not exist), `src/components` and `src/layouts` the shared parts, and `src/styles` the colours, type and layout rules. `src/layouts/Base.astro` writes each page's description and its Open Graph tags (title, description, address and type) for link previews.
- `src/content` holds the Markdown files for posts, projects, research themes and the profile.
- `src/data/site.ts` holds the site name, navigation and the public repository list.
- `tests` holds the unit tests (`tests/unit`), the site tests (`tests/site`), the tests that read the private lists (`tests/local`, run only by `npm test`) and the launch gate (`tests/launch`, run only by `npm run check:launch`).
- `CHANGELOG.md` lists the changes for each version.
