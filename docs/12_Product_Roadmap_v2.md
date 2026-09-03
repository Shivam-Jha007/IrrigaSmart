# 11_Product_Roadmap_v2.md

# IrrigaSmart

## Product Evolution Roadmap

Version: 2.0

Status: Planning

---

# Purpose

This document defines the planned evolution of IrrigaSmart beyond the MVP.

The MVP focuses on providing offline-first irrigation recommendations using weather data, farm information, and agronomic knowledge.

Future versions improve usability, recommendation quality, regional relevance, and intelligent decision support while preserving the existing architecture.

---

# Product Vision

IrrigaSmart aims to become an intelligent farm decision-support platform capable of assisting farmers with irrigation planning, resource optimization, and future agricultural recommendations.

The system shall remain:

- Explainable
- Offline-first
- Low-bandwidth friendly
- Modular
- Extensible

---

# Version 1.1 — Usability & Accessibility

Objective

Reduce friction for farmers while improving accessibility.

---

## Feature 1 — Smart Farm Location

### Objective

Eliminate manual coordinate entry.

### Features

- Use browser GPS location
- Reverse geocoding
- Auto-fill:
  - Latitude
  - Longitude
  - Village
  - District
  - State

### Optional Enhancement

Suggest soil type using publicly available soil maps.

The suggested soil type must always be confirmed by the user.

### Benefits

- Faster farm registration
- Fewer user errors
- Improved recommendation accuracy

---

## Feature 2 — Multi-language Support

### Supported Languages

- English
- Hindi
- Bengali

### Scope

Translate:

- Dashboard
- Recommendations
- Forms
- Alerts
- History
- Settings

User language preference shall be stored locally.

---

## Feature 3 — Enhanced Farm Dashboard

Support multiple farms.

Each farm card displays:

- Farm Name
- Crop
- Growth Stage
- Soil Type
- Today's Recommendation
- Confidence
- Last Weather Update

Dashboard shall support quick farm switching.

---

# Version 1.2 — Smarter Decision Support

Objective

Improve recommendation quality and explainability.

---

## Feature 4 — Recommendation Factors

Every recommendation shall include:

Decision Factors

- Crop
- Growth Stage
- Temperature
- Rainfall
- Humidity
- Wind
- Soil Type
- Irrigation Method

Each factor should indicate its relative influence on the recommendation.

---

## Feature 5 — Multi-Day Irrigation Planning

Instead of recommending only today's irrigation schedule, the system shall provide recommendations for the upcoming 3–5 days.

Output includes:

- Recommended irrigation day
- Expected rainfall impact
- Planning notes
- Confidence

Purpose

Allow farmers to plan irrigation activities in advance.

---

## Feature 6 — Enhanced Decision Engine

Expand recommendation inputs.

Current Inputs

- Crop
- Growth Stage
- Soil Type
- Weather
- Irrigation Method

Future Inputs

- Historical rainfall
- Consecutive dry days
- Temperature trends
- Wind trends
- Relative humidity
- Seasonal patterns
- Regional knowledge

Future agricultural inputs may include:

- Fertilizer application dates
- Pesticide application dates
- Crop stress indicators

The Decision Engine shall remain fully explainable.

---
## Feature 6.5 — Welcome & Learning Experience

### Objective

Introduce new users to IrrigaSmart before they begin using the application.

The onboarding experience shall explain the platform's purpose, capabilities, and limitations in simple, farmer-friendly language.

---

### Welcome Screen

Display

- IrrigaSmart logo
- Tagline
- "Get Started"

Example

"IrrigaSmart helps you make better irrigation decisions using weather, crop information, and agricultural knowledge."

---

### About IrrigaSmart

Explain

- Why the platform was created
- Offline-first capability
- Weather-based recommendations
- Explainable recommendations
- Farmer-focused design

---

### How It Works

Illustrate the workflow

Add Farm

↓

Weather

↓

Decision Engine

↓

Recommendation

↓

Explanation

Use simple icons instead of technical diagrams.

---

### Why Trust the Recommendation

Explain

The recommendation considers

- Crop
- Growth Stage
- Soil
- Weather
- Irrigation Method

