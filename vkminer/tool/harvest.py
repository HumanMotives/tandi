#!/usr/bin/env python3
"""HUMAN/MOTIVES sample harvester.

Zoekt op Internet Archive, transcribeert met Whisper, scoort zinnen
(trefwoorden + optioneel Claude), knipt de beste stukken als WAV en
schrijft een audit-site naar --out.
"""
import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import internetarchive as ia
import requests
import yaml

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "processed.txt"
SEEN = ROOT / "seen.txt"  # al geknipte zinnen, tegen dubbelingen

AUDIO_FORMATS = ["64Kbps MP3", "VBR MP3", "128Kbps MP3", "MP3", "Ogg Vorbis", "Flac", "WAVE"]
VIDEO_FORMATS = ["512Kb MPEG4", "h.264", "h.264 IA", "MPEG4", "Ogg Video", "MPEG2", "Cinepack"]
PD_HINTS = ["publicdomain", "public domain", "/mark/", "cc0"]


def log(*a):
    print(*a, flush=True)


# ---------- Internet Archive ----------

def parse_len(v):
    if v in (None, ""):
        return None
    try:
        if ":" in str(v):
            s = 0.0
            for p in str(v).split(":"):
                s = s * 60 + float(p)
            return s
        return float(v)
    except ValueError:
        return None


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def license_of(md):
    url = " ".join(as_list(md.get("licenseurl")))
    rights = " ".join(as_list(md.get("rights")))
    colls = as_list(md.get("collection"))
    txt = f"{url} {rights}".lower()
    if any(h in txt for h in PD_HINTS):
        status = "public-domain"
    elif "prelinger" in colls:
        status = "public-domain"
    elif "creativecommons.org" in url:
        status = "cc"
    else:
        status = "check"
    return {"status": status, "url": url, "rights": rights[:240]}


def pick_files(item, max_files, max_minutes):
    """Beste afspeelbare variant per bronbestand; audio boven video."""
    best = {}
    for f in item.files:
        fmt = f.get("format", "")
        if fmt in AUDIO_FORMATS:
            rank = AUDIO_FORMATS.index(fmt)
        elif fmt in VIDEO_FORMATS:
            rank = 100 + VIDEO_FORMATS.index(fmt)
        else:
            continue
        length = parse_len(f.get("length"))
        if length and length > max_minutes * 60:
            continue
        key = Path(f.get("original") or f["name"]).stem.lower()
        if key not in best or rank < best[key][0]:
            best[key] = (rank, f)
    chosen = sorted(best.values(), key=lambda x: (x[0] >= 100, x[1]["name"]))
    return [f for _, f in chosen][:max_files]


def download_url(identifier, name):
    return f"https://archive.org/download/{identifier}/{quote(name, safe='/')}"


def fetch_to_wav(url, dest):
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(url).suffix) as tmp:
        tmp_path = tmp.name
    try:
        for attempt in range(3):
            try:
                with requests.get(url, stream=True, timeout=60) as r:
                    r.raise_for_status()
                    with open(tmp_path, "wb") as fh:
                        for chunk in r.iter_content(1 << 20):
                            fh.write(chunk)
                break
            except requests.RequestException as e:
                if attempt == 2:
                    raise
                log(f"   download mislukt ({e}), opnieuw...")
                time.sleep(5 * (attempt + 1))
        subprocess.run(
            ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", tmp_path,
             "-vn", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(dest)],
            check=True,
        )
    finally:
        os.unlink(tmp_path)


# ---------- Transcriptie en scoring ----------

def transcribe(model, wav, language):
    segments, info = model.transcribe(
        str(wav), language=language or None, vad_filter=True,
        word_timestamps=True, beam_size=1, condition_on_previous_text=False,
    )
    out = []
    for s in segments:
        words = s.words or []
        start = words[0].start if words else s.start
        end = words[-1].end if words else s.end
        text = s.text.strip()
        if text:
            out.append({"start": float(start), "end": float(end), "text": text})
    return out, float(info.duration)


def compile_keywords(cfg, extra=None):
    pats = [(4, t, re.compile(r"\b" + re.escape(t.lower()))) for t in (extra or [])]
    for weight, terms in (cfg.get("keywords") or {}).items():
        for t in terms:
            pats.append((int(weight), str(t), re.compile(r"\b" + re.escape(str(t).lower()))))
    return pats


