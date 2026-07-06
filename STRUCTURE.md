# Project Structure

## Recommended Repository Layout

```
digital-reading-predictor/
├── App.jsx                   # Root component + all logic (current single-file implementation)
├── README.md                 # Project overview, features, setup
├── PROJECT_DESCRIPTION.md     # Problem statement, domain context, audience
├── ALGORITHM.md               # RBF-SVM / CRI / SHAP-proxy / What-If math
├── IMPLEMENTATION.md          # Architecture, state management, inference pipeline
├── CODE_EXPLANATION.md        # Section-by-section code walkthrough
├── STRUCTURE.md               # This file
├── WORKFLOW.md                # End-to-end user & data workflow
├── FUTURE_WORK.md             # Planned improvements
├── package.json               # Dependencies (react, recharts, vite)
└── .gitignore
```

> If you later split `App.jsx` into multiple files (recommended as the project grows — see
> `FUTURE_WORK.md`), a natural decomposition would look like:

```
src/
├── main.jsx                  # ReactDOM entry point
├── App.jsx                   # Root shell: sidebar + tab router only
├── data/
│   ├── models.js              # MODELS metadata (metrics, ROC points, insights, interventions)
│   ├── features.js            # ALL_FEATURES, DEFAULTS
│   └── svm-params.js          # RBF_MODELS (gamma, bias, support vectors)
├── lib/
│   └── svm.js                 # norm, rbfKernel, predictModel, computeCRI, whatIfAnalysis
├── components/
│   ├── ui/                    # Shared primitives: Tag, H (header), Slider, SignalBars, card styles
│   └── panels/
│       ├── PredictionPanel.jsx
│       ├── FeaturesPanel.jsx
│       ├── ROCPanel.jsx
│       ├── MetricsPanel.jsx
│       ├── NoveltyPanel.jsx
│       └── NetworkPanel.jsx
└── styles/
    └── globalStyles.js        # STYLES template string + design tokens (T)
```

## Component Hierarchy (current single-file structure)

```
App
├── Sidebar (inline, not extracted)
│   ├── Logo / title
│   ├── Nav buttons (6 tabs, from TABS config)
│   └── Live model accuracy list (HL / HA / LA, pulsing dots)
└── Active Panel (conditionally rendered by `tab` state)
    ├── PredictionPanel
    │   ├── Slider × 20 (feature inputs)
    │   └── Per-model result cards (probabilities, confidence, top attributions)
    ├── FeaturesPanel
    │   └── Bar chart × 3 models (feature importances)
    ├── ROCPanel
    │   └── LineChart/ComposedChart × 3 models (ROC + AUC)
    ├── MetricsPanel
    │   ├── Metric cards (ACC/Precision/SEN/F1/AUC)
    │   ├── 10-fold CV bar chart
    │   └── Confusion matrix grid
    ├── NoveltyPanel
    │   ├── Section switcher (CRI / What-If / Prescription)
    │   ├── Preset profile buttons + Slider × 16
    │   ├── "Run Novel Analysis" action
    │   └── Result view (per selected section)
    └── NetworkPanel
        ├── Tower cards × N (RSRP, signal bars, confidence)
        └── Serving tower summary
```

## Data Flow Direction

```
Static data (MODELS, ALL_FEATURES, RBF_MODELS, DEFAULTS)
        │
        ▼
User interaction (Slider onChange) → local component state (vals)
        │
        ▼
Pure inference functions (predictModel / computeCRI / whatIfAnalysis)
        │
        ▼
Derived result state (criResult, whatIfResult, per-model predictions)
        │
        ▼
Panel re-render (charts + cards reflect new results)
```

Data flows **one way** — panels never mutate the static data objects; they only read from them and
write to their own local result state.
