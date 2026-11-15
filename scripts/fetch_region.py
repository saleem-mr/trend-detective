#!/usr/bin/env python3
"""Fetch NASA POWER monthly series for a grid of points (no credentials)."""
import os, sys, time, urllib.parse, urllib.request

PARAMS = "TS,PRECTOTCORR,GWETTOP,ALLSKY_SRF_ALB,ALLSKY_SFC_SW_DWN"
BASE = "https://power.larc.nasa.gov/api/temporal/monthly/point"


def fetch(lat, lon, start=1981, end=2023):
    q = urllib.parse.urlencode({
        "parameters": PARAMS, "community": "RE", "latitude": lat, "longitude": lon,
        "start": start, "end": end, "format": "CSV",
    })
    req = urllib.request.Request(BASE + "?" + q, headers={"User-Agent": "trend-detective/2.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def build(outdir, prefix, lats, lons):
    os.makedirs(outdir, exist_ok=True)
    n = 0
    for la in lats:
        for lo in lons:
            path = os.path.join(outdir, "%s%g_%g.csv" % (prefix, la, lo))
            if os.path.exists(path) and os.path.getsize(path) > 2000 and start >= 2001:
                print("skip", path); n += 1; continue
            for attempt in range(3):
                try:
                    csv = fetch(la, lo)
                    if "PARAMETER,YEAR" in csv:
                        open(path, "w").write(csv)
                        print("ok  ", path, len(csv)); n += 1
                        break
                    print("bad ", path, csv[:80])
                except Exception as e:
                    print("retry", path, e)
                time.sleep(1.5)
            time.sleep(0.45)
    print("total", n)


if __name__ == "__main__":
    region = sys.argv[1] if len(sys.argv) > 1 else "gobi"
    if region == "sahel":
        build("data/sahel", "S", [12, 13.5, 15, 16.5, 18], [-16, -12, -8, -4, 0, 4, 8, 12, 16])
    elif region == "jordan":
        build("data/jordan", "J", [31.5, 32, 32.5, 33], [35.5, 36, 36.5, 37])
    elif region == "gobi":
        build("data/gobi", "G", [40, 43, 46], [95, 102.5, 110])
    elif region == "arctic":
        build("data/arctic", "A", [66, 69, 72], [80, 100, 120])
    elif region == "amazon":
        build("data/amazon", "M", [-6, -9, -12], [-52, -57, -62])
    else:
        raise SystemExit("unknown region")