Every recommendation includes an explanation.

The system supports decision-making rather than replacing farmer experience.

---

### Offline Support

Explain

The application stores farm information locally.

Previously retrieved weather data remains available when internet connectivity is unavailable.

---

### Privacy

Explain

Farm information remains on the user's device during the MVP.

No personal information is shared.

---

### Getting Started

Guide the user through

1. Add Farm

2. Select Crop

3. Choose Soil

4. Receive Recommendation
# Version 2.0 — Farmer Companion

Objective

Provide continuous farm assistance.

---

## Feature 7 — Smart Notifications

Support scheduled reminders.

Notification examples

- Irrigation reminder
- Rainfall warning
- Weather change notification

Preferred implementation

- Progressive Web App notifications

Optional

- SMS reminders

Notification scheduling shall be based on recommendation timing.

---

## Feature 8 — Regional Agricultural Knowledge

Improve recommendations using regional datasets.

Potential datasets include:

- Historical rainfall
- Soil maps
- Groundwater availability
- Crop calendars
- Regional irrigation guidelines
- Seasonal climate trends

The system shall continue operating offline using locally cached datasets whenever possible.

---

# Version 2.1 — User Accounts

Objective

Enable personalized farm management.

Features

- Authentication
- Secure login
- Multiple devices
- Cloud synchronization
- Backup & restore
- Personalized settings

Authentication is intentionally excluded from the MVP because it does not improve irrigation decision quality.

---

# Version 2.2 — Advisor Assistant

Objective

Turn the assistant from a rewording of the engine's output into a grounded farm advisor, without relaxing the boundaries that make its answers trustworthy.

---

## Feature — Quotable Official Fertilizer Schedule

The assistant (model path) may state exact fertilizer doses, manure, amendment, sulphur, micronutrient and split-timing lines when — and only when — they are transcriptions of the State Agriculture Department (West Bengal) soil-test-based fertilizer schedule that the Fertilizer tab already displays, resolved to the crop, variety, soil zone and fertility band the farmer selected. The model quotes them verbatim with attribution; it may never scale, combine, re-derive or invent a figure.

This amends the earlier assistant-level rule that the model may state no fertilizer or amendment quantity at all. The rule's purpose — no figure a farmer acts on that nothing in the app can reproduce — is preserved and strengthened by the change: the previous behaviour answered "how much fertilizer?" with a referral, while the app's own Fertilizer tab was displaying the exact official answer one screen away. The no-invention rule continues to cover everything outside a schedule line.

The chemical boundary is unchanged (docs/10 §10.2): no fungicide, pesticide or insecticide name, ever, on any path. Schedule lines name no plant-protection product.

---

## Feature — Persisted Fertilizer Selection

The variety and soil zone the farmer last selected on the Fertilizer tab persist on the farm's soil record (`fertilizerSelection`), alongside the existing `nutrientReading`. The selection is USER_PROVIDED and stores no crop: the assistant always resolves it against the farm's current crop, so a crop change can never leave a stale schedule attached.

---

## Feature — Crop Alternatives by pH

When a pH figure exists (map estimate or the farmer's own reading), the assistant receives the app's crops ranked by pH suitability, computed by the same `CROP_PH_RANGE` data the pH suitability card uses. The ranking is deterministic code; the model presents it and never re-ranks.

---

## Feature — Scouting-First Disease Answers

A disease or spray question ("what spray for purple blotch?") is no longer answered with a bare referral. Both answer paths now lead with the Knowledge Base's own scouting facts for the weather-named disease — where on the plant to look and what the signs look like (docs/10 §10.5) — then safe prevention practice (remove debris, improve drainage, avoid wetting leaves in the evening), then the on-device leaf-photo check ("Check a leaf photo" card, no internet), and end with a prepared referral: show the photo to the KVK or input dealer, who confirm and name what is approved for the crop stage.

The chemical boundary is unchanged: no product name, no dose, and no claim a disease is present. The offline rules carry the same scouting lines in all five languages, so a farmer with no signal gets the same actionable answer.

---

## Feature — Soil-Improvement Plans and Card Onboarding

"Your pH is out of range" is no longer the end of the answer. On both paths, a pH outside the crop's optimal band now produces a plan: the direction the pH must move, the usual correction family for that direction on these soils (lime or dolomite to raise pH, gypsum to lower it) with the amount-needs-a-soil-test caveat, and the pH-ranked crop alternatives as a second option. The offline fertility answer also quotes the resolved official schedule dose (with a pointer to the booklet's manure and timing lines on the Fertilizer tab) and closes with a confirm-with-KVK line instead of a refusal. "How do I improve my soil?" and its natural phrasings now route to this answer offline instead of falling through to the model.

