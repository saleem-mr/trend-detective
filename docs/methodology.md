# Methodology

## 1. Inputs
Monthly means from the NASA POWER API, 2001–2023, for five variables (see README). Each CSV is
aggregated to **annual means** (a year is used only if ≥ 10 months are present). The number of
sampled points is reported, and so is the number of *distinct model cells* they map onto.

## 2. Theil–Sen slope
For a series $(t_i, y_i)$, the slope is
$$\hat\beta = \operatorname{median}_{i<j}\frac{y_j-y_i}{j-i}.$$
It is robust to outliers and to a single corrupted year, and it does not assume normality.

The 95 % confidence interval is taken from the **block-permutation null** (below): $\hat\beta \pm 1.96 \cdot \mathrm{SD}$ of the null slopes.

## 3. Mann–Kendall
$$S=\sum_{i<j}\operatorname{sgn}(y_j-y_i),\qquad
\operatorname{Var}(S)=\frac{n(n-1)(2n+5)-\sum_t t(t-1)(2t+5)}{18},$$
with the second term the tie correction. $z=(S\mp1)/\sqrt{\operatorname{Var}(S)}$, two-sided $p$.

**Why the raw $p$ is not enough.** Annual means are serially correlated, which inflates $S$.
We estimate the effective sample size
$$n_{\text{eff}}=\frac{n}{1+2\sum_{k\ge1}\left(1-\tfrac{k}{n}\right)\rho_k}$$
from the autocorrelation of the **detrended** series, and rescale the variance (**Hamed–Rao**):
$\operatorname{Var}_{\text{HR}}=\operatorname{Var}(S)\cdot n/n_{\text{eff}}$.

## 4. Block-permutation null
Shuffling points destroys autocorrelation and therefore makes the null too narrow (over-confident).
Instead we take the detrended residuals, split them into blocks of length $\lceil n^{1/3}\rceil$,
permute the blocks, and recompute the slope — 400 times. This keeps short-range correlation and
removes only the trend. Reported:
- $p_{\text{perm}}$ = fraction of surrogates with $|\hat\beta^\*|\ge|\hat\beta|$,
- the empirical standard error of the slope, used for the CI and for the detection limit.

## 4b. Multiplicity: Benjamini–Hochberg
We test five variables per region and up to 45 cells. Raw p-values would over-claim, so every claim is
also required to survive FDR control: sort the p-values, set
$q_{(k)}=\min_{j\ge k}\; p_{(j)}\,m/j$, and require $q<0.05$. The dashboard reports raw and
FDR-controlled counts side by side (Sahel albedo: 28 raw vs 14 FDR).

## 5. Minimum detectable trend (MDT)
$$\mathrm{MDT}=(z_{0.975}+z_{0.80})\cdot \mathrm{SE}(\hat\beta)\approx 2.80\,\mathrm{SE}(\hat\beta).$$
We define the dimensionless **signal** as $|\hat\beta|/\mathrm{MDT}$ and require it to exceed 1.
**Verdict rule:** `TREND` requires $p_{\text{HR}}<0.05$ **and** $q_{\text{FDR}}<0.05$. The detection
limit is reported as an **advisory confidence label** — `strong` ($\mathrm{SNR}\ge2$), `moderate`
($1\le\mathrm{SNR}<2$) or `near-limit` ($\mathrm{SNR}<1$) — rather than being used as a fourth hard
gate, because a trend can be statistically significant while the record is still underpowered.

## 6. Calibration (`--selftest`)
Synthetic AR(1) series ($\phi=0.30$, $\sigma_{\text{res}}=0.35$, $n=23$), 600 replicates per level:

| slope / MDT | detection rate |
|---|---|
| 0.0 | 0.038 |
| 0.5 | 0.170 |
| 1.0 | 0.435 |
| 1.5 | 0.762 |
| 2.0 | 0.925 |

Reference MDT = 0.0310 per year. The false-positive rate sits below the nominal 5 % because the
detection-limit gate is deliberately stricter than a plain significance test, and detection rises
monotonically with the true slope.

## 6b. Record length is a control, not a detail
The UI can recompute everything on 1981–2023 (MERRA-2 variables) or 2001–2023. For the Sahel,
temperature is **−0.32 °C/dec on the short window** and **+0.15 °C/dec on the full one**; only the
longer record makes the Arctic warming detectable. CERES variables (albedo, shortwave) start in 2001
in both windows, and the dashboard says so.

## 7. Anomalies and projection
Anomalies are z-scores of the detrended series; $|z|\ge1.5$ is flagged (droughts/wet spells by sign).
The projection is $\hat\beta t+\hat b$ extended with an interval that widens with the horizon. It is an
extrapolation, and the UI says so.

## 8. Spatial field and effective resolution
Each sampled point yields its own slope and permutation $p$; the map shows sign and significance.
The dashboard also reports how many points share a model cell: 16 Jordan points → 12 cells, and a
40.7 km nine-point corridor → 3 cells. Cell size (~55–111 km) is coarser than many desertification
processes, which is a limit of the data, not of the tool.

## 9. Known limits
- Linear trends only; non-linear change and regime shifts are out of scope.
- MERRA-2/CERES are model/retrieval products; cross-variable correlation is partly built-in.
- 23 annual samples give limited power; this is reported as MDT rather than hidden.
- NDVI requires an Earthdata login and is not bundled; the engine accepts any `date,value` series.
