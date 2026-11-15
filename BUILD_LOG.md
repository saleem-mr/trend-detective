# BUILD LOG — Trend Detective (The Orcas)

NASA Space Apps Challenge 2026 · Challenge: *Be An Earth System Trend Detective!*
Local event: Irbid, Jordan. Format: append-only log of real, measured progress.

## Phase 0 — Decision log (deliberate deviations from the initial brief)
- **Data source changed to NASA POWER** (MERRA-2 + CERES SYN1deg) instead of `earthaccess`/MOD13A3.
  Reason: POWER needs no Earthdata account, is a REST/CSV service, and MERRA-2 is named in the
  challenge itself. 70 verified CSVs were already on disk from earlier work. NDVI is not dropped
  as a concept — the engine accepts any `date,value` series, so an Earthdata pipeline can be added.
- **Frontend stack changed to zero-dependency** (vanilla ES modules + one Node server, no npm).
  Reason: removes install/build risk inside a 36-hour event; the whole app is auditable.
- **Science core changed**: not "detect decline", but "decide whether a trend is detectable at all".
  Reason: the challenge text explicitly warns trends differ by region and may be insignificant.

## Phase 1 — Scaffold
- `engine/trend_detect.cpp` (C++17), `server.js` (Node, no deps), `web/` (html/css/js), `data/`.
- Compiler: `g++ -O3 -std=c++17 -march=native -mavx512f -mavx512dq -mavx512bw -mavx512vl`.
- Build OK: `engine/trend-detect` (131 KB).

## Phase 2 — Data
- 45 Sahel points (`data/sahel/`) and 16 Jordan points (`data/jordan/`), POWER monthly, 2001–2023,
  5 variables each (TS, PRECTOTCORR, GWETTOP, ALLSKY_SRF_ALB, ALLSKY_SFC_SW_DWN).
- Live POWER fetch verified: one point request returns all 5 variables (129 lines), ~3 s.
- Jordan: 16 points collapse to **12 distinct MERRA-2 cells**. Corridor test: 9 points → 3 cells.

## Phase 3 — Engine (statistics)
Implemented: Theil–Sen slope, Mann–Kendall (tie-corrected), Hamed–Rao effective sample size,
block-permutation null (spreads of the detrended series), minimum detectable trend (MDT = 2.80·SE),
quantisation floor, detrended z-score anomalies, Spearman + permutation p, linear projection with
widening interval, per-cell spatial mode, and a `--selftest` calibration mode.

**Calibration (`--selftest`, n=23, σ=0.35, 600 reps):**

| slope / MDT | detection rate |
|---|---|
| 0.0 | 0.038 |
| 0.5 | 0.170 |
| 1.0 | 0.435 |
| 1.5 | 0.762 |
| 2.0 | 0.925 |

Reference MDT = 0.0310 per year. False positives stay ≈ 3.8 % because three gates must pass.

## Phase 4 — Preset results (real, measured)

**Western Sahel (45 cells, 2001–2023)**

| variable | slope / yr | p (perm) | MDT | signal | verdict |
|---|---|---|---|---|---|
| precipitation | +0.0308 | 0.0025 | 0.0160 | 1.93× | TREND |
| soil wetness | +0.00303 | 0.0025 | 0.00173 | 1.75× | TREND |
| surface albedo | −0.00027 | 0.0025 | 0.00012 | 2.17× | TREND |
| temperature | −0.0316 | 0.0025 | 0.0335 | 0.95× | **NO VERDICT** |
| shortwave down | −0.00504 | 0.152 | 0.00964 | 0.52× | **NO VERDICT** |

Spatial (albedo): 16 cells rising, 28 falling, 28 significant → opposing signs, as the challenge warns.

**Jordan Badia (16 points → 12 cells, 2001–2023)**

