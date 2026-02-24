# VOID KULTUR • Type Engine

A tiny web tool to generate fast cryptic typographic loops (vertical reels) with **preview + one-click recording**.

## What it does
- Type words/lines (one per line)
- Generates bold editorial typography animation on a canvas
- Lets you **record** and download a video (WebM) via the browser

## Run locally
Any static server works:

### Option A: VS Code Live Server
Open the folder and run Live Server on `index.html`.

### Option B: Python
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080/voidkultur-type-engine/`

## Export format
Browsers reliably record to **WebM**.

### Convert to MP4 (recommended)
If you need MP4 for some workflows, convert with ffmpeg:

```bash
ffmpeg -i input.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart output.mp4
```

## Notes
- 1080×1920 @ 60fps is a lot. If preview stutters, use 720×1280.
- If you want: a "preset pack" that matches your exact VK typography grid and spacing, we can lock those rules in.
