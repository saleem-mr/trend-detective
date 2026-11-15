#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
chk() { if [ "$1" = "$2" ]; then echo "  PASS  $3"; else echo "  FAIL  $3 (got '$1' want '$2')"; fail=1; fi; }

echo "1) engine self-test (calibration)"
./engine/trend-detect --selftest | tee /tmp/td_selftest.txt
fp=$(grep -oE 'slope= 0.0x MDT -> detection rate [0-9.]+' /tmp/td_selftest.txt | grep -oE '[0-9.]+$')
awk -v v="$fp" 'BEGIN{exit !(v<=0.08)}' && echo "  PASS  null false-positive rate <= 0.08" || { echo "  FAIL  FP too high ($fp)"; fail=1; }
tp=$(grep -oE 'slope= 1.5x MDT -> detection rate [0-9.]+' /tmp/td_selftest.txt | grep -oE '[0-9.]+$')
awk -v v="$tp" 'BEGIN{exit !(v>=0.60)}' && echo "  PASS  detection at 1.5x MDT >= 0.60" || { echo "  FAIL  low power ($tp)"; fail=1; }

echo "2) presets build"
bash scripts/build_presets.sh >/dev/null
for r in sahel jordan; do
  n=$(python3 -c "import json;d=json.load(open('data/$r.json'));print(len(d['variables']))")
  c=$(python3 -c "import json;d=json.load(open('data/$r.json'));print(len(d['spatial']['cells']))")
  chk "$n" "5" "$r has 5 variables"
  [ "$c" -ge 16 ] && echo "  PASS  $r spatial cells = $c" || { echo "  FAIL  $r cells=$c"; fail=1; }
done

echo "3) every variable carries the full required schema"
python3 - <<'PY' || fail=1
import json,sys
need={"slope_per_year","slope_ci","mk","hamed_rao","permutation","fdr","detectability","verdict","confidence","series","fit","anomalies","predictions"}
for r in ("sahel","jordan","arctic","gobi"):
    d=json.load(open(f"data/{r}.json"))
    s2=json.load(open(f"data/{r}_2001.json"))
    assert s2["variables"]["temperature"]["period"][0] >= 2001, f"{r} short window starts too early"
    for k,v in d["variables"].items():
        miss=need-set(v)
        assert not miss, f"{r}/{k} missing {miss}"
    assert "cells_up" in d["spatial"] and "cells_down" in d["spatial"]
print("  PASS  schema complete for 4 regions x 2 windows")
PY

echo "4) server endpoints"
( PORT=3011 node server.js >/tmp/td_test_server.log 2>&1 & echo $! > /tmp/td_pid )
sleep 1.2
h=$(curl -s localhost:3011/api/health | python3 -c "import json,sys;print(json.load(sys.stdin)['ok'])")
chk "$h" "True" "GET /api/health"
a=$(curl -s "localhost:3011/api/analyze?region=jordan" | python3 -c "import json,sys;print(json.load(sys.stdin)['region']['name'])")
chk "$a" "Jordan Badia (Irbid–Mafraq)" "GET /api/analyze?region=jordan"
w=$(curl -s "localhost:3011/api/analyze?region=sahel&period=2001" | python3 -c "import json,sys;print(json.load(sys.stdin)['variables']['temperature']['period'][0])")
chk "$w" "2001" "GET /api/analyze&period=2001"
c=$(curl -s -X POST localhost:3011/api/chat -H 'Content-Type: application/json' -d '{"question":"is this significant?","lang":"en"}' | python3 -c "import json,sys;d=json.load(sys.stdin);print(1 if len(d.get('text',''))>20 else 0)")
chk "$c" "1" "POST /api/chat answers (LLM or rule-based)"
kill "$(cat /tmp/td_pid)" 2>/dev/null || true

echo
[ "$fail" = "0" ] && echo "ALL TESTS PASSED" || { echo "TESTS FAILED"; exit 1; }