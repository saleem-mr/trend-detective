# Presentation — Trend Detective (7 slides)

## Slide 1 — Title
**Trend Detective**
*Finds real trends. Refuses fake ones.*
The Orcas · Irbid, Jordan · NASA Space Apps Challenge 2026
Challenge: *Be An Earth System Trend Detective!*

## Slide 2 — The problem
NASA's challenge asks for a tool that finds trends, says **where** they are, and judges whether they
are **significant** — and warns that the same process can trend one way here and the opposite way
there. Most trend tools fail on the second half: they draw a line through noise, print a p-value, and
call it a discovery. In a 23-year record this is exactly where honesty is needed.

## Slide 3 — The solution
A dashboard on NASA POWER data with **three mandatory gates** before any claim:
1. block-permutation null (keeps autocorrelation, kills the trend),
2. Mann–Kendall with Hamed–Rao autocorrelation correction,
3. slope above the **minimum detectable trend**.
Plus a per-cell slope map ("where"), a bilingual EN/AR interface, and a grounded chat that only sees
the computed JSON.

## Slide 4 — Data & method
Five variables from MERRA-2 and CERES SYN1deg (2001–2023), 45 Sahel points + 16 Jordan points.
Theil–Sen slopes, Hamed–Rao corrected Mann–Kendall, 400 block permutations, MDT = 2.80 × SE.
Engine: portable C++17 (`-O3`, no `-march=native`). Calibration: 3.8 % false positives, detection rising 0.17 → 0.93
with slope strength.

## Slide 5 — Key findings
- Sahel: precipitation **+0.031** mm/day/yr, soil wetness **+0.003**/yr, albedo **−0.00027**/yr → TREND.
- Sahel temperature **−0.032** °C/yr → **NO VERDICT** (0.95× the detection limit).
- Jordan: temperature **+0.050** °C/yr → TREND; precipitation/soil → NO VERDICT.
- Sahel albedo map: **16 cells rising, 28 falling** — opposite signs in one region.

## Slide 6 — Live demo
Switch region → watch verdicts change. Open the Sahel map → opposing signs. Ask the chat
*"why is there no verdict on temperature?"* → it quotes the detection limit instead of inventing a story.
Toggle العربية → the whole dashboard mirrors to RTL.

## Slide 7 — Impact & roadmap
Impact: an honest detector for students and journalists — it tells you when *not* to believe a trend.
Scalability: the engine takes any `date,value` series, so any NASA variable can be plugged in.
Roadmap: MODIS NDVI + GPM IMERG via Earthdata; CHIRPS for rainfall; per-pixel MK on gridded tiles;
longer records to lower the detection limit.
Team: The Orcas. Built on open NASA data.
