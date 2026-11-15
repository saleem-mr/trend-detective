#!/usr/bin/env python3
"""Build the 7-slide deck (16:9, dark NASA theme) from the measured results."""
import os, sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn


def strip_style(shp):
    el = shp._element
    for tag in ("p:style",):
        for child in el.findall(qn(tag)):
            el.remove(child)


ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "docs", "slides")
os.makedirs(OUT, exist_ok=True)

BG     = RGBColor(0x0B, 0x0F, 0x1A)
CARD   = RGBColor(0x13, 0x1A, 0x2A)
CARD2  = RGBColor(0x1A, 0x23, 0x38)
ACC    = RGBColor(0x4D, 0x9F, 0xFF)
TEAL   = RGBColor(0x00, 0xD4, 0xAA)
RED    = RGBColor(0xFF, 0x6B, 0x6B)
AMBER  = RGBColor(0xFF, 0xB8, 0x4D)
TXT    = RGBColor(0xE6, 0xED, 0xF7)
MUTED  = RGBColor(0x8B, 0x96, 0xA8)
BORDER = RGBColor(0x1F, 0x2A, 0x3D)
F = "Arial"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def bg(slide, color=BG):
    s = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
    s.fill.solid(); s.fill.fore_color.rgb = color
    s.line.fill.background(); s.shadow.inherit = False
    strip_style(s)
    return s


