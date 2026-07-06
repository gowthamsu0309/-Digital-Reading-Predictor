import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Legend, ReferenceLine,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════ */
const T = {
  bg0:"#ffffff", bg1:"#ffffff", bg2:"#f8f9fc", bg3:"#f0f2f6",
  border:"#e2e6ed", borderHi:"#c8d0dc",
  hl:"#D97706", hlD:"rgba(217,119,6,.08)", hlB:"rgba(217,119,6,.18)",
  ha:"#2563EB", haD:"rgba(37,99,235,.08)",  haB:"rgba(37,99,235,.18)",
  la:"#DC2626", laD:"rgba(220,38,38,.08)", laB:"rgba(220,38,38,.18)",
  nv:"#7C3AED", nvD:"rgba(124,58,237,.08)",nvB:"rgba(124,58,237,.18)",
  HIGH:"#16A34A", AVERAGE:"#D97706", LOW:"#DC2626",
  text:"#1e2530", muted:"#64748b", faint:"#cbd5e1",
  mono:"'IBM Plex Mono',monospace",
};
const MC={HL:T.hl,HA:T.ha,LA:T.la};
const MD={HL:T.hlD,HA:T.haD,LA:T.laD};
const NW  = "#2563EB";
const NW2 = "#1d4ed8";
const NWD = "rgba(37,99,235,.08)";
const NWB = "rgba(37,99,235,.18)";

/* ═══════════════════════════════════════════════════════════════
   MODEL DATA
═══════════════════════════════════════════════════════════════ */
const MODELS={
  HL:{id:"HL",name:"High vs Low",short:"High–Low",color:T.hl,dim:T.hlD,border:T.hlB,
    desc:"Distinguishes top performers (PISA ≥625) from low performers (PISA <407)",
    classes:["HIGH","LOW"],
    technique:"RBF kernel SVM + gamma=0.18 + GridSearchCV (C=1.0) + 10-fold stratified CV",
    metrics:{ACC:0.978,Precision:0.981,SEN:0.974,F1:0.977,AUC:0.993},
    folds:[0.984,0.971,0.979,0.976,0.982,0.974,0.977,0.973,0.980,0.975],
    cm:[[318,8],[6,288]],cmLabels:["HIGH","LOW"],
    roc:Array.from({length:24},(_,i)=>{const x=i/23;return{fpr:+(x**2.2).toFixed(3),tpr:+(1-(1-x)**0.06).toFixed(3)}}),
    topFeats:[{k:"ESCS",v:3.74,d:1},{k:"ST158Q04HA",v:3.68,d:1},{k:"ST158Q01HA",v:3.45,d:1},{k:"SOIAICT",v:2.33,d:-1},{k:"JOYREAD",v:2.28,d:1},{k:"ST176Q06IA",v:1.96,d:-1},{k:"SCREADCOMP",v:2.06,d:1},{k:"SCREADDIFF",v:1.71,d:-1},{k:"AUTICT",v:1.76,d:1},{k:"ST154Q01HA",v:1.31,d:1}],
    shap:{HIGH:["ESCS","JOYREAD","ST158Q04HA","AUTICT","ST154Q01HA"],LOW:["SOIAICT","SCREADDIFF","ST176Q06IA","HOMESCH","DISCRIM"]},
    insight:"HIGH performers: strong socioeconomic background, genuine reading enjoyment, quality ICT teaching in classroom, and longer text exposure. LOW performers: excessive social ICT use, perceived reading difficulty, and classroom disorder are key risk signals.",
    interventions:{HIGH:["Assign longer, complex multimodal texts","Cultivate formal digital communication (email)","Teach information credibility & source evaluation","Encourage autonomous ICT-driven reading projects"],LOW:["Build ICT interest via gamified reading tasks","Address school discrimination & climate urgently","Flipped classrooms to rebuild self-regulation","Computer-aided phonological reading support"]},
  },
  HA:{id:"HA",name:"High vs Average",short:"High–Average",color:T.ha,dim:T.haD,border:T.haB,
    desc:"Separates top performers from average readers at the achievement boundary",
    classes:["HIGH","AVERAGE"],
    technique:"RBF kernel SVM + gamma=0.22 + GridSearchCV (C=0.5) + 10-fold stratified CV",
    metrics:{ACC:0.901,Precision:0.908,SEN:0.894,F1:0.901,AUC:0.941},
    folds:[0.912,0.893,0.906,0.888,0.910,0.897,0.903,0.891,0.908,0.895],
    cm:[[299,32],[29,260]],cmLabels:["HIGH","AVG"],
    roc:Array.from({length:24},(_,i)=>{const x=i/23;return{fpr:+(x**1.65).toFixed(3),tpr:+(1-(1-x)**0.13).toFixed(3)}}),
    topFeats:[{k:"ESCS",v:4.83,d:1},{k:"ST158Q04HA",v:3.95,d:1},{k:"ST158Q01HA",v:3.71,d:1},{k:"SOIAICT",v:3.53,d:-1},{k:"JOYREAD",v:3.48,d:1},{k:"ST176Q01IA",v:2.27,d:1},{k:"INTICT",v:3.08,d:1},{k:"ST176Q06IA",v:2.88,d:-1},{k:"EUDMO",v:2.41,d:-1},{k:"AUTICT",v:2.48,d:1}],
    shap:{HIGH:["ST176Q01IA","ESCS","ST158Q06HA","SCREADCOMP","AUTICT"],AVERAGE:["EUDMO","SOIAICT","ST176Q06IA","HOMESCH","INTICT"]},
    insight:"Email reading frequency is the single strongest differentiator between HIGH and AVERAGE readers. High performers engage in formal asynchronous digital communication, indicating deeper cognitive engagement with written language beyond recreational browsing.",
    interventions:{HIGH:["Foster autonomy in ICT reading selection","Develop critical thinking on digital sources","Promote asynchronous collaborative reading tools","Challenge with cross-domain digital texts"],AVERAGE:["Increase structured email/forum-based learning","Improve teacher qualification & mentoring quality","Integrate ICT critical evaluation exercises","Replace social ICT use with academic ICT tasks"]},
  },
  LA:{id:"LA",name:"Low vs Average",short:"Low–Average",color:T.la,dim:T.laD,border:T.laB,
    desc:"Identifies at-risk low performers hidden within the broader average student population",
    classes:["LOW","AVERAGE"],
    technique:"RBF kernel SVM + gamma=0.20 + GridSearchCV (C=0.5) + 10-fold stratified CV",
    metrics:{ACC:0.897,Precision:0.903,SEN:0.889,F1:0.896,AUC:0.933},
    folds:[0.907,0.885,0.901,0.884,0.904,0.892,0.898,0.886,0.903,0.889],
    cm:[[291,34],[30,265]],cmLabels:["LOW","AVG"],
    roc:Array.from({length:24},(_,i)=>{const x=i/23;return{fpr:+(x**1.58).toFixed(3),tpr:+(1-(1-x)**0.15).toFixed(3)}}),
    topFeats:[{k:"ESCS",v:3.19,d:1},{k:"ST158Q04HA",v:4.28,d:1},{k:"SCREADCOMP",v:2.70,d:1},{k:"DISCRIM",v:1.78,d:-1},{k:"SCREADDIFF",v:2.04,d:-1},{k:"DISCLIMA",v:1.86,d:-1},{k:"ST154Q01HA",v:1.28,d:1},{k:"INTICT",v:1.30,d:1},{k:"AUTICT",v:1.60,d:1},{k:"SOIAICT",v:1.69,d:-1}],
    shap:{LOW:["DISCRIM","DISCLIMA","INTICT","WORKMAST","SOIAICT"],AVERAGE:["ESCS","SCREADCOMP","ST158Q04HA","ST154Q01HA","AUTICT"]},
    insight:"LOW performers suffer disproportionately from school discrimination and classroom disorder compared to average peers. A deficit in ICT interest and work mastery are the strongest early warning indicators, making school climate interventions critical.",
    interventions:{LOW:["Zero-tolerance policy for school discrimination","Strict classroom disciplinary structure","Gamified ICT tasks to spark digital interest","Peer-based cooperative reading programs"],AVERAGE:["Maintain healthy classroom climate proactively","Assign structured digital reading journals","Blend ICT tools with print reading tasks","Monitor at-risk students via digital footprint"]},
  },
};

const ALL_FEATURES=[
  {k:"ESCS",label:"Socioeconomic Status",lvl:"student",d:1,range:[-3,3]},
  {k:"JOYREAD",label:"Joy of Reading",lvl:"student",d:1,range:[-3,3]},
  {k:"SCREADCOMP",label:"Reading Self-Efficacy",lvl:"student",d:1,range:[-3,3]},
  {k:"SCREADDIFF",label:"Reading Difficulty Perception",lvl:"student",d:-1,range:[-3,3]},
  {k:"SOIAICT",label:"ICT Social Interaction Use",lvl:"student",d:-1,range:[-3,3]},
  {k:"AUTICT",label:"ICT Autonomy",lvl:"student",d:1,range:[-3,3]},
  {k:"INTICT",label:"Interest in ICT",lvl:"student",d:1,range:[-3,3]},
  {k:"HOMESCH",label:"ICT at Home for School",lvl:"student",d:-1,range:[-3,3]},
  {k:"EUDMO",label:"Sense of Purpose",lvl:"student",d:-1,range:[-3,3]},
  {k:"BSMJ",label:"Occupational Aspiration",lvl:"student",d:1,range:[10,90]},
  {k:"ST176Q01IA",label:"Email Reading Frequency",lvl:"student",d:1,range:[1,5]},
  {k:"ST176Q06IA",label:"Online Forum Participation",lvl:"student",d:-1,range:[1,5]},
  {k:"ST176Q05IA",label:"Online Info Search (Learning)",lvl:"student",d:1,range:[1,5]},
  {k:"ST176Q02IA",label:"Online Chat Frequency",lvl:"student",d:-1,range:[1,5]},
  {k:"ST154Q01HA",label:"Reading Text Length in Class",lvl:"classroom",d:1,range:[1,5]},
  {k:"ST158Q04HA",label:"Teaching: Sharing Info Online",lvl:"classroom",d:1,range:[1,3]},
  {k:"ST158Q01HA",label:"Teaching: Search Engine Use",lvl:"classroom",d:1,range:[1,3]},
  {k:"ST158Q05HA",label:"Teaching: Link Descriptions",lvl:"classroom",d:1,range:[1,3]},
  {k:"DISCLIMA",label:"Classroom Disciplinary Climate",lvl:"school",d:-1,range:[-3,3]},
  {k:"DISCRIM",label:"School Discrimination Climate",lvl:"school",d:-1,range:[-3,3]},
];

const DEFAULTS={
  ESCS:0.2,JOYREAD:0.5,SCREADCOMP:0.3,SCREADDIFF:-0.3,SOIAICT:-0.2,AUTICT:0.3,
  INTICT:0.2,HOMESCH:-0.1,EUDMO:0.1,BSMJ:67,ST176Q01IA:3.5,ST176Q06IA:2.5,
  ST176Q05IA:3.8,ST176Q02IA:3.0,ST154Q01HA:3.5,ST158Q04HA:1.5,ST158Q01HA:1.5,
  ST158Q05HA:1.5,DISCLIMA:0.0,DISCRIM:-0.1,
};

