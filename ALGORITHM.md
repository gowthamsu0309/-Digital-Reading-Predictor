# Algorithm Explanation

This document explains the mathematical logic implemented in `App.jsx`, independent of the UI.

---

## 1. RBF Kernel

For two feature vectors `x` and `y` (normalized to [0,1] per-feature), the Radial Basis Function
(Gaussian) kernel is:

```
K(x, y) = exp(-γ · Σ (xᵢ - yᵢ)²)
```

Implemented as:

```js
function rbfKernel(vec1, vec2, gamma) {
  let sqDist = 0;
  ALL_FEATURES.forEach(f => {
    const d = (vec1[f.k] || 0) - (vec2[f.k] || 0);
    sqDist += d * d;
  });
  return Math.exp(-gamma * sqDist);
}
```

- `γ` (gamma) controls how quickly similarity decays with distance; each of the 3 models has its
  own tuned gamma (0.18, 0.22, 0.20 for HL, HA, LA respectively).
- Features are min-max normalized to [0,1] first via `norm(k, v)` using each feature's declared
  `range` in `ALL_FEATURES`.

## 2. Feature Normalization

```
norm(v) = clamp( (v - lo) / (hi - lo), 0, 1 )
```

This puts all 20 heterogeneous features (some on a -3..3 scale, some 1..5, one 10..90) on a common
scale before computing kernel distances, so no single feature dominates just because of its raw
numeric range.

## 3. SVM Decision Function

For a query point `x`, the standard dual-form SVM decision score is:

```
score(x) = b + Σᵢ αᵢ · yᵢ · K(x, svᵢ)
```

Where:
- `b` = model bias
- `αᵢ` = Lagrange multiplier ("alpha") of support vector `i`
- `yᵢ` = class label of support vector `i` (+1 or -1)
- `svᵢ` = the support vector's normalized feature vector

Implemented as:

```js
let score = model.bias;
model.supportVectors.forEach(sv => {
  score += sv.alpha * sv.label * rbfKernel(normVals, sv.vec, model.gamma);
});
```

Each model ships **12 support vectors** (6 per class): a few "high-confidence" anchor vectors with
large alpha, and several "boundary" vectors with small alpha representing the margin.

## 4. Score → Probability

The raw SVM score is not a probability, so it's passed through a scaled sigmoid (a simplified
Platt-scaling approximation):

```
p(class 1) = 1 / (1 + exp(-score · 2.5))
p(class 2) = 1 - p(class 1)
```

The predicted class is whichever probability is higher; `conf` is the max of the two.

## 5. Feature Attribution (SHAP-style Proxy)

True SHAP values require averaging marginal contributions across all feature coalitions, which is
too expensive to run client-side. Instead, this app uses a **finite-difference sensitivity proxy**:

For each feature `f`:
1. Perturb the (normalized) input by nudging `f` up by `+0.1`.
2. Recompute the SVM score with the perturbed vector.
3. The attribution value is `0.5 × (score_perturbed − score_original)`.
4. Features are ranked by `|value|` descending; top 8 are kept.

```js
const perturbed = { ...normVals, [f.k]: normVals[f.k] + 0.1 };
let deltaScore = 0;
model.supportVectors.forEach(sv => {
  deltaScore += sv.alpha * sv.label *
    (rbfKernel(perturbed, sv.vec, model.gamma) - rbfKernel(normVals, sv.vec, model.gamma));
});
```

This approximates *local sensitivity* of the decision score to each feature — directionally similar
to a SHAP value, but computationally a first-order numerical gradient, not a Shapley-value.

## 6. Composite Risk Index (CRI) — Novel Contribution #1

Combines the "at-risk" probability from all three pairwise models into a single weighted score:

```
riskHL = P(LOW | HL model)
riskHA = 1 − P(HIGH | HA model)
riskLA = P(LOW | LA model)

CRI = round( 100 × (0.4·riskHL + 0.35·riskHA + 0.25·riskLA) )
```

Risk bands:
- `CRI ≥ 65` → **HIGH RISK**
- `35 ≤ CRI < 65` → **MODERATE RISK**
- `CRI < 35` → **LOW RISK**

The weights (0.40 / 0.35 / 0.25) reflect the relative diagnostic importance assigned to the
High-vs-Low, High-vs-Average, and Low-vs-Average boundaries respectively.

## 7. What-If Simulator — Novel Contribution #2

For each of the 20 features:
1. Compute the baseline CRI for the current profile.
2. Simulate a moderate, direction-aware improvement: move the feature 25% of its range
   (`step × 5`, where `step = range/20`) toward its "good" direction (`f.d = +1` moves up,
   `f.d = -1` moves down), clamped to the feature's valid range.
3. Recompute CRI with that single change.
4. `delta = baseCri − newCri` — the risk reduction achievable by improving that one feature.
5. Rank all features by `delta` descending → shows which single intervention would help most.

```js
const best = f.d > 0 ? Math.min(hi, vals[f.k] + step*5) : Math.max(lo, vals[f.k] - step*5);
```

## 8. Smart Learning Prescription — Novel Contribution #3

Not a separate numeric algorithm — it maps the top feature-attribution keys (from step 5) for the
predicted class to a curated, pre-written set of pedagogical interventions stored per model in
`MODELS[id].interventions`, prioritized by the magnitude of each feature's contribution to the
current prediction.

---

## Summary of Data Flow

```
User inputs (20 sliders)
        │
        ▼
Normalize features (0–1)
        │
        ▼
RBF kernel vs 12 support vectors × 3 models  →  SVM scores
        │
        ▼
Sigmoid  →  class probabilities + confidence  (Prediction tab)
        │
        ├─→ Finite-difference attribution → top-8 features (Features tab / Prescription)
        │
        └─→ CRI fusion (weighted risk combo) → risk band (Novelty tab)
                    │
                    └─→ What-If perturbation sweep → ranked improvement levers
```
