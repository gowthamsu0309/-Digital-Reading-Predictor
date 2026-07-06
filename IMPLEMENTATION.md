# Implementation Details

## 1. Architecture Overview

This is a **single-file, client-only React application** — there is no backend, no API, and no
database. All "model" data (support vectors, metrics, ROC points) is embedded as static JS objects,
and all inference (kernel computation, sigmoid scoring, attribution) runs synchronously in the
browser on each render/interaction.

```
Browser
 └── App.jsx
      ├── Static data layer   (MODELS, ALL_FEATURES, RBF_MODELS, DEFAULTS)
      ├── Inference layer     (norm, rbfKernel, predictModel, computeCRI, whatIfAnalysis)
      ├── Presentation layer  (Panel components + shared UI primitives)
      └── Root shell          (App(): sidebar nav + tab router)
```

## 2. State Management

No external state library (Redux/Zustand/Context) is used. State is local to each component via
`useState`:
- Root `App()`: `tab` (active nav tab), `tick` (animation heartbeat via `setInterval`, cleaned up in
  `useEffect`'s return function)
- `PredictionPanel` / `NoveltyPanel`: local `vals` (current feature slider values), plus derived
  result state (`criResult`, `whatIfResult`, `running`) set after invoking the inference functions
- Sliders are fully controlled inputs — value + `onChange` update the parent's `vals` object, which
  triggers a re-render and (on demand) a re-run of the pure prediction functions

## 3. Inference Pipeline (per prediction)

1. **Collect input** — the 20 slider values (`vals`) from state.
2. **Normalize** — `norm(k, v)` maps each raw value into [0,1] using the feature's declared range.
3. **Kernel evaluation** — for each of the 3 models, `rbfKernel` is evaluated against each of the
   12 support vectors (36 kernel evaluations per full 3-model prediction).
4. **Decision score** — weighted sum of `alpha × label × kernel` plus bias, per model.
5. **Sigmoid transform** — converts the raw score into two complementary class probabilities.
6. **Attribution** — 20 finite-difference perturbations per model to rank feature impact
   (20 × 3 = 60 extra kernel-sum evaluations).
7. **Fusion (Novelty tab only)** — `computeCRI` calls `predictModel` for all 3 models and combines
   their risk-relevant probabilities into a single weighted score.
8. **Counterfactual sweep (What-If tab only)** — `whatIfAnalysis` calls `computeCRI` once per
   feature (20 additional full 3-model inference passes) to measure achievable CRI reduction.

All of this is pure, synchronous JavaScript — no async calls, no memoization currently applied
(see Future Work for optimization ideas).

## 4. Rendering Approach

- **No CSS framework.** All styling is inline `style={{...}}` objects referencing the central `T`
  design-token object, plus one global `<style>{STYLES}</style>` block for things inline styles
  can't express (keyframes, pseudo-selectors like `:hover`, `::-webkit-slider-thumb`).
- **Charts** are declarative `recharts` components fed directly from the static/derived data
  (`roc`, `folds`, `cm`, `topFeats` arrays) — no manual SVG/canvas drawing.
- **Animation** is minimal and CSS-driven (`fadeUp`, `pop`, `pulse`, `spin` keyframes) plus one
  JS-driven pulse (the sidebar's "live model" dot glow, keyed off the `tick` interval state).

## 5. Why Simulated Support Vectors Instead of a Real Model

Since the app has no backend, an actual trained `scikit-learn` `SVC(kernel='rbf')` can't be loaded
or executed at runtime. The implementation instead **hand-encodes a representative set of support
vectors** (6 clearly-positive, 6 clearly-negative per model, with varying alpha weights to mimic a
realistic margin) so the *kernel mechanics* (distance → similarity → weighted decision score) are
real and responsive to input changes, even though the specific weights are illustrative rather than
fitted from PISA microdata.

## 6. Error Handling / Edge Cases

- `norm()` clamps to [0,1] — out-of-range slider values can't produce nonsensical kernel distances.
- Missing feature keys default to `0` in `vals[f.k] || 0` and to `0.5` in `norm()`'s fallback,
  preventing `NaN` propagation through the kernel sum.
- The "Run Novel Analysis" button disables itself (`running` state) during computation to prevent
  duplicate concurrent runs, though since everything is synchronous this is mostly a UX affordance
  rather than a true async race-condition guard.

## 7. Dependencies

| Package | Purpose |
|---|---|
| `react` / `react-dom` | Component model, hooks, rendering |
| `recharts` | All charts (ROC, bar, radar, composed) |
| *(build tool, e.g. Vite)* | Bundling/dev server — not part of `App.jsx` itself |

No ML library (TensorFlow.js, ONNX Runtime, etc.) is used or required — the RBF/SVM math is
implemented from scratch in ~15 lines of plain JS (see `ALGORITHM.md`).