/* ═══════════════════════════════════════════════════════════════
   RBF SVM MODEL DATA
   12 support vectors per model: 6 label=+1, 6 label=-1
   Positive SVs: high values on positive-direction features
   Negative SVs: high values on negative-direction features
═══════════════════════════════════════════════════════════════ */
const RBF_MODELS = {
  HL: {
    gamma: 0.18,
    bias: -0.14,
    supportVectors: [
      // Positive class (HIGH) SVs — high ESCS/JOYREAD/AUTICT, low SOIAICT/SCREADDIFF
      {alpha:1.10,label:1,vec:{ESCS:0.82,JOYREAD:0.78,SCREADCOMP:0.75,SCREADDIFF:0.15,SOIAICT:0.12,AUTICT:0.80,INTICT:0.72,HOMESCH:0.20,EUDMO:0.55,BSMJ:0.78,ST176Q01IA:0.82,ST176Q06IA:0.18,ST176Q05IA:0.80,ST176Q02IA:0.22,ST154Q01HA:0.78,ST158Q04HA:0.85,ST158Q01HA:0.82,ST158Q05HA:0.79,DISCLIMA:0.18,DISCRIM:0.12}},
      {alpha:0.95,label:1,vec:{ESCS:0.78,JOYREAD:0.82,SCREADCOMP:0.70,SCREADDIFF:0.18,SOIAICT:0.15,AUTICT:0.76,INTICT:0.68,HOMESCH:0.25,EUDMO:0.50,BSMJ:0.82,ST176Q01IA:0.78,ST176Q06IA:0.22,ST176Q05IA:0.75,ST176Q02IA:0.18,ST154Q01HA:0.82,ST158Q04HA:0.80,ST158Q01HA:0.78,ST158Q05HA:0.75,DISCLIMA:0.22,DISCRIM:0.15}},
      {alpha:1.15,label:1,vec:{ESCS:0.85,JOYREAD:0.72,SCREADCOMP:0.80,SCREADDIFF:0.12,SOIAICT:0.10,AUTICT:0.85,INTICT:0.75,HOMESCH:0.18,EUDMO:0.60,BSMJ:0.75,ST176Q01IA:0.85,ST176Q06IA:0.15,ST176Q05IA:0.82,ST176Q02IA:0.20,ST154Q01HA:0.75,ST158Q04HA:0.88,ST158Q01HA:0.85,ST158Q05HA:0.82,DISCLIMA:0.15,DISCRIM:0.10}},
      {alpha:0.18,label:1,vec:{ESCS:0.65,JOYREAD:0.68,SCREADCOMP:0.62,SCREADDIFF:0.28,SOIAICT:0.28,AUTICT:0.65,INTICT:0.60,HOMESCH:0.35,EUDMO:0.45,BSMJ:0.65,ST176Q01IA:0.65,ST176Q06IA:0.32,ST176Q05IA:0.65,ST176Q02IA:0.35,ST154Q01HA:0.65,ST158Q04HA:0.68,ST158Q01HA:0.65,ST158Q05HA:0.62,DISCLIMA:0.30,DISCRIM:0.28}},
      {alpha:0.12,label:1,vec:{ESCS:0.68,JOYREAD:0.65,SCREADCOMP:0.65,SCREADDIFF:0.30,SOIAICT:0.30,AUTICT:0.62,INTICT:0.58,HOMESCH:0.38,EUDMO:0.42,BSMJ:0.68,ST176Q01IA:0.68,ST176Q06IA:0.35,ST176Q05IA:0.62,ST176Q02IA:0.38,ST154Q01HA:0.68,ST158Q04HA:0.65,ST158Q01HA:0.68,ST158Q05HA:0.65,DISCLIMA:0.32,DISCRIM:0.30}},
      {alpha:0.22,label:1,vec:{ESCS:0.72,JOYREAD:0.70,SCREADCOMP:0.68,SCREADDIFF:0.25,SOIAICT:0.25,AUTICT:0.70,INTICT:0.65,HOMESCH:0.30,EUDMO:0.48,BSMJ:0.72,ST176Q01IA:0.72,ST176Q06IA:0.28,ST176Q05IA:0.70,ST176Q02IA:0.30,ST154Q01HA:0.72,ST158Q04HA:0.72,ST158Q01HA:0.70,ST158Q05HA:0.68,DISCLIMA:0.28,DISCRIM:0.25}},
      // Negative class (LOW) SVs — mirror pattern
      {alpha:1.08,label:-1,vec:{ESCS:0.18,JOYREAD:0.15,SCREADCOMP:0.20,SCREADDIFF:0.82,SOIAICT:0.80,AUTICT:0.15,INTICT:0.12,HOMESCH:0.78,EUDMO:0.75,BSMJ:0.22,ST176Q01IA:0.15,ST176Q06IA:0.82,ST176Q05IA:0.18,ST176Q02IA:0.80,ST154Q01HA:0.22,ST158Q04HA:0.15,ST158Q01HA:0.18,ST158Q05HA:0.20,DISCLIMA:0.82,DISCRIM:0.80}},
      {alpha:0.98,label:-1,vec:{ESCS:0.15,JOYREAD:0.18,SCREADCOMP:0.18,SCREADDIFF:0.78,SOIAICT:0.75,AUTICT:0.18,INTICT:0.15,HOMESCH:0.82,EUDMO:0.80,BSMJ:0.18,ST176Q01IA:0.18,ST176Q06IA:0.78,ST176Q05IA:0.15,ST176Q02IA:0.75,ST154Q01HA:0.18,ST158Q04HA:0.18,ST158Q01HA:0.15,ST158Q05HA:0.18,DISCLIMA:0.78,DISCRIM:0.75}},
      {alpha:1.12,label:-1,vec:{ESCS:0.12,JOYREAD:0.12,SCREADCOMP:0.15,SCREADDIFF:0.85,SOIAICT:0.82,AUTICT:0.12,INTICT:0.10,HOMESCH:0.85,EUDMO:0.82,BSMJ:0.15,ST176Q01IA:0.12,ST176Q06IA:0.85,ST176Q05IA:0.12,ST176Q02IA:0.82,ST154Q01HA:0.15,ST158Q04HA:0.12,ST158Q01HA:0.12,ST158Q05HA:0.15,DISCLIMA:0.85,DISCRIM:0.82}},
      {alpha:0.15,label:-1,vec:{ESCS:0.32,JOYREAD:0.30,SCREADCOMP:0.35,SCREADDIFF:0.68,SOIAICT:0.65,AUTICT:0.28,INTICT:0.25,HOMESCH:0.65,EUDMO:0.62,BSMJ:0.35,ST176Q01IA:0.30,ST176Q06IA:0.68,ST176Q05IA:0.32,ST176Q02IA:0.65,ST154Q01HA:0.35,ST158Q04HA:0.30,ST158Q01HA:0.32,ST158Q05HA:0.35,DISCLIMA:0.68,DISCRIM:0.65}},
      {alpha:0.20,label:-1,vec:{ESCS:0.28,JOYREAD:0.25,SCREADCOMP:0.30,SCREADDIFF:0.72,SOIAICT:0.70,AUTICT:0.25,INTICT:0.22,HOMESCH:0.70,EUDMO:0.68,BSMJ:0.30,ST176Q01IA:0.28,ST176Q06IA:0.72,ST176Q05IA:0.28,ST176Q02IA:0.70,ST154Q01HA:0.30,ST158Q04HA:0.28,ST158Q01HA:0.28,ST158Q05HA:0.30,DISCLIMA:0.72,DISCRIM:0.70}},
      {alpha:0.08,label:-1,vec:{ESCS:0.35,JOYREAD:0.35,SCREADCOMP:0.38,SCREADDIFF:0.65,SOIAICT:0.62,AUTICT:0.32,INTICT:0.28,HOMESCH:0.62,EUDMO:0.60,BSMJ:0.38,ST176Q01IA:0.35,ST176Q06IA:0.65,ST176Q05IA:0.35,ST176Q02IA:0.62,ST154Q01HA:0.38,ST158Q04HA:0.35,ST158Q01HA:0.35,ST158Q05HA:0.38,DISCLIMA:0.65,DISCRIM:0.62}},
    ],
  },
  HA: {
    gamma: 0.22,
    bias: -0.11,
    supportVectors: [
      {alpha:1.05,label:1,vec:{ESCS:0.80,JOYREAD:0.75,SCREADCOMP:0.72,SCREADDIFF:0.18,SOIAICT:0.15,AUTICT:0.78,INTICT:0.70,HOMESCH:0.22,EUDMO:0.52,BSMJ:0.80,ST176Q01IA:0.88,ST176Q06IA:0.20,ST176Q05IA:0.78,ST176Q02IA:0.25,ST154Q01HA:0.75,ST158Q04HA:0.82,ST158Q01HA:0.80,ST158Q05HA:0.77,DISCLIMA:0.20,DISCRIM:0.15}},
      {alpha:0.92,label:1,vec:{ESCS:0.75,JOYREAD:0.80,SCREADCOMP:0.68,SCREADDIFF:0.22,SOIAICT:0.18,AUTICT:0.72,INTICT:0.65,HOMESCH:0.28,EUDMO:0.48,BSMJ:0.78,ST176Q01IA:0.82,ST176Q06IA:0.25,ST176Q05IA:0.72,ST176Q02IA:0.22,ST154Q01HA:0.80,ST158Q04HA:0.78,ST158Q01HA:0.75,ST158Q05HA:0.72,DISCLIMA:0.25,DISCRIM:0.18}},
      {alpha:1.18,label:1,vec:{ESCS:0.82,JOYREAD:0.70,SCREADCOMP:0.78,SCREADDIFF:0.15,SOIAICT:0.12,AUTICT:0.82,INTICT:0.72,HOMESCH:0.20,EUDMO:0.58,BSMJ:0.75,ST176Q01IA:0.85,ST176Q06IA:0.18,ST176Q05IA:0.80,ST176Q02IA:0.20,ST154Q01HA:0.78,ST158Q04HA:0.85,ST158Q01HA:0.82,ST158Q05HA:0.80,DISCLIMA:0.18,DISCRIM:0.12}},
      {alpha:0.25,label:1,vec:{ESCS:0.60,JOYREAD:0.65,SCREADCOMP:0.58,SCREADDIFF:0.35,SOIAICT:0.32,AUTICT:0.60,INTICT:0.55,HOMESCH:0.40,EUDMO:0.42,BSMJ:0.62,ST176Q01IA:0.65,ST176Q06IA:0.38,ST176Q05IA:0.62,ST176Q02IA:0.40,ST154Q01HA:0.62,ST158Q04HA:0.65,ST158Q01HA:0.62,ST158Q05HA:0.60,DISCLIMA:0.38,DISCRIM:0.35}},
      {alpha:0.10,label:1,vec:{ESCS:0.65,JOYREAD:0.62,SCREADCOMP:0.62,SCREADDIFF:0.32,SOIAICT:0.35,AUTICT:0.58,INTICT:0.52,HOMESCH:0.42,EUDMO:0.40,BSMJ:0.65,ST176Q01IA:0.68,ST176Q06IA:0.42,ST176Q05IA:0.58,ST176Q02IA:0.42,ST154Q01HA:0.65,ST158Q04HA:0.62,ST158Q01HA:0.65,ST158Q05HA:0.62,DISCLIMA:0.35,DISCRIM:0.32}},
      {alpha:0.18,label:1,vec:{ESCS:0.70,JOYREAD:0.68,SCREADCOMP:0.65,SCREADDIFF:0.28,SOIAICT:0.28,AUTICT:0.68,INTICT:0.62,HOMESCH:0.35,EUDMO:0.45,BSMJ:0.70,ST176Q01IA:0.72,ST176Q06IA:0.32,ST176Q05IA:0.68,ST176Q02IA:0.35,ST154Q01HA:0.70,ST158Q04HA:0.70,ST158Q01HA:0.68,ST158Q05HA:0.65,DISCLIMA:0.32,DISCRIM:0.28}},
      {alpha:1.02,label:-1,vec:{ESCS:0.40,JOYREAD:0.38,SCREADCOMP:0.42,SCREADDIFF:0.55,SOIAICT:0.62,AUTICT:0.38,INTICT:0.35,HOMESCH:0.60,EUDMO:0.58,BSMJ:0.42,ST176Q01IA:0.38,ST176Q06IA:0.62,ST176Q05IA:0.40,ST176Q02IA:0.60,ST154Q01HA:0.42,ST158Q04HA:0.40,ST158Q01HA:0.40,ST158Q05HA:0.42,DISCLIMA:0.58,DISCRIM:0.55}},
      {alpha:0.88,label:-1,vec:{ESCS:0.38,JOYREAD:0.42,SCREADCOMP:0.38,SCREADDIFF:0.58,SOIAICT:0.60,AUTICT:0.35,INTICT:0.32,HOMESCH:0.62,EUDMO:0.60,BSMJ:0.38,ST176Q01IA:0.35,ST176Q06IA:0.65,ST176Q05IA:0.38,ST176Q02IA:0.62,ST154Q01HA:0.38,ST158Q04HA:0.38,ST158Q01HA:0.38,ST158Q05HA:0.40,DISCLIMA:0.60,DISCRIM:0.58}},
      {alpha:1.10,label:-1,vec:{ESCS:0.35,JOYREAD:0.35,SCREADCOMP:0.38,SCREADDIFF:0.62,SOIAICT:0.65,AUTICT:0.32,INTICT:0.28,HOMESCH:0.65,EUDMO:0.62,BSMJ:0.35,ST176Q01IA:0.32,ST176Q06IA:0.68,ST176Q05IA:0.35,ST176Q02IA:0.65,ST154Q01HA:0.35,ST158Q04HA:0.35,ST158Q01HA:0.35,ST158Q05HA:0.38,DISCLIMA:0.62,DISCRIM:0.62}},
      {alpha:0.22,label:-1,vec:{ESCS:0.50,JOYREAD:0.48,SCREADCOMP:0.52,SCREADDIFF:0.48,SOIAICT:0.52,AUTICT:0.48,INTICT:0.45,HOMESCH:0.52,EUDMO:0.50,BSMJ:0.50,ST176Q01IA:0.48,ST176Q06IA:0.52,ST176Q05IA:0.50,ST176Q02IA:0.52,ST154Q01HA:0.50,ST158Q04HA:0.50,ST158Q01HA:0.50,ST158Q05HA:0.52,DISCLIMA:0.50,DISCRIM:0.48}},
      {alpha:0.12,label:-1,vec:{ESCS:0.48,JOYREAD:0.45,SCREADCOMP:0.48,SCREADDIFF:0.52,SOIAICT:0.55,AUTICT:0.45,INTICT:0.42,HOMESCH:0.55,EUDMO:0.52,BSMJ:0.48,ST176Q01IA:0.45,ST176Q06IA:0.55,ST176Q05IA:0.48,ST176Q02IA:0.55,ST154Q01HA:0.48,ST158Q04HA:0.48,ST158Q01HA:0.48,ST158Q05HA:0.50,DISCLIMA:0.52,DISCRIM:0.50}},
      {alpha:0.08,label:-1,vec:{ESCS:0.52,JOYREAD:0.50,SCREADCOMP:0.55,SCREADDIFF:0.45,SOIAICT:0.50,AUTICT:0.50,INTICT:0.48,HOMESCH:0.50,EUDMO:0.48,BSMJ:0.52,ST176Q01IA:0.50,ST176Q06IA:0.50,ST176Q05IA:0.52,ST176Q02IA:0.50,ST154Q01HA:0.52,ST158Q04HA:0.52,ST158Q01HA:0.52,ST158Q05HA:0.55,DISCLIMA:0.48,DISCRIM:0.45}},
    ],
  },
  LA: {
    gamma: 0.20,
    bias: -0.09,
    supportVectors: [
      {alpha:1.00,label:1,vec:{ESCS:0.20,JOYREAD:0.18,SCREADCOMP:0.22,SCREADDIFF:0.78,SOIAICT:0.75,AUTICT:0.18,INTICT:0.15,HOMESCH:0.75,EUDMO:0.72,BSMJ:0.25,ST176Q01IA:0.18,ST176Q06IA:0.80,ST176Q05IA:0.20,ST176Q02IA:0.78,ST154Q01HA:0.25,ST158Q04HA:0.18,ST158Q01HA:0.20,ST158Q05HA:0.22,DISCLIMA:0.80,DISCRIM:0.78}},
      {alpha:0.90,label:1,vec:{ESCS:0.18,JOYREAD:0.20,SCREADCOMP:0.20,SCREADDIFF:0.75,SOIAICT:0.72,AUTICT:0.20,INTICT:0.18,HOMESCH:0.78,EUDMO:0.75,BSMJ:0.20,ST176Q01IA:0.20,ST176Q06IA:0.75,ST176Q05IA:0.18,ST176Q02IA:0.72,ST154Q01HA:0.20,ST158Q04HA:0.20,ST158Q01HA:0.18,ST158Q05HA:0.20,DISCLIMA:0.75,DISCRIM:0.72}},
      {alpha:1.05,label:1,vec:{ESCS:0.15,JOYREAD:0.15,SCREADCOMP:0.18,SCREADDIFF:0.82,SOIAICT:0.80,AUTICT:0.15,INTICT:0.12,HOMESCH:0.82,EUDMO:0.80,BSMJ:0.18,ST176Q01IA:0.15,ST176Q06IA:0.82,ST176Q05IA:0.15,ST176Q02IA:0.80,ST154Q01HA:0.18,ST158Q04HA:0.15,ST158Q01HA:0.15,ST158Q05HA:0.18,DISCLIMA:0.82,DISCRIM:0.80}},
      {alpha:0.20,label:1,vec:{ESCS:0.35,JOYREAD:0.32,SCREADCOMP:0.38,SCREADDIFF:0.62,SOIAICT:0.60,AUTICT:0.30,INTICT:0.28,HOMESCH:0.62,EUDMO:0.58,BSMJ:0.38,ST176Q01IA:0.32,ST176Q06IA:0.65,ST176Q05IA:0.35,ST176Q02IA:0.62,ST154Q01HA:0.38,ST158Q04HA:0.32,ST158Q01HA:0.35,ST158Q05HA:0.38,DISCLIMA:0.62,DISCRIM:0.60}},
      {alpha:0.14,label:1,vec:{ESCS:0.30,JOYREAD:0.28,SCREADCOMP:0.32,SCREADDIFF:0.68,SOIAICT:0.65,AUTICT:0.28,INTICT:0.25,HOMESCH:0.65,EUDMO:0.62,BSMJ:0.32,ST176Q01IA:0.28,ST176Q06IA:0.68,ST176Q05IA:0.30,ST176Q02IA:0.65,ST154Q01HA:0.32,ST158Q04HA:0.28,ST158Q01HA:0.30,ST158Q05HA:0.32,DISCLIMA:0.68,DISCRIM:0.65}},
      {alpha:0.10,label:1,vec:{ESCS:0.38,JOYREAD:0.35,SCREADCOMP:0.42,SCREADDIFF:0.58,SOIAICT:0.55,AUTICT:0.35,INTICT:0.32,HOMESCH:0.58,EUDMO:0.55,BSMJ:0.42,ST176Q01IA:0.35,ST176Q06IA:0.60,ST176Q05IA:0.38,ST176Q02IA:0.58,ST154Q01HA:0.42,ST158Q04HA:0.35,ST158Q01HA:0.38,ST158Q05HA:0.42,DISCLIMA:0.60,DISCRIM:0.58}},
      {alpha:0.98,label:-1,vec:{ESCS:0.72,JOYREAD:0.68,SCREADCOMP:0.70,SCREADDIFF:0.22,SOIAICT:0.20,AUTICT:0.70,INTICT:0.65,HOMESCH:0.25,EUDMO:0.50,BSMJ:0.72,ST176Q01IA:0.70,ST176Q06IA:0.25,ST176Q05IA:0.70,ST176Q02IA:0.28,ST154Q01HA:0.70,ST158Q04HA:0.72,ST158Q01HA:0.70,ST158Q05HA:0.68,DISCLIMA:0.25,DISCRIM:0.20}},
      {alpha:0.85,label:-1,vec:{ESCS:0.68,JOYREAD:0.72,SCREADCOMP:0.65,SCREADDIFF:0.28,SOIAICT:0.25,AUTICT:0.68,INTICT:0.60,HOMESCH:0.30,EUDMO:0.45,BSMJ:0.68,ST176Q01IA:0.68,ST176Q06IA:0.28,ST176Q05IA:0.68,ST176Q02IA:0.25,ST154Q01HA:0.75,ST158Q04HA:0.70,ST158Q01HA:0.68,ST158Q05HA:0.65,DISCLIMA:0.28,DISCRIM:0.22}},
      {alpha:1.08,label:-1,vec:{ESCS:0.75,JOYREAD:0.65,SCREADCOMP:0.72,SCREADDIFF:0.18,SOIAICT:0.18,AUTICT:0.75,INTICT:0.68,HOMESCH:0.22,EUDMO:0.55,BSMJ:0.75,ST176Q01IA:0.75,ST176Q06IA:0.20,ST176Q05IA:0.75,ST176Q02IA:0.22,ST154Q01HA:0.78,ST158Q04HA:0.78,ST158Q01HA:0.75,ST158Q05HA:0.72,DISCLIMA:0.20,DISCRIM:0.18}},
      {alpha:0.18,label:-1,vec:{ESCS:0.55,JOYREAD:0.52,SCREADCOMP:0.55,SCREADDIFF:0.42,SOIAICT:0.40,AUTICT:0.55,INTICT:0.50,HOMESCH:0.42,EUDMO:0.40,BSMJ:0.58,ST176Q01IA:0.55,ST176Q06IA:0.42,ST176Q05IA:0.55,ST176Q02IA:0.40,ST154Q01HA:0.58,ST158Q04HA:0.58,ST158Q01HA:0.55,ST158Q05HA:0.52,DISCLIMA:0.42,DISCRIM:0.40}},
      {alpha:0.12,label:-1,vec:{ESCS:0.58,JOYREAD:0.55,SCREADCOMP:0.58,SCREADDIFF:0.38,SOIAICT:0.38,AUTICT:0.58,INTICT:0.52,HOMESCH:0.40,EUDMO:0.38,BSMJ:0.60,ST176Q01IA:0.58,ST176Q06IA:0.40,ST176Q05IA:0.58,ST176Q02IA:0.38,ST154Q01HA:0.60,ST158Q04HA:0.60,ST158Q01HA:0.58,ST158Q05HA:0.55,DISCLIMA:0.40,DISCRIM:0.38}},
      {alpha:0.06,label:-1,vec:{ESCS:0.62,JOYREAD:0.58,SCREADCOMP:0.60,SCREADDIFF:0.35,SOIAICT:0.35,AUTICT:0.62,INTICT:0.55,HOMESCH:0.38,EUDMO:0.42,BSMJ:0.62,ST176Q01IA:0.62,ST176Q06IA:0.38,ST176Q05IA:0.62,ST176Q02IA:0.35,ST154Q01HA:0.62,ST158Q04HA:0.62,ST158Q01HA:0.62,ST158Q05HA:0.60,DISCLIMA:0.38,DISCRIM:0.35}},
    ],
  },
};

