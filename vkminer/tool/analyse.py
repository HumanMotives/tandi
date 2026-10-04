#!/usr/bin/env python3
"""Een bron volledig uitschrijven op verzoek van de pagina (knop Analyse Entire Source).

Verzoek: {"action": "analyse", "batch": "...", "transcript": "transcripts/x.json"}
Vult het transcript aan vanaf waar de oogst stopte. Knipt zelf niets.
"""
import json
import re
import sys
import tempfile
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest import chunked, fetch_to_wav, fmt_time, wav_duration, write_transcript  # noqa: E402


def fail(msg):
    print(msg)
    sys.exit(1)


def main():
    body_path, root = Path(sys.argv[1]), Path(sys.argv[2])
    cfg = yaml.safe_load((Path(__file__).resolve().parent / "config.yaml").read_text())
    raw = body_path.read_text()
    m = re.search(r"```json\s*(\{.*?\})\s*```", raw, re.S)
    try:
        req = json.loads(m.group(1) if m else raw)
    except json.JSONDecodeError:
        fail("Geen geldig verzoek gevonden.")

    batch = str(req.get("batch", ""))
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,80}", batch):
        fail("Ongeldige batchnaam.")
    bdir = root / "batches" / batch
    clips_path = bdir / "clips.json"
    if not clips_path.exists():
        fail(f"Batch {batch} bestaat niet.")
    data = json.loads(clips_path.read_text())

    tpath = str(req.get("transcript", ""))
    if not any(c.get("transcript") == tpath for c in data["clips"]):
        fail("Deze bron hoort niet bij de batch.")
    tfile = bdir / tpath
    tdata = json.loads(tfile.read_text())
    if not tdata.get("partial"):
        print(f"{tdata.get('title', 'Bron')} was al volledig uitgeschreven.")
        return

    segs = [{"start": a, "end": b, "text": t} for a, b, t in tdata["segments"]]
    start = float(tdata.get("analysed_until") or (segs[-1]["end"] if segs else 0.0))
    whisper = tdata.get("whisper") or "base.en"

    from faster_whisper import WhisperModel
    model = WhisperModel(whisper, device="cpu", compute_type="int8")

    wav = Path(tempfile.mkdtemp()) / "src.wav"
    print(f"Downloaden: {tdata['url']}", flush=True)
    fetch_to_wav(tdata["url"], wav)
    total = wav_duration(wav)
    print(f"Uitschrijven vanaf {fmt_time(start)} tot {fmt_time(total)}", flush=True)
    rest, until = chunked(model, wav, total, cfg, start=start)
    wav.unlink(missing_ok=True)

    last = segs[-1]["end"] if segs else -1
    segs += [x for x in rest if x["start"] >= last - 0.05]
    meta = {k: tdata[k] for k in ("item", "file", "title", "url") if k in tdata}
    write_transcript(tfile, meta, segs, total, total, whisper)
    print(f"{tdata.get('title', 'Bron')} volledig uitgeschreven: {len(segs)} zinnen.")


if __name__ == "__main__":
    main()