def keyword_score(text, pats):
    low = text.lower()
    score, hits = 0, []
    for w, term, rx in pats:
        if rx.search(low):
            score += w
            hits.append(term)
    return score, hits


CLAUDE_PROMPT = """You pick spoken-word samples for an experimental electronic music project.
Wanted: eerie, weird, wonderful lines from old horror/sci-fi films, radio plays and strange interviews
(alien abduction, UFOs, the unexplained). A good sample works on its own, without plot context:
evocative, mysterious, quotable, unsettling or strangely beautiful. Score low for mundane talk,
plot exposition, character names, announcements and commercials.

Rate each numbered line 0-10. Reply with ONLY a JSON array, no prose:
[{"i": <number>, "score": <0-10>, "tags": ["1-3 short lowercase tags"]}]

Lines:
"""


def claude_scores(lines, model, key):
    """lines: list of str. Returns {index: (score, tags)}."""
    result = {}
    for b in range(0, len(lines), 60):
        chunk = lines[b:b + 60]
        body = "\n".join(f"{b + i}: {t}" for i, t in enumerate(chunk))
        try:
            r = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                         "content-type": "application/json"},
                json={"model": model, "max_tokens": 4000,
                      "messages": [{"role": "user", "content": CLAUDE_PROMPT + body}]},
                timeout=120,
            )
            r.raise_for_status()
            text = "".join(c.get("text", "") for c in r.json().get("content", []))
            text = re.sub(r"```(?:json)?", "", text).strip()
            for row in json.loads(text):
                result[int(row["i"])] = (float(row.get("score", 0)), list(row.get("tags", []))[:3])
        except Exception as e:  # scoring is best effort
            log(f"   Claude-scoring overgeslagen voor blok {b}: {e}")
    return result


def norm(text):
    return re.sub(r"[^a-z0-9 ]+", "", text.lower()).strip()


class Seen:
    """Zinnen die al eerder geknipt zijn (ook in vorige batches)."""
    def __init__(self, path):
        self.path = path
        self.items = path.read_text().splitlines() if path.exists() else []
        self.exact = set(self.items)

    def has(self, text):
        n = norm(text)
        if not n or n in self.exact:
            return bool(n)
        for o in self.items:
            m = difflib.SequenceMatcher(None, n, o)
            if m.real_quick_ratio() > 0.85 and m.quick_ratio() > 0.85 and m.ratio() > 0.85:
                return True
        return False

    def add(self, text):
        n = norm(text)
        if n and n not in self.exact:
            self.exact.add(n)
            self.items.append(n)
            with self.path.open("a") as fh:
                fh.write(n + "\n")


def split_list(v):
    if isinstance(v, list):
        items = v
    else:
        items = re.split(r"[,\n]", str(v or ""))
    return [str(x).strip().strip('"').strip() for x in items if str(x).strip()]


def select_clips(segs, cfg, pats, api_key, per_file, seen=None):
    lo, hi = cfg["min_clip"], cfg["max_clip"]
    cands = []
    for i, s in enumerate(segs):
        d = s["end"] - s["start"]
        if not (lo <= d <= hi):
            continue
        gap_before = s["start"] - segs[i - 1]["end"] if i > 0 else 9.0
        gap_after = segs[i + 1]["start"] - s["end"] if i + 1 < len(segs) else 9.0
        if seen is not None and seen.has(s["text"]):
            continue
        kw, hits = keyword_score(s["text"], pats)
        cands.append({**s, "kw": kw, "hits": hits,
                      "isolated": gap_before > 0.4 and gap_after > 0.4})

    use_claude = bool(api_key) and cands
    if use_claude:
        scores = claude_scores([c["text"] for c in cands], cfg["claude_model"], api_key)
        for i, c in enumerate(cands):
            c["ai"], c["tags"] = scores.get(i, (None, []))
    picked = []
    for c in cands:
        ai = c.get("ai")
        if ai is not None:
            if ai < cfg["claude_min_score"]:
                continue
            c["score"] = round(ai * 2 + c["kw"] + (1 if c["isolated"] else 0), 1)
        else:
            if c["kw"] < cfg["keyword_min_score"]:
                continue
            c["score"] = c["kw"] + (1 if c["isolated"] else 0)
        c["tags"] = c.get("tags") or c["hits"][:3]
        picked.append(c)
    picked.sort(key=lambda c: -c["score"])
    final, texts = [], set()
    for c in picked:
        if norm(c["text"]) in texts:
            continue
        if any(c["start"] < f["end"] and f["start"] < c["end"] for f in final):
            continue
        final.append(c)
        texts.add(norm(c["text"]))
        if len(final) >= per_file:
            break
    return final