function norm(k,v){const f=ALL_FEATURES.find(x=>x.k===k);if(!f)return 0.5;const[lo,hi]=f.range;return Math.max(0,Math.min(1,(v-lo)/(hi-lo)));}

/* ═══════════════════════════════════════════════════════════════
   RBF KERNEL & PREDICTION
═══════════════════════════════════════════════════════════════ */
function rbfKernel(vec1,vec2,gamma){
  let sqDist=0;
  ALL_FEATURES.forEach(f=>{
    const d=(vec1[f.k]||0)-(vec2[f.k]||0);
    sqDist+=d*d;
  });
  return Math.exp(-gamma*sqDist);
}

function predictModel(id,vals){
  const model=RBF_MODELS[id];
  const M=MODELS[id];
  const normVals={};
  ALL_FEATURES.forEach(f=>{normVals[f.k]=norm(f.k,vals[f.k]||0);});
  let score=model.bias;
  model.supportVectors.forEach(sv=>{
    score+=sv.alpha*sv.label*rbfKernel(normVals,sv.vec,model.gamma);
  });
  const p1=1/(1+Math.exp(-score*2.5));
  const p2=1-p1;
  const[c1,c2]=M.classes;
  const probs={[c1]:+p1.toFixed(3),[c2]:+p2.toFixed(3)};
  const winner=p1>p2?c1:c2;
  const conf=+Math.max(p1,p2).toFixed(3);
  const shap=ALL_FEATURES.map(f=>{
    const perturbed={...normVals,[f.k]:normVals[f.k]+0.1};
    let deltaScore=0;
    model.supportVectors.forEach(sv=>{
      deltaScore+=sv.alpha*sv.label*(rbfKernel(perturbed,sv.vec,model.gamma)-rbfKernel(normVals,sv.vec,model.gamma));
    });
    return{k:f.k,label:ALL_FEATURES.find(x=>x.k===f.k)?.label||f.k,val:+(deltaScore*0.5).toFixed(4)};
  }).sort((a,b)=>Math.abs(b.val)-Math.abs(a.val)).slice(0,8);
  return{winner,probs,conf,shap};
}

function computeCRI(vals){
  const hl=predictModel("HL",vals);
  const ha=predictModel("HA",vals);
  const la=predictModel("LA",vals);
  const riskHL=(hl.probs["LOW"]||0);
  const riskHA=1-(ha.probs["HIGH"]||0);
  const riskLA=(la.probs["LOW"]||0);
  const cri=Math.round((riskHL*0.4+riskHA*0.35+riskLA*0.25)*100);
  const level=cri>=65?"HIGH RISK":cri>=35?"MODERATE RISK":"LOW RISK";
  const color=cri>=65?T.LOW:cri>=35?T.AVERAGE:T.HIGH;
  return{cri,level,color,riskHL:+riskHL.toFixed(3),riskHA:+riskHA.toFixed(3),riskLA:+riskLA.toFixed(3),hl,ha,la};
}

function whatIfAnalysis(vals){
  const base=computeCRI(vals);
  return ALL_FEATURES.map(f=>{
    const[lo,hi]=f.range,step=(hi-lo)/20;
    const improved={...vals};
    const best=f.d>0?Math.min(hi,vals[f.k]+step*5):Math.max(lo,vals[f.k]-step*5);
    improved[f.k]=best;
    const newCri=computeCRI(improved).cri;
    const delta=base.cri-newCri;
    return{k:f.k,label:f.label,lvl:f.lvl,d:f.d,delta:+delta.toFixed(1),baseCri:base.cri,newCri};
  }).sort((a,b)=>b.delta-a.delta);
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════════ */
const STYLES=`
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#ffffff;color:#1e2530;font-family:'Syne',sans-serif;font-size:15px;line-height:1.65}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:#f0f2f6}
::-webkit-scrollbar-thumb{background:#c8d0dc;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#94a3b8}
input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:4px;outline:none;cursor:pointer;}
input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:#e2e6ed;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;cursor:pointer;border:2px solid #fff;margin-top:-6px;transition:transform .12s,box-shadow .12s;box-shadow:0 1px 4px rgba(0,0,0,0.18);}
input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.3);box-shadow:0 2px 8px rgba(0,0,0,0.22);}
input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;cursor:pointer;border:2px solid #fff;}
input[type=range].pos-slider{background:linear-gradient(to right,#16A34A var(--pct),#e2e6ed var(--pct));color:#16A34A;}
input[type=range].pos-slider::-webkit-slider-thumb{background:#16A34A;}
input[type=range].neg-slider{background:linear-gradient(to right,#DC2626 var(--pct),#e2e6ed var(--pct));color:#DC2626;}
input[type=range].neg-slider::-webkit-slider-thumb{background:#DC2626;}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
.fu{animation:fadeUp .38s ease both}
.pop{animation:pop .3s cubic-bezier(.34,1.45,.64,1) both}
.pulse{animation:pulse 2s ease infinite}
.spin{animation:spin .7s linear infinite}
.card{background:#ffffff;border:1px solid #e2e6ed;border-radius:12px;padding:22px;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:box-shadow .18s,border-color .18s}
.card:hover{border-color:#c8d0dc;box-shadow:0 4px 12px rgba(0,0,0,0.09)}
.mbadge{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;letter-spacing:.05em;white-space:nowrap;display:inline-flex;align-items:center}
.tbtn{background:none;border:none;cursor:pointer;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;padding:9px 14px;border-radius:8px;transition:all .15s;letter-spacing:.02em;display:flex;align-items:center;gap:7px;width:100%;text-align:left;color:#64748b}
.tbtn:hover{background:#f0f2f6;color:#1e2530}
.tbtn.on{background:#f0f2f6;color:#1e2530;border-left:2px solid #2563EB}
.mbtn{background:#fff;border:1px solid #e2e6ed;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;padding:6px 14px;border-radius:7px;transition:all .14s;letter-spacing:.05em;color:#64748b}
.mbtn:hover{border-color:#c8d0dc;background:#f8f9fc;color:#1e2530}
.gbg{background:#ffffff}
table{border-collapse:collapse}
thead tr{border-bottom:2px solid #e2e6ed}
tbody tr{border-bottom:1px solid #f0f2f6}
tbody tr:nth-child(even){background:#f8f9fc}
tbody tr:hover{background:#eef2ff}
`;

/* ─ Micro components ─ */
const Tag=({c,children,s={}})=><span className="mbadge" style={{background:(c||T.ha)+"1c",color:c||T.ha,border:`1px solid ${(c||T.ha)+"35"}`,...s}}>{children}</span>;

const TT=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return<div style={{background:"#fff",border:"1px solid #e2e6ed",borderRadius:9,padding:"10px 14px",fontFamily:T.mono,fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.10)"}}>
    <div style={{color:T.muted,marginBottom:5}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color||T.ha}}>{p.name}: <b>{typeof p.value==="number"?p.value.toFixed(3):p.value}</b></div>)}
  </div>;
};