| variable | slope / yr | p (perm) | MDT | signal | verdict |
|---|---|---|---|---|---|
| temperature | +0.0495 | 0.0025 | 0.0300 | 1.65× | TREND |
| surface albedo | −0.00038 | 0.0025 | 0.00027 | 1.40× | TREND |
| precipitation | −0.00163 | 0.604 | 0.00873 | 0.19× | **NO VERDICT** |
| soil wetness | −0.00054 | 0.486 | 0.00191 | 0.28× | **NO VERDICT** |
| shortwave down | −0.00282 | 0.090 | 0.00436 | 0.65× | **NO VERDICT** |

Spatial (albedo): 16 falling, 14 significant.

## Phase 5 — API
`GET /api/health`, `GET /api/regions`, `GET /api/analyze?region=…`, `GET /api/analyze?bbox=…`
(live POWER fetch, ≥ 2° box, cached by SHA-1 of the box), `POST /api/chat` (grounded; DeepSeek if a
key is present, otherwise a rule-based interpreter that only reads the computed JSON).

## Phase 6 — Dashboard
RTL/LTR bilingual (EN/AR). Verdict banner, three-gate panel, signal meter, SVG series chart with
trend CI band + projection + anomaly markers, per-cell slope map (opposing signs), 5 KPI cards,
statistics table, anomaly timeline, projection table, methodology card, grounded chat with an
injected-context viewer, JSON download, reproduce-this-result panel, About page.

## Phase 7 — Deployment
Multi-stage `Dockerfile` (builds the engine with g++ in stage 1), `docker-compose.yml` (app + nginx),
`deploy/nginx.conf` (gzip, security headers, TLS notes), `.env.example`, `ML_ENGINE_PATH` honoured.

## Phase 8 — Docs
`README.md`, `docs/methodology.md`, `docs/presentation.md`, `docs/demo-script.md`, this log.

## Phase 9 — QA
`scripts/test.sh`: engine calibration, preset schema completeness, and all three server endpoints —
**ALL TESTS PASSED**. Rendered in-browser: chart (74 SVG nodes), 45/16 map cells, 5 KPI cards,
12 projection rows, EN↔AR live switch, grounded chat reply verified in Arabic.

## Blockers / open items
- No Earthdata, DeepSeek or Gemini key on the machine → chat runs on the rule-based interpreter
  (the LLM path is wired and will activate when a key is provided).
- NDVI (MOD13A3) requires an Earthdata login and is not included; the engine's input contract
  already accepts any `date,value` series.

## Phase 10 — Grounded LLM providers (measured)
Probed three real endpoints from this machine:
- **TokenHarbor** `https://tokenharbor.ai/v1` — 84 models, key accepted; `deepseek-v4.1-flash:free`
  answered correctly in 1.5–3.2 s (EN + AR).
- **llm7.io** `https://api.llm7.io/v1` — works with **no key** for free model ids
  (`DeepSeek-V4-Flash-0731`), but enforces a short quota window ("retry after 42 s").
- **Local CLI proxy** `http://localhost:18765/v1` — 401 without the CLI's own token, localhost-only,
  so it is not usable from a deployed server. Not shipped.

Implemented an OpenAI-compatible provider chain: TokenHarbor → DeepSeek → llm7 → Groq → rule-based.
Errors and quota failures fall through automatically; `/api/chat` returns `provider` + `model`, the UI
shows them, and `/api/health` lists the active chain. Verified in EN and AR.

## Phase 11 — Professional map (Leaflet, vendored, no CDN)
- Vendored **Leaflet 1.9.4** (js/css/images/LICENSE, BSD-2) into `web/vendor/leaflet`.
- Layers: CARTO Dark Matter basemap · **NASA GIBS WMTS** `MODIS_Terra_NDVI_8Day` (2025-07-01) as a
  context-only overlay · per-cell slope markers from our own engine · analysed bbox · legend · scale
  control · layer switcher (all labels localised EN/AR).
- Engine change: each spatial cell now carries its 23-year series, so a marker popup shows that cell's
  own sparkline, slope, permutation p and significance.