def cut(src, start, end, total, pad_start, pad_end, dest):
    a = max(0.0, start - pad_start)
    b = min(total, end + pad_end)
    d = b - a
    fade = 0.015
    subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-t", f"{d:.3f}",
         "-i", str(src), "-af", f"afade=t=in:d={fade},afade=t=out:st={max(0, d - fade):.3f}:d={fade}",
         "-c:a", "pcm_s16le", str(dest)],
        check=True,
    )
    return a, b


def build_query(cfg, terms):
    """Zoekt op heel Internet Archive (inclusief Prelinger) naar audio en video."""
    q = lambda t: f'"{t}"' if " " in t else t
    parts = ["mediatype:(" + " OR ".join(cfg.get("search", {}).get("mediatype", ["audio", "movies"])) + ")"]
    if terms:
        parts.append("(" + " OR ".join(q(t) for t in terms) + ")")
    return " AND ".join(parts)


def pad_start(cfg):
    return float(cfg.get("pad_start", cfg.get("pad", 0.35)))


def pad_end(cfg):
    return float(cfg.get("pad_end", 1.5))


def slug(s, n=40):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:n] or "clip"


# ---------- Main ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--terms", default="", help="zoekwoorden, komma-gescheiden; leeg = lijst uit config")
    ap.add_argument("--keywords", default="", help="extra trefwoorden voor het knippen, komma-gescheiden")
    ap.add_argument("--request", help="JSON-bestand of issue-tekst met bovenstaande velden")
    ap.add_argument("--max-items", type=int, default=5)
    ap.add_argument("--max-files", type=int, default=3, help="bestanden per item")
    ap.add_argument("--per-file", type=int, default=8, help="max clips per bestand")
    ap.add_argument("--whisper", default="base.en")
    ap.add_argument("--pd-only", action="store_true")
    ap.add_argument("--batch", default=datetime.now(timezone.utc).strftime("b%Y%m%d-%H%M"))
    ap.add_argument("--out", required=True, help="map voor deze batch")
    ap.add_argument("--batches-index", required=True, help="pad naar batches.json")
    args = ap.parse_args()

    if args.request:
        raw = Path(args.request).read_text()
        m = re.search(r"```json\s*(\{.*?\})\s*```", raw, re.S)
        req = json.loads(m.group(1) if m else raw)
        args.terms = req.get("terms", args.terms)
        args.keywords = req.get("keywords", args.keywords)
        args.max_items = max(1, min(20, int(req.get("max_items", args.max_items))))
        args.max_files = max(1, min(10, int(req.get("max_files", args.max_files))))
        if req.get("whisper") in ("base.en", "small.en", "medium.en"):
            args.whisper = req["whisper"]
        args.pd_only = bool(req.get("pd_only", True))

    cfg = yaml.safe_load((ROOT / "config.yaml").read_text())
    user_terms = split_list(args.terms)[:40]
    terms = user_terms or split_list(cfg.get("search", {}).get("terms", []))
    extra_kw = split_list(args.keywords)[:40]
    args.label = ", ".join(user_terms[:3]) + ("…" if len(user_terms) > 3 else "") if user_terms else "standaardlijst"
    query = build_query(cfg, terms)
    pats = compile_keywords(cfg, extra_kw)
    seen = Seen(SEEN)
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()

    out = Path(args.out)
    clips_dir = out / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    STATE.parent.mkdir(exist_ok=True)
    done = set(STATE.read_text().split()) if STATE.exists() else set()

    from faster_whisper import WhisperModel
    log(f"Whisper laden: {args.whisper}")
    model = WhisperModel(args.whisper, device="cpu", compute_type="int8")

    log(f"Query: {query}")
    results = ia.search_items(query, fields=["identifier"], sorts=["downloads desc"])
    clips, items_done, work = [], 0, Path(tempfile.mkdtemp())

    for hit in results:
        if items_done >= args.max_items:
            break
        ident = hit["identifier"]
        try:
            item = ia.get_item(ident)
        except Exception as e:
            log(f"- {ident}: overgeslagen ({e})")
            continue
        md = item.metadata
        lic = license_of(md)
        if args.pd_only and lic["status"] == "check":
            log(f"- {ident}: licentie onduidelijk, overgeslagen")
            continue
        files = [f for f in pick_files(item, args.max_files, cfg["max_minutes"])
                 if f"{ident}/{f['name']}" not in done]
        if not files:
            continue
        items_done += 1
        title = " ".join(as_list(md.get("title"))) or ident
        log(f"[{items_done}/{args.max_items}] {title} ({lic['status']})")

        for f in files:
            name = f["name"]
            url = download_url(ident, name)
            wav = work / "src.wav"
            try:
                log(f"   {name}: downloaden")
                fetch_to_wav(url, wav)
                log("   transcriberen")
                segs, total = transcribe(model, wav, cfg.get("language"))
                picked = select_clips(segs, cfg, pats, api_key, args.per_file, seen)
                log(f"   {len(segs)} zinnen, {len(picked)} clips")
                tkey = f"{slug(ident)}-{slug(Path(name).stem, 20)}"
                if picked:
                    (out / "transcripts").mkdir(exist_ok=True)
                    (out / "transcripts" / f"{tkey}.json").write_text(json.dumps({
                        "item": ident, "file": name, "title": title, "url": url,
                        "duration": round(total, 2),
                        "segments": [[round(x["start"], 2), round(x["end"], 2), x["text"]] for x in segs],
                    }, ensure_ascii=False))
                for c in picked:
                    seen.add(c["text"])
                    cid = f"{slug(ident)}-{slug(Path(name).stem, 20)}-{int(c['start']):05d}"
                    a, b = cut(wav, c["start"], c["end"], total, pad_start(cfg), pad_end(cfg),
                               clips_dir / f"{cid}.wav")
                    clips.append({
                        "id": cid, "file": f"clips/{cid}.wav", "text": c["text"],
                        "score": c["score"], "ai": c.get("ai"), "tags": c["tags"],
                        "start": round(a, 2), "end": round(b, 2),
                        "t0": round(c["start"], 2), "t1": round(c["end"], 2),
                        "transcript": f"transcripts/{tkey}.json", "source_dl": url,
                        "item": ident, "title": title, "source_file": name,
                        "year": " ".join(as_list(md.get("year") or md.get("date")))[:10],
                        "item_url": f"https://archive.org/details/{ident}",
                        "source_url": f"{url}#t={a:.1f}",
                        "license": lic,
                    })
            except Exception as e:
                log(f"   fout bij {name}: {e}")
            finally:
                wav.unlink(missing_ok=True)
            done.add(f"{ident}/{name}")
            with STATE.open("a") as fh:
                fh.write(f"{ident}/{name}\n")
            # tussentijds wegschrijven, zodat een afgebroken run toch iets oplevert
            write_index(out, args, query, api_key, clips)

    shutil.rmtree(work, ignore_errors=True)
    if not clips:
        shutil.rmtree(out, ignore_errors=True)
        log("Geen clips gevonden, batch niet opgeslagen.")
        return
    write_index(out, args, query, api_key, clips)
    idx = Path(args.batches_index)
    batches = json.loads(idx.read_text()) if idx.exists() else []
    batches = [b for b in batches if b.get("name") != args.batch]
    batches.insert(0, {"name": args.batch, "preset": args.label, "count": len(clips),
                       "created": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    idx.write_text(json.dumps(batches, ensure_ascii=False, indent=1))
    log(f"Klaar: {len(clips)} clips uit {items_done} items -> {out}")


def write_index(out, args, query, api_key, clips):
    data = {
        "batch": {
            "name": args.batch, "preset": args.label, "query": query,
            "whisper": args.whisper, "claude": bool(api_key),
            "created": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "clips": sorted(clips, key=lambda c: -c["score"]),
    }
    (out / "clips.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