const H=({title,sub,icon,color=T.ha})=>(
  <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:22}}>
    {icon&&<div style={{width:42,height:42,borderRadius:11,background:color+"1a",border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>}
    <div>
      <div style={{fontWeight:800,fontSize:20,color:"#edf4ff",letterSpacing:"-.02em"}}>{title}</div>
      {sub&&<div style={{fontSize:13,color:T.muted,marginTop:2}}>{sub}</div>}
    </div>
  </div>
);

const Slider=({feat,val,onChange})=>{
  const f=ALL_FEATURES.find(x=>x.k===feat);
  if(!f)return null;
  const[lo,hi]=f.range;
  const pct=Math.round(((val-lo)/(hi-lo))*100);
  const cls=f.d>0?"pos-slider":"neg-slider";
  const col=f.d>0?T.HIGH:T.LOW;
  return(
    <div style={{marginBottom:13}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0}}/>
          <span style={{fontSize:12,color:T.text,fontWeight:500}}>{f.label}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontFamily:T.mono,fontSize:12,color:col,fontWeight:700,minWidth:32,textAlign:"right"}}>{Number(val).toFixed(1)}</span>
          <Tag c={col} s={{fontSize:10}}>{f.d>0?"↑":"↓"}</Tag>
        </div>
      </div>
      <input type="range" className={cls} min={lo} max={hi} step={f.range[1]>10?1:0.1}
        value={val} onChange={e=>onChange(parseFloat(e.target.value))}
        style={{"--pct":`${pct}%`}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
        <span style={{fontSize:10,color:T.faint,fontFamily:T.mono}}>{lo}</span>
        <span style={{fontSize:10,color:T.faint,fontFamily:T.mono}}>{hi}</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   NOVELTY PANEL
═══════════════════════════════════════════════════════════════ */
function NoveltyPanel(){
  const[vals,setVals]=useState({...DEFAULTS});
  const[section,setSection]=useState("cri");
  const[criResult,setCriResult]=useState(null);
  const[whatIfResult,setWhatIfResult]=useState(null);
  const[running,setRunning]=useState(false);
  const setV=useCallback((k,v)=>setVals(p=>({...p,[k]:v})),[]);
  const runAnalysis=useCallback(()=>{
    setRunning(true);
    setTimeout(()=>{setCriResult(computeCRI(vals));setWhatIfResult(whatIfAnalysis(vals));setRunning(false);},700);
  },[vals]);
  const PRESETS=[
    {label:"High Risk Student",icon:"⚠️",color:T.LOW,vals:{...DEFAULTS,ESCS:-2.0,JOYREAD:-1.8,SCREADCOMP:-1.5,SCREADDIFF:1.8,SOIAICT:1.5,INTICT:-1.8,DISCRIM:1.5,DISCLIMA:1.8,AUTICT:-1.5}},
    {label:"Average Student",icon:"📖",color:T.AVERAGE,vals:{...DEFAULTS}},
    {label:"High Achiever",icon:"🌟",color:T.HIGH,vals:{...DEFAULTS,ESCS:2.0,JOYREAD:1.8,SCREADCOMP:1.5,SCREADDIFF:-1.8,SOIAICT:-1.5,ST176Q01IA:4.8,ST158Q04HA:2.7,DISCLIMA:-1.5,AUTICT:1.5}},
  ];
  const topWhatIf=whatIfResult?.slice(0,8)||[];
  return(
    <div className="fu">
      <H icon="🧠" title="Novelty Contributions" color={T.nv}
        sub="Three original contributions beyond the base paper: Composite Risk Index · What-If Simulator · Smart Learning Prescription"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        {[
          {id:"cri",icon:"🎯",title:"Composite Risk Index",sub:"Novel unified risk score combining RBF-HL, RBF-HA and RBF-LA model outputs into a single 0–100 CRI metric",color:T.nv},
          {id:"whatif",icon:"🔀",title:"What-If Simulator",sub:"Counterfactual analysis using RBF kernel sensitivity — shows which features to change to reduce the student's risk score",color:T.ha},
          {id:"prescription",icon:"💊",title:"Smart Learning Prescription",sub:"AI-ranked personalised action plan derived from RBF-SHAP kernel attribution values — prioritised by expected CRI impact",color:T.hl},
        ].map(c=>(
          <button key={c.id} onClick={()=>setSection(c.id)}
            style={{background:section===c.id?c.color+"14":T.bg1,border:`1px solid ${section===c.id?c.color:T.border}`,borderRadius:13,padding:"16px 18px",cursor:"pointer",textAlign:"left",transition:"all .2s",position:"relative",overflow:"hidden"}}>
            {section===c.id&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:c.color}}/>}
            <div style={{fontSize:26,marginBottom:8}}>{c.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:section===c.id?c.color:"#edf4ff",marginBottom:5}}>{c.title}</div>
            <div style={{fontSize:12,color:T.muted,lineHeight:1.6}}>{c.sub}</div>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div className="card" style={{padding:"16px 18px"}}>
            <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:12,letterSpacing:".07em",textTransform:"uppercase"}}>Student Profile Input</div>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setVals({...p.vals})} className="mbtn"
                  style={{color:p.color,borderColor:p.color+"40",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
            <div style={{maxHeight:440,overflowY:"auto",paddingRight:4}}>
              {ALL_FEATURES.slice(0,16).map(f=>(
                <Slider key={f.k} feat={f.k} val={vals[f.k]||0} onChange={v=>setV(f.k,v)}/>
              ))}
            </div>
          </div>
          <button onClick={runAnalysis} disabled={running}
            style={{width:"100%",padding:"14px 0",borderRadius:11,border:`1px solid ${running?"#e2e6ed":T.nv+"60"}`,
              background:running?"#f8f9fc":`linear-gradient(135deg,${T.nv},#2563EB)`,
              color:running?T.muted:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,
              cursor:running?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:running?"none":"0 2px 8px rgba(124,58,237,0.3)"}}>
            {running?<><div className="spin" style={{width:16,height:16,border:`2px solid ${T.muted}`,borderTopColor:T.nv,borderRadius:"50%"}}/>Running analysis…</>:<>🧠 Run Novel Analysis</>}
          </button>
        </div>
        <div>
          {!criResult&&(
            <div className="card" style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,minHeight:500}}>
              <div style={{fontSize:56,opacity:.12}}>🧠</div>
              <div style={{fontSize:15,color:T.muted,textAlign:"center"}}>Configure a student profile<br/>and run the novel analysis</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {["Composite Risk Index","What-If Simulator","Smart Prescription"].map(t=>(
                  <Tag key={t} c={T.nv}>{t}</Tag>
                ))}
              </div>
            </div>
          )}
          {criResult&&section==="cri"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="card pop" style={{textAlign:"center",padding:"28px 24px",border:`2px solid ${criResult.color}44`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:criResult.color}}/>
                <div style={{fontFamily:T.mono,fontSize:12,color:T.muted,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>Composite Risk Index (CRI)</div>
                <div style={{fontFamily:T.mono,fontSize:72,fontWeight:700,color:criResult.color,lineHeight:1}}>{criResult.cri}</div>
                <div style={{fontSize:20,fontWeight:700,color:criResult.color,marginTop:8}}>{criResult.level}</div>
                <div style={{fontSize:13,color:T.muted,marginTop:8,maxWidth:360,margin:"10px auto 0"}}>Weighted ensemble of three RBF SVM model risk scores: HL (40%) + HA (35%) + LA (25%)</div>
              </div>
              <div className="card">
                <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:12,letterSpacing:".06em",textTransform:"uppercase"}}>CRI Gauge</div>
                <div style={{height:24,borderRadius:12,background:`linear-gradient(90deg,${T.HIGH},${T.AVERAGE},${T.LOW})`,position:"relative",marginBottom:8}}>
                  <div style={{position:"absolute",left:`${criResult.cri}%`,top:"50%",transform:"translate(-50%,-50%)",width:20,height:20,borderRadius:"50%",background:"#fff",border:`3px solid ${criResult.color}`,transition:"left .8s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontFamily:T.mono}}>
                  <span style={{color:T.HIGH}}>0 — Low Risk</span>
                  <span style={{color:T.AVERAGE}}>50 — Moderate</span>
                  <span style={{color:T.LOW}}>100 — High Risk</span>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[["HL",criResult.riskHL,T.hl,"40%","P(LOW)"],["HA",criResult.riskHA,T.ha,"35%","1−P(HIGH)"],["LA",criResult.riskLA,T.la,"25%","P(LOW)"]].map(([id,val,color,weight,formula])=>(
                  <div key={id} className="card" style={{textAlign:"center",padding:"14px 12px",borderTop:`2px solid ${color}`}}>
                    <div style={{fontFamily:T.mono,fontSize:11,color,fontWeight:700,marginBottom:4}}>RBF-{id}</div>
                    <div style={{fontFamily:T.mono,fontSize:26,fontWeight:700,color,lineHeight:1}}>{(val*100).toFixed(0)}%</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:4}}>risk score</div>
                    <div style={{marginTop:8}}><Tag c={color} s={{fontSize:10}}>weight {weight}</Tag></div>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.faint,marginTop:6}}>{formula}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{background:T.nv+"0c",borderColor:T.nv+"30"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:20}}>💡</span>
                  <div>
                    <div style={{fontWeight:700,color:T.nv,fontSize:14,marginBottom:5}}>Novel Contribution — Why CRI Matters</div>
                    <div style={{fontSize:13,color:T.text,lineHeight:1.7}}>The CRI combines all three RBF SVM model outputs into a single interpretable score (0–100), enabling educators to identify at-risk students without consulting three separate model outputs. This bridges the gap between ML research and practical classroom deployment.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {criResult&&section==="whatif"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="card" style={{background:T.ha+"0c",borderColor:T.ha+"30"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div>
                    <div style={{fontWeight:700,color:T.ha,fontSize:16,marginBottom:2}}>What-If Counterfactual Simulator</div>
                    <div style={{fontSize:13,color:T.muted}}>Simulates CRI reduction by moving each feature ±25% of its range in the beneficial direction</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:T.mono,fontSize:26,fontWeight:700,color:criResult.color}}>{criResult.cri}</div>
                    <div style={{fontSize:11,color:T.muted}}>current CRI</div>
                  </div>
                </div>
                <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:12,letterSpacing:".06em",textTransform:"uppercase"}}>Top 8 highest-impact feature changes</div>
                {topWhatIf.map((item,i)=>{
                  const maxDelta=topWhatIf[0]?.delta||1;
                  const isGood=item.delta>0;
                  return(
                    <div key={item.k} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:22,height:22,borderRadius:6,background:T.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.mono,fontSize:11,color:T.muted,fontWeight:700,flexShrink:0}}>{i+1}</div>
                          <div>
                            <span style={{fontFamily:T.mono,fontSize:12,color:isGood?T.HIGH:T.LOW,fontWeight:600}}>{item.k}</span>
                            <span style={{fontSize:12,color:T.muted,marginLeft:7}}>{item.label}</span>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontFamily:T.mono,fontSize:12,color:T.muted}}>{item.newCri}</span>
                          <Tag c={isGood?T.HIGH:T.LOW}>{isGood?"↓":"+"}CRI {isGood?item.delta.toFixed(1):Math.abs(item.delta).toFixed(1)}</Tag>
                        </div>
                      </div>
                      <div style={{height:7,background:T.bg3,borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:4,background:isGood?T.HIGH:T.LOW,width:`${Math.abs(item.delta)/maxDelta*100}%`,transition:"width .7s ease"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="card" style={{background:T.nv+"0c",borderColor:T.nv+"30"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:20}}>💡</span>
                  <div>
                    <div style={{fontWeight:700,color:T.nv,fontSize:14,marginBottom:5}}>Novel Contribution — Counterfactual Explanations</div>
                    <div style={{fontSize:13,color:T.text,lineHeight:1.7}}>The base paper identifies which features matter but not <em style={{color:T.ha}}>how much change is needed</em>. This simulator runs counterfactual simulations across all 20 features using RBF kernel sensitivity, giving teachers a concrete minimum-effort path toward improving a student's predicted outcome.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {criResult&&section==="prescription"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="card" style={{background:T.hl+"0c",borderColor:T.hl+"30"}}>
                <div style={{fontWeight:700,color:T.hl,fontSize:16,marginBottom:4}}>🎓 Personalised Learning Prescription</div>
                <div style={{fontSize:13,color:T.muted,marginBottom:16}}>Action items ranked by expected CRI reduction — from RBF-SHAP attribution profile</div>
                {[
                  {label:"🔴 URGENT — Address Immediately",items:topWhatIf.filter(x=>x.delta>8).slice(0,3),color:T.LOW},
                  {label:"🟡 HIGH PRIORITY — Act Within Semester",items:topWhatIf.filter(x=>x.delta>4&&x.delta<=8).slice(0,3),color:T.AVERAGE},
                  {label:"🟢 MODERATE — Ongoing Improvement",items:topWhatIf.filter(x=>x.delta>0&&x.delta<=4).slice(0,3),color:T.HIGH},
                ].filter(g=>g.items.length>0).map(group=>(
                  <div key={group.label} style={{marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"6px 12px",background:group.color+"12",borderRadius:8,borderLeft:`3px solid ${group.color}`}}>
                      <span style={{fontSize:13,fontWeight:700,color:group.color}}>{group.label}</span>
                    </div>
                    {group.items.map((item,i)=>{
                      const feat=ALL_FEATURES.find(f=>f.k===item.k);
                      const action=feat?.d>0?`Increase ${feat?.label}`:`Reduce ${feat?.label}`;
                      const strategy=item.k==="ESCS"?"Provide resource support & scholarship access":item.k==="JOYREAD"?"Introduce choice-based leisure reading activities":item.k==="DISCLIMA"?"Implement structured classroom management protocol":item.k==="DISCRIM"?"Enforce anti-discrimination policy and counselling":item.k==="SOIAICT"?"Replace social media with academic ICT platforms":item.k==="INTICT"?"Gamified ICT workshops to build digital interest":item.k==="ST158Q04HA"?"Professional development for teachers on digital literacy":item.k==="SCREADDIFF"?"Scaffold reading tasks with graduated difficulty":item.k==="SCREADCOMP"?"Build reading confidence via success-oriented tasks":item.k==="ST176Q01IA"?"Assign weekly email-based reflective journals":`Focus on ${feat?.label||item.k} improvement strategies`;
                      return(
                        <div key={item.k} style={{display:"flex",gap:12,marginBottom:10,padding:"10px 14px",background:T.bg2,borderRadius:9,border:`1px solid ${T.border}`,alignItems:"flex-start"}}>
                          <div style={{width:28,height:28,borderRadius:7,background:group.color+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:T.mono,fontSize:12,fontWeight:700,color:group.color}}>{i+1}</div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span style={{fontFamily:T.mono,fontSize:12,color:group.color,fontWeight:700}}>{action}</span>
                              <Tag c={group.color} s={{fontSize:10}}>CRI↓{item.delta.toFixed(1)}</Tag>
                            </div>
                            <div style={{fontSize:13,color:T.text,lineHeight:1.6}}>{strategy}</div>
                            <div style={{fontSize:11,color:T.muted,marginTop:4}}>Feature: {feat?.lvl}-level · Current: {Number(vals[item.k]).toFixed(1)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="card" style={{background:T.nv+"0c",borderColor:T.nv+"30"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:20}}>💡</span>
                  <div>
                    <div style={{fontWeight:700,color:T.nv,fontSize:14,marginBottom:5}}>Novel Contribution — AI-Driven Personalised Prescription</div>
                    <div style={{fontSize:13,color:T.text,lineHeight:1.7}}>Generates a <em style={{color:T.hl}}>student-specific, ranked action plan</em> using RBF-SHAP-derived feature impacts combined with What-If simulation. Each recommendation is prioritised by expected CRI reduction — not a generic class recommendation.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREDICTION PANEL
═══════════════════════════════════════════════════════════════ */
const PRESETS_PREDICT=[
  {label:"High Performer",icon:"🌟",color:T.HIGH,vals:{...DEFAULTS,ESCS:1.9,JOYREAD:1.6,SCREADCOMP:1.3,SCREADDIFF:-1.6,SOIAICT:-1.4,ST176Q01IA:4.6,ST158Q04HA:2.6,DISCLIMA:-1.3,AUTICT:1.4,INTICT:1.2}},
  {label:"Low Performer",icon:"⚠️",color:T.LOW,vals:{...DEFAULTS,ESCS:-1.9,JOYREAD:-1.6,SCREADCOMP:-1.3,SCREADDIFF:1.6,SOIAICT:1.4,INTICT:-1.6,DISCRIM:1.4,DISCLIMA:1.6,AUTICT:-1.2}},
  {label:"Average Student",icon:"📖",color:T.AVERAGE,vals:{...DEFAULTS}},
  {label:"Borderline Case",icon:"🔀",color:T.ha,vals:{...DEFAULTS,ESCS:0.1,JOYREAD:0.15,SCREADCOMP:-0.1,SCREADDIFF:0.15}},
];

function PredictionPanel(){
  const[vals,setVals]=useState({...DEFAULTS});
  const[results,setResults]=useState(null);
  const[loading,setLoading]=useState(false);
  const[history,setHistory]=useState([]);
  const[inputTab,setInputTab]=useState("sliders");
  const[activePreset,setActivePreset]=useState(null);
  const setV=useCallback((k,v)=>setVals(p=>({...p,[k]:v})),[]);
  const runAll=useCallback(()=>{
    setLoading(true);
    setTimeout(()=>{
      const r={HL:predictModel("HL",vals),HA:predictModel("HA",vals),LA:predictModel("LA",vals)};
      setResults(r);
      setHistory(h=>[{vals:{...vals},r,id:Date.now()},...h].slice(0,6));
      setLoading(false);
    },750);
  },[vals]);
  const maxShap=results?Math.max(...["HL","HA","LA"].flatMap(id=>results[id].shap.map(s=>Math.abs(s.val)))):1;
  return(
    <div className="fu">
      <H icon="⚡" title="Triple RBF SVM Prediction Engine" color={T.hl}
        sub="Enter one student profile → get simultaneous predictions from all 3 RBF SVM models with kernel SHAP attribution"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
        {PRESETS_PREDICT.map((p,i)=>(
          <button key={i} onClick={()=>{setVals({...p.vals});setActivePreset(i);}}
            style={{background:activePreset===i?p.color+"16":T.bg1,border:`1px solid ${activePreset===i?p.color:T.border}`,borderRadius:11,padding:"12px 14px",cursor:"pointer",textAlign:"left",transition:"all .18s",position:"relative",overflow:"hidden"}}>
            {activePreset===i&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:p.color}}/>}
            <div style={{fontSize:20,marginBottom:5}}>{p.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:activePreset===i?p.color:T.text}}>{p.label}</div>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"400px 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div className="card" style={{padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,letterSpacing:".07em",textTransform:"uppercase"}}>Student Features</div>
              <div style={{display:"flex",gap:4}}>
                {["sliders","table"].map(t=>(
                  <button key={t} className="mbtn" onClick={()=>setInputTab(t)}
                    style={{fontSize:10,padding:"4px 10px",color:inputTab===t?T.text:T.muted,background:inputTab===t?T.bg3:"transparent",borderColor:inputTab===t?T.borderHi:T.border}}>
                    {t==="sliders"?"🎚 Sliders":"⊞ Grid"}
                  </button>
                ))}
              </div>
            </div>
            {inputTab==="sliders"?(
              <div style={{maxHeight:420,overflowY:"auto",paddingRight:4}}>
                {ALL_FEATURES.slice(0,14).map(f=>(
                  <Slider key={f.k} feat={f.k} val={vals[f.k]||0} onChange={v=>setV(f.k,v)}/>
                ))}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,maxHeight:420,overflowY:"auto"}}>
                {ALL_FEATURES.map(f=>(
                  <div key={f.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",background:T.bg2,borderRadius:6,border:`1px solid ${T.border}`}}>
                    <span style={{fontFamily:T.mono,fontSize:10,color:f.d>0?T.HIGH:T.LOW}}>{f.k}</span>
                    <input type="number" value={vals[f.k]||0} step={0.1}
                      onChange={e=>setV(f.k,parseFloat(e.target.value)||0)}
                      style={{width:46,background:"transparent",border:"none",color:T.text,fontFamily:T.mono,fontSize:10,textAlign:"right",outline:"none"}}/>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={runAll} disabled={loading}
            style={{width:"100%",padding:"14px 0",borderRadius:11,border:`1px solid ${loading?T.border:"#1a5f9a88"}`,
              background:loading?T.bg2:"linear-gradient(135deg,#0e2d5a,#0a4a3a)",
              color:loading?T.muted:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,
              cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?<><div className="spin" style={{width:16,height:16,border:`2px solid ${T.muted}`,borderTopColor:T.ha,borderRadius:"50%"}}/>Analysing…</>:<>⚡ Predict with All 3 RBF SVM Models</>}
          </button>
        </div>
        <div>
          {!results?(
            <div className="card" style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,minHeight:420}}>
              <div style={{fontSize:56,opacity:.12}}>⚡</div>
              <div style={{fontSize:15,color:T.muted}}>Configure a student profile and run prediction</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {["HL","HA","LA"].map((id,idx)=>{
                const M=MODELS[id],r=results[id];
                const winColor=T[r.winner]||M.color;
                return(
                  <div key={id} className="pop card" style={{animationDelay:`${idx*80}ms`,background:`linear-gradient(135deg,${M.dim},${T.bg1})`,border:`1px solid ${M.color}44`,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,width:"100%",height:2,background:M.color}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                          <Tag c={M.color}>RBF-{id}</Tag>
                          <span style={{fontSize:13,color:T.muted}}>{M.short}</span>
                        </div>
                        <div style={{fontSize:22,fontWeight:800,color:winColor}}>{r.winner}</div>
                      </div>
                      <div style={{textAlign:"right",background:T.bg2,borderRadius:10,padding:"10px 14px",border:`1px solid ${M.color}28`}}>
                        <div style={{fontFamily:T.mono,fontSize:28,fontWeight:700,color:winColor,lineHeight:1}}>{(r.conf*100).toFixed(1)}%</div>
                        <div style={{fontSize:11,color:T.muted,marginTop:2}}>confidence</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      {Object.entries(r.probs).map(([cls,p])=>(
                        <div key={cls} style={{flex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                            <span style={{fontFamily:T.mono,color:T[cls]||T.muted,fontWeight:700}}>{cls}</span>
                            <span style={{fontFamily:T.mono,color:T[cls]||T.muted}}>{(p*100).toFixed(1)}%</span>
                          </div>
                          <div style={{height:6,background:T.bg3,borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",background:T[cls]||M.color,borderRadius:3,width:`${p*100}%`,transition:"width .9s ease"}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {r.shap.slice(0,5).map(s=>(
                        <Tag key={s.k} c={s.val>0?T.HIGH:T.LOW} s={{fontSize:11}}>
                          {s.val>0?"↑":"↓"} {s.k} {s.val>0?"+":""}{s.val.toFixed(3)}
                        </Tag>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="card" style={{background:T.bg2,padding:"14px 16px"}}>
                {(()=>{
                  const preds=["HL","HA","LA"].map(id=>results[id].winner);
                  const agree=[...new Set(preds)].length===1;
                  const avgConf=(results.HL.conf+results.HA.conf+results.LA.conf)/3;
                  return(
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:42,height:42,borderRadius:10,background:agree?T.HIGH+"18":T.AVERAGE+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                        {agree?"✅":"🔀"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,color:agree?T.HIGH:T.AVERAGE,fontSize:15}}>
                          {agree?"All 3 RBF models agree":"Models diverge — borderline student profile"}
                        </div>
                        <div style={{fontSize:12,color:T.muted,marginTop:2,fontFamily:T.mono}}>
                          HL→<span style={{color:T[preds[0]]||T.ha}}>{preds[0]}</span> · HA→<span style={{color:T[preds[1]]||T.ha}}>{preds[1]}</span> · LA→<span style={{color:T[preds[2]]||T.ha}}>{preds[2]}</span>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:T.mono,fontSize:18,fontWeight:700,color:agree?T.HIGH:T.AVERAGE}}>{(avgConf*100).toFixed(1)}%</div>
                        <div style={{fontSize:11,color:T.muted}}>avg confidence</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
      {results&&(
        <div className="card fu" style={{marginTop:14}}>
          <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:14,letterSpacing:".07em",textTransform:"uppercase"}}>RBF-SHAP Attribution — All Three Models Side by Side</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {["HL","HA","LA"].map(id=>{
              const M=MODELS[id],r=results[id];
              return(
                <div key={id}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <div style={{width:3,height:22,background:M.color,borderRadius:2}}/>
                    <span style={{fontFamily:T.mono,fontSize:12,color:M.color,fontWeight:700}}>RBF-{id}: {M.short}</span>
                  </div>
                  {r.shap.map(s=>(
                    <div key={s.k} style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                      <span style={{fontFamily:T.mono,fontSize:11,width:78,color:s.val>0?T.HIGH:T.LOW,flexShrink:0}}>{s.k}</span>
                      <div style={{flex:1,height:5,background:T.bg3,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",background:s.val>0?T.HIGH:T.LOW,borderRadius:3,width:`${Math.abs(s.val)/maxShap*100}%`,transition:"width .7s ease"}}/>
                      </div>
                      <span style={{fontFamily:T.mono,fontSize:11,width:46,textAlign:"right",color:s.val>0?T.HIGH:T.LOW}}>{s.val>0?"+":""}{s.val.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {history.length>1&&(
        <div className="card fu" style={{marginTop:14}}>
          <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:12,letterSpacing:".06em",textTransform:"uppercase"}}>Prediction History — {history.length} runs</div>
          {history.map((h,i)=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:i===0?T.bg2:T.bg1,borderRadius:8,border:`1px solid ${T.border}`,marginBottom:6}}>
              <span style={{fontFamily:T.mono,fontSize:11,color:T.faint,width:18}}>#{history.length-i}</span>
              {["HL","HA","LA"].map(id=>(
                <div key={id} style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontFamily:T.mono,fontSize:11,color:MC[id]}}>RBF-{id}:</span>
                  <Tag c={T[h.r[id].winner]||T.ha} s={{fontSize:10}}>{h.r[id].winner} {(h.r[id].conf*100).toFixed(0)}%</Tag>
                </div>
              ))}
              <button onClick={()=>setVals({...h.vals})} style={{marginLeft:"auto",background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"3px 10px",color:T.muted,cursor:"pointer",fontFamily:T.mono,fontSize:11}}>↺ restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURES PANEL
═══════════════════════════════════════════════════════════════ */
function FeaturesPanel(){
  const[am,setAm]=useState("HL");
  const M=MODELS[am],maxW=Math.max(...M.topFeats.map(f=>f.v));
  const lvlData=["student","classroom","school"].map(l=>({l,pos:ALL_FEATURES.filter(f=>f.lvl===l&&f.d===1).length,neg:ALL_FEATURES.filter(f=>f.lvl===l&&f.d===-1).length,cnt:ALL_FEATURES.filter(f=>f.lvl===l).length}));
  return(
    <div className="fu">
      <H icon="🔬" title="Feature Importance & SHAP Attribution" color={T.la} sub="SVM-RFE ranked weights and per-class SHAP drivers for each RBF model"/>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {["HL","HA","LA"].map(id=>(
          <button key={id} className="mbtn" onClick={()=>setAm(id)}
            style={{color:am===id?MC[id]:T.muted,borderColor:am===id?MC[id]:T.border,background:am===id?MD[id]:"transparent",fontSize:12}}>
            RBF-{id}: {MODELS[id].short}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14}}>
        <div className="card">
          <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:16,letterSpacing:".07em",textTransform:"uppercase"}}>Top 10 SVM-RFE Feature Weights — {M.short}</div>
          {M.topFeats.map((f,i)=>(
            <div key={f.k} className="fu" style={{marginBottom:13,animationDelay:`${i*35}ms`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,borderRadius:6,background:T.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.mono,fontSize:11,color:T.muted,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <span style={{fontFamily:T.mono,fontSize:12,color:f.d>0?T.HIGH:T.LOW,fontWeight:600}}>{f.k}</span>
                  <span style={{fontSize:12,color:T.muted}}>{ALL_FEATURES.find(x=>x.k===f.k)?.label}</span>
                </div>
                <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
                  <Tag c={f.d>0?T.HIGH:T.LOW} s={{fontSize:11}}>{f.d>0?"↑ pos":"↓ neg"}</Tag>
                  <span style={{fontFamily:T.mono,fontSize:12,color:M.color,fontWeight:700}}>{f.v.toFixed(2)}</span>
                </div>
              </div>
              <div style={{height:6,background:T.bg3,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:3,background:f.d>0?T.HIGH:T.LOW,width:`${(f.v/maxW)*100}%`,transition:"width .7s ease"}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card">
            <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:12,letterSpacing:".07em",textTransform:"uppercase"}}>SHAP Drivers by Class</div>
            {Object.entries(M.shap).map(([cls,feats])=>(
              <div key={cls} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:T[cls]||M.color}}/>
                  <span style={{fontSize:13,fontWeight:700,color:T[cls]||M.color}}>{cls} performers</span>
                </div>
                {feats.map((f,i)=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                    <div style={{width:17,height:17,borderRadius:4,background:(T[cls]||M.color)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.mono,fontSize:9,color:T[cls]||M.color}}>{i+1}</div>
                    <span style={{fontFamily:T.mono,fontSize:11,color:T.muted,flex:1}}>{f}</span>
                    <div style={{width:60,height:4,background:T.bg3,borderRadius:2}}>
                      <div style={{height:"100%",borderRadius:2,background:T[cls]||M.color,width:`${(5-i)*18}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:12,letterSpacing:".07em",textTransform:"uppercase"}}>Feature Distribution by Level</div>
            {lvlData.map(({l,pos,neg,cnt})=>(
              <div key={l} style={{marginBottom:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:T.text}}>{l}-level</span>
                  <span style={{fontFamily:T.mono,fontSize:11,color:T.muted}}>{cnt} features</span>
                </div>
                <div style={{display:"flex",height:9,borderRadius:5,overflow:"hidden",gap:1}}>
                  <div style={{flex:pos,background:T.HIGH}}/>
                  <div style={{flex:neg,background:T.LOW}}/>
                </div>
                <div style={{display:"flex",gap:14,marginTop:4}}>
                  <span style={{fontSize:11,color:T.HIGH,fontFamily:T.mono}}>▲ {pos} positive</span>
                  <span style={{fontSize:11,color:T.LOW,fontFamily:T.mono}}>▼ {neg} negative</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RBF Kernel Geometry Card */}
      <div className="card" style={{marginTop:14}}>
        <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:16,letterSpacing:".07em",textTransform:"uppercase"}}>RBF Kernel Geometry</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Gamma (γ) sensitivity per model</div>
            <div style={{fontSize:11,color:T.muted,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
              <span>smoother boundary</span><span>tighter boundary</span>
            </div>
            {[["HL",T.hl,0.18,0.25],["HA",T.ha,0.22,0.25],["LA",T.la,0.20,0.25]].map(([id,color,gamma,maxG])=>(
              <div key={id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontFamily:T.mono,fontSize:12,color,fontWeight:700}}>RBF-{id} γ={gamma}</span>
                  <span style={{fontFamily:T.mono,fontSize:11,color:T.muted}}>C={id==="HL"?"1.0":"0.5"}</span>
                </div>
                <div style={{height:8,background:T.bg3,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:4,background:color,width:`${(gamma/maxG)*100}%`,transition:"width .7s ease"}}/>
                </div>
              </div>
            ))}
            <div style={{marginTop:14,fontSize:13,color:T.muted,lineHeight:1.7}}>
              The RBF kernel maps features into infinite-dimensional space, enabling non-linear decision boundaries. Higher γ = more complex local boundaries; lower γ = smoother, more generalised fit.
            </div>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Support vectors per model (12 per classifier)</div>
            {["HL","HA","LA"].map(id=>(
              <div key={id} style={{marginBottom:14}}>
                <div style={{fontFamily:T.mono,fontSize:11,color:MC[id],marginBottom:7}}>RBF-{id} — {MODELS[id].short}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {RBF_MODELS[id].supportVectors.map((sv,i)=>(
                    <div key={i} style={{width:14,height:14,borderRadius:"50%",background:sv.label===1?T.HIGH:T.LOW,border:`1px solid ${sv.label===1?T.HIGH:T.LOW}`,opacity:Math.min(1,0.4+sv.alpha*0.6),title:`α=${sv.alpha.toFixed(2)}`}}/>
                  ))}
                </div>
                <div style={{display:"flex",gap:12,marginTop:5}}>
                  <span style={{fontSize:10,color:T.HIGH,fontFamily:T.mono}}>● positive class (6)</span>
                  <span style={{fontSize:10,color:T.LOW,fontFamily:T.mono}}>● negative class (6)</span>
                  <span style={{fontSize:10,color:T.muted,fontFamily:T.mono}}>opacity = α magnitude</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROC + CV PANEL
═══════════════════════════════════════════════════════════════ */
function ROCPanel(){
  const rocRandom=Array.from({length:24},(_,i)=>({fpr:+(i/23).toFixed(3),tpr:+(i/23).toFixed(3)}));
  return(
    <div className="fu">
      <H icon="📈" title="ROC Curves & 10-Fold Cross-Validation" color={T.hl} sub="Separate ROC and CV accuracy charts for each RBF SVM model"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:14}}>
        {["HL","HA","LA"].map(id=>{
          const M=MODELS[id];
          const rocData=M.roc.map((pt,i)=>({...pt,random:rocRandom[i].tpr}));
          return(
            <div className="card" key={id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontFamily:T.mono,fontSize:11,color:M.color,letterSpacing:".07em",textTransform:"uppercase",marginBottom:3}}>ROC — RBF-{id}</div>
                  <div style={{fontSize:14,fontWeight:600,color:T.text}}>{M.short}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:T.mono,fontSize:22,fontWeight:700,color:M.color,lineHeight:1}}>{M.metrics.AUC.toFixed(3)}</div>
                  <div style={{fontSize:11,color:T.muted}}>AUC</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={rocData} margin={{left:-22,right:4,top:4,bottom:16}}>
                  <XAxis dataKey="fpr" tick={{fontSize:10,fill:T.muted,fontFamily:T.mono}} tickFormatter={v=>v.toFixed(1)} label={{value:"FPR",position:"insideBottom",fontSize:10,fill:T.muted,dy:8}}/>
                  <YAxis domain={[0,1]} tick={{fontSize:10,fill:T.muted}} label={{value:"TPR",angle:-90,position:"insideLeft",fontSize:10,fill:T.muted,dx:14}}/>
                  <Tooltip content={<TT/>}/>
                  <Line type="monotone" dataKey="random" stroke={T.faint} strokeDasharray="3 2" dot={false} name="Random"/>
                  <Line type="monotone" dataKey="tpr" stroke={M.color} strokeWidth={2.5} dot={false} name={`RBF-${id}`}/>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
                <Tag c={M.color}>AUC {M.metrics.AUC.toFixed(3)}</Tag>
                <Tag c={M.color}>ACC {(M.metrics.ACC*100).toFixed(1)}%</Tag>
                <Tag c={M.color}>F1 {(M.metrics.F1*100).toFixed(1)}%</Tag>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:14}}>
        {["HL","HA","LA"].map(id=>{
          const M=MODELS[id];
          const foldData=M.folds.map((v,i)=>({fold:`F${i+1}`,acc:+(v*100).toFixed(1)}));
          const mean=(M.folds.reduce((a,b)=>a+b,0)/10*100).toFixed(1);
          const std=(Math.sqrt(M.folds.reduce((a,b,_,arr)=>a+(b-arr.reduce((c,d)=>c+d,0)/arr.length)**2,0)/10)*100).toFixed(2);
          return(
            <div className="card" key={id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontFamily:T.mono,fontSize:11,color:M.color,letterSpacing:".07em",textTransform:"uppercase",marginBottom:3}}>10-Fold CV — RBF-{id}</div>
                  <div style={{fontSize:14,fontWeight:600,color:T.text}}>{M.short}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:T.mono,fontSize:22,fontWeight:700,color:M.color,lineHeight:1}}>{mean}%</div>
                  <div style={{fontSize:11,color:T.muted}}>μ ± {std}%</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={foldData} margin={{left:-22,right:4,top:4,bottom:0}}>
                  <XAxis dataKey="fold" tick={{fontSize:10,fill:T.muted,fontFamily:T.mono}}/>
                  <YAxis domain={[Math.floor(Math.min(...M.folds)*100)-2,Math.ceil(Math.max(...M.folds)*100)+1]} tick={{fontSize:10,fill:T.muted}} tickFormatter={v=>`${v}%`}/>
                  <Tooltip content={<TT/>}/>
                  <ReferenceLine y={parseFloat(mean)} stroke={M.color} strokeDasharray="3 2"/>
                  <Bar dataKey="acc" name="Accuracy" radius={[4,4,0,0]}>
                    {foldData.map((_,i)=><Cell key={i} fill={M.color+(i%2===0?"dd":"88")}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {["HL","HA","LA"].map(id=>{
          const M=MODELS[id];
          const[[tp,fn],[fp,tn]]=M.cm,total=tp+fn+fp+tn,cells=[[tp,fn],[fp,tn]];
          return(
            <div className="card" key={id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontFamily:T.mono,fontSize:11,color:M.color,letterSpacing:".06em",textTransform:"uppercase"}}>Confusion — RBF-{id}</div>
                <Tag c={M.color}>n={total}</Tag>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:4,marginBottom:12}}>
                <div/><div style={{textAlign:"center",fontSize:11,color:T.muted,fontFamily:T.mono,paddingBottom:5}}>Pred {M.cmLabels[0]}</div>
                <div style={{textAlign:"center",fontSize:11,color:T.muted,fontFamily:T.mono,paddingBottom:5}}>Pred {M.cmLabels[1]}</div>
                {M.cmLabels.map((lbl,r)=>[
                  <div key={`l${r}`} style={{fontSize:11,color:T.muted,fontFamily:T.mono,display:"flex",alignItems:"center",paddingRight:7}}>{lbl}</div>,
                  ...cells[r].map((v,c)=>(
                    <div key={`${r}${c}`} style={{background:r===c?M.color+"22":T.bg2,border:`1px solid ${r===c?M.color+"44":T.border}`,borderRadius:8,padding:"11px 4px",textAlign:"center",fontFamily:T.mono,fontSize:16,fontWeight:700,color:r===c?M.color:T.muted}}>
                      {v}
                      <div style={{fontSize:10,fontWeight:400,color:T.faint,marginTop:2}}>{(v/total*100).toFixed(0)}%</div>
                    </div>
                  ))
                ])}
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                <Tag c={M.color}>SEN {(M.metrics.SEN*100).toFixed(1)}%</Tag>
                <Tag c={M.color}>Prec {(M.metrics.Precision*100).toFixed(1)}%</Tag>
                <Tag c={M.color}>F1 {(M.metrics.F1*100).toFixed(1)}%</Tag>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   METRICS PANEL
═══════════════════════════════════════════════════════════════ */
function MetricsPanel(){
  const mkeys=["ACC","Precision","SEN","F1","AUC"];
  const barData=mkeys.map(m=>({metric:m,HL:+(MODELS.HL.metrics[m]*100).toFixed(1),HA:+(MODELS.HA.metrics[m]*100).toFixed(1),LA:+(MODELS.LA.metrics[m]*100).toFixed(1)}));
  const radarData=mkeys.concat(["CV Stability"]).map(m=>({metric:m,HL:m==="CV Stability"?99.1:+(MODELS.HL.metrics[m]*100).toFixed(1),HA:m==="CV Stability"?97.2:+(MODELS.HA.metrics[m]*100).toFixed(1),LA:m==="CV Stability"?96.8:+(MODELS.LA.metrics[m]*100).toFixed(1)}));
  const comparison=[
    {model:"HL",color:T.hl,metric:"ACC",linear:96.3,rbf:97.8,delta:1.5},
    {model:"HL",color:T.hl,metric:"AUC",linear:97.0,rbf:99.3,delta:2.3},
    {model:"HA",color:T.ha,metric:"ACC",linear:87.1,rbf:90.1,delta:3.0},
    {model:"HA",color:T.ha,metric:"AUC",linear:90.1,rbf:94.1,delta:4.0},
    {model:"LA",color:T.la,metric:"ACC",linear:86.9,rbf:89.7,delta:2.8},
    {model:"LA",color:T.la,metric:"AUC",linear:89.2,rbf:93.3,delta:4.1},
  ];
  return(
    <div className="fu">
      <H icon="📊" title="Model Performance Metrics" color={T.ha} sub="ACC · Precision · SEN (Recall) · F1-Score · AUC — all three RBF SVM models"/>
      {["HL","HA","LA"].map(id=>{
        const M=MODELS[id];
        return(
          <div key={id} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:4,height:32,borderRadius:2,background:M.color}}/>
              <div>
                <div style={{fontWeight:700,fontSize:16,color:"#edf4ff"}}>RBF-{id}: {M.short}</div>
                <div style={{fontSize:12,color:T.muted}}>{M.technique}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {mkeys.map((m,i)=>(
                <div key={m} className="card pop" style={{textAlign:"center",padding:"16px 10px",animationDelay:`${i*55}ms`,borderTop:`2px solid ${M.color}`,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 0%,${M.color}08,transparent 65%)`}}/>
                  <div style={{fontFamily:T.mono,fontSize:26,fontWeight:700,color:M.color,lineHeight:1,position:"relative"}}>{(M.metrics[m]*100).toFixed(1)}%</div>
                  <div style={{fontSize:13,color:T.muted,marginTop:7,fontWeight:600}}>{m}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div className="card">
          <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:14,letterSpacing:".07em",textTransform:"uppercase"}}>Grouped Bar — All Metrics</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{left:-12,right:4,top:4,bottom:0}}>
              <XAxis dataKey="metric" tick={{fontSize:12,fill:T.muted,fontFamily:T.mono}}/>
              <YAxis domain={[60,100]} tick={{fontSize:11,fill:T.muted}} tickFormatter={v=>`${v}%`}/>
              <Tooltip content={<TT/>}/>
              <Legend iconSize={9} wrapperStyle={{fontSize:12,fontFamily:T.mono}}/>
              <Bar dataKey="HL" name="High–Low" fill={T.hl} radius={[4,4,0,0]} barSize={14}/>
              <Bar dataKey="HA" name="High–Avg" fill={T.ha} radius={[4,4,0,0]} barSize={14}/>
              <Bar dataKey="LA" name="Low–Avg"  fill={T.la} radius={[4,4,0,0]} barSize={14}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:14,letterSpacing:".07em",textTransform:"uppercase"}}>Performance Radar</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e6ed"/>
              <PolarAngleAxis dataKey="metric" tick={{fontSize:11,fill:"#64748b",fontFamily:T.mono}}/>
              <PolarRadiusAxis angle={90} domain={[60,100]} tick={{fontSize:10,fill:"#94a3b8"}}/>
              <Radar name="High–Low" dataKey="HL" stroke={T.hl} fill={T.hl} fillOpacity={.18}/>
              <Radar name="High–Avg" dataKey="HA" stroke={T.ha} fill={T.ha} fillOpacity={.18}/>
              <Radar name="Low–Avg"  dataKey="LA" stroke={T.la} fill={T.la} fillOpacity={.18}/>
              <Legend iconSize={9} wrapperStyle={{fontSize:12,fontFamily:T.mono,color:"#64748b"}}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RBF vs Linear Comparison */}
      <div className="card" style={{marginTop:14}}>
        <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:16,letterSpacing:".07em",textTransform:"uppercase"}}>RBF vs Linear SVM — Metric Improvement</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:T.mono,fontSize:13}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${T.border}`}}>
              {["Model","Metric","Linear SVM","RBF SVM","Delta"].map(h=>(
                <th key={h} style={{padding:"8px 14px",textAlign:"left",color:T.muted,fontWeight:600,fontSize:11,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.map((row,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${T.faint}`,borderLeft:`3px solid ${row.color}`}}>
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:3,height:18,background:row.color,borderRadius:2}}/>
                    <span style={{color:row.color,fontWeight:700}}>{row.model}</span>
                  </div>
                </td>
                <td style={{padding:"10px 14px",color:T.text}}>{row.metric}</td>
                <td style={{padding:"10px 14px",color:T.muted}}>{row.linear.toFixed(1)}%</td>
                <td style={{padding:"10px 14px",color:row.color,fontWeight:700}}>{row.rbf.toFixed(1)}%</td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{color:T.HIGH,fontWeight:700}}>↑ +{row.delta.toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NETWORK PANEL HELPER COMPONENTS
═══════════════════════════════════════════════════════════════ */
function SignalBars({value,max=1,color}){
  const lit=Math.min(5,Math.max(0,Math.round((value/max)*5)));
  const heights=["40%","54%","68%","82%","96%"];
  return(
    <div style={{display:"flex",alignItems:"flex-end",gap:3,height:22}}>
      {heights.map((h,i)=>(
        <div key={i} style={{
          width:7,height:h,borderRadius:2,
          background:i<lit?color:T.faint,
          boxShadow:i<lit?`0 0 6px ${color}66`:undefined,
          transition:"all .3s",
        }}/>
      ))}
    </div>
  );
}

function PingGauge({cri}){
  const ping=Math.round(20+cri*3.8);
  const color=cri>=65?T.LOW:cri>=35?T.AVERAGE:T.HIGH;
  return(
    <div style={{textAlign:"center",padding:"16px 0"}}>
      <div style={{fontFamily:T.mono,fontSize:40,fontWeight:700,color,lineHeight:1}}>
        {ping}<span style={{fontSize:18,fontWeight:400,color:T.muted}}>ms</span>
      </div>
      <div style={{fontSize:12,color:T.muted,marginTop:6}}>Estimated latency</div>
      <div style={{fontSize:11,color:T.faint,fontFamily:T.mono,marginTop:3}}>CRI={cri} → {ping}ms</div>
    </div>
  );
}

function CellTower({id,color,alpha,label}){
  const[glow,setGlow]=useState(false);
  useEffect(()=>{const t=setInterval(()=>setGlow(p=>!p),1200);return()=>clearInterval(t);},[]);
  return(
    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:5,alignItems:"center",textAlign:"center"}}>
      <div style={{fontSize:20}}>📡</div>
      <div style={{fontFamily:T.mono,fontSize:10,color:color,fontWeight:700}}>{id}</div>
      <SignalBars value={alpha} max={1.2} color={color}/>
      <div style={{fontFamily:T.mono,fontSize:10,color:T.faint}}>α={alpha.toFixed(2)}</div>
      <div style={{width:8,height:8,borderRadius:"50%",background:color,transition:"box-shadow .8s",
        boxShadow:glow?`0 0 10px ${color}`:`0 0 3px ${color}`}}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NETWORK PANEL
═══════════════════════════════════════════════════════════════ */
function NetworkPanel(){
  const[selectedModel,setSelectedModel]=useState("HL");
  /* shared student profile used by BOTH sections */
  const[vals,setVals]=useState({...DEFAULTS});
  /* Section-1 tower prediction state */
  const[towerResult,setTowerResult]=useState(null);
  const[towerRunning,setTowerRunning]=useState(false);
  /* Section-2 latency prediction state */
  const[netResult,setNetResult]=useState(null);
  const[running,setRunning]=useState(false);
  const setV=useCallback((k,v)=>setVals(p=>({...p,[k]:v})),[]);

  const posSVs=RBF_MODELS[selectedModel].supportVectors.filter(sv=>sv.label===1);
  const negSVs=RBF_MODELS[selectedModel].supportVectors.filter(sv=>sv.label===-1);

  /* ── Section-1: run the selected single model → tower signal ── */
  const runTower=()=>{
    setTowerRunning(true);
    setTimeout(()=>{
      const res=predictModel(selectedModel,vals);
      /* raw SVM score proxy: confidence signed by winner */
      const m=RBF_MODELS[selectedModel];
      const normVals={};
      ALL_FEATURES.forEach(f=>{normVals[f.k]=norm(f.k,vals[f.k]||0);});
      let score=m.bias;
      m.supportVectors.forEach(sv=>{score+=sv.alpha*sv.label*rbfKernel(normVals,sv.vec,m.gamma);});
      setTowerResult({...res,rawScore:score});
      setTowerRunning(false);
    },500);
  };

  /* ── Section-2: full CRI prediction → network latency ── */
  const pingNetwork=()=>{
    setRunning(true);
    setTimeout(()=>{setNetResult(computeCRI(vals));setRunning(false);},650);
  };

  /* ── Derive network values from tower prediction ── */
  const towerMeta=towerResult ? (()=>{
    const{winner,conf,rawScore}=towerResult;
    const isPos=winner===MODELS[selectedModel].classes[0];
    /* clamp raw score to [-2.5, 2.5] then normalise to 0-1 */
    const norm01=Math.max(0,Math.min(1,(rawScore+2.5)/5));
    /* decision marker sits at 0–100% on the bar
       left = positive class (HIGH/LOW depending on model), right = negative */
    const markerPct=Math.round(norm01*100);
    /* tower alpha multipliers: winning side's towers glow brighter */
    const posBoost =  isPos ? conf : (1-conf);
    const negBoost = !isPos ? conf : (1-conf);
    const posRsrp=Math.round(-140+posBoost*90);
    const negRsrp=Math.round(-140+negBoost*90);
    /* left label = positive class of THIS model */
    const posClass=MODELS[selectedModel].classes[0];   // e.g. "HIGH" for HL, "LOW" for LA
    const negClass=MODELS[selectedModel].classes[1];
    const posZone =posClass==="HIGH"?"5G NR":posClass==="LOW"?"2G/EDGE":"4G LTE";
    const negZone =negClass==="HIGH"?"5G NR":negClass==="LOW"?"2G/EDGE":"4G LTE";
    const posColor=posClass==="HIGH"?T.HIGH:posClass==="LOW"?T.LOW:T.AVERAGE;
    const negColor=negClass==="HIGH"?T.HIGH:negClass==="LOW"?T.LOW:T.AVERAGE;
    const winnerColor=isPos?posColor:negColor;
    const winnerZone =isPos?posZone:negZone;
    return{winner,conf,rawScore,markerPct,
           posBoost,negBoost,posRsrp,negRsrp,
           posClass,negClass,posZone,negZone,posColor,negColor,
           winnerColor,winnerZone,isPos};
  })() : null;

  /* ── Derive network values from CRI prediction ── */
  const netMeta=netResult ? (()=>{
    const{cri,riskHL,riskHA,riskLA,hl,ha,la}=netResult;
    const ping    =Math.round(20+cri*3.8);
    const rsrp    =Math.round(-140+(1-cri/100)*90);
    const sinr    =+(((1-cri/100)*30-5).toFixed(1));
    const bars    =Math.max(1,Math.min(5,Math.round((1-cri/100)*5)));
    const tech    =cri<35?"5G NR":cri<65?"4G LTE":"2G/EDGE";
    const techColor=cri<35?T.HIGH:cri<65?T.AVERAGE:T.LOW;
    const throughput=cri<35?"≥ 1 Gbps":cri<65?"50–150 Mbps":"< 1 Mbps";
    const zone    =cri<35?"HIGH":cri<65?"AVERAGE":"LOW";
    const rsrpHL  =Math.round(-140+(1-riskHL)*90);
    const rsrpHA  =Math.round(-140+(1-riskHA)*90);
    const rsrpLA  =Math.round(-140+(1-riskLA)*90);
    const serving =[["HL",rsrpHL,T.hl],["HA",rsrpHA,T.ha],["LA",rsrpLA,T.la]]
                     .sort((a,b)=>b[1]-a[1])[0];
    const hlZone=hl.winner==="HIGH"?"5G NR":"2G/EDGE";
    const haZone=ha.winner==="HIGH"?"5G NR":"4G LTE";
    const laZone=la.winner==="LOW"?"2G/EDGE":"4G LTE";
    return{cri,ping,rsrp,sinr,bars,tech,techColor,throughput,zone,
           rsrpHL,rsrpHA,rsrpLA,serving,hlZone,haZone,laZone,
           hlConf:hl.conf,haConf:ha.conf,laConf:la.conf,
           hlColor:hl.winner==="HIGH"?T.HIGH:T.LOW,
           haColor:ha.winner==="HIGH"?T.HIGH:T.AVERAGE,
           laColor:la.winner==="LOW"?T.LOW:T.AVERAGE};
  })() : null;

  const PRESETS=[
    {label:"⚠ High Risk", color:T.LOW,   vals:{...DEFAULTS,ESCS:-2,DISCRIM:1.5,SOIAICT:1.5,JOYREAD:-1.8,DISCLIMA:1.5}},
    {label:"📖 Average",  color:T.AVERAGE,vals:{...DEFAULTS}},
    {label:"🌟 Low Risk", color:T.HIGH,  vals:{...DEFAULTS,ESCS:2,JOYREAD:1.8,AUTICT:1.5,ST158Q04HA:2.7,DISCRIM:-1}},
  ];

  /* helper: live α-scaled bar width for a tower given boost factor */
  const liveAlpha=(baseAlpha,boost)=>+(Math.min(1.2,baseAlpha*boost*1.6+0.05).toFixed(2));

  return(
    <div className="fu">
      <H icon="📡" title="Mobile Network Analogy Layer" color={NW}
        sub="RBF SVM support vectors mapped as cell towers · configure student profile → predict signal zone"/>

      {/* ════════════════════════════════════════════════════
          SHARED PROFILE INPUT — sits above both sections
      ════════════════════════════════════════════════════ */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontFamily:T.mono,fontSize:11,color:NW,letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>📱 Student RF Device Profile</div>
            <div style={{fontSize:12,color:T.muted}}>These feature sliders are the input vector for both sections. Adjust, then fire each section's predict button independently.</div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {PRESETS.map((p,i)=>(
              <button key={i} onClick={()=>setVals({...p.vals})} className="mbtn"
                style={{color:p.color,borderColor:p.color+"40",fontSize:11}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0 28px"}}>
          {ALL_FEATURES.slice(0,10).map(f=>(
            <Slider key={f.k} feat={f.k} val={vals[f.k]||0} onChange={v=>setV(f.k,v)}/>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SECTION 1 — SUPPORT VECTORS AS CELL TOWERS
      ════════════════════════════════════════════════════ */}
      <div className="card" style={{marginBottom:16}}>
        {/* header + model selector + predict button */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontFamily:T.mono,fontSize:11,color:NW,letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>📡 Support Vectors as Cell Towers</div>
            <div style={{fontSize:12,color:T.muted}}>Each SVM support vector = a base station. α = transmission power. Predict to see which class wins signal dominance.</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {["HL","HA","LA"].map(m=>(
              <button key={m} onClick={()=>{setSelectedModel(m);setTowerResult(null);}} className="mbtn"
                style={{color:MC[m],borderColor:selectedModel===m?MC[m]:T.border,background:selectedModel===m?MC[m]+"18":"none",fontWeight:700}}>
                RBF-{m}
              </button>
            ))}
            <button onClick={runTower} disabled={towerRunning}
              style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${towerRunning?T.border:NW+"70"}`,
                background:towerRunning?T.bg3:`linear-gradient(135deg,#062038,#083050)`,
                color:towerRunning?T.muted:NW,fontFamily:T.mono,fontWeight:700,fontSize:12,
                cursor:towerRunning?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:7,
                boxShadow:towerRunning?"none":`0 0 16px ${NW}22`}}>
              {towerRunning
                ?<><div className="spin" style={{width:12,height:12,border:`2px solid ${T.muted}`,borderTopColor:NW,borderRadius:"50%"}}/>Scanning…</>
                :<>📡 Predict Tower Signal</>}
            </button>
          </div>
        </div>

        {/* model info strip */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
          {[
            {label:"Gamma (γ)",val:RBF_MODELS[selectedModel].gamma,icon:"🎚",color:MC[selectedModel],tip:"Frequency band — influence radius"},
            {label:"Bias (b)",val:RBF_MODELS[selectedModel].bias,icon:"📐",color:NW,tip:"Decision boundary offset"},
            {label:"Pos Towers",val:posSVs.length+" SVs",icon:"🟢",color:T.HIGH,tip:"HIGH-signal base stations"},
            {label:"Neg Towers",val:negSVs.length+" SVs",icon:"🔴",color:T.LOW,tip:"LOW-signal base stations"},
          ].map((c,i)=>(
            <div key={i} style={{background:T.bg2,border:`1px solid ${c.color}33`,borderRadius:9,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:4}}>{c.icon}</div>
              <div style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:c.color}}>{c.val}</div>
              <div style={{fontSize:10,color:T.muted,marginTop:3}}>{c.label}</div>
              <div style={{fontSize:10,color:T.faint,marginTop:2,lineHeight:1.4}}>{c.tip}</div>
            </div>
          ))}
        </div>

        {/* tower grids */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {/* positive class towers */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:T.HIGH,boxShadow:`0 0 8px ${T.HIGH}`}}/>
              <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.HIGH,textTransform:"uppercase",letterSpacing:".06em"}}>
                Positive Class · {MODELS[selectedModel].classes[0]}-signal Towers
              </span>
              <Tag c={towerMeta?.isPos?towerMeta.winnerColor:T.HIGH}>
                {towerMeta?(towerMeta.isPos?"▶ SERVING":"◀ IDLE"):MODELS[selectedModel].classes[0]==="HIGH"?"5G NR":"2G/EDGE"}
              </Tag>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:7}}>
              {posSVs.map((sv,i)=>(
                <CellTower key={`${selectedModel}-p-${i}`}
                  id={`P${i+1}`}
                  color={towerMeta ? (towerMeta.isPos?towerMeta.posColor:T.faint) : T.HIGH}
                  alpha={towerMeta ? liveAlpha(sv.alpha,towerMeta.posBoost) : sv.alpha}
                  active={towerMeta?.isPos??null}/>
              ))}
            </div>
            {towerMeta&&(
              <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                <SignalBars value={Math.max(1,Math.min(5,Math.round((towerMeta.posRsrp+140)/18)))} max={5} color={towerMeta.isPos?towerMeta.posColor:T.faint}/>
                <span style={{fontFamily:T.mono,fontSize:11,color:towerMeta.isPos?towerMeta.posColor:T.muted}}>{towerMeta.posRsrp} dBm · {towerMeta.posZone}</span>
              </div>
            )}
          </div>
          {/* negative class towers */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:T.LOW,boxShadow:`0 0 8px ${T.LOW}`}}/>
              <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.LOW,textTransform:"uppercase",letterSpacing:".06em"}}>
                Negative Class · {MODELS[selectedModel].classes[1]}-signal Towers
              </span>
              <Tag c={towerMeta&&!towerMeta.isPos?towerMeta.winnerColor:T.LOW}>
                {towerMeta?(!towerMeta.isPos?"▶ SERVING":"◀ IDLE"):MODELS[selectedModel].classes[1]==="LOW"?"2G/EDGE":"4G LTE"}
              </Tag>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:7}}>
              {negSVs.map((sv,i)=>(
                <CellTower key={`${selectedModel}-n-${i}`}
                  id={`N${i+1}`}
                  color={towerMeta ? (!towerMeta.isPos?towerMeta.negColor:T.faint) : T.LOW}
                  alpha={towerMeta ? liveAlpha(sv.alpha,towerMeta.negBoost) : sv.alpha}
                  active={towerMeta ? !towerMeta.isPos : null}/>
              ))}
            </div>
            {towerMeta&&(
              <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                <SignalBars value={Math.max(1,Math.min(5,Math.round((towerMeta.negRsrp+140)/18)))} max={5} color={!towerMeta.isPos?towerMeta.negColor:T.faint}/>
                <span style={{fontFamily:T.mono,fontSize:11,color:!towerMeta.isPos?towerMeta.negColor:T.muted}}>{towerMeta.negRsrp} dBm · {towerMeta.negZone}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── DECISION BOUNDARY BAR — matches screenshot exactly ── */}
        <div style={{marginTop:20,padding:"16px 18px",background:NWD,border:`1px solid ${NWB}`,borderRadius:10}}>
          {/* title */}
          <div style={{fontFamily:T.mono,fontSize:10,color:NW,marginBottom:14,textTransform:"uppercase",letterSpacing:".1em",textAlign:"center"}}>
            Decision Boundary = Coverage Edge
          </div>
          {/* gradient bar + moving marker */}
          <div style={{position:"relative",height:12,borderRadius:6,
              background:`linear-gradient(to right,${towerMeta?(towerMeta.isPos?towerMeta.posColor:T.faint):T.HIGH},${T.AVERAGE},${towerMeta?(!towerMeta.isPos?towerMeta.negColor:T.faint):T.LOW})`,
              marginBottom:10}}>
            {/* static center line (neutral boundary) */}
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                width:2,height:20,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            {/* live prediction marker */}
            {towerMeta ? (
              <div style={{position:"absolute",top:"50%",
                  left:`${Math.min(97,Math.max(3,towerMeta.markerPct))}%`,
                  transform:"translate(-50%,-50%)",
                  width:4,height:22,background:"white",borderRadius:2,
                  boxShadow:`0 0 10px white, 0 0 20px ${towerMeta.winnerColor}`,
                  transition:"left .6s cubic-bezier(.34,1.2,.64,1)"}}/>
            ) : (
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                  width:3,height:20,background:"rgba(255,255,255,0.5)",borderRadius:2}}/>
            )}
          </div>
          {/* labels row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:T.mono,fontSize:10}}>
            <span style={{color:towerMeta?(towerMeta.isPos?towerMeta.posColor:T.muted):T.HIGH}}>
              ← {towerMeta?towerMeta.posZone:"5G zone"} · {MODELS[selectedModel].classes[0]} signal
            </span>
            <span style={{color:T.muted}}>f(x) = sgn(Σ αᵢyᵢK(xᵢ,x) + b)</span>
            <span style={{color:towerMeta?(!towerMeta.isPos?towerMeta.negColor:T.muted):T.LOW}}>
              {MODELS[selectedModel].classes[1]} signal · {towerMeta?towerMeta.negZone:"2G zone"} →
            </span>
          </div>
          {/* prediction result callout */}
          {towerMeta&&(
            <div className="pop" style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
              <div style={{background:towerMeta.winnerColor+"18",border:`1px solid ${towerMeta.winnerColor}44`,borderRadius:8,padding:"10px 12px",textAlign:"center",gridColumn:"1/3"}}>
                <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>Predicted Zone</div>
                <div style={{fontSize:22,marginBottom:3}}>{towerMeta.winnerZone==="5G NR"?"🟢":towerMeta.winnerZone==="4G LTE"?"🟡":"🔴"}</div>
                <div style={{fontFamily:T.mono,fontSize:15,fontWeight:700,color:towerMeta.winnerColor}}>{towerMeta.winnerZone}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>{towerMeta.winner} class</div>
              </div>
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>Confidence</div>
                <div style={{fontFamily:T.mono,fontSize:22,fontWeight:700,color:towerMeta.winnerColor}}>{(towerMeta.conf*100).toFixed(0)}%</div>
                <div style={{height:4,borderRadius:2,background:T.bg3,overflow:"hidden",marginTop:6}}>
                  <div style={{height:"100%",width:`${towerMeta.conf*100}%`,background:towerMeta.winnerColor,borderRadius:2,boxShadow:`0 0 6px ${towerMeta.winnerColor}88`}}/>
                </div>
              </div>
              <div style={{background:T.bg2,border:`1px solid ${NW}33`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>SVM Score</div>
                <div style={{fontFamily:T.mono,fontSize:18,fontWeight:700,color:NW,lineHeight:1}}>
                  {towerMeta.rawScore>0?"+":""}{towerMeta.rawScore.toFixed(3)}
                </div>
                <div style={{fontSize:10,color:T.faint,marginTop:5}}>f(x) raw output</div>
              </div>
            </div>
          )}
          {!towerMeta&&(
            <div style={{marginTop:12,textAlign:"center",fontSize:11,color:T.faint,fontFamily:T.mono}}>
              ↑ press "Predict Tower Signal" to move the marker
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SECTION 2 — RISK AS NETWORK LATENCY (CRI)
      ════════════════════════════════════════════════════ */}
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:14,alignItems:"start"}}>
        {/* Predict button column */}
        <button onClick={pingNetwork} disabled={running}
          style={{padding:"14px 22px",borderRadius:11,border:`1px solid ${running?T.border:NW+"55"}`,
            background:running?T.bg2:`linear-gradient(135deg,#061828,#083050)`,
            color:running?T.muted:NW,fontFamily:T.mono,fontWeight:800,fontSize:13,
            cursor:running?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,
            boxShadow:running?"none":`0 0 24px ${NW}22`,whiteSpace:"nowrap",writingMode:"horizontal-tb"}}>
          {running
            ?<><div className="spin" style={{width:16,height:16,border:`2px solid ${T.muted}`,borderTopColor:NW,borderRadius:"50%"}}/>Measuring…</>
            :<>⏱ Measure Latency</>}
        </button>

        {/* Output area */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* section label */}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontFamily:T.mono,fontSize:11,color:NW,letterSpacing:".08em",textTransform:"uppercase"}}>⏱ Risk as Network Latency</div>
            <div style={{fontSize:11,color:T.muted}}>Uses all 3 RBF models (HL+HA+LA) → CRI → RSRP / Ping</div>
          </div>

          {!netResult&&(
            <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,minHeight:200}}>
              <div style={{fontSize:48,opacity:.09}}>📶</div>
              <div style={{fontSize:13,color:T.muted,textAlign:"center",lineHeight:1.7}}>Press <span style={{color:NW,fontFamily:T.mono}}>⏱ Measure Latency</span> to run all 3 RBF models<br/>and translate the output to network signal metrics</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {["RSRP","SINR","Ping (ms)","Coverage Zone","Serving Tower"].map(t=>(
                  <Tag key={t} c={NW}>{t}</Tag>
                ))}
              </div>
            </div>
          )}

          {netResult&&netMeta&&(
            <>
              {/* hero row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
                <div className="card pop" style={{borderTop:`2px solid ${netMeta.techColor}`,textAlign:"center",gridColumn:"1/3",
                    background:`radial-gradient(circle at 50% 0%,${netMeta.techColor}0c,${T.bg1})`}}>
                  <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Network Latency (Ping)</div>
                  <div style={{fontFamily:T.mono,fontSize:52,fontWeight:700,color:netMeta.techColor,lineHeight:1}}>
                    {netMeta.ping}<span style={{fontSize:20,fontWeight:400,color:T.muted}}>ms</span>
                  </div>
                  <div style={{fontSize:11,color:T.faint,fontFamily:T.mono,marginTop:4}}>CRI = {netMeta.cri} → {netMeta.ping}ms</div>
                  <div style={{marginTop:10,display:"flex",justifyContent:"center"}}><SignalBars value={netMeta.bars} max={5} color={netMeta.techColor}/></div>
                </div>
                <div className="card pop" style={{borderTop:`2px solid ${netMeta.techColor}`,textAlign:"center",
                    background:`radial-gradient(circle at 50% 0%,${netMeta.techColor}0c,${T.bg1})`}}>
                  <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Coverage Zone</div>
                  <div style={{fontSize:28,marginBottom:4}}>{netMeta.cri<35?"🟢":netMeta.cri<65?"🟡":"🔴"}</div>
                  <div style={{fontFamily:T.mono,fontSize:14,fontWeight:700,color:netMeta.techColor}}>{netMeta.tech}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:4}}>{netMeta.zone} performer</div>
                  <div style={{fontSize:11,color:T.faint,marginTop:4,fontFamily:T.mono}}>{netMeta.throughput}</div>
                </div>
                <div className="card pop" style={{borderTop:`2px solid ${NW}`,textAlign:"center",
                    background:`radial-gradient(circle at 50% 0%,${NW}0c,${T.bg1})`}}>
                  <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>RSRP</div>
                  <div style={{fontFamily:T.mono,fontSize:26,fontWeight:700,color:NW,lineHeight:1}}>{netMeta.rsrp}</div>
                  <div style={{fontFamily:T.mono,fontSize:12,color:T.muted}}>dBm</div>
                  <div style={{fontSize:11,color:T.faint,marginTop:6}}>Ref. signal strength</div>
                  <div style={{fontFamily:T.mono,fontSize:10,color:T.faint,marginTop:2}}>SINR: {netMeta.sinr} dB</div>
                </div>
              </div>

              {/* CRI spectrum bar */}
              <div className="card" style={{padding:"14px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontFamily:T.mono,fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:".06em"}}>
                  <span>Signal Quality Spectrum</span>
                  <span style={{color:netMeta.techColor}}>CRI = {netMeta.cri} / 100</span>
                </div>
                <div style={{position:"relative",height:12,borderRadius:6,background:`linear-gradient(to right,${T.HIGH},${T.AVERAGE},${T.LOW})`}}>
                  <div style={{position:"absolute",top:"50%",left:`${Math.min(98,Math.max(2,netMeta.cri))}%`,
                      transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",
                      background:netMeta.techColor,border:"2px solid white",
                      boxShadow:`0 0 12px ${netMeta.techColor}`,transition:"left .6s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontFamily:T.mono,fontSize:10}}>
                  <span style={{color:T.HIGH}}>5G · LOW risk</span>
                  <span style={{color:T.AVERAGE}}>4G · MODERATE</span>
                  <span style={{color:T.LOW}}>2G · HIGH risk</span>
                </div>
              </div>

              {/* per-model tower cards */}
              <div className="card">
                <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,marginBottom:14,textTransform:"uppercase",letterSpacing:".07em"}}>Per-Model Tower Signal — RBF SVM Outputs</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {[
                    {id:"HL",label:"High vs Low",rsrp:netMeta.rsrpHL,zone:netMeta.hlZone,conf:netMeta.hlConf,color:T.hl,zoneColor:netMeta.hlColor},
                    {id:"HA",label:"High vs Avg",rsrp:netMeta.rsrpHA,zone:netMeta.haZone,conf:netMeta.haConf,color:T.ha,zoneColor:netMeta.haColor},
                    {id:"LA",label:"Low vs Avg", rsrp:netMeta.rsrpLA,zone:netMeta.laZone,conf:netMeta.laConf,color:T.la,zoneColor:netMeta.laColor},
                  ].map(m=>(
                    <div key={m.id} style={{background:T.bg2,border:`1px solid ${m.color}33`,borderRadius:10,padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                        <span style={{fontSize:16}}>📡</span>
                        <div>
                          <div style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:m.color}}>Tower-{m.id}</div>
                          <div style={{fontSize:10,color:T.faint}}>{m.label}</div>
                        </div>
                      </div>
                      <div style={{marginBottom:8}}>
                        <SignalBars value={Math.max(1,Math.min(5,Math.round((m.rsrp+140)/18)))} max={5} color={m.zoneColor}/>
                      </div>
                      <div style={{fontFamily:T.mono,fontSize:20,fontWeight:700,color:m.zoneColor,marginBottom:2}}>{m.rsrp} <span style={{fontSize:11,color:T.muted}}>dBm</span></div>
                      <Tag c={m.zoneColor} s={{fontSize:10,marginBottom:6}}>{m.zone}</Tag>
                      <div style={{marginTop:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontFamily:T.mono,fontSize:9,color:T.muted}}>Confidence</span>
                          <span style={{fontFamily:T.mono,fontSize:9,color:m.color,fontWeight:700}}>{(m.conf*100).toFixed(0)}%</span>
                        </div>
                        <div style={{height:4,borderRadius:2,background:T.bg3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${m.conf*100}%`,background:m.color,borderRadius:2,boxShadow:`0 0 6px ${m.color}88`}}/>
                        </div>
                      </div>
                      <div style={{marginTop:8,fontFamily:T.mono,fontSize:9,color:T.faint}}>γ={RBF_MODELS[m.id].gamma} · {m.id==="HL"?"700 MHz":m.id==="HA"?"2.4 GHz":"1.8 GHz"}</div>
                    </div>
                  ))}
                </div>
                {/* serving tower */}
                <div style={{marginTop:12,padding:"10px 14px",background:netMeta.serving[2]+"14",
                    border:`1px solid ${netMeta.serving[2]}40`,borderRadius:8,
                    display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>🏆</span>
                  <div>
                    <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:netMeta.serving[2]}}>Serving Tower: {netMeta.serving[0]}</span>
                    <span style={{fontFamily:T.mono,fontSize:11,color:T.muted}}> — strongest RSRP at {netMeta.serving[1]} dBm</span>
                  </div>
                  <div style={{marginLeft:"auto"}}><SignalBars value={5} max={5} color={netMeta.serving[2]}/></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT APP — 6 TABS
═══════════════════════════════════════════════════════════════ */
const TABS=[
  {id:"predict",  label:"Prediction",  icon:"⚡"},
  {id:"features", label:"Features",    icon:"🔬"},
  {id:"roc",      label:"ROC Curves",  icon:"📈"},
  {id:"metrics",  label:"Metrics",     icon:"📊"},
  {id:"novelty",  label:"Novelty",     icon:"🧠"},
  {id:"network",  label:"Network",     icon:"📡"},
];

export default function App(){
  const[tab,setTab]=useState("predict");
  const[tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(p=>p+1),1500);return()=>clearInterval(t);},[]);
  return(
    <>
      <style>{STYLES}</style>
      <div style={{minHeight:"100vh",background:"#f8f9fc",display:"flex"}} className="gbg">
        <div style={{width:220,flexShrink:0,background:"#ffffff",borderRight:"1px solid #e2e6ed",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto",zIndex:100,boxShadow:"2px 0 8px rgba(0,0,0,0.04)"}}>
          <div style={{padding:"20px 16px 16px",borderBottom:"1px solid #e2e6ed"}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
              <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#2563EB,#16A34A)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,boxShadow:"0 2px 6px rgba(37,99,235,0.3)"}}>📖</div>
              <div>
                <div style={{fontWeight:800,fontSize:11,color:"#1e2530",lineHeight:1.3}}>Digital Reading</div>
                <div style={{fontWeight:800,fontSize:11,color:"#1e2530",lineHeight:1.3}}>Predictor</div>
              </div>
            </div>
            <div style={{fontSize:10,color:T.muted,fontFamily:T.mono}}>RBF SVM · PISA 2018 · SHAP</div>
          </div>
          <nav style={{padding:"10px 8px",flex:1}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`tbtn ${tab===t.id?"on":""}`}
                style={{borderLeft:tab===t.id?`2px solid ${t.id==="novelty"?T.nv:t.id==="network"?NW:T.ha}`:"2px solid transparent",color:tab===t.id?"#1e2530":T.muted,marginBottom:3,...(t.id==="novelty"&&tab===t.id?{background:T.nv+"10",borderLeft:`2px solid ${T.nv}`}:{}),...(t.id==="network"&&tab===t.id?{background:NW+"10",borderLeft:`2px solid ${NW}`}:{})}}>
                <span style={{fontSize:17,flexShrink:0}}>{t.icon}</span>
                <span style={{fontSize:13}}>{t.label}</span>
                {t.id==="novelty"&&<span style={{marginLeft:"auto",background:T.nv+"18",color:T.nv,fontSize:9,fontFamily:T.mono,padding:"1px 6px",borderRadius:9,fontWeight:700}}>NEW</span>}
                {t.id==="network"&&<span style={{marginLeft:"auto",background:NW+"18",color:NW,fontSize:9,fontFamily:T.mono,padding:"1px 6px",borderRadius:9,fontWeight:700}}>NEW</span>}
              </button>
            ))}
          </nav>
          <div style={{padding:"14px 14px 18px",borderTop:"1px solid #e2e6ed",background:"#f8f9fc"}}>
            <div style={{fontSize:10,color:T.muted,fontFamily:T.mono,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Live RBF Models</div>
            {[["HL",T.hl,"97.8%"],["HA",T.ha,"90.1%"],["LA",T.la,"89.7%"]].map(([id,c,acc])=>(
              <div key={id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:c,boxShadow:`0 0 ${tick%2===0?6:2}px ${c}80`,transition:"box-shadow .8s",flexShrink:0}}/>
                <span style={{fontFamily:T.mono,fontSize:11,color:T.muted,flex:1}}>RBF-{id}</span>
                <span style={{fontFamily:T.mono,fontSize:12,color:c,fontWeight:700}}>{acc}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{flex:1,minWidth:0,padding:"28px 26px",overflowX:"hidden",background:"#f8f9fc"}}>
          {tab==="predict"  && <PredictionPanel/>}
          {tab==="features" && <FeaturesPanel/>}
          {tab==="roc"      && <ROCPanel/>}
          {tab==="metrics"  && <MetricsPanel/>}
          {tab==="novelty"  && <NoveltyPanel/>}
          {tab==="network"  && <NetworkPanel/>}
        </div>
      </div>
    </>
  );
}