- GIBS verified against `WMTSCapabilities.xml`; the NDVI 8-day layer serves recent dates only, so the
  panel states "context only, not used in the statistics".
- Verified in-browser: 12 basemap + 12 GIBS tiles loaded, 45/16 markers inside the viewport,
  fitBounds correct, popup sparkline = 23 points, AR labels, **0 console errors**, 0 px horizontal
  overflow at 390 px, map 440 px desktop / 320 px mobile.
- Degradation: tile errors raise an "offline" badge; vector layers continue to work without tiles.

## Phase 12 — Removed the third-party basemap (no map API key)
Concern raised: CARTO's public basemaps now push users toward an account/key. Even though
`basemaps.cartocdn.com` still returned 200 without a key, depending on it is a needless risk.
- Basemap replaced with **NASA GIBS** `BlueMarble_ShadedRelief_Bathymetry`
  (`GoogleMapsCompatible_Level8`, `.jpeg`, time 2004-08-01), dimmed with a CSS filter
  (`brightness(.52) saturate(.62)`) to match the dark theme.
- NDVI overlay remains NASA GIBS (`MODIS_Terra_NDVI_8Day`, `.png`, level 9).
- Verified: 12/12 tiles served from `gibs.earthdata.nasa.gov`, **zero** requests to CARTO; 46 markers;
  no console errors.
- GIBS quirk discovered and handled: format is per-layer (BlueMarble/NDVI differ; BlueMarble needs
  `.jpeg`, NDVI needs `.png`, and both need a real time value rather than `default`, otherwise HTTP 400).
- Result: the whole app now has **no map keys and no map third-party services**; the only optional
  credential is the LLM provider.

## Phase 13 — Power, FDR and the window control
Findings from extending the records to 1981–2023 and adding multiplicity control:
- POWER MERRA-2 variables were refetched **1981–2023** (43 annual values) while CERES (albedo, shortwave)
  remains 2001+; 79 point series fetched, 0 credentials.
- **Window effect (measured):** Sahel temperature is −0.32 °C/dec on 2001–2023 but **+0.15 °C/dec on
  1981–2023**; Arctic warming is only detectable on the full record (+0.40 °C/dec, p_HR = 0.008).
  The UI now has a window switch, and the API takes `&period=2001`.
- **New presets:** Arctic tundra (9 pts) and Gobi Desert (9 pts) → four scenarios with four different
  verdicts/confidences.
- **Benjamini–Hochberg FDR** across variables and across cells. Sahel albedo: 28 raw-significant cells
  → **14 FDR-significant**. Verdict = p_HR < 0.05 AND q < 0.05; MDT became an advisory
  (strong / moderate / near-limit) rather than a hard gate — a trend can be significant while the
  record is still underpowered, and saying so is more honest than refusing the result.
- Schema: `fdr{q,m,method}`, `confidence`, per-cell `phr`/`q`; engine flag `--start-year`.
- Rebuilt 4 regions × 2 windows = 8 result files; tests updated.

## Phase 14 — AVX-512 removed after measurement (it did nothing)
Question: is `-mavx512f -mavx512dq -mavx512bw -mavx512vl -march=native` making this faster?
Measured, not assumed:
- `objdump -d engine/trend-detect | grep -c zmm` → **0**. The compiler never emitted a single
  AVX-512 instruction for this code; it auto-vectorises a few loops with 32-byte (AVX2) vectors.
- self-test (600 synthetic fits): 1.50 s with the flags, **1.46 s** without them.
- full region rebuild (5 variables + 45-cell spatial field, 200 permutations per cell): **0.05 s** with,
  **0.05 s** without. Four repeats: identical.

Why: the statistical work is O(n²) over n = 23–43, then ~24k pairwise slopes per region. That is a few
million scalar divisions — microseconds. There is no large streaming kernel to vectorise. The earlier
9× AVX-512 result belonged to a 16.7M-element dot product (memory-bandwidth bound), a completely
different regime; quoting it here would have been dishonest.

