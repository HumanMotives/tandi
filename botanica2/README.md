# Botanica Sequencer

Botanica is an organic MIDI sequencer by Human Motives.

## Current version

v0.2

This version keeps the original browser behavior but splits the single HTML prototype into:

- `web/index.html`
- `web/style.css`
- `web/app.js`

The original single-file prototype is preserved in:

- `archive/botanica-v9-original.html`

## Cloudflare Pages

Set the publish directory to:

```text
web
```

## Local testing

Open:

```text
web/index.html
```

For WebMIDI, Chrome is recommended. Some browsers require the page to be hosted or served from localhost.

## Roadmap

v0.3:
- Extract musical logic into `engine/`
- Keep browser behavior identical

v0.4:
- Add first Max for Live bridge prototype

v1.0:
- Stable browser + Max for Live release
