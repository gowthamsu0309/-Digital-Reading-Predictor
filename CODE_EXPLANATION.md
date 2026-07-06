# Code Explanation — `App.jsx`

Single-file React app (~1,676 lines). This walkthrough maps each section of the file to its purpose.

## 1. Imports (lines ~1–6)
- React hooks: `useState`, `useEffect`, `useCallback`
- `recharts` components for all charts: `LineChart`, `BarChart`, `RadarChart`, `ComposedChart`,
  axes, tooltips, legends, reference lines.

## 2. Design Tokens — `T` (lines ~11–27)
A single object holding the entire color/typography palette (backgrounds, borders, per-model accent
colors for HIGH/AVERAGE/LOW, monospace font stack). All inline `style={}` props reference `T.*`
rather than hardcoding colors, so the theme can be changed in one place.

## 3. `MODELS` (lines ~32–72)
Static metadata for the three pairwise classifiers (`HL`, `HA`, `LA`): display name, description,
class labels, SVM technique description, reported metrics (`ACC`, `Precision`, `SEN`, `F1`, `AUC`),
per-fold CV scores, confusion matrix, precomputed ROC curve points, top feature importances, SHAP
top-features per class, a natural-language insight, and per-class intervention lists.

## 4. `ALL_FEATURES` (lines ~74–95)
The 20 predictor variables. Each entry: key (`k`, matching PISA questionnaire codes), human label,
level (`student` / `classroom` / `school`), direction of effect (`d`: +1 = higher is better, -1 =
higher is worse), and valid numeric `range`.

## 5. `DEFAULTS` (lines ~97–102)
Default slider values used to initialize the Prediction and Novelty panels.

## 6. `RBF_MODELS` (lines ~110–~166)
The actual "trained" SVM parameters per model: `gamma`, `bias`, and 12 `supportVectors` (each with
an `alpha` weight, class `label` ±1, and a normalized feature-value dict `vec`). This is the
data the kernel math operates on.

## 7. Core ML Functions (lines ~169–233)
- `norm(k, v)` — min-max normalizes a raw feature value to [0,1] using its declared range.
- `rbfKernel(vec1, vec2, gamma)` — Gaussian RBF similarity between two normalized vectors.
- `predictModel(id, vals)` — runs the SVM decision function + sigmoid for one model, and computes
  the top-8 finite-difference feature attributions.
- `computeCRI(vals)` — fuses all three models' outputs into the Composite Risk Index.
- `whatIfAnalysis(vals)` — sweeps each feature's "improved" value and measures CRI delta.

*(Full math for each of these is in `ALGORITHM.md`.)*

## 8. `STYLES` (lines ~238 onward)
A template-literal CSS string injected via `<style>{STYLES}</style>` in the root component. Covers
Google Fonts import (IBM Plex Mono + Syne), scrollbar styling, custom range-slider thumb/track
styling (separate `pos-slider` / `neg-slider` classes for direction-colored sliders), and keyframe
animations (`fadeUp`, `pop`, `pulse`, `spin`).

## 9. Shared UI Primitives
Small reusable components used across panels — badges/tags, section headers (`H`), sliders
(`Slider`), signal bars (`SignalBars`), cards, and buttons — built with plain inline styles rather
than a component library.

## 10. Panel Components
Each dashboard tab is its own component:
- **`PredictionPanel`** — feature sliders + live prediction across all 3 models, probability bars,
  confidence, and attribution list.
- **`FeaturesPanel`** — bar charts of feature importance per model.
- **`ROCPanel`** — ROC curve + AUC per model via `LineChart`/`ComposedChart`.
- **`MetricsPanel`** — metric cards, 10-fold CV bar chart, confusion matrix grid.
- **`NoveltyPanel`** — the 3 novel contributions (CRI, What-If, Prescription), with preset student
  profiles (e.g. "High Achiever"), a slider panel, and a "Run Novel Analysis" action that computes
  `computeCRI` + `whatIfAnalysis` and renders results.
- **`NetworkPanel`** — simulated cellular tower/signal-strength visualization (RSRP dBm, signal
  bars per tower, serving-tower selection) — a standalone stylistic panel, not tied to the PISA
  prediction logic.

## 11. Root Component — `App()` (lines ~1622–1675)
- `TABS` — the 6-tab navigation config (id, label, icon).
- State: `tab` (active tab) and `tick` (a 1.5s interval counter used to animate the sidebar's
  "live model" pulse indicators).
- Renders: injected `<style>`, a fixed left sidebar (logo, nav buttons, live model accuracy list),
  and a main content area that conditionally renders the active panel based on `tab`.

## Rendering Notes
- Everything uses inline `style={{...}}` objects (no CSS modules/Tailwind), driven by the `T` token
  object for consistency.
- Charts are all built with `recharts`; no server calls — all data (models, metrics, ROC points) is
  static/precomputed in-file, and predictions run entirely client-side.