Action: the default build is now `g++ -O3 -std=c++17` (baseline x86-64). This also removes a real
deployment hazard: `-march=native` inside a Docker build targets the *build* host, and an AVX-512
binary dies with SIGILL on any server without it. Every mention of "AVX-512" in the UI, README, slides
and the report to the briefing AI was corrected.

## Phase 15 — Design audit and fixes
Reported: the verdict badge looked wrong. Root causes found by measuring, not by eye:
1. **Arabic typography broken by design tokens.** `.verdict`, `.card h3`, `.badge`, `th`, `.conf` carried
   `letter-spacing` + `text-transform:uppercase`, and the badge used `Space Grotesk` (no Arabic glyphs).
   Letter-spacing severs cursive joining, so "اتجاه مؤكّد" rendered as disconnected letters in a fallback
   font. Fix: `[dir=rtl]` block that resets letter-spacing/text-transform and switches to IBM Plex Sans
   Arabic for every uppercase/latin-styled element.
2. **Stale CSS made the fix invisible.** Static assets had `max-age=300`; the browser kept old CSS. Replaced
   with **ETag + `no-cache` revalidation** for app files (verified 304 round-trip) while `/vendor/*` stays
   immutable; URLs bumped to `?v=4`.
3. **Verdict pill hardened**: `white-space:nowrap`, explicit status dot, `role="status" aria-live="polite"`.
4. **Header at tablet width**: badge + controls wrapped into 4 rows (124 px). Badge/spacer hidden ≤1100,
   controls get their own row; **768 px → 2 rows**.
5. **Mobile header 204 px → 132 px** (24% of a 844 px viewport): compact segmented control, smaller type,
   hidden "Custom box" (documented), subtitle hidden, 32 px mark.
6. **KPI row** now `auto-fit/minmax(190px)` so a 6th variable (NDVI) will not leave an orphan cell.
7. **Scenario cards** clamp their titles to two lines with a reserved min-height, so the four cards stay
   the same height when a name wraps (verified 190 px × 4 in Arabic).
8. **Focus-visible** rings on every interactive element; legend title `overflow-wrap:anywhere`; mobile map
   legend nudged up 52 px so the chat FAB can never sit on it (measured: no overlap).
All verified at 1440 / 768 / 390 px in EN and AR: no horizontal overflow (-15 px scrollbar allowance).

## Phase 16 — First-10-seconds pass
Design advice implemented after the audit:
1. **NDVI overlay on by default** (`st.gibs.addTo(map)`, opacity 0.66). The map now opens as NASA satellite
   imagery with the trend cells on top, instead of an empty dark basemap. Verified: 4 Blue Marble + 4 NDVI
   tiles in the viewport, checkbox checked on load, layer still toggleable.
2. **"The surprise" banner** under the hero: one measured sentence per region, EN + AR, shown before any
   chart. Content is measured, not marketing:
   - Sahel: cooling −0.32 °C/dec on 2001–2023 vs warming +0.15 °C/dec on 1981–2023.
   - Jordan: +0.48 °C/dec at 3.2× the detection limit; rainfall no trend.
   - Arctic: detectable only with the 43-year record.
   - Gobi: +0.17 °C/dec, 0.9× the detection limit.
3. Bilingual styling for the banner (`[dir=rtl]` resets spacing, Arabic font) and mobile sizing.
Verified: banner visible and RTL-correct, no horizontal overflow, map layers both loaded.

## Phase 17 — 7-slide deck (no video)
Built `docs/slides/Trend_Detective_7slides.pptx` (16:9, 13.33×7.5 in) and an exported
`…7slides.pdf` (7 pages, 960×540 pt). Generated from code (`build_deck.py`) so every number is traceable,
with speaker notes on all seven slides.
- Theme: #0B0F1A background, accent #4D9FFF, signal #00D4AA / #FF6B6B, Arial (metric alias of Liberation
  Sans, so no downloaded font is required to render correctly anywhere).
