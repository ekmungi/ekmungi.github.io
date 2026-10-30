---
# Project page: Notion Obsidian Theme. Software, public on GitHub. A design and features overview rather than a technical one.
# Summary and text come from the theme's CSS, README and changelog (version 1.1.0), checked on 2026-10-30.
title: "Notion Obsidian Theme"
kind: software
summary: "An Obsidian theme, forked from Obsidianotion, that makes notes look and read like Notion, with its fonts built in."
status: "Public on GitHub"
repo: "https://github.com/ekmungi/notion-obsidian"
# Views drawn from the theme's CSS and its Style Settings block, with invented note content. The theme has no data flow to diagram,
# so its colours and type stand in for the "How it works" frame.
views:
  - file: "notion-obsidian-light.svg"
    caption: "A note in light mode: brown-black headings, warm grey sidebar items and a tab underlined in the heading colour, on Obsidian's own page."
  - file: "notion-obsidian-dark.svg"
    caption: "The same note in dark mode: warm light-grey headings and text, dark greys in the sidebar and a lighter active tab."
  - file: "notion-obsidian-palette-light.svg"
    caption: "The light palette: the colours the theme applies in light mode, with what each one is for."
  - file: "notion-obsidian-palette-dark.svg"
    caption: "The dark palette: the colours the theme applies in dark mode."
  - file: "notion-obsidian-type.svg"
    caption: "The type scale: six heading sizes close to Notion's proportions, the body size and the four built-in body fonts."
  - file: "notion-obsidian-settings-layout.svg"
    caption: "Style Settings, part one: the body width and the layout switches."
  - file: "notion-obsidian-settings-type.svg"
    caption: "Style Settings, part two: the body font, the two font-size sliders and the heading sizes."
# The original theme, the plugin its settings rely on, the licence of its fonts and Obsidian's theme variables.
# Checked against GitHub and the live pages on 2026-10-30.
references:
  - title: "Obsidianotion"
    url: "https://github.com/diegoeis/obsidianotion"
    authors: "Eis"
    source: "GitHub, 2023"
    use: "The theme this one is forked from, at its version 1.1.39, released into the public domain under the Unlicense."
  - title: "Style Settings"
    url: "https://github.com/community-archive/obsidian-style-settings"
    authors: "Meyers"
    source: "GitHub, 2021"
    use: "The Obsidian plugin that turns the theme's settings block into the panel of switches, sliders and fields."
  - title: "SIL Open Font License, version 1.1"
    url: "https://openfontlicense.org/open-font-license-official-text/"
    authors: "SIL International"
    source: "openfontlicense.org, 2007"
    use: "The licence under which the theme's fonts, Fira Sans, Fira Code, Source Sans 3, Nunito Sans and Inter, are built in."
  - title: "CSS variables"
    url: "https://docs.obsidian.md/Reference/CSS+variables/CSS+variables"
    authors: "Obsidian"
    source: "Obsidian developer documentation, 2026"
    use: "The variables Obsidian exposes to themes, which this theme sets alongside variables of its own."
---

## The problem

I read and write in Obsidian all day, and its default look is built more for writing than for reading. I prefer the calm page that Notion gives a document: a white page, warm greys around it, generous spacing and clear headings.

## The design

Notion Obsidian is a fork of Obsidianotion, a theme by Diego Eis that he released into the public domain (Eis, 2023). I kept its structure and most of its layout options, and changed what a reader notices first. In light mode the theme colours headings a near-black brown (#37352f), sidebar items a warm grey (#787774) with soft greys for the hovered and selected item, table rows with faint borders (#e9e9e7) and the dividers between panes a warm off-white (#f7f6f3), and it underlines the active tab in the heading colour. Dark mode mirrors this with warm light-grey headings and text (#e3e2e0) and darker greys in the sidebar. The page itself keeps Obsidian's own background. Heading sizes stay close to Notion's proportions, from 1.8 rem for the first level down to 1 rem for the fifth and sixth, and Dataview tables get a light header row.

The fonts travel with the theme. Fira Sans, Source Sans 3, Nunito Sans, Inter and Fira Code are embedded in the theme file under the SIL Open Font License (SIL International, 2007), so a note looks the same on every computer without installing anything, and Obsidian Sync carries the fonts to other devices. Sizes and colours are set through CSS variables, mostly the theme's own alongside Obsidian's (Obsidian, 2026), and the Style Settings plugin (Meyers, 2021) turns the theme's settings block into a panel. There, a reader can change the body width, pick the body font, scale the interface and the Settings window separately, set each heading size, and switch layout details such as the ribbon, the scrollbar styling and the icons in the sidebar.

## What it does

- It gives Obsidian's light and dark modes colours close to Notion's: brown-black or warm light-grey headings, warm greys in the sidebar and faint table borders.
- Heading sizes stay close to Notion's proportions, and every heading size, the body size and the table text size can be changed.
- Fira Sans is the default body font, with Source Sans 3, Nunito Sans or Inter as alternatives, and all four are built into the theme.
- The interface and the Settings window have their own font-size sliders, so menus can stay small while settings stay readable.
- Switches hide the ribbon, shrink pinned tabs, style the scrollbars, show or hide the sidebar icons, move the new-note button and turn on alternative checkboxes.
