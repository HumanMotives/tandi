#!/usr/bin/env python3
"""Extra knippen op verzoek van de auditpagina (via een GitHub-issue).

Leest een JSON-blok uit de issue-tekst:
{"batch": "...", "transcript": "transcripts/x.json", "ranges": [{"start": 1.0, "end": 9.5, "text": "..."}]}
Alleen bronnen die al in die batch staan worden geaccepteerd.
"""
import json
import re
import sys
import tempfile
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest import cut, fetch_to_wav, pad_end, pad_start, slug  # noqa: E402

MAX_RANGES = 20
MAX_LEN = 120  # seconden per knip


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
    sources = [c for c in data["clips"] if c.get("transcript") == tpath]
    if not sources:
        fail("Deze bron hoort niet bij de batch.")
    ref = sources[0]
    tdata = json.loads((bdir / tpath).read_text())
    total = float(tdata["duration"])

    ranges = []
    for r in (req.get("ranges") or [])[:MAX_RANGES]:
        a, b = float(r["start"]), float(r["end"])
        a, b = max(0.0, a), min(total, b, a + MAX_LEN)
        if b - a >= 0.3:
            ranges.append((a, b, str(r.get("text", ""))[:600]))
    if not ranges:
        fail("Geen geldige stukken om te knippen.")

    existing = {c["id"] for c in data["clips"]}
    top = max((c.get("score") or 0) for c in data["clips"]) + 1
    wav = Path(tempfile.mkdtemp()) / "src.wav"
    fetch_to_wav(tdata["url"], wav)

    made = []
    for a, b, text in ranges:
        base_id = f"{slug(ref['item'])}-{slug(Path(ref['source_file']).stem, 20)}-{int(a):05d}-x{int(b):05d}"
        cid, n = base_id, 2
        while cid in existing:
            cid, n = f"{base_id}-{n}", n + 1
        existing.add(cid)
        ca, cb = cut(wav, a, b, total, pad_start(cfg), pad_end(cfg), bdir / "clips" / f"{cid}.wav")
        clip = {k: ref[k] for k in ("item", "title", "source_file", "year", "item_url", "license",
                                     "transcript", "source_dl") if k in ref}
        clip.update({
            "id": cid, "file": f"clips/{cid}.wav", "text": text,
            "score": top, "ai": None, "tags": ["extra"], "extra": True,
            "start": round(ca, 2), "end": round(cb, 2), "t0": round(a, 2), "t1": round(b, 2),
            "source_url": f"{ref.get('source_dl', tdata['url'])}#t={ca:.1f}",
        })
        data["clips"].insert(0, clip)
        made.append(clip)
    wav.unlink(missing_ok=True)

    clips_path.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    idx = root / "batches.json"
    if idx.exists():
        batches = json.loads(idx.read_text())
        for b in batches:
            if b.get("name") == batch:
                b["count"] = len(data["clips"])
        idx.write_text(json.dumps(batches, ensure_ascii=False, indent=1))

    print(f"{len(made)} extra clip(s) geknipt uit {ref['title']}. "
          f"Ververs de pagina over een paar minuten; ze staan bovenaan in batch {batch} met label extra.")


if __name__ == "__main__":
    main()