def rect(slide, x, y, w, h, fill=None, line=None, lw=1.0, radius=None):
    shp = slide.shapes.add_shape(1, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line; shp.line.width = Pt(lw)
    shp.shadow.inherit = False
    strip_style(shp)
    return shp


def tb(slide, x, y, w, h, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = 0; tf.margin_right = 0; tf.margin_top = 0; tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    tf.paragraphs[0].alignment = align
    return tf


def para(tf, text, size, color=TXT, bold=False, first=False, space_before=0,
         space_after=0, align=PP_ALIGN.LEFT, line=1.0):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    p.space_before = Pt(space_before)
    p.space_after = Pt(space_after)
    p.line_spacing = line
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = F
    r.font.color.rgb = color
    return p


def kicker(slide, text, color=ACC):
    tf = tb(slide, 0.74, 0.52, 9.0, 0.3)
    para(tf, text.upper(), 11.5, color, True, first=True)


def heading(slide, text, size=40, y=0.95, w=11.8, color=TXT):
    tf = tb(slide, 0.74, y, w, 1.2)
    para(tf, text, size, color, True, first=True, line=0.98)


def footer(slide, n, total=7, note="Trend Detective · NASA Space Apps 2026"):
    rect(slide, 0.74, 6.86, 11.85, 0.012, BORDER)
    tf = tb(slide, 0.74, 6.98, 8.0, 0.25)
    para(tf, note, 10, MUTED, first=True)
    tf2 = tb(slide, 11.6, 6.98, 1.0, 0.25, align=PP_ALIGN.RIGHT)
    para(tf2, f"{n} / {total}", 10, MUTED, first=True, align=PP_ALIGN.RIGHT)


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def new(n, kick=None, head=None, head_size=40):
    s = prs.slides.add_slide(BLANK)
    bg(s)
    if kick: kicker(s, kick)
    if head: heading(s, head, size=head_size)
    footer(s, n)
    return s


# ---------------------------------------------------------------- slide 1
s = prs.slides.add_slide(BLANK)
bg(s)
rect(s, 0, 0, 0.16, 7.5, ACC)
tf = tb(s, 1.1, 0.9, 10.5, 0.35)
para(tf, "NASA SPACE APPS CHALLENGE 2026  ·  BE AN EARTH SYSTEM TREND DETECTIVE!", 12, ACC, True, first=True)
tf = tb(s, 1.1, 1.9, 11.0, 1.4)
para(tf, "Trend Detective", 72, TXT, True, first=True, line=0.92)
tf = tb(s, 1.1, 3.45, 11.0, 0.7)
para(tf, "Finds real trends. Refuses fake ones.", 30, TEAL, True, first=True)
rect(s, 1.12, 4.45, 3.2, 0.03, BORDER)
tf = tb(s, 1.1, 4.75, 10.5, 1.1)
para(tf, "A calibrated trend detector for NASA Earth data: Theil–Sen slopes, autocorrelation-corrected",
     15, MUTED, first=True, line=1.35)
para(tf, "Mann–Kendall, permutation nulls and false-discovery control — with a printed detection limit.",
     15, MUTED, line=1.35)
tf = tb(s, 1.1, 6.25, 10.5, 0.6)
para(tf, "The Orcas  ·  Irbid, Jordan  ·  NASA POWER (MERRA-2, CERES SYN1deg)  ·  NASA GIBS", 11.5, MUTED, first=True)
rect(s, 10.5, 6.2, 1.9, 0.5, CARD, BORDER)
tf = tb(s, 10.62, 6.33, 1.7, 0.3)
para(tf, "4 regions · 5 variables", 9.5, MUTED, first=True)
notes(s, "Open with the tagline, not the technology. One sentence: most trend tools manufacture trends; "
         "this one is built to refuse them. 10 seconds.")

# ---------------------------------------------------------------- slide 2
s = new(2, "The problem", "Most trend tools manufacture trends.")
items = [
    ("23", "annual samples", "Long enough to draw a line, too short to carry the claim. Naive p-values say otherwise."),
    ("45 × 5", "cells × variables", "Hundreds of chances to be 'significant' by luck. No correction, no honesty."),
    ("0.01", "published albedo step", "CERES reports monthly albedo in steps of 0.01 — the same size as a decade of change. The signal hides in the rounding."),
]
x = 0.74
for big, mid, small in items:
    rect(s, x, 2.35, 3.86, 2.55, CARD, BORDER)
    rect(s, x, 2.35, 3.86, 0.05, ACC)
    tf = tb(s, x + 0.28, 2.6, 3.3, 0.8)
    para(tf, big, 34, TXT, True, first=True)
    tf = tb(s, x + 0.28, 3.28, 3.3, 0.3)
    para(tf, mid, 11.5, ACC, True, first=True)
    tf = tb(s, x + 0.28, 3.7, 3.3, 1.0)
    para(tf, small, 12.5, MUTED, first=True, line=1.3)
    x += 4.0
rect(s, 0.74, 5.25, 11.85, 1.15, CARD2)
rect(s, 0.74, 5.25, 0.06, 1.15, AMBER)
tf = tb(s, 1.05, 5.42, 11.2, 0.85)
para(tf, "“a measured Earth science data variable can trend one way in one region and the opposite way in",
     15, TXT, False, first=True, line=1.3)
para(tf, "another, even when the same process drives both.”  — the challenge statement", 15, MUTED, False, line=1.3)
notes(s, "The three failure modes: too few samples, too many tests, signal smaller than noise. "
         "Quote NASA's own warning — it is the design brief.")

# ---------------------------------------------------------------- slide 3
s = new(3, "The solution", "Three gates, then a verdict.")
gates = [
    ("1", "Permutation null", "400 block-shuffles that preserve autocorrelation and destroy only the trend. The honest null."),
    ("2", "Hamed–Rao Mann–Kendall", "Rank test with variance corrected for serial correlation — because annual means are not independent."),
    ("3", "Benjamini–Hochberg FDR", "Five variables and up to 45 cells: every claim must survive false-discovery control."),
]
x = 0.74
for num, title, body in gates:
    rect(s, x, 2.3, 3.86, 2.6, CARD, BORDER)
    rect(s, x, 2.3, 3.86, 0.05, TEAL)
    tf = tb(s, x + 0.28, 2.5, 0.8, 0.6)
    para(tf, num, 26, TEAL, True, first=True)
    tf = tb(s, x + 0.28, 3.08, 3.3, 0.5)
    para(tf, title, 15, TXT, True, first=True)
    tf = tb(s, x + 0.28, 3.55, 3.3, 1.2)
    para(tf, body, 12, MUTED, first=True, line=1.3)
    x += 4.0
rect(s, 0.74, 5.2, 11.85, 1.2, CARD2)
rect(s, 0.74, 5.2, 0.06, 1.2, ACC)
tf = tb(s, 1.05, 5.35, 11.2, 0.95)
para(tf, "Pass all three → TREND.  Fail any → NO VERDICT, with the detection limit printed beside the estimate.",
     17, TXT, True, first=True, line=1.25)
para(tf, "Confidence label: strong (≥2× limit) · moderate (1–2×) · near-limit (<1×).", 12.5, MUTED, line=1.3)
notes(s, "This is the whole product in one slide. If a judge remembers only one thing, it is that a "
         "NO VERDICT is a result, not an error.")

# ---------------------------------------------------------------- slide 4
s = new(4, "Data & method", "Real NASA data. No keys, no accounts.")
tf = tb(s, 0.74, 2.25, 6.3, 4.2)
rows = [
    ("Variables", "temperature · precipitation · soil wetness · albedo · shortwave"),
    ("Products", "MERRA-2 (1981–2023) · CERES SYN1deg — albedo 2001–, shortwave 1984–"),
    ("Sampling", "4 regions · 79 points × 5 variables = 395 series; 16 Jordan points → 12 real cells"),
    ("Engine", "portable C++17, ~0.05 s per region for 5 variables + a 45-cell field"),
    ("Calibration", "600 synthetic series: 3.8 % false positives"),
]
first = True
for k, v in rows:
    para(tf, k, 11, ACC, True, first=first, space_before=0 if first else 12)
    para(tf, v, 14, TXT if k != "Calibration" else TXT, False, line=1.25)
    first = False
tiles = [("79", "point series"), ("43", "years (MERRA-2)"), ("4", "regions"), ("3.8 %", "false positives")]
x, y = 7.45, 2.2
for i, (big, small) in enumerate(tiles):
    cx = x + (i % 2) * 2.62
    cy = y + (i // 2) * 1.55
    rect(s, cx, cy, 2.4, 1.35, CARD, BORDER)
    tf = tb(s, cx + 0.22, cy + 0.22, 2.0, 0.6)
    para(tf, big, 30, TXT, True, first=True)
    tf = tb(s, cx + 0.22, cy + 0.88, 2.0, 0.3)
    para(tf, small, 11, MUTED, first=True)
rect(s, 7.45, 5.3, 5.02, 1.15, CARD2)
tf = tb(s, 7.7, 5.45, 4.6, 0.9)
para(tf, "Detection curve", 11, ACC, True, first=True)
para(tf, "0.17 → 0.44 → 0.76 → 0.93  as the true slope grows to 2× the limit", 13, TXT, line=1.3)
notes(s, "Data provenance matters to NASA judges. Say the products and the years. Mention that the "
         "engine is portable: no GPU, no AVX-512 dependency, runs on any x86-64 server.")

# ---------------------------------------------------------------- slide 5
s = new(5, "What the data says", "Four regions, four different answers.")
tbl_shape = s.shapes.add_table(5, 3, Inches(0.74), Inches(2.2), Inches(7.35), Inches(2.9))
table = tbl_shape.table
table.columns[0].width = Inches(2.5)
table.columns[1].width = Inches(3.1)
table.columns[2].width = Inches(1.75)
head = ["Region", "Headline (per decade)", "Confidence"]
data = [
    ("Western Sahel", "albedo  −0.27 pp", "strong 2.2×"),
    ("Jordan Badia", "temperature  +0.48 °C", "strong 3.2×"),
    ("Arctic tundra", "temperature  +0.40 °C", "moderate 1.3×"),
    ("Gobi Desert", "temperature  +0.17 °C", "near-limit 0.9×"),
]
for j, h in enumerate(head):
    c = table.cell(0, j); c.text = h
    c.fill.solid(); c.fill.fore_color.rgb = CARD2
    p = c.text_frame.paragraphs[0]; p.runs[0].font.size = Pt(10.5)
    p.runs[0].font.bold = True; p.runs[0].font.color.rgb = MUTED; p.runs[0].font.name = F
for i, row in enumerate(data, start=1):
    for j, val in enumerate(row):
        c = table.cell(i, j); c.text = val
        c.fill.solid(); c.fill.fore_color.rgb = CARD
        p = c.text_frame.paragraphs[0]
        r = p.runs[0]; r.font.size = Pt(12.5); r.font.name = F
        r.font.color.rgb = TXT if j < 2 else TEAL
        r.font.bold = (j == 0)
for i in range(5):
    table.rows[i].height = Inches(0.55)
rect(s, 8.35, 2.15, 4.2, 2.05, CARD2)
rect(s, 8.35, 2.15, 0.06, 2.05, AMBER)
tf = tb(s, 8.6, 2.3, 3.8, 1.8)
para(tf, "Same place. Same code. Opposite sign.", 14, TXT, True, first=True, line=1.25)
para(tf, "Sahel temperature, 2001–2023:", 11, MUTED, space_before=8)
para(tf, "−0.32 °C / decade", 17, RED, True)
para(tf, "Sahel temperature, 1981–2023:", 11, MUTED, space_before=6)
para(tf, "+0.15 °C / decade", 17, TEAL, True)
rect(s, 8.35, 4.4, 4.2, 1.05, CARD, BORDER)
tf = tb(s, 8.6, 4.55, 3.8, 0.8)
para(tf, "FDR in action", 10.5, ACC, True, first=True)
para(tf, "Sahel albedo: 28 cells at raw p < 0.05 → 14 survive q < 0.05", 11.5, MUTED, line=1.25)
tf = tb(s, 0.74, 5.5, 11.85, 1.0)
para(tf, "And the refusals: Sahel precipitation p = 0.087 · Jordan rainfall p = 0.205 · Gobi albedo p = 0.221 → NO VERDICT.",
     12.5, MUTED, first=True, line=1.3)
para(tf, "The headline shows each region's primary variable; shortwave also passes in three of the four regions (see the dashboard).",
     11, MUTED, space_before=5, line=1.25)
notes(s, "Lead with the window flip — it is the most surprising, most defensible result. Then the FDR "
         "collapsing 28 cells to 14. Then the refusals, which prove the detector is not a trend generator.")

# ---------------------------------------------------------------- slide 6
s = new(6, "What you see", "A dashboard built to be interrogated.")
img = os.path.join(ROOT, "docs", "screenshots", "slide-main.png")
img_map = os.path.join(ROOT, "docs", "screenshots", "slide-map.png")
IW, IX, IY = 5.6, 6.98, 1.5                      # images: width, x, top
if os.path.exists(img):
    s.shapes.add_picture(img, Inches(IX), Inches(IY), width=Inches(IW))
    cap = tb(s, IX, IY + 2.16, IW, 0.22)
    para(cap, "Robust trend · permutation CI · projection · three gates", 9.5, MUTED, first=True)
else:
    rect(s, IX, IY, IW, 2.3, CARD, BORDER)
if os.path.exists(img_map):
    mtop = IY + 2.52
    s.shapes.add_picture(img_map, Inches(IX), Inches(mtop), width=Inches(IW))
else:
    rect(s, IX, IY + 2.52, IW, 2.8, CARD, BORDER)
bullets = [
    ("Four scenario cards", "one click loads a region and its verdict — no hunting."),
    ("Window switch", "1981–2023 vs 2001–2023, recomputed live from the same engine."),
    ("Clickable cells", "each map marker opens that cell's 23-year series, slope, p and q."),
    ("Grounded chat", "the model sees only the computed JSON; otherwise it refuses to answer."),
]
y = 2.2
for t1, t2 in bullets:
    rect(s, 0.74, y + 0.06, 0.08, 0.08, TEAL)
    tf = tb(s, 0.98, y - 0.04, 5.6, 0.95)
    para(tf, t1, 13.5, TXT, True, first=True)
    para(tf, t2, 11.5, MUTED, line=1.25)
    y += 1.02
tf = tb(s, 0.74, 5.72, 6.05, 0.7)
para(tf, "Map: 45 POWER cells on the Sahel box — 16 rising, 28 falling, 14 survive FDR; click any cell for its own 23-year series.",
     11, MUTED, first=True, line=1.3)
rect(s, 0.74, 6.28, 5.4, 0.5, CARD2)
tf = tb(s, 0.95, 6.37, 5.0, 0.32)
para(tf, "Live: docker compose up  ·  no API keys on the data path", 10.5, MUTED, first=True)
notes(s, "Keep this to 20 seconds in the talk: cards, window switch, one cell click, one chat answer. "
         "Do not scroll the whole page.")

# ---------------------------------------------------------------- slide 7
s = new(7, "Why it matters", "Honest uncertainty is a feature.")
tf = tb(s, 0.74, 2.15, 7.2, 1.3)
para(tf, "The most useful number in the project is not a slope — it is the detection limit.", 20, TXT, True, first=True, line=1.25)
tf = tb(s, 0.74, 3.55, 7.0, 2.6)
para(tf, "It tells you when a dashboard should stay silent, which is the one thing a trend tool almost never does.",
     14, MUTED, first=True, line=1.35)
para(tf, "It turns a 43-year record into an honest statement about what the record can and cannot resolve.",
     14, MUTED, space_before=10, line=1.35)
rect(s, 8.3, 2.15, 4.3, 4.0, CARD, BORDER)
rect(s, 8.3, 2.15, 4.3, 0.05, ACC)
tf = tb(s, 8.55, 2.35, 3.9, 3.6)
para(tf, "Next", 11, ACC, True, first=True)
para(tf, "MODIS NDVI via AppEEARS (task queued)", 12, TXT, space_before=8, line=1.25)
para(tf, "Per-pixel trend fields on gridded tiles", 12, TXT, space_before=7, line=1.25)
para(tf, "Change-point detection, seasonal MK", 12, TXT, space_before=7, line=1.25)
para(tf, "Shareable permalinks: region × variable × window", 12, TXT, space_before=7, line=1.25)
tf = tb(s, 0.74, 6.12, 11.85, 0.5)
para(tf, "The Orcas  ·  Irbid, Jordan  ·  NASA Space Apps Challenge 2026  ·  NASA POWER + NASA GIBS",
     11, MUTED, first=True)
notes(s, "Close on the philosophy, not the feature list. Then invite a question — the tool is designed "
         "to be interrogated, and the demo holds up.")

prs.core_properties.title = "Trend Detective — NASA Space Apps 2026"
prs.core_properties.author = "The Orcas"
prs.core_properties.subject = "Be An Earth System Trend Detective!"
path = os.path.join(OUT, "Trend_Detective_7slides.pptx")
prs.save(path)
print("saved", path, len(prs.slides.__iter__.__self__._sldIdLst), "slides")