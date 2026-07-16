#!/usr/bin/env python3
"""Score mastered phoneme candidates against per-class acoustic expectations.

Classes:
  stop        b d g p t k c ck j ch qu q x  — short; no sustained letter-name vowel
  short_vowel a e i o u                     — voiced 120-600ms; formants in vowel box
  ufric       f s sh th1 h ph               — mostly unvoiced; sustained
  vcont       m n l r v z ng th2 w y wh     — mostly voiced; sustained

Checks (letter-name rejection):
  - final sustained /i:/ (F1<500,F2>1900) >= 100ms  -> letter name (bee/dee/pee/tea/see...)
  - whisper transcript in banned letter-name list
Quality: duration 250-900ms, integrated loudness -19..-13 LUFS, TP <= -0.5dBFS.
"""
import json, os, re, subprocess, sys
import numpy as np

SR = 16000
FRAME = 480
HOP = 160
LPC_ORDER = 12

CLASSES = {
    "stop": ["b","d","g","p","t","k","c","ck","j","ch","qu","q","x"],
    "short_vowel": ["a","e","i","o","u"],
    "ufric": ["f","s","sh","th1","h","ph"],
    "vcont": ["m","n","l","r","v","z","ng","th2","w","y","wh"],
}
KEY_CLASS = {k: c for c, ks in CLASSES.items() for k in ks}

VOWEL_BOX = {  # female-ish F1/F2 ranges
    "a": (600, 1200, 1300, 2400),   # ae
    "e": (450, 1050, 1500, 2800),   # eh
    "i": (300, 700, 1700, 2900),    # ih
    "o": (450, 1050, 700, 1600),    # aw/ah
    "u": (500, 1100, 900, 1900),    # uh
}

LETTER_NAMES = {"a","ay","b","bee","be","c","cee","see","sea","d","dee","e","ee","f","ef","eff",
    "g","gee","h","aitch","i","eye","j","jay","k","kay","kaye","l","el","ell","m","em","n","en",
    "o","oh","p","pee","pea","q","cue","queue","r","ar","are","s","ess","t","tee","tea","u","you",
    "v","vee","w","doubleyou","x","ex","y","why","z","zee","zed"}

def load(path):
    raw = subprocess.run(["ffmpeg","-v","error","-i",path,"-f","f32le","-ac","1","-ar",str(SR),"-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def lpc(frame, order):
    r = np.correlate(frame, frame, "full")[len(frame)-1:len(frame)+order]
    if r[0] == 0: return None
    a = np.zeros(order+1); a[0] = 1.0; e = r[0]
    for i in range(1, order+1):
        acc = r[i] + np.dot(a[1:i], r[1:i][::-1])
        k = -acc / e
        a[1:i+1] = a[1:i+1] + k * np.concatenate((a[1:i][::-1], [1.0]))
        e *= (1 - k*k)
        if e <= 0: return None
    return a

def formants(frame):
    f = np.append(frame[0], frame[1:] - 0.97*frame[:-1]) * np.hamming(len(frame))
    a = lpc(f, LPC_ORDER)
    if a is None: return []
    roots = np.roots(a)
    roots = roots[np.imag(roots) >= 0.01]
    angs = np.arctan2(np.imag(roots), np.real(roots))
    freqs = angs * SR / (2*np.pi)
    bws = -0.5 * (SR/(2*np.pi)) * np.log(np.abs(roots))
    return sorted(f for f, b in zip(freqs, bws) if 200 < f < 4000 and b < 500)

def loudness(path):
    out = subprocess.run(["ffmpeg","-hide_banner","-nostats","-i",path,
                          "-af","loudnorm=print_format=summary","-f","null","-"],
                         capture_output=True, text=True).stderr
    il = re.search(r"Input Integrated:\s*(-?[\d.]+)", out)
    tp = re.search(r"Input True Peak:\s*(\+?-?[\d.]+)", out)
    return (float(il.group(1)) if il else None, float(tp.group(1)) if tp else None)

def duration(path):
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                          "-of","csv=p=0",path], capture_output=True, text=True).stdout.strip()
    return float(out) if out else 0.0

