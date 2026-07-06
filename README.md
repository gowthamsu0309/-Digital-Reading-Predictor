# 📖 Digital Reading Predictor — RBF-SVM Dashboard

An interactive React dashboard that predicts a student's **digital reading performance level**
(HIGH / AVERAGE / LOW) using a **client-side RBF-kernel SVM simulation** trained conceptually on
the **PISA 2018** dataset, enriched with SHAP-style feature attribution, ROC/metric visualizations,
and three original decision-support tools.

> This is a **front-end simulation**: the SVM's support vectors, kernel weights, and metrics are
> pre-computed constants embedded in the code (representing a model that would normally be trained
> offline in Python/scikit-learn). The kernel math itself (RBF similarity + decision scoring) runs
> live in the browser on whatever feature values the user enters.

---

## ✨ Features

| Tab | What it does |
|---|---|
| **⚡ Prediction** | Enter/slide 20 student, classroom & ICT-usage features → get a live HIGH/AVERAGE/LOW prediction, class probabilities, and confidence from all 3 pairwise SVM models |
| **🔬 Features** | Ranked feature-importance bars per model (HL, HA, LA) with direction of effect |
| **📈 ROC Curves** | Precomputed ROC curve + AUC per model, rendered with Recharts |
| **📊 Metrics** | Accuracy, Precision, Sensitivity, F1, AUC, 10-fold CV scores, and confusion matrices |
| **🧠 Novelty** | Three original contributions: Composite Risk Index (CRI), What-If Simulator, Smart Learning Prescription |
| **📡 Network** | A simulated cellular signal/tower panel (RSRP, signal bars, serving tower) — a stylistic/thematic extension, not part of the PISA prediction pipeline |

---

## 🧩 The Three Pairwise Models

The task is framed as **three binary classifiers** rather than one 3-class model:

1. **HL — High vs Low**: top performers (PISA ≥ 625) vs low performers (PISA < 407)
2. **HA — High vs Average**: top performers vs mid-range readers
3. **LA — Low vs Average**: at-risk low performers vs average readers

Each is an **RBF-kernel SVM** (gamma tuned per model, `GridSearchCV` for `C`, 10-fold stratified
cross-validation), reporting Accuracy, Precision, Sensitivity, F1, and AUC in the 90–98% range.

---

## 🧠 Novel Contributions (beyond the base methodology)

1. **Composite Risk Index (CRI)** — a single 0–100 score fusing the risk signals from all three
   models (`0.4·HL-risk + 0.35·HA-risk + 0.25·LA-risk`) into one interpretable risk band
   (LOW / MODERATE / HIGH RISK).
2. **What-If Simulator** — counterfactual analysis: for each feature, simulate a moderate
   improvement and measure the resulting drop in CRI, ranking which levers matter most for a
   given student.
3. **Smart Learning Prescription** — turns the top SHAP-style feature attributions into a
   prioritized, human-readable list of recommended interventions.

---

## 🛠️ Tech Stack

- **React** (hooks: `useState`, `useEffect`, `useCallback`)
- **Recharts** — `LineChart`, `BarChart`, `RadarChart`, `ComposedChart` for ROC/metrics/feature charts
- Plain inline-style design system (no CSS framework) driven by a `T` design-token object
- Pure JS implementation of the RBF kernel and SVM decision function (no ML library dependency)

---

## 📥 Inputs

20 standardized student/classroom/school-level features (subset of PISA 2018 questionnaire
indices), each with a defined numeric range, e.g.:

| Feature | Meaning | Level | Range |
|---|---|---|---|
| `ESCS` | Socioeconomic status | Student | -3 to 3 |
| `JOYREAD` | Joy of reading | Student | -3 to 3 |
| `SCREADCOMP` | Reading self-efficacy | Student | -3 to 3 |
| `SCREADDIFF` | Perceived reading difficulty | Student | -3 to 3 |
| `SOIAICT` | Social ICT use | Student | -3 to 3 |
| `ST176Q01IA` | Email reading frequency | Student | 1 to 5 |
| `ST158Q04HA` | Teacher shares info online | Classroom | 1 to 3 |
| `DISCLIMA` | Classroom disciplinary climate | School | -3 to 3 |
| `DISCRIM` | School discrimination climate | School | -3 to 3 |
| ...and 11 more | | | |

See `CODE_EXPLANATION.md` for the full feature list and default values.

## 📤 Outputs

- **Predicted class** (e.g. HIGH vs LOW) per model, with class probabilities and a confidence score
- **Top-8 feature attributions** (approximate SHAP values) explaining the prediction
- **Composite Risk Index** (0–100) and risk band
- **What-if deltas**: expected CRI reduction per feature if improved
- **Prescription list**: ranked, actionable interventions

---


## 📁 Repository Structure (suggested)

```
.
├── App.jsx                # Main application (all logic + UI)
├── README.md              # This file
├── ALGORITHM.md            # RBF-SVM, CRI, SHAP-proxy & What-If algorithm details
├── CODE_EXPLANATION.md     # Section-by-section code walkthrough
├── package.json
└── .gitignore
```

---

## ⚠️ Notes & Limitations

- The support vectors, gammas, biases, and metrics are **hand-authored constants**, not the output
  of an actual scikit-learn training run — treat this as a **demonstration/prototype UI**, not a
  production model.
- SHAP values are **approximated** via finite-difference perturbation of the kernel score, not the
  true Shapley-value computation from the `shap` library.
- The Network (signal tower) tab is a separate, thematically-adjacent simulation and is not derived
  from the PISA dataset.
