#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p cache

run()    { ./engine/trend-detect --data "data/$1" --region "$2" --bbox "$3" --primary albedo --grid-param ALLSKY_SRF_ALB --out "data/$1.json"; }
run2001(){ ./engine/trend-detect --data "data/$1" --region "$2" --bbox "$3" --primary albedo --grid-param ALLSKY_SRF_ALB --start-year 2001 --out "data/$1_2001.json"; }

run sahel  "Western Sahel"                  "12,18,-16,16"
run jordan "Jordan Badia (Irbid–Mafraq)"    "31.5,33,35.5,37"
run arctic "Arctic tundra (Taymyr–Yakutia)" "66,72,80,120"
run gobi   "Gobi Desert (Mongolia)"         "40,46,95,110"

run2001 sahel  "Western Sahel"                  "12,18,-16,16"
run2001 jordan "Jordan Badia (Irbid–Mafraq)"    "31.5,33,35.5,37"
run2001 arctic "Arctic tundra (Taymyr–Yakutia)" "66,72,80,120"
run2001 gobi   "Gobi Desert (Mongolia)"         "40,46,95,110"

python3 - <<'PY'
import json

META = {
 "sahel": dict(story_en="On 2001–2023 this region looks like it is cooling by 0.32 °C per decade. On the full 1981–2023 record it warms by 0.15 °C per decade — same place, same code, opposite sign.", story_ar="في 2001–2023 تبدو المنطقة أبرد بمقدار 0.32 °م لكل عقد، وفي السجل الكامل 1981–2023 تظهر احتراراً بمقدار 0.15 °م لكل عقد — نفس المكان ونفس الشيفرة وإشارة معاكسة.",name="Western Sahel", name_ar="الساحل الغربي", bbox=[12,18,-16,16],
   points=45, effective_cells=45, note="Mauritania / Senegal / Mali core drylands",
   tagline="Albedo falls strongly; rain, soil and temperature sit at the edge of detectability — and the temperature sign depends on the window.",
   tagline_ar="الانعكاس ينخفض بقوة، أما الأمطار والتربة والحرارة فكلها عند حد الكشف — وإشارة الحرارة تتغيّر بتغيّر النافذة الزمنية."),
 "jordan": dict(story_en="Warming is unambiguous here (+0.48 °C per decade, 3.2× the detection limit). Rainfall shows no trend at all — and the dashboard says so instead of guessing.", story_ar="الاحترار واضح هنا (+0.48 °م لكل عقد، أي 3.2 أضعاف حد الكشف). أما الأمطار فلا تُظهر أي اتجاه — والأداة تقول ذلك بدل التخمين.",name="Jordan Badia (Irbid–Mafraq)", name_ar="البادية الأردنية", bbox=[31.5,33,35.5,37],
   points=16, effective_cells=12, note="16 sampled points collapse to 12 distinct MERRA-2 cells",
   tagline="Warming is unambiguous here (+0.48 °C/decade). Rainfall is not trending at all.",
   tagline_ar="الاحترار واضح هنا (+0.48 °م لكل عقد)، أما الأمطار فلا تُظهر أي اتجاه."),
 "arctic": dict(story_en="Warming only becomes detectable when the record is extended to 43 years. On 2001–2023 the same data yields no verdict: the record was too short, not the climate quiet.", story_ar="لا يصبح الاحترار قابلاً للكشف إلا بتمديد السجل إلى 43 سنة. في 2001–2023 تعطي البيانات نفسها «لا حكم»: لأن السجل قصير، لا لأن المناخ هادئ.",name="Arctic tundra (Taymyr–Yakutia)", name_ar="التندرا القطبية (تايمير–ياكوتيا)", bbox=[66,72,80,120],
   points=9, effective_cells=9, note="high-latitude tundra; very large interannual variability",
   tagline="Warming becomes detectable only when the full 43-year record is used — a 23-year window hides it.",
   tagline_ar="لا يصبح الاحترار قابلاً للكشف إلا باستخدام السجل الكامل (43 سنة) — نافذة 23 سنة تخفيه."),
 "gobi": dict(story_en="Warming sits exactly at the detection limit: statistically real, but only 0.9× the smallest trend this record can resolve.", story_ar="الاحترار عند حد الكشف تماماً: حقيقي إحصائياً، لكنه 0.9 من أصغر اتجاه يستطيع هذا السجل تمييزه.",name="Gobi Desert (Mongolia)", name_ar="صحراء غوبي (منغوليا)", bbox=[40,46,95,110],
   points=9, effective_cells=9, note="cold desert; continental, high interannual rainfall variance",
   tagline="Warming at the edge of detection (+0.17 °C/decade); precipitation shows no trend.",
   tagline_ar="احترار عند حد الكشف (+0.17 °م لكل عقد)، والأمطار بلا اتجاه."),
}
PRIORITY = ["temperature", "precipitation", "soil", "albedo", "swdown"]
ORDER = ["sahel", "jordan", "arctic", "gobi"]

idx = {}
for k in ORDER:
    d = json.load(open(f"data/{k}.json"))
    meta = dict(META[k]); meta["key"] = k
    meta["source_grid"] = "MERRA-2 0.5x0.625 deg / CERES 1 deg"
    meta["grid_km"] = [55.3, 58.7]

    def headline_from(doc):
        vars_ = doc["variables"]
        trends = {kk: vv for kk, vv in vars_.items() if vv["verdict"] == "TREND"}
        pick = next((p for p in PRIORITY if p in trends), None)
        if pick is None:
            pick = "albedo" if "albedo" in vars_ else next(iter(vars_))
        vv = vars_[pick]
        return {
            "var": pick, "slope_per_decade": vv["slope_per_decade"], "direction": vv["direction"],
            "verdict": vv["verdict"], "confidence": vv.get("confidence", "none"),
            "snr": vv["detectability"]["snr"], "n_trends": len(trends), "n_variables": len(vars_),
        }

    meta["headline"] = headline_from(d)
    meta["headline_window"] = "1981–2023"
    d["region"]["meta"] = meta
    d["region"]["challenge"] = "Be An Earth System Trend Detective!"
    json.dump(d, open(f"data/{k}.json", "w"), ensure_ascii=False)

    s = json.load(open(f"data/{k}_2001.json"))
    m2 = dict(meta); m2["window"] = "2001–2023"
    m2["headline"] = headline_from(s)
    m2["headline_window"] = "2001–2023"
    s["region"]["meta"] = m2
    s["region"]["challenge"] = "Be An Earth System Trend Detective!"
    json.dump(s, open(f"data/{k}_2001.json", "w"), ensure_ascii=False)

    idx[k] = {kk: meta[kk] for kk in ("key","name","name_ar","bbox","points","effective_cells","note","tagline","tagline_ar","story_en","story_ar","headline")}

json.dump(idx, open("data/regions.json","w"), ensure_ascii=False, indent=1)
print("built (full + 2001):", ", ".join(ORDER))
for k in ORDER:
    h = idx[k]["headline"]
    print(f"  {k:7s} {h['verdict']:10s} {h['confidence']:11s} {h['var']:13s} {h['slope_per_decade']:+.4f}/dec  ({h['n_trends']}/{h['n_variables']})")
PY