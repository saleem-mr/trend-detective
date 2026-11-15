# Deck — 7 slides (16:9)

| file | use |
|---|---|
| `Trend_Detective_7slides.pptx` | editable deck (PowerPoint / LibreOffice / Google Slides) |
| `Trend_Detective_7slides.pdf` | upload or present as-is, 960×540 pt (16:9) |
| `build_deck.py` | regenerates the deck from code — numbers are edited here, not in slides |

## Slides
1. Title — name, tagline, event, team.
2. The problem — three failure modes (23 samples, 45×5 tests, 0.01 signal) + NASA's own warning.
3. The solution — the three gates and the NO VERDICT rule.
4. Data & method — products, years, 79 series, calibration, detection curve.
5. What the data says — four regions, the window flip, FDR 28→14, the refusals.
6. What you see — chart + gates screenshot and the four interactions.
7. Why it matters — detection limit as the product, roadmap, closing line.

Every slide carries **speaker notes** (visible in Presenter View).

## Rebuild
```bash
python3 docs/slides/build_deck.py
cd docs/slides && soffice --headless --convert-to pdf Trend_Detective_7slides.pptx
```
Font is Arial (maps to Liberation Sans here, Arial on Windows/macOS) so nothing depends on a downloaded
font. Theme colours match the dashboard: #0B0F1A background, #4D9FFF accent, #00D4AA / #FF6B6B signals.