A farmer who says they have a Soil Health Card or lab report — in any of the five languages — is shown the two ways to use it: send the numbers in the chat (they are parsed and interpreted, including low/high N-P-K classification), or enter them in the Fertilizer tab's soil-test mode, where they persist on the farm and drive the official schedule's fertility band. The Urdu translations of the soil-test answer family, previously missing, are added with this feature.

---

## Feature — Photo-Result Awareness

The assistant answers "what did the photo show?" from the most recent leaf-photo check on the Today screen, on both paths. The verdict sentence is PRE-WORDED by deterministic code (`photoCheckSummary`) from the same translation keys the card renders — "looks similar to X (N% similar)", never "has" — so the resemblance-not-diagnosis boundary holds by construction and neither the offline rule nor the model can re-word it into a claim. Non-results (unsure, unknown class, another plant's healthy class — docs/14 §5) contribute nothing; the assistant says no check has happened and how to take one. The result is session state, cleared when the selected farm changes, and never persisted.

The `photo` intent is matched before `disease` so a photo question is never answered from the weather risk, and it is answered with no farm data at all — the how-to needs none.

---

## Feature — Truthful Delay Explanations

The "Delay Irrigation" explanation used to end, for every soil, with "On {soil} soil this moisture stays available longer" — untrue for sandy soils, which hold the least water of any soil in the app. The sentence now branches (`LIGHT_SOILS` in `explanationText.ts`): light soils (Sandy, Sandy Loam) are told moisture drains quickly and to check the crop again tomorrow; water-holding soils are told the soil holds the moisture well. A dedicated test (`explanationText.test.ts`) walks every soil × language and fails if either half of the branch is applied to the wrong soil or if the old clause reappears.

---

## Feature — Reply Hygiene and Model

Provenance tokens (`[USER_PROVIDED]` and the rest of the §7 vocabulary) are stripped mechanically from every model reply, so a farmer can never see a bracketed label a small model failed to paraphrase. The default Gemini model moves from Flash-Lite to Flash: replies now quote schedules and compose short action lists, and Flash-Lite's weaker instruction-following produced the flat generic answers this version exists to fix. Flash-Lite remains available via `GEMINI_MODEL`.

---

## Feature — Interactive Answer Pack

The offline "what should I do today?" answer is now an action list: alongside the water figure it names the dashboard's top flagged issue, the weather-favoured disease with its where-to-look hint, and the saved official schedule when one resolved — every line a fact the dashboard already shows, so the two can never disagree, and every line omitted when its fact is absent. The chat panel's opener chips become context-aware (disease question promoted when the weather favours one, dose question when a schedule is saved, photo question after a check), and answers whose advice has a screen carry a deep-link button — the today-answer with a resolved schedule gets "Open the Fertilizer tab".

The chat panel itself moved from the Dashboard to the app shell, floating above every tab: a farmer who follows the bot's advice ("open the Fertilizer tab") can still ask the follow-up question when they get there. The Dashboard reports the engine outputs (selected farm, recommendation, weather, water progress, latest photo check) upward; the shell builds the bot's context from those plus the LIVE store profiles, so a fertilizer selection saved on the Fertilizer tab is in the bot's context immediately — location-independent by construction. The conversation persists across app restarts (IndexedDB v6, `assistantChat` store): a single transcript, capped at the newest 60 messages, restored on panel mount, written best-effort after every message so a storage failure costs history, never the chat. A suitable-pH "how do I improve my soil?" now leads with the soil's state and the good news that nothing needs correcting, with the soil test as the next step rather than a refusal.

---

## Feature — Knowledge Corpus (RAG Foundation)

The assistant route now retrieves from a knowledge corpus (`backend/src/knowledgeCorpus.ts`) transcribed from the app's own vetted sources: FAO-56 crop water behaviour, the extension-sourced crop pH optima, the disease scouting profiles with their infection windows, and the soil behaviour profiles. Retrieval is deterministic keyword scoring with multi-script keywords (Roman, Devanagari, Bengali/Assamese, Urdu), capped at three entries; matched entries are injected into the system prompt as an APP KNOWLEDGE section with each source named, and the model is instructed to ground its answer in them and cite the source rather than answer from general memory. An unmatched question retrieves nothing and the section is omitted — never an empty header. The §10.2 chemical restriction binds the corpus itself (tested), and extending it requires transcribing from the app's vetted data first: the module invents nothing.

---

## Feature — Soil & Water Tests in the Farm Form

The farm form gains an optional "I have soil / water test data" section (collapsed on a new farm, open when editing a farm that carries values, all fields independent and all in five languages): soil ECe and ESP, and irrigation-water ECw, SAR, boron, bicarbonate and pH. Every value is USER_PROVIDED and persists on the farm and soil records.

What each parameter DOES is decided by whether a defensible formula exists, not by symmetry:

- **ECw + ECe → the decision engine.** A new Step 6a (Decision Logic) applies the FAO-29 leaching requirement `LR = ECw / (5·ECe_threshold(crop) − ECw)` against per-crop tolerances transcribed from FAO-29 Table 1 (Maas & Hoffman: onion 1.3 dS/m … cotton 7.7), raising the irrigate-today depth by `1/(1−LR)` when the farmer's own ECe confirms the field is actually saline (≥ 2.0 dS/m; the Soil Health Card's EC field counts as ECe). The explanation gains one FAO-29-attributed sentence naming the fraction and the extra mm. Water too saline for the crop (LR > 0.9 or a non-positive denominator) adds no depth — it becomes an issue instead.
- **SAR, ESP, boron, bicarbonate, water pH → the improvement plan and the assistant.** A single `water-quality` detector (one card, not six — a real report trips several limits at once) flags breaches of the FAO-29 limits with the values in the sentence, escalating to HIGH for unusable water or three-plus breaches. The assistant receives every figure with its limit and may interpret, never prescribe a corrective product or dose.

