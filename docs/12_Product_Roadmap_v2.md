# 12_Product_Roadmap_v2.md

# IrrigaSmart

## Product Evolution Roadmap

Version: 2.1

Status: Active

Each version below carries its own status. A version is implementable only when it is marked **Approved for implementation**; versions marked *Planning* or *Deferred* must not be built (`CLAUDE.md` rule 5). Versions 1.1, 1.2 and 2.0 are implemented; Version 1.3 is approved; Versions 2.1 and 3.0 are not.

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

---

# Version 1.3 — Crop Protection Awareness

Status: **Approved for implementation**

Objective

Warn farmers when the weather turns favourable for crop disease, using data the application already holds.

---

## Feature 9 — Weather-Based Disease Risk

### Objective

Tell the farmer, in plain language, when recent and forecast weather create conditions in which a disease of their crop is likely to develop — early enough to inspect the field before symptoms are visible.

This feature promotes the **weather-based** half of "Disease Risk Prediction" (previously listed under Version 3.0 — Intelligent Farm Assistant) into an approved, implementable version. Image-based diagnosis remains deferred; see Version 3.0.

### Rationale

Most economically important crop diseases are **weather-driven**. Infection requires a temperature band together with sustained leaf wetness or high humidity. Those three signals — temperature, humidity, rainfall — are already retrieved, normalised, and cached per day by the existing weather integration. No new data source, no new network request, and no model are required.

This makes disease risk the cheapest possible extension of the platform and the one most consistent with Principle 1 — Trust Before Intelligence: the farmer can be told exactly which weather conditions triggered the warning.

### Inputs

All already present in the cached daily weather series and the farm profile:

- Crop type
- Daily maximum temperature
- Daily mean relative humidity
- Daily rainfall
- Recent days and forecast days (the same window the irrigation plan uses)

### Outputs

- A **risk level** for the crop: None / Low / Moderate / High
- The **disease** whose conditions are being met
- An **explanation** naming the weather conditions responsible
- **Preventive inspection guidance** — what to look at, and where on the plant

### Behaviour

- Risk is computed by deterministic rules, not a trained model. Identical inputs always produce an identical risk level.
- Risk is computed from cached weather and therefore works fully offline.
- Risk is **advisory only**. It never alters the irrigation recommendation, its status, or its water amount.
- When no daily weather series is available, the feature reports that risk cannot be assessed rather than guessing.

### Product Boundaries

These boundaries are requirements, not implementation notes.

- The application shall **not** name a pesticide, fungicide, or any chemical product.
- The application shall **not** state a dose, concentration, or spray schedule.
- The application shall **not** claim a disease is present. It reports only that weather conditions favour it, and advises inspection.
- Guidance shall direct the farmer to their local agricultural extension officer for treatment decisions.

Rationale: a wrong chemical recommendation causes direct financial and environmental harm, and the application has no way to observe the crop. This restriction is permanent and also applies to any future image-based feature.

### Definition of Done

- A farm with a supported crop and a cached daily weather series shows a disease risk level with an explanation.
- The same inputs always produce the same risk level.
- The risk card works offline.
- The irrigation recommendation is unchanged by the presence of this feature.
- All disease conditions used are traceable to a published source recorded in the Knowledge Base.

---

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

## Disease Diagnosis from Images

Status: **Deferred — not approved for implementation**

The weather-based half of disease risk was promoted to Version 1.3 (Feature 9) and is implemented. What remains here is **visual diagnosis**: identifying a disease from a photograph of an affected leaf or plant.

Potential inputs

- Photograph of the affected plant
- Crop type
- Current weather-based risk level (Feature 9)

Potential outputs

- Candidate disease identification with a confidence level
- Preventive and inspection guidance

Open questions that must be resolved before this is approved

- Field accuracy. Public plant-disease datasets are dominated by laboratory images on uniform backgrounds; published evaluations show accuracy collapsing on real field photographs. A model that is confidently wrong is worse than no model.
- Offline behaviour. Image diagnosis cannot work offline unless the model runs on the device. Any online-only capability must degrade gracefully and must not weaken the offline guarantee.
- Cost. The feature must have a permanently free path; it cannot depend on a paid image-recognition service.
- Validation. Predictions cannot be shipped without review by a qualified plant pathologist.

The Version 1.3 product boundaries apply here in full: no chemical names, no doses, no claim that a disease is present.

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