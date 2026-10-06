#!/usr/bin/env python3
"""HUMAN/MOTIVES sample harvester.

Zoekt op Internet Archive, transcribeert met Whisper, scoort zinnen
(trefwoorden + optioneel Claude), knipt de beste stukken als WAV en
schrijft een audit-site naar --out.
"""
import argparse
import difflib
import itertools
import json
import os
import random
import re
import shutil
import subprocess
import tempfile
import time
import wave
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import internetarchive as ia
import requests
import yaml

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "processed.txt"  # verwerkte bestanden (item/bestand) en bronnen (title:...)
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


def source_kind(meta, cfg):
    """'avoid' (luisterboek, podcast), 'drama' (geacteerd), 'prefer' (film, radio, interview) of 'neutral'."""
    src = cfg.get("sources") or {}
    colls = {str(c).lower() for c in as_list(meta.get("collection"))}
    text = " ".join(str(x) for x in as_list(meta.get("title")) + as_list(meta.get("subject"))).lower()

    def match(group):
        g = src.get(group) or {}
        if colls & {str(c).lower() for c in g.get("collections") or []}:
            return True
        return any(re.search(r"\b" + re.escape(str(w).lower()), text) for w in g.get("words") or [])

    if match("avoid"):
        return "avoid"
    if match("drama"):
        return "drama"
    if match("prefer"):
        return "prefer"
    return "neutral"


def kind_adjust(kind, cfg):
    src = cfg.get("sources") or {}
    if kind == "avoid":
        return -float((src.get("avoid") or {}).get("penalty", 6))
    if kind in ("drama", "prefer"):
        return float((src.get(kind) or {}).get("bonus", 4 if kind == "drama" else 2))
    return 0.0


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


def wav_duration(wav):
    with wave.open(str(wav)) as w:
        return w.getnframes() / float(w.getframerate())


def transcribe_range(model, wav, a, b, language):
    """Transcribeer alleen [a, b] seconden van wav; tijden blijven absoluut."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        part = tmp.name
    try:
        subprocess.run(
            ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}",
             "-i", str(wav), "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", part],
            check=True,
        )
        segs, _ = transcribe(model, part, language)
    finally:
        os.unlink(part)
    return [{**x, "start": x["start"] + a, "end": x["end"] + a} for x in segs]


def chunked(model, wav, total, cfg, start=0.0, stop=None):
    """Loopt in blokken door de bron. stop(new_segs) -> True breekt af. Geeft (segs, tot_waar)."""
    size = max(60.0, float(cfg.get("chunk_minutes", 10)) * 60)
    segs, pos = [], start
    while pos < total - 1:
        end = min(total, pos + size)
        new = transcribe_range(model, wav, pos, min(total, end + 5), cfg.get("language"))
        # zinnen die na de blokgrens beginnen komen in het volgende blok terug
        new = [x for x in new if end >= total or x["start"] < end]
        segs += new
        pos = max(end, new[-1]["end"]) if new else end
        log(f"   {fmt_time(pos)} van {fmt_time(total)} uitgeschreven, {len(segs)} zinnen")
        if stop and stop(new):
            break
    return segs, min(pos, total)


def fmt_time(s):
    s = int(s)
    return f"{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def good_enough(c, cfg):
    if c.get("ai") is not None:
        return c["ai"] >= float(cfg.get("early_stop_ai", 7))
    return c["score"] >= float(cfg.get("early_stop_score", 5))


def best_clips(cands, n):
    out, texts = [], set()
    for c in sorted(cands, key=lambda c: -c["score"]):
        if norm(c["text"]) in texts or any(c["start"] < f["end"] and f["start"] < c["end"] for f in out):
            continue
        out.append(c)
        texts.add(norm(c["text"]))
        if len(out) >= n:
            break
    return out


def write_transcript(path, meta, segs, total, until, whisper):
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps({
        **meta, "duration": round(total, 2), "whisper": whisper,
        "analysed_until": round(until, 2), "partial": until < total - 1,
        "segments": [[round(x["start"], 2), round(x["end"], 2), x["text"]] for x in segs],
    }, ensure_ascii=False))


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


PROFILE = ROOT / "profile.md"  # bandprofiel: wie we zijn en wat we zoeken


def load_profile(brief=""):
    text = PROFILE.read_text().strip() if PROFILE.exists() else ""
    if brief:
        text += f"\n\nFor this batch specifically, the band is looking for:\n{brief}"
    return text


def claude_json(prompt, cfg, key, max_tokens=4000):
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        json={"model": cfg["claude_model"], "max_tokens": max_tokens,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=120,
    )
    r.raise_for_status()
    text = "".join(c.get("text", "") for c in r.json().get("content", []))
    return json.loads(re.sub(r"```(?:json)?", "", text).strip())


LINES_PROMPT = """You pick spoken-word samples for an experimental electronic music project.

About the band and what they look for:
{profile}

A good sample works on its own, without plot context: evocative, mysterious, quotable, unsettling
or strangely beautiful, and it fits the profile above. Prefer lines that read as acted and dramatic
(radio plays, film dialogue, theatre: declamation, dread, revelation) over everyday conversational speech. Score low for mundane talk, plot exposition,
character names, announcements and commercials, and for audiobook narration or flat readings of books:
we want the colour and atmosphere of film, radio and interviews.
The source is: {source}

Rate each numbered line 0-10. Reply with ONLY a JSON array, no prose:
[{{"i": <number>, "score": <0-10>, "tags": ["1-3 short lowercase tags"]}}]

Lines:
"""


def claude_scores(lines, cfg, key, source=""):
    """lines: list of str. Returns {index: (score, tags)}."""
    result = {}
    head = LINES_PROMPT.format(profile=cfg.get("_profile") or "(no profile)", source=source or "unknown")
    for b in range(0, len(lines), 60):
        body = "\n".join(f"{b + i}: {t}" for i, t in enumerate(lines[b:b + 60]))
        try:
            for row in claude_json(head + body, cfg, key):
                result[int(row["i"])] = (float(row.get("score", 0)), list(row.get("tags", []))[:3])
        except Exception as e:  # scoring is best effort
            log(f"   Claude-scoring overgeslagen voor blok {b}: {e}")
    return result


SOURCES_PROMPT = """You help an experimental electronic music project find recordings on the Internet Archive
to harvest spoken-word samples from.

About the band and what they look for:
{profile}

For each numbered source below (title, subjects, description), rate 0-10 how likely it contains spoken
lines that fit. Rate highest: acted, dramatized material with theatrical voices: old radio plays,
horror and science-fiction films, theatre. Then: interviews and documentaries with real atmosphere.
Rate low: everyday conversational voices (podcasts, talk radio, call-in shows, news, plain lectures),
audiobooks and book readings, music-only recordings.
Reply with ONLY a JSON array, no prose: [{{"i": <number>, "score": <0-10>}}]

Sources:
"""


def source_text(h, desc_len=300):
    title = " ".join(str(t) for t in as_list(h.get("title")))
    subj = ", ".join(str(t) for t in as_list(h.get("subject")))[:150]
    desc = re.sub(r"<[^>]+>|\s+", " ", " ".join(str(t) for t in as_list(h.get("description"))))[:desc_len]
    return title, subj, desc


def claude_rank_sources(pool, cfg, key):
    """Returns {identifier: score 0-10}; best effort."""
    out = {}
    head = SOURCES_PROMPT.format(profile=cfg.get("_profile") or "(no profile)")
    for b in range(0, len(pool), 40):
        chunk = pool[b:b + 40]
        body = "\n".join(f"{b + i}: {t} | subjects: {s} | {d}"
                         for i, (t, s, d) in enumerate(source_text(h) for h in chunk))
        try:
            for row in claude_json(head + body, cfg, key, 2000):
                i = int(row["i"])
                if b <= i < b + len(chunk):
                    out[pool[i]["identifier"]] = float(row.get("score", 0))
        except Exception as e:
            log(f"Claude-bronscore overgeslagen voor blok {b}: {e}")
    return out


TERMS_PROMPT = """You help an experimental electronic music project search the Internet Archive for
recordings to harvest spoken-word samples from.

About the band and what they look for:
{profile}

Suggest {n} short search terms (1-3 words, English) that will find fitting old films, radio plays,
broadcasts and interviews on the Internet Archive, including the darker and stranger themes in the profile. Mix obvious and less obvious angles. Avoid these,
they were used recently: {recent}
Reply with ONLY a JSON array of strings."""


def claude_terms(cfg, key, n=15, recent=()):
    try:
        terms = claude_json(TERMS_PROMPT.format(profile=cfg.get("_profile") or "(no profile)", n=n,
                                                recent=", ".join(recent) or "none"), cfg, key, 500)
        return [str(t).strip() for t in terms if str(t).strip()][:n]
    except Exception as e:
        log(f"Claude-zoektermen overgeslagen: {e}")
        return []


def theme_score(h, pats):
    """Trefwoorden in titel tellen dubbel, onderwerp en omschrijving enkel (max 6)."""
    title, subj, desc = source_text(h, 2000)
    t, _ = keyword_score(title, pats)
    r, _ = keyword_score(f"{subj} {desc}", pats)
    return 2 * t + min(6, r)


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
        scores = claude_scores([c["text"] for c in cands], cfg, api_key, cfg.get("_source", ""))
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


def type_filter(cfg, types):
    """Beperkt de zoekopdracht tot gekozen soorten bronnen (films, radio, interviews)."""
    q = lambda t: f'"{t}"' if re.search(r"[^A-Za-z0-9_]", str(t)) else str(t)
    groups = []
    for t in types:
        spec = (cfg.get("types") or {}).get(t) or {}
        ors = []
        if spec.get("collections"):
            ors.append("collection:(" + " OR ".join(q(c) for c in spec["collections"]) + ")")
        if spec.get("words"):
            words = " OR ".join(q(w) for w in spec["words"])
            ors.append(f"subject:({words})")
            ors.append(f"title:({words})")
        if ors:
            groups.append("(" + " OR ".join(ors) + ")")
    return "(" + " OR ".join(groups) + ")" if groups else ""


def preset_query(p):
    """Zoekset als losse query, of als lijstjes: collections, mediatype, title, terms."""
    if p.get("query"):
        return p["query"]
    q = lambda t: f'"{t}"' if re.search(r"[^A-Za-z0-9_]", str(t)) else str(t)
    parts = []
    if p.get("collections"):
        parts.append("collection:(" + " OR ".join(map(str, p["collections"])) + ")")
    if p.get("mediatype"):
        parts.append("mediatype:(" + " OR ".join(map(str, p["mediatype"])) + ")")
    if p.get("title"):
        parts.append("title:(" + " OR ".join(q(t) for t in p["title"]) + ")")
    if p.get("terms"):
        parts.append("(" + " OR ".join(q(t) for t in p["terms"]) + ")")
    return " AND ".join(parts)


def build_query(cfg, terms, types=()):
    """Zoekt op heel Internet Archive (inclusief Prelinger) naar audio en video."""
    q = lambda t: f'"{t}"' if " " in t else t
    parts = ["mediatype:(" + " OR ".join(cfg.get("search", {}).get("mediatype", ["audio", "movies"])) + ")"]
    if terms:
        parts.append("(" + " OR ".join(q(t) for t in terms) + ")")
    tf = type_filter(cfg, types)
    if tf:
        parts.append(tf)
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
    ap.add_argument("--max-items", type=int, default=15, help="aantal clips; één per bron")
    ap.add_argument("--max-files", type=int, default=3, help="bestanden per item")
    ap.add_argument("--whisper", default="base.en")
    ap.add_argument("--pd-only", action="store_true")
    ap.add_argument("--types", default="", help="film, radio, interview; leeg = alles")
    ap.add_argument("--brief", default="", help="vrije omschrijving van wat je zoekt (met Claude)")
    ap.add_argument("--preset", default="", help="zoekset uit config.yaml (presets)")
    ap.add_argument("--per-source", type=int, default=None, help="clips per bron; leeg = config")
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
        args.max_items = max(1, min(40, int(req.get("max_items", args.max_items))))
        args.max_files = max(1, min(10, int(req.get("max_files", args.max_files))))
        if req.get("whisper") in ("base.en", "small.en", "medium.en"):
            args.whisper = req["whisper"]
        args.pd_only = bool(req.get("pd_only", True))
        args.types = split_list(req.get("types", []))
        args.brief = str(req.get("brief") or "").strip()[:600]
        args.preset = str(req.get("preset") or "").strip()
        if req.get("per_source") not in (None, ""):
            args.per_source = max(1, min(5, int(req["per_source"])))

    cfg = yaml.safe_load((ROOT / "config.yaml").read_text())
    global cfg_global
    cfg_global = cfg
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    cfg["_profile"] = load_profile(args.brief)
    user_terms = split_list(args.terms)[:40]
    extra_kw = split_list(args.keywords)[:40]
    preset = (cfg.get("presets") or {}).get(args.preset) if args.preset else None
    if args.preset and not preset:
        log(f"Zoekset {args.preset} bestaat niet, vrij zoeken")
        args.preset = ""
    auto_terms = []
    if not preset and not user_terms and api_key and cfg.get("auto_terms", True):
        recent = [t for b in (json.loads(Path(args.batches_index).read_text())
                              if Path(args.batches_index).exists() else [])[:5]
                  for t in b.get("terms", [])]
        auto_terms = claude_terms(cfg, api_key, int(cfg.get("auto_terms_count", 15)), recent)
        if auto_terms:
            log(f"Zoektermen van Claude: {', '.join(auto_terms)}")
    terms = user_terms or auto_terms or split_list(cfg.get("search", {}).get("terms", []))
    args.used_terms = terms
    if isinstance(args.types, str):
        args.types = split_list(args.types)
    type_cfg = cfg.get("types") or {}
    types = [t for t in (x.lower() for x in args.types) if t in type_cfg]
    type_label = ", ".join(type_cfg[t].get("label", t) for t in types)
    if preset:
        args.label = preset.get("label", args.preset) + (f" + {', '.join(user_terms[:2])}" if user_terms else "")
    elif user_terms:
        args.label = ", ".join(user_terms[:3]) + ("…" if len(user_terms) > 3 else "")
    elif args.brief and api_key:
        args.label = args.brief[:40] + ("…" if len(args.brief) > 40 else "")
    elif auto_terms:
        args.label = "Bandprofiel"
    else:
        args.label = type_label or "standaardlijst"
    if preset:
        # zoekset bepaalt waar hij zoekt; eigen zoekwoorden verfijnen binnen die zoekset
        query = "(" + preset_query(preset) + ")"
        if user_terms:
            q = lambda t: f'"{t}"' if re.search(r"[^A-Za-z0-9_]", t) else t
            query += " AND (" + " OR ".join(q(t) for t in user_terms) + ")"
        terms = user_terms + [str(t) for t in preset.get("title", []) + preset.get("terms", [])]
        types = []
    else:
        query = build_query(cfg, terms, types)
    pats = compile_keywords(cfg, extra_kw)
    # knipwoorden van de zoekset tellen mee met gewicht 2 (eigen woorden van de pagina: 4)
    pats += [(2, str(t), re.compile(r"\b" + re.escape(str(t).lower()))) for t in (preset or {}).get("keywords", [])]
    seen = Seen(SEEN)

    out = Path(args.out)
    clips_dir = out / "clips"
    save_wavs = bool(cfg.get("save_wavs", False))  # standaard knipt de pagina zelf; geen WAVs in de repo
    out.mkdir(parents=True, exist_ok=True)
    if save_wavs:
        clips_dir.mkdir(exist_ok=True)

    STATE.parent.mkdir(exist_ok=True)
    done = {l.strip() for l in STATE.read_text().splitlines() if l.strip()} if STATE.exists() else set()
    # Bronnen die in een eerdere batch al eens bekeken zijn, met of zonder resultaat.
    skip_polled = bool((cfg.get("sources") or {}).get("skip_polled", True))
    polled_items = {l[5:] for l in done if l.startswith("skip:")}
    polled_titles = {l[6:] for l in done if l.startswith("title:")}

    def remember(line):
        done.add(line)
        with STATE.open("a") as fh:
            fh.write(line + "\n")

    from faster_whisper import WhisperModel
    log(f"Whisper laden: {args.whisper}")
    model = WhisperModel(args.whisper, device="cpu", compute_type="int8")

    log(f"Query: {query}")
    per_source = args.per_source or max(1, int((cfg.get("sources") or {}).get("per_source", 1)))
    # Instellingen van deze batch, zodat de pagina ze kan tonen en herhalen
    args.settings = {
        "preset": args.preset, "types": types, "brief": args.brief,
        "terms": user_terms, "auto_terms": auto_terms, "keywords": extra_kw,
        "max_items": args.max_items, "per_source": per_source,
        "whisper": args.whisper, "pd_only": bool(args.pd_only),
    }
    results = ia.search_items(query, fields=["identifier", "title", "collection", "subject", "description"],
                              sorts=["downloads desc"])
    def fresh(hits, limit=3000):
        """Nieuwe bronnen; slaat eerder bekeken items en titels over."""
        for n, h in enumerate(hits):
            if n >= limit:
                return
            if skip_polled and (h["identifier"] in polled_items
                                or norm(" ".join(str(t) for t in as_list(h.get("title"))))[:60] in polled_titles):
                continue
            yield h

    pool = list(itertools.islice(fresh(results), max(200, args.max_items * 15)))
    if skip_polled:
        log(f"{len(polled_items)} bronnen staan op de overslaanlijst (leeg of al gebruikt)")
    order = {"drama": 0, "prefer": 1, "neutral": 2, "avoid": 3}
    # Thema: trefwoorden en zoekwoorden in titel, onderwerp en omschrijving
    theme_pats = compile_keywords(cfg, extra_kw + list(terms))
    theme = {h["identifier"]: theme_score(h, theme_pats) for h in pool}
    ai_src = {}
    if api_key and pool:
        log("Bronnen laten beoordelen door Claude op titel en omschrijving")
        # eerst grof op thema, zodat Claude de meest kansrijke bronnen ziet
        pool.sort(key=lambda h: (order[source_kind(h, cfg)], -theme[h["identifier"]]))
        ai_src = claude_rank_sources(pool[:int(cfg.get("claude_source_pool", 120))], cfg, api_key)
        low = float(cfg.get("claude_source_min", 3))
        dropped = [h for h in pool if ai_src.get(h["identifier"], 10) < low]
        if dropped:
            log(f"{len(dropped)} bronnen afgewezen op titel/omschrijving")
            pool = [h for h in pool if ai_src.get(h["identifier"], 10) >= low]
    rank = lambda h: theme[h["identifier"]] + 2 * ai_src.get(h["identifier"], 0)
    pool.sort(key=lambda h: (order[source_kind(h, cfg)], -rank(h)))  # stabiel: gelijk blijft populair eerst
    counts = {k: sum(1 for h in pool if source_kind(h, cfg) == k) for k in order}
    log(f"{len(pool)} bronnen gevonden: {counts['drama']} hoorspel/drama, {counts['prefer']} film/radio/interview, "
        f"{counts['neutral']} overig, {counts['avoid']} luisterboek/podcast (achteraan)")
    clips, items_done, tried, titles, work = [], 0, 0, set(), Path(tempfile.mkdtemp())

    for hit in pool:
        if items_done >= args.max_items or tried >= args.max_items * 4:
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
        # eerst al gebruikte afleveringen eruit; bij een serie een willekeurige greep uit de rest
        files = [f for f in pick_files(item, 100000, cfg["max_minutes"])
                 if f"{ident}/{f['name']}" not in done]
        random.shuffle(files)
        series = len(files) > 1
        files = files[:args.max_files]
        if not files:
            continue
        title = " ".join(as_list(md.get("title"))) or ident
        tkey_title = norm(title)[:60]
        if tkey_title in titles:  # zelfde film/programma onder een andere upload
            log(f"- {ident}: zelfde titel als eerdere bron, overgeslagen")
            continue
        kind = source_kind(md, cfg)
        cfg["_source"] = " | ".join(source_text({**md, "title": title}, 300)[::2])
        adjust = kind_adjust(kind, cfg)
        tried += 1
        log(f"[{items_done + 1}/{args.max_items}] {title} ({lic['status']}, {kind})")
        found = 0

        for f in files:
            name = f["name"]
            url = download_url(ident, name)
            wav = work / "src.wav"
            try:
                log(f"   {name}: downloaden")
                fetch_to_wav(url, wav)
                total = wav_duration(wav)
                need = per_source - found
                cands = []
                early = bool(cfg.get("early_stop", True))

                def enough(new):
                    cands.extend(select_clips(new, cfg, pats, api_key, need * 3, seen))
                    return early and sum(1 for c in cands if good_enough(c, cfg)) >= need

                log(f"   transcriberen ({fmt_time(total)})")
                segs, until = chunked(model, wav, total, cfg, stop=enough)
                picked = best_clips(cands, need)
                log(f"   {len(segs)} zinnen, {len(picked)} clips"
                    + (f", gestopt na {fmt_time(until)}" if until < total - 1 else ""))
                tkey = f"{slug(ident)}-{slug(Path(name).stem, 20)}"
                if picked:
                    write_transcript(out / "transcripts" / f"{tkey}.json",
                                     {"item": ident, "file": name, "title": title, "url": url},
                                     segs, total, until, args.whisper)
                for c in picked:
                    seen.add(c["text"])
                    c["score"] = round(c["score"] + adjust, 1)
                    if kind == "avoid":
                        c["tags"] = ["luisterboek"] + list(c["tags"])[:2]
                    cid = f"{slug(ident)}-{slug(Path(name).stem, 20)}-{int(c['start']):05d}"
                    if save_wavs:
                        a, b = cut(wav, c["start"], c["end"], total, pad_start(cfg), pad_end(cfg),
                                   clips_dir / f"{cid}.wav")
                    else:
                        a = max(0.0, c["start"] - pad_start(cfg))
                        b = min(total, c["end"] + pad_end(cfg))
                    clips.append({
                        "id": cid, "text": c["text"], **({"file": f"clips/{cid}.wav"} if save_wavs else {}),
                        "score": c["score"], "ai": c.get("ai"), "tags": c["tags"],
                        "start": round(a, 2), "end": round(b, 2),
                        "t0": round(c["start"], 2), "t1": round(c["end"], 2),
                        "transcript": f"transcripts/{tkey}.json", "source_dl": url,
                        "item": ident, "title": title, "source_file": name,
                        "year": " ".join(as_list(md.get("year") or md.get("date")))[:10],
                        "item_url": f"https://archive.org/details/{ident}",
                        "source_url": f"{url}#t={a:.1f}",
                        "license": lic, "kind": kind, "theme": rank(hit),
                    })
                found += len(picked)
            except Exception as e:
                log(f"   fout bij {name}: {e}")
            finally:
                wav.unlink(missing_ok=True)
            remember(f"{ident}/{name}")
            # tussentijds wegschrijven, zodat een afgebroken run toch iets oplevert
            write_index(out, args, query, api_key, clips)
            if found >= per_source:
                break  # genoeg uit deze bron; overige bestanden niet downloaden
        titles.add(tkey_title)
        # Een serie die iets opleverde blijft beschikbaar (alleen de gebruikte aflevering valt af).
        # Een bron zonder resultaat, of een losse film/opname, slaan we voortaan helemaal over.
        if not found or not series:
            if f"skip:{ident}" not in done:
                remember(f"skip:{ident}")
            if tkey_title and f"title:{tkey_title}" not in done:
                remember(f"title:{tkey_title}")
        if found:
            items_done += 1

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
                       "terms": args.used_terms[:20], "brief": args.brief,
                       "created": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    idx.write_text(json.dumps(batches, ensure_ascii=False, indent=1))
    log(f"Klaar: {len(clips)} clips uit {items_done} items -> {out}")


cfg_global = {}


def write_index(out, args, query, api_key, clips):
    data = {
        "batch": {
            "name": args.batch, "preset": args.label, "query": query,
            "whisper": args.whisper, "claude": bool(api_key),
            "pad": [pad_start(cfg_global), pad_end(cfg_global)],
            "settings": getattr(args, "settings", {}),
            "created": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "clips": sorted(clips, key=lambda c: -c["score"]),
    }
    (out / "clips.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