- Content mirrors the measured results: three gates, window flip (−0.32 vs +0.15 °C/dec), FDR 28→14,
  four regions with confidence labels, and the refusals.
- Verified: 7 pages, text extraction complete, no shape outside the slide bounds (only the intentional
  page numbers sit in the footer zone), one embedded screenshot (1353×514) on slide 6, notes present.

## Phase 18 — Deployed to production host
Host chosen by measurement (see server comparison): **Hostinger Large 145.223.116.240**, Frankfurt,
x86_64, 4 vCPU / 15 GB / 194 GB free, 82–92 ms from Jordan versus 162–190 ms for the Boston box.
Oracle A1 (server 1) was unreachable on every port, so it is out.

Two real bugs surfaced during deployment and were fixed:
1. **The Dockerfile assumed `cache/` exists** (`COPY cache ./cache`). It built locally only because the
   directory happened to be present; the clean checkout on the server failed with
   "failed to compute cache key: /cache: not found". Now: `RUN mkdir -p cache`, plus a `.dockerignore`.
2. Printed a reminder that `docker compose` is **not** installed on the Hostinger hosts, so the publish
   guide uses plain `docker build` / `docker run`.

Live verification from the public URL: `/api/health` ok, `/api/analyze` returns the full schema, the
window toggle recomputes (Sahel temperature −0.316 °C/dec on 2001–2023), the chat answers through
TokenHarbor, and **24 map tiles (12 Blue Marble + 12 NDVI) load from NASA GIBS** — so outbound access
works and the map renders. Container is `healthy`, `--restart unless-stopped`, docker enabled at boot.
The chat also proved its grounding live: asked about the Arctic while the Sahel was loaded, it replied
"This analysis does not cover the Arctic…" instead of inventing an answer.

## Phase 19 — Public domain
Added `trend.mawqi3k.com` (A → 145.223.116.240, TTL 300) in the Hostinger DNS panel. Because the app
already binds port 80 on that host, no server change was needed — verifying that any hostname pointing
at the IP is served.
Verified end to end through the real domain: resolution correct on Cloudflare and Google DNS, HTTP 200
in 0.20 s, `/api/health` ok, `/api/analyze` returns all verdicts for Jordan, **24 map tiles (12 Blue
Marble + 12 MODIS NDVI)** load over the public internet, and the chat answers through TokenHarbor.
Docs (README, submission pack, deploy guide) updated to the new URL.

Side finding recorded for later: every A record on mawqi3k.com (root, `moodle`, `play`) points to the
dead Oracle host 145.241.108.211, so the main site is offline. Separate job from the hackathon.

## Phase 20 — Server normalised, TLS on 443, VPN stack removed
Requested: drop the mada/VPN pieces, make it a normal web server, make the site solid.

Removed (all backed up under `/root/backup-mada-<date>/`):
- `stunnel` service + `/etc/stunnel/stunnel.conf` and the `mada.crt`/`mada.key` pair — this was the
  SSH-over-443 SNI tunnel for the free-internet experiment. Ports 443 and 8443 released.
- The stale host `nginx` unit configs (`default.conf`, `halaqa.conf.disabled`, `mada-free.conf.bak`,
  `php-fpm.conf`) and the dead `halaqa.duckdns.org` renewal entry (cert files kept, renewal retired —
  that host no longer exists).
- `trend-tls` container (temporary 4443 endpoint) — superseded by the real setup.

Resulting topology:
- **host nginx 1.30** owns **80** (301 → HTTPS, plus ACME challenges) and **443** (TLS 1.2/1.3, HTTP/2,
  HSTS, security headers) and proxies to the app on `127.0.0.1:3000`.
- App container republished to **loopback only** (`-p 127.0.0.1:3000:3000`).
- Certificate: Let's Encrypt, `CN=trend.mawqi3k.com`, valid to **13 Feb 2027**; renewal proven with
  `certbot renew --dry-run` → "all simulated renewals succeeded"; deploy hook reloads nginx, and ACME
  is served by nginx *and* the app (zero-downtime, no container stop).
