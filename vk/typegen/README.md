# VOID KULTUR • Type Engine v5 (Alpha)

This version adds **transparent background export** so you get *only the letters* in the video.

## Run
Use any static server:
- VS Code Live Server, or
```bash
python3 -m http.server 8080
```

## Transparent export notes
- Set **Background → Transparent (alpha)**
- Click **Record**
- Output is **WebM** (VP8/VP9). In most Chromium browsers, this can carry alpha.

### Convert to .mov with alpha (recommended)
If your editor needs a .mov with transparency, convert WebM → ProRes 4444:

```bash
ffmpeg -i input.webm -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le output.mov
```

## MP4 warning
MP4 (H.264/H.265) typically does **not** support an alpha channel for this workflow.