def acoustic(path):
    x = load(path)
    n = len(x)
    frames = [(s, x[s:s+FRAME]) for s in range(0, max(0, n-FRAME), HOP)]
    if not frames:
        return None
    rms = np.array([np.sqrt((f**2).mean()) for _, f in frames])
    rmax = rms.max()
    track = []  # (idx, voiced, f1, f2)
    for i, (s, f) in enumerate(frames):
        if rms[i] < rmax*0.12:
            track.append((i, False, 0, 0)); continue
        fw = f * np.hanning(FRAME)
        ac = np.correlate(fw, fw, "full")[FRAME-1:]
        voiced = False
        if ac[0] > 0:
            acn = ac/ac[0]
            seg = acn[SR//400:SR//70]
            voiced = seg.size > 0 and seg.max() > 0.55
        f1 = f2 = 0
        if voiced:
            fs = formants(f)
            if len(fs) >= 2:
                f1, f2 = fs[0], fs[1]
        track.append((i, voiced, f1, f2))
    active = [t for t in track if rms[t[0]] >= rmax*0.12]
    voiced_frames = [t for t in active if t[1] and t[2] > 0]
    # tail /i:/ run over the last voiced frames
    tail_ii = 0
    for _, v, f1, f2 in reversed(voiced_frames):
        if f1 < 500 and f2 > 1900: tail_ii += 1
        else: break
    # medians of central voiced frames (for vowels)
    med_f1 = med_f2 = 0
    if voiced_frames:
        core = voiced_frames[len(voiced_frames)//5 : max(1, 4*len(voiced_frames)//5)] or voiced_frames
        med_f1 = float(np.median([f1 for _,_,f1,_ in core]))
        med_f2 = float(np.median([f2 for _,_,_,f2 in core]))
    return {
        "active_ms": len(active)*10,
        "voiced_ms": len(voiced_frames)*10,
        "voiced_frac": round(len(voiced_frames)/len(active), 2) if active else 0,
        "i_tail_ms": tail_ii*10,
        "med_f1": int(med_f1), "med_f2": int(med_f2),
    }

def score(path, key, transcript=None):
    cls = KEY_CLASS.get(key, "stop")
    dur = duration(path)
    il, tp = loudness(path)
    ac = acoustic(path)
    fails = []
    if not (0.25 <= dur <= 0.95): fails.append(f"duration {dur:.2f}s")
    if il is not None and not (-19.5 <= il <= -12.5): fails.append(f"loudness {il}")
    if tp is not None and tp > -0.4: fails.append(f"truepeak {tp}")
    if ac is None:
        fails.append("no audio")
        return {"key": key, "cls": cls, "dur": dur, "il": il, "tp": tp, "fails": fails, "score": -99}
    if transcript is not None:
        norm = re.sub(r"[^a-z]", "", transcript.lower())
        if norm in LETTER_NAMES and cls != "short_vowel":
            fails.append(f"transcript letter-name '{transcript.strip()}'")
    pts = 0.0
    if cls == "stop":
        if ac["i_tail_ms"] >= 100: fails.append(f"letter-name vowel tail {ac['i_tail_ms']}ms")
        elif ac["i_tail_ms"] >= 60: pts -= 2
        if ac["voiced_ms"] > 350: fails.append(f"too much voicing {ac['voiced_ms']}ms")
        pts += max(0, 3 - ac["i_tail_ms"]/33)
        pts += max(0, 2 - ac["voiced_ms"]/150)
        if dur: pts += max(0, 2 - dur*2)
    elif cls == "short_vowel":
        if ac["voiced_ms"] < 100: fails.append("vowel too short")
        if ac["voiced_ms"] > 650: fails.append("vowel too long")
        lo1, hi1, lo2, hi2 = VOWEL_BOX[key]
        ok1 = lo1 <= ac["med_f1"] <= hi1
        ok2 = lo2 <= ac["med_f2"] <= hi2
        if ok1 and ok2: pts += 4
        elif ok1 or ok2: pts += 1.5
        else: fails.append(f"formants F1={ac['med_f1']} F2={ac['med_f2']} outside {key} box")
    elif cls == "ufric":
        if ac["voiced_frac"] > 0.45: fails.append(f"too voiced {ac['voiced_frac']}")
        if ac["active_ms"] < 200: fails.append("fricative too short")
        pts += max(0, 3 - ac["voiced_frac"]*4)
        pts += min(2, ac["active_ms"]/300)
    else:  # vcont
        if ac["voiced_frac"] < 0.5: fails.append(f"not voiced enough {ac['voiced_frac']}")
        if ac["i_tail_ms"] >= 150 and key in ("m","n","l","z","v"):
            fails.append(f"letter-name-ish /i:/ tail {ac['i_tail_ms']}ms")  # em/en/el/zee/vee
        pts += ac["voiced_frac"]*3
        pts += max(0, 2 - ac["i_tail_ms"]/100)
    return {"key": key, "cls": cls, "dur": round(dur,3), "il": il, "tp": tp, **ac,
            "fails": fails, "score": round(pts - len(fails)*10, 2)}

if __name__ == "__main__":
    txdir = sys.argv[1] if len(sys.argv) > 2 else None
    files = sys.argv[2:] if txdir else sys.argv[1:]
    for p in files:
        base = os.path.basename(p).replace(".mp3","")
        key = base.split("__")[0]
        transcript = None
        if txdir:
            tj = os.path.join(txdir, base + ".json")
            if os.path.exists(tj):
                transcript = json.load(open(tj)).get("text","")
        print(json.dumps({"file": base, **score(p, key, transcript)}))