- Firewall reduced to **22/80/443**. MySQL, PostgreSQL, Redis, MongoDB, FTP and 11 admin ports were open
  to the internet and are now blocked (services left running locally; verified unreachable from outside).

Verified over HTTPS in a browser: secure context true, **24 GIBS tiles over https**, **zero mixed
content**, 4 scenario cards, 46 map features, grounded chat answering through TokenHarbor, no overflow.
HTTP returns 301 → HTTPS, and HTTPS answers in 19 ms over HTTP/2.

## Phase 21 — Map overlay removed (reported on a phone)
Reported: a text panel covered most of the map and could not be dismissed, worst on mobile.

Diagnosis by measurement: the Leaflet **legend control** lived *inside* the map container
(`.leaflet-bottom.leaflet-right`) with a fixed min-width plus two note lines. On a 310 px-wide map it
occupied roughly half the surface, and the full-width **attribution bar** added another strip.

Fix — the legend now lives **outside the map**, as its own panel in the map card, so no map content can
ever be hidden behind it:
- `map.js` no longer creates an `L.control` legend; `drawLegend()` renders into `#mapLegend`, a sibling
  element placed directly under the canvas.
- The panel is a full-width bar: parameter + cell count, the slope gradient with min/max, falling/rising
  labels, `◯ ring = FDR-significant (q<0.05)`, and the NDVI context note.
- Attribution compacted to `Leaflet | NASA GIBS` (9.5 px, single line, ellipsis) — the same credit is
  shown in full on the About page and in the docs.
- Scale control hidden on phones; the copyright credit stays visible (licence requirement).
- Dead in-map legend CSS and the old `margin-bottom:52px` mobile hack were deleted.

Measured after the change — map surface covered by controls:

| viewport | before | after |
|---|---|---|
| 391 px (phone) | legend ≈ half the map + full-width attribution | **5.6 %** (zoom 2.1, layers 2.3, attribution 1.2, scale 0) |
| 1440 px | legend inside the map | **2.7 %** |