Farms without tests see byte-for-byte the pre-V2.2 recommendation (tested).

---

# Version 3.0 — Intelligent Farm Assistant

Objective

Provide AI-assisted agricultural guidance.

---

## AI Recommendation Assistant

The AI assistant shall explain recommendations using outputs from the Decision Engine.

Example

Farmer

"Why should I irrigate today?"

Assistant

"Your rice crop is currently in its highest water-demand stage. Temperatures are high, rainfall is insufficient, and your sandy soil loses moisture quickly."

The AI assistant shall explain recommendations rather than replace the Decision Engine.

---

## AI Farm Advisor

Potential capabilities

- Crop health guidance
- Fertilizer suggestions
- Pest management advice
- Disease risk explanation
- Seasonal planning

---

## Disease Risk Prediction

Potential inputs

- Humidity
- Temperature
- Rainfall
- Crop type

Potential outputs

- Disease probability
- Preventive recommendations

---

## Yield Assistance

Potential capabilities

- Seasonal water estimation
- Irrigation efficiency analysis
- Water usage summaries
- Farm performance insights

---

# Future Data Sources

Potential integrations

- Government agricultural APIs
- Soil databases
- Satellite imagery
- Regional weather services
- IoT sensors
- Groundwater datasets

All integrations must remain modular.

---

# Architectural Principles

Future versions shall preserve:

- Offline-first architecture
- Explainable recommendations
- Modular Decision Engine
- Knowledge Base separation
- Repository abstraction
- Progressive enhancement

No future feature shall compromise offline usability.

---

# Success Criteria

The roadmap is successful if:

- Each version improves farmer usability.
- Recommendation quality increases over time.
- New features remain modular.
- Offline operation continues to function.
- AI complements, rather than replaces, the Decision Engine.