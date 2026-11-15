#!/usr/bin/env python3
"""Fetch MODIS MOD13A3 monthly NDVI via NASA AppEEARS (Earthdata login).

Reads EARTHDATA_USERNAME / EARTHDATA_PASSWORD from .env, submits one point task for all
regions, polls until done, downloads the bundle, and writes one POWER-style CSV per point
into data/<region>/N<tag>.csv so the C++ engine can use NDVI like any other variable.
"""
import csv, glob, io, json, os, re, sys, time, zipfile
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://appeears.earthdatacloud.nasa.gov/api"
REGIONS = ["sahel", "jordan", "arctic", "gobi"]
PRODUCT = "MOD13A3.061"
LAYER = "_1_km_monthly_NDVI"
START, END = "01-01-2001", "12-31-2023"


def env():
    out = {}
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip()
    return out


def login(e):
    r = requests.post(API + "/login", auth=(e["EARTHDATA_USERNAME"], e["EARTHDATA_PASSWORD"]), timeout=60)
    r.raise_for_status()
    return r.json()["token"]


def cell_of(path):
    lat = lon = None
    with open(path, errors="ignore") as f:
        for line in f:
            if line.startswith("-END HEADER-"):
                break
            if "Latitude" in line:
                m = re.search(r"Latitude\s+(-?[\d.]+)\s+Longitude\s+(-?[\d.]+)", line)
                if m:
                    lat, lon = float(m.group(1)), float(m.group(2))
    return lat, lon


def collect():
    coords = []
    for reg in REGIONS:
        for path in sorted(glob.glob(os.path.join(ROOT, "data", reg, "*.csv"))):
            tag = os.path.splitext(os.path.basename(path))[0]
            if not tag[0].isalpha():
                continue
            lat, lon = cell_of(path)
            if lat is None:
                continue
            coords.append({"latitude": lat, "longitude": lon, "id": tag, "category": reg})
    return coords


def submit(token, coords):
    body = {
        "task_type": "point",
        "task_name": "trend-detective-ndvi-" + time.strftime("%Y%m%d-%H%M%S"),
        "params": {
            "dates": [{"startDate": START, "endDate": END}],
            "layers": [{"product": PRODUCT, "layer": LAYER}],
            "coordinates": coords,
            "output": {"format": {"type": "csv"}, "projection": {"scheme": "geographic"}},
        },
    }
    r = requests.post(API + "/task", json=body, headers={"Authorization": "Bearer " + token}, timeout=120)
    if not r.ok:
        print("submit failed", r.status_code, r.text[:400]); sys.exit(1)
    return r.json()["task_id"]


def poll(token, task_id, every=20, limit=21600):
    h = {"Authorization": "Bearer " + token}
    t0 = time.time()
    while time.time() - t0 < limit:
        r = requests.get(f"{API}/task/{task_id}", headers=h, timeout=60)
        r.raise_for_status()
        j = r.json()
        status = j.get("status")
        print(f"  [{int(time.time()-t0):4d}s] {status}")
        if status == "done":
            return True
        if status in ("failed", "error"):
            print(json.dumps(j, indent=1)[:1200]); return False
        time.sleep(every)
    return False


def download(token, task_id):
    h = {"Authorization": "Bearer " + token}
    b = requests.get(f"{API}/bundle/{task_id}", headers=h, timeout=120).json()
    files = b.get("files", [])
    csvs = [f for f in files if f["file_name"].lower().endswith(".csv")]
    print("bundle files:", [f["file_name"] for f in files])
    for f in csvs:
        r = requests.get(f["file_id"], headers=h, timeout=300)
        r.raise_for_status()
        return f["file_name"], r.content
    raise RuntimeError("no CSV in bundle")


def to_power_csvs(name, content):
    text = content.decode("utf-8-sig", "replace")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows:
        raise RuntimeError("empty csv")
    cols = list(rows[0].keys())
    vcol = next((c for c in cols if "NDVI" in c.upper()), None)
    if not vcol:
        raise RuntimeError("no NDVI column in " + str(cols))
    print("value column:", vcol, "rows:", len(rows))
    by_pt = {}
    for row in rows:
        cat = (row.get("category") or "").strip()
        pid = (row.get("id") or "").strip()
        if cat not in REGIONS or not pid:
            continue
        raw = (row.get(vcol) or "").strip()
        try:
            val = float(raw)
        except ValueError:
            continue
        if val <= -1000:
            continue
        d = (row.get("date") or "").strip()
        m = re.match(r"(\d{4})-(\d{2})", d)
        if not m:
            continue
        by_pt.setdefault((cat, pid), {})[(int(m.group(1)), int(m.group(2)))] = val / 10000.0
    written = 0
    for (cat, pid), data in by_pt.items():
        lat = lon = None
        for row in rows:
            if (row.get("category") or "").strip() == cat and (row.get("id") or "").strip() == pid:
                lat, lon = float(row["latitude"]), float(row["longitude"]); break
        years = {}
        for (y, mo), v in data.items():
            years.setdefault(y, {})[mo] = v
        out = os.path.join(ROOT, "data", cat, "N" + pid + ".csv")
        with open(out, "w") as f:
            f.write("-BEGIN HEADER-\n")
            f.write("NASA AppEEARS point sample (MOD13A3.061 NDVI monthly)\n")
            f.write("Source: LP DAAC / AppEEARS\n")
            f.write(f"Location: Latitude  {lat}  Longitude {lon}\n")
            f.write("Parameter(s):\nNDVI  MOD13A3 1km monthly NDVI (scaled /10000)\n")
            f.write("-END HEADER-\n")
            f.write("PARAMETER,YEAR,JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC,ANN\n")
            for y in sorted(years):
                mm = years[y]
                if len(mm) < 10:
                    continue
                vals = [mm.get(m, -999) for m in range(1, 13)]
                ann = sum(v for v in vals if v > -900) / max(1, sum(1 for v in vals if v > -900))
                f.write("NDVI,%d,%s,%.4f\n" % (y, ",".join("%.4f" % v for v in vals), ann))
        written += 1
    print("wrote", written, "per-point NDVI CSVs")


def main():
    e = env()
    if not e.get("EARTHDATA_USERNAME") or not e.get("EARTHDATA_PASSWORD"):
        print("missing EARTHDATA_USERNAME / EARTHDATA_PASSWORD in .env"); sys.exit(1)
    resume = None
    if "--resume" in sys.argv:
        resume = sys.argv[sys.argv.index("--resume") + 1]
    token = login(e)
    print("logged in")
    if resume:
        tid = resume
        print("resuming task:", tid)
    else:
        coords = collect()
        print("points:", len(coords), "regions:", sorted({c['category'] for c in coords}))
        tid = submit(token, coords)
        print("task:", tid)
    if not poll(token, tid):
        print("task did not finish"); sys.exit(2)
    name, content = download(token, tid)
    print("downloaded", name, len(content), "bytes")
    to_power_csvs(name, content)


if __name__ == "__main__":
    main()