Verified live on the deployed site (https://trend.mawqi3k.com/) at both widths: legend below the map,
46 map features, tiles loading, no horizontal overflow.

## Phase 22 — Official requirements audit and last gaps closed
Read the official 2026 guides (Project Submission Guide, Judging & Awards Guide) and audited against them.

**What the rules actually require**
- Demo is **mandatory**: either a ≤30 s video **or a slide deck of up to 7 slides** (title + intro
  included). Slide decks must be in English. Hosted externally with a public, login-free link — the
  Space Apps site does not accept video or document uploads.
- Submission closes **Sunday 15 Nov, 23:59 local** (Jordan, UTC+3).
- Judged 1–5 on five criteria: **Impact, Creativity, Validity, Relevance, Presentation**.
- Must describe **use of Super Intelligence (SI)**; generated images/video need visible watermarks, and
  generated code/data must be acknowledged. No NASA branding in generated content.
- Must list **NASA data** used (at least one NASA data/resource is required for a Global Award) and all
  other references with licences.

**Gaps found and closed**
- The deck existed but was not publicly reachable → published at
  `https://trend.mawqi3k.com/deck/Trend_Detective_7slides.pdf` (`.pptx` too), served by our own nginx
  with correct `application/pdf` MIME.
- No public source link (project is not a git repo and `gh` is not installed) → published a 3.2 MB
  source archive at `https://trend.mawqi3k.com/deck/trend-detective-src.tar.gz`.
- `docs/submission.md` extended with paste-ready values for **all eight official fields**, including the
  SI disclosure (agentic coding assistant + grounded in-app interpreter, no SI imagery) and a full
  reference list with licences.

## Phase 23 — Root domain restored (redirect) + cert for the apex
The apex `mawqi3k.com` still pointed at the dead Oracle host, so anyone typing the bare domain (or
stripping the subdomain from a link) hit nothing. Fixed:
- **A record `@` → 145.223.116.240** (set by the owner; `www` is a CNAME to the apex so it follows).
- Issued a Let's Encrypt certificate covering **`mawqi3k.com` + `www.mawqi3k.com`** via the same
  HTTP-01 webroot used by the app.
- New nginx server blocks: port 80 for the apex, `www` and every legacy subdomain
  (`moodle`, `play`, `test`, `chat`, `exams`, `clinic`, `mail`) → 301 to the app; port 443 for the apex
  and `www` with the new certificate → 301 to `https://trend.mawqi3k.com/`.
- HSTS deliberately **without** `includeSubDomains`, so it cannot force HTTPS onto the mail host.
- Deliberate non-changes: `mail` still points at the old host (repointing it here would break the MX);
  `moodle`/`play` were left alone.

Debugging note worth remembering: `systemctl reload nginx` reported success and `nginx -T` showed the new
config, yet the running master was still serving the old one (process start 17:51 vs config mtime 18:19) —
SNI for `mawqi3k.com` returned the *trend* certificate. A full `systemctl restart nginx` applied it.
Verified after restart: SNI `mawqi3k.com` → CN=mawqi3k.com, SNI `trend.mawqi3k.com` → CN=trend.mawqi3k.com,
apex over HTTPS → 301 to the app, app still 200.

DNS propagation: Google and OpenDNS already return the new IP; Cloudflare's resolver still holds the
previous record until its 3600 s TTL expires. `certbot renew --dry-run` passes for both certificates.

## Phase 24 — Full end-to-end verification (pre-submission)
Ran a complete pass against the live deployment, plus a security sweep of everything published.

**Security sweep — clean**
- Public source archive: 151 files, contains `.env.example` (empty keys only) and no real secret values
  (scans for the TokenHarbor key prefix, the Earthdata password and `thk_live_` values all return 0).
- `web/` contains no secrets; `.env` is mode 600 on the host and **not present inside the image**
  (`/app/.env` → NO).
- Private paths over HTTPS: `/.env`, `/server.js`, `/package.json`, `/Dockerfile`, `/data/sahel.json`,
  `/cache/`, `/docs/submission.md` → all **404**.

**Functional pass — all green**
| check | result |
|---|---|
| HTTPS / TLS | TLSv1.3, `TLS_AES_256_GCM_SHA384`, HSTS + nosniff + referrer + permissions headers |
| HTTP | 301 → HTTPS |
| regions (all four, via the scenario cards) | Sahel albedo TREND · Jordan +0.484 °C/dec TREND · Arctic +0.396 TREND · Gobi +0.171 TREND |
| window flip (live) | 1981–2023 **+0.154** °C/dec vs 2001–2023 **−0.316** °C/dec |
| map | 46 features (45 cells + bbox), GIBS tiles over https, cell popup with 23-point sparkline, p and q |
| chat | EN and AR answered via TokenHarbor, grounded |
| Arabic RTL | `dir=rtl`, IBM Plex Sans Arabic on the badge, legend still below the map |
| mobile 390 px | header 132 px, in-map controls **5.6 %**, no overflow, no offending elements |
| console | **0 errors** across the whole session |
| deck (fetched publicly) | 7 pages, 960×540 pt, correct first slide |
| local suite | `npm test` → ALL TESTS PASSED |

**Bug found and fixed during this pass:** the verdict badge followed the previously selected variable, so
opening Arctic or Gobi showed "NO VERDICT" while the story banner said warming. The badge now switches to
the region's headline variable (temperature for Jordan/Arctic/Gobi, albedo for the Sahel), so badge,
chart, tab and story always agree.

## Phase 25 — Deck audited against the data (one real error found)
Ran an automated numeric audit: every figure on the slides was compared with the JSON the engine produced.
- **Error found:** slide 5 stated Sahel albedo as **−0.027 per decade**; the engine says **−0.00268**
  (a 10× slip). The same wrong value had propagated into `README.md` (and nowhere else). Fixed in the
  deck, the README and the submission pack; the slide now reads **−0.27 pp** (percentage points), which is
  exact and readable.
- **Second, subtler problem:** slide 2 claimed albedo "moves by about one hundredth per decade", which our
  own measurement contradicts (−0.0027/decade). Replaced with a verified, stronger statement: CERES
  publishes monthly albedo in steps of **0.01** — confirmed directly from the raw CSVs — i.e. the same
  magnitude as a decade of change, so the signal hides in the rounding.
- Everything else cross-checked and correct: +0.48 / +0.40 / +0.17 °C per decade, the window flip
  (−0.32 vs +0.15), FDR 28 → 14, the three refusal p-values, 79 series, 43 years, 45 cells, 12 Jordan
  cells, 3.8 % false positives and the 0.17 → 0.93 detection curve.
- Layout/typography checks: 7 slides, no shape off-slide, no likely text overflow, no misspellings, no
  Arabic (English-only requirement), all key terms present.
Deck rebuilt, PDF re-exported and republished at the public link.

## Phase 26 — Independent audit (external review) — verdicts on each claim
An external reviewer read BUILD_LOG + data and raised seven points. Each was checked against the files.

**Confirmed and fixed**
1. **`headline` in `*_2001.json` was inherited from the full record** (worst finding). `arctic_2001.json`
   showed `headline.verdict = TREND` while its own `temperature.verdict = NO VERDICT`; the same class of
   mismatch existed in all four short files. `build_presets.sh` now computes a headline from each file's own
   variables and adds `headline_window`. Verified through the public API: Arctic 2001 → NO VERDICT (snr 0.60),
   Arctic full → TREND moderate (snr 1.28).
2. **Product years mislabelled.** Slide 4 said "CERES SYN1deg (2001–2023)", but `ALLSKY_SFC_SW_DWN` starts
   **1984** (Arctic swdown: n=40, 1984–2023) while albedo starts 2001. Deck, README and the About page now
   state the exception explicitly.
3. **`lib/ml-adapter.js` was a misleading name** for a project that advertises "no ML" — renamed to
   `lib/engine-adapter.js`, references updated, archive repackaged (0 occurrences of the old name).
4. **Series count imprecise**: "79 point series" → "79 points × 5 variables = 395 series".
5. **No git repository**: `git init` + first commit (132 tracked files), repo included in the published
   archive (465 entries, `.env` absent, no secret values).

**Investigated and rejected (with evidence)**
6. **"Jordan SNR contradicts BUILD_LOG"** — false alarm: BUILD_LOG Phase 4 recorded the 2001-window values
   (`+0.0495/yr`, snr 1.65) and Phase 13+ the full record. 0.0495/yr × 10 = 0.495/dec = the slide's "+0.48";
   the SNR rise from 1.65 → 3.15 is the effect of extending 23 → 43 years, not an error.
7. **"n_eff = 43 means the autocorrelation correction does nothing in the Arctic"** — checked by independent
   recomputation: the detrended Arctic temperature series has lag-1 autocorrelation **−0.35**, so the
   Hamed–Rao sum is negative and the code clamps n_eff to n (i.e. it applies *no* variance reduction),
   which is the conservative choice. The correction is demonstrably active elsewhere (Arctic soil on the
   2001 window: n_eff 4.9, inflation 2.17).
8. **"Published deck may be stale"** — verified fresh: the public PDF contains `albedo −0.27 pp` and
   `published albedo step`. (The reviewer's doubt and my own first grep both tripped on U+2212 vs hyphen.)

**Also fixed while in there:** the rule-based chat fallback handled English but not Arabic for the phrase
"detection limit" — a new pattern now answers it in both languages. Verified by running the server with
no keys at all (provider: rule-based).
