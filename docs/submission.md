# Space Apps submission pack — Trend Detective

Everything below is ready to paste into the project page. Replace `[VIDEO]` and `[REPO]` after upload.

---

## Project name
**Trend Detective**

## Tagline (one line)
Finds real trends. Refuses fake ones.

## Elevator pitch (≤ 300 characters)
A dashboard that detects Earth-system trends in NASA data — and proves when a trend is *not*
detectable. Theil–Sen slopes, autocorrelation-corrected Mann–Kendall, permutation nulls, FDR control and a
minimum detectable trend, on four real regions. Bilingual EN/AR.

## Short description
Most trend tools draw a line through noise and print a p-value. Trend Detective does the opposite: it
computes a robust slope, tests it against a null that preserves autocorrelation, controls the false
discovery rate, and then states the smallest trend the data could actually reveal. When the signal is
below that limit it reports **NO VERDICT** instead of inventing a story. Four real regions, four
different answers — from a distinctly warming Jordanian Badia to a Sahel albedo signal that is real
while its rainfall trend is not.

## Full description
Earth-science trend analysis fails in two directions: it misses real change, or it manufactures
change. NASA's challenge warns that "a measured Earth science data variable can trend one way in one
region and the opposite way in another", and that a trend may be insignificant or need a longer record.
We built the tool that takes that sentence literally.

**What it does.** Pick a region and a variable set; the engine returns, for every variable: a
Theil–Sen slope with a permutation-based confidence interval, a Mann–Kendall test whose variance is
corrected for serial correlation (Hamed–Rao), a Benjamini–Hochberg q-value across the variable family,
detrended anomaly years, a linear projection with widening uncertainty, and a per-cell spatial field.
A verdict is only issued when the autocorrelation-corrected test **and** the FDR correction both pass.
Everything else is reported as NO VERDICT, with the detection limit shown next to the estimate.

**The part nobody else shows.** The window is a control, not a footnote. On 2001–2023 the Sahel
temperature slope is −0.32 °C/decade; on the full 1981–2023 record it is +0.15 °C/decade and no longer
significant. The dashboard has a switch for this, so a judge can watch a conclusion change when the
record is extended — which is exactly the lesson in the challenge text.

**Where.** A Leaflet map with NASA GIBS imagery (Blue Marble basemap + MODIS NDVI context layer) and one
marker per sampled POWER cell, coloured by slope sign, ringed when it survives FDR. Clicking a cell
opens that cell's own 23-year series, its slope, its permutation p and its q-value. The Sahel field
shows 16 cells rising and 28 falling — opposite signs inside one region, as NASA warned.

**Data.** NASA POWER (MERRA-2: temperature, precipitation, soil wetness; CERES SYN1deg: albedo,
shortwave), 79 point series, 1981–2023 for MERRA-2 and 2001–2023 for CERES. No API keys, no accounts.

**Statistics are verified, not asserted.** `--selftest` runs 600 synthetic series and prints the
false-positive rate (3.8 %) and the detection curve (0.17 → 0.93 as the slope grows). A tool that finds
trends should be able to prove it does not find them in noise.

**Bilingual.** Full Arabic interface with proper RTL, written for the local event in Irbid.

## How we built it
- **C++17 statistics engine** (no dependencies), invoked by the server as a subprocess. Portable build
  (`-O3`, no `-march=native`); we measured AVX-512 and it bought exactly nothing for 23–43-point series,
  so we removed the flags rather than advertise them.
- **Zero-dependency Node server**: static hosting, JSON API, live NASA POWER fetch for custom boxes
  (cached by bounding-box hash), and a provider-agnostic LLM adapter.
- **Hand-rolled SVG charts** and **vendored Leaflet** so nothing on the critical path depends on a CDN.
- **Grounded LLM**: the model receives only the computed JSON, never raw data, with a verbatim system
  prompt that forbids inventing numbers; provider chain TokenHarbor → DeepSeek → llm7 → rule-based.
- **Docker + nginx** multi-stage build; the engine is compiled in stage 1.
- **Tests**: calibration thresholds, schema completeness for 4 regions × 2 windows, and all endpoints.

## Challenges we ran into
1. **The brief's own assumption was wrong.** Our first data plan expected a pre-built analysis binary and
   Earthdata credentials; neither existed. We wrote the engine from scratch and switched to NASA POWER,
   which needs no account.
2. **Statistical power.** Twenty-three annual samples cannot resolve small trends. We extended MERRA-2 to
   1981 and made the window visible — which then revealed a sign flip in the Sahel temperature trend.
3. **Autocorrelation.** Naive Mann–Kendall on monthly means is misleading; we aggregate to annual,
   correct with Hamed–Rao, and cross-check with a block-permutation null.
4. **Multiplicity.** With 45 cells, raw p-values over-claim. FDR took the Sahel albedo field from 28
   "significant" cells to 14, and we show both numbers.
5. **Map keys.** CARTO's basemaps now push toward accounts, so we moved the basemap to NASA GIBS — zero
   keys, zero third-party tile services, and it is NASA imagery anyway.

## Accomplishments we are proud of
- A **NO VERDICT** is a first-class result, not an error state.
- **Calibration is published**, with the false-positive rate printed by the engine.
- **Window sensitivity is demonstrable** in two clicks.
- **FDR-controlled spatial field** rather than a single misleading regional average.
- **Reproducible**: `npm test`, `--selftest`, and a "Reproduce" button that prints the exact command.

## What we learned
Honest uncertainty is a feature. The most interesting number in the project is not a slope — it is the
detection limit, because it tells you when a dashboard should stay silent.

## What's next
- MODIS NDVI and GPM IMERG time series (Earthdata via AppEEARS) to add the vegetation variable directly.
- Per-pixel trend fields on gridded tiles instead of sampled points.
- Change-point detection (Pettitt) and seasonal Mann–Kendall for within-year structure.
- A public instance with shareable permalinks to a region + variable + window.

## Built with
C++ · Node.js · Leaflet · NASA POWER (MERRA-2, CERES) · NASA GIBS · Docker · nginx · DeepSeek

## Links
- Live app: **https://trend.mawqi3k.com/**
- Source: `[REPO]`
- Demo video (30 s): `[VIDEO]`

---

# Judge Q&A prep (answer these in one breath)

**"Why does it say NO VERDICT? Is it broken?"**
No — that is the product. The verdict requires the autocorrelation-corrected test *and* FDR to pass. If
they do not, the honest answer is that this record cannot separate the trend from noise, and we show the
detection limit so you can see how far off it is.

**"Isn't 1981 vs 2001 just cherry-picking?"**
It is the opposite: we expose both windows and let you switch. The Sahel flips from −0.32 to +0.15 °C/dec
when the record is extended, which is precisely why single-window trend claims deserve scrutiny.

**"Why no NDVI?"**
NDVI needs MODIS via Earthdata. Our engine accepts any `date,value` series, so NDVI drops in without code
changes; we prioritized breadth of variables and statistical validity over one more layer.

**"Aren't MERRA-2 and CERES correlated by construction?"**
Yes, partly — that is why we refuse causal language and label the products as model/retrieval. The
correlations are reported as co-variation, not attribution.

**"Why Theil–Sen and not OLS?"**
Robustness: one bad year cannot drag the slope. We report the permutation CI, not a textbook OLS interval.

**"What does the LLM do?"**
It only explains the computed JSON, never sees raw data, and is instructed to say "this analysis does not
cover that question" otherwise. If no key is configured, a deterministic interpreter answers instead.

**"Is it fast?"** ~0.05 s per region for 5 variables + a 45-cell field with 200 permutations per cell.

**"Does it run on any server?"** Yes — portable x86-64 build, no AVX requirement, no npm install.

---

# Submission checklist
- [ ] Repository public (or judge-accessible) with README and screenshots
- [ ] 30-second video recorded from `docs/demo-script.md`
- [ ] Project page fields filled from this document
- [ ] Live URL reachable (nginx + docker compose)
- [ ] Rotate the Earthdata password and the TokenHarbor key (both were shared in chat during the event)

---

# PASTE-READY FIELD VALUES (updated: submission closes tonight 23:59 local)

## 1. Project name
**Trend Detective**

## 2. High-Level Project Summary
Most trend tools draw a line through noise and print a p-value. Trend Detective is built to refuse
them. It pulls five real variables from NASA POWER (MERRA-2 temperature, precipitation and soil
wetness; CERES albedo and shortwave) for any region and any window, then applies three mandatory
gates — a block-permutation null that preserves autocorrelation, a Mann–Kendall test corrected with
Hamed–Rao effective sample size, and Benjamini–Hochberg false-discovery control — before it is allowed
to say the word "trend". If the signal does not clear the gates, it reports **NO VERDICT** together with
the smallest trend the record could actually detect. It also answers "where": a per-cell slope field
with FDR-significance, which on the Sahel shows 16 cells rising and 28 falling inside one region. The
most useful number in the project is not a slope but a detection limit — that is what tells a
journalist, a student or a planner when a dashboard should stay silent. Live: https://trend.mawqi3k.com/

## 3. Link to Project Demo (7-slide deck, English)
https://trend.mawqi3k.com/deck/Trend_Detective_7slides.pdf
(editable version: https://trend.mawqi3k.com/deck/Trend_Detective_7slides.pptx)
Public link, no password, no registration.

## 4. Link to Final Project
Live application: **https://trend.mawqi3k.com/**
Public code repository: **https://github.com/saleem-mr/trend-detective** (release v1.0.0 includes the demo deck)
Source archive (full code, data and docs, no login): https://trend.mawqi3k.com/deck/trend-detective-src.tar.gz

## 5. Detailed Project Description
*What it does.* Region-selectable dashboard over NASA POWER data. For each variable it reports a
Theil–Sen slope with a permutation confidence interval, a Hamed–Rao-corrected Mann–Kendall p-value, a
Benjamini–Hochberg q-value across the variable family, detrended anomaly years, a linear projection with
widening uncertainty, and a per-cell spatial slope field where significance is FDR-controlled.

*How it works.* A dependency-free C++17 engine (`trend-detect`) does the statistics; a
zero-dependency Node server exposes it as JSON and fetches custom regions live from the POWER API; the
front end is hand-written HTML/CSS/JS with SVG charts and a locally vendored Leaflet map. A window
switch recomputes everything on 1981–2023 or 2001–2023 — which is how the project shows that the Sahel
temperature trend is −0.32 °C/decade on the short window and +0.15 °C/decade on the full one.

*Benefits.* Anyone can interrogate the same numbers a scientist would: every claim carries p, q, the
effective sample size and the detection limit. The engine prints its own calibration (3.8 % false
positives; detection rising 0.17 → 0.93 as the slope grows), so its honesty is measurable rather than
asserted. It is bilingual (English/Arabic with full RTL) for the local event in Irbid.

*Tools.* C++17 (portable build, no -march=native), Node.js 20, vanilla JavaScript, SVG, Leaflet 1.9.4
(vendored, BSD-2), Docker, nginx with Let's Encrypt TLS, NASA POWER/MERRA-2/CERES and NASA GIBS.

## 6. Use of Super Intelligence (SI)
Yes — disclosed in full. **(a) Development:** the code was written by a human team lead pair-programming
with an agentic AI coding assistant (opencode CLI driving a DeepSeek model). The assistant wrote most of
the C++ statistics engine, the server and the front end under the lead's direction; the lead chose the
challenge, defined the concept and gate logic, and validated every result. No SI tool chose the idea or
the scientific method; the assistant was used as tooling, in the same way as a compiler or an IDE.
**(b) In the product:** the chat panel uses a large language model that is strictly grounded — it
receives only the pre-computed results JSON, never raw data, and is instructed to answer "this analysis
does not cover that question" otherwise. If no model key is configured, a deterministic template
interpreter answers instead. **(c) Content:** no SI-generated images or video are used in this
submission; every screenshot is a capture of the running application and the slide deck is generated
from code by a script. **(d)** No NASA branding, logos or mission identifiers are used in any generated
content.

## 7. NASA Data
- **NASA POWER** (power.larc.nasa.gov) — 79 monthly point series, 1981–2023: `TS` (MERRA-2 Earth skin
  temperature), `PRECTOTCORR` (MERRA-2 precipitation), `GWETTOP` (MERRA-2 surface soil wetness),
  `ALLSKY_SRF_ALB` (CERES SYN1deg albedo), `ALLSKY_SFC_SW_DWN` (CERES SYN1deg shortwave).
- **NASA GIBS** — MODIS Terra NDVI 8-day and Blue Marble Shaded Relief basemap tiles.
- NASA data is the core of the solution, not decoration: every number in the dashboard, every slope,
  every verdict and every map cell is computed from NTRS/POWER records.

## 8. Space Agency Partner Data and Other References
- NASA POWER API (MERRA-2, CERES SYN1deg) — https://power.larc.nasa.gov/
- NASA GIBS WMTS — https://gibs.earthdata.nasa.gov/
- NASA AppEEARS (MODIS MOD13A3 NDVI pipeline, queued during the event) — https://appeears.earthdatacloud.nasa.gov/
- Leaflet 1.9.4 — BSD-2-Clause, vendored in `web/vendor/leaflet` with its LICENSE file
- Google Fonts: Inter, Space Grotesk, IBM Plex Sans Arabic (OFL)
- Node.js (MIT), g++/libstdc++ (GPL-3.0 with runtime exception), Docker, nginx, Certbot/Let's Encrypt
- DeepSeek model via TokenHarbor, used only for the grounded interpreter (optional at runtime)
- No copyrighted third-party imagery is used; all maps are rendered from NASA GIBS tiles.
