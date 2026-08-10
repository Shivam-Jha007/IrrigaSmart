> **Document Role**
>
> This document is part of the IrrigaSmart engineering specification.
> It is intended to be read alongside the other documents in the `/docs` directory.
> If implementation depends on information defined elsewhere, reference the appropriate document instead of making assumptions.
# 02_Decision_Engine.md

# IrrigaSmart

## Decision Engine Specification

Version: 1.0

Status: Active

---

# Purpose

The Decision Engine is the core intelligence of IrrigaSmart.

Its responsibility is to analyze farm information, crop characteristics, soil properties, irrigation methods, and weather conditions to generate reliable irrigation recommendations.

The engine is deterministic during the MVP. It relies on agricultural rules and reference data rather than machine learning models.

Future AI capabilities may enhance the engine but should not replace its overall architecture.

> **Note on formulas.** This document defines the pipeline **stages** and their
> responsibilities, not the numeric logic. The deterministic formulas,
> parameters, and thresholds that implement these stages are defined in
> `11_Decision_Logic.md`, which reads Knowledge Base facts from
> `10_Knowledge_Base.md`. Stages 4 (Recommendation Logic) and 5 (Water
> Estimation) are realized by that specification.

> **Note on disease risk.** Weather-based disease risk
> (`12_Product_Roadmap_v2.md` Version 1.3 Feature 9, specified in
> `11_Decision_Logic.md` Step 12) is **not** a stage of this pipeline. It reads
> the same normalized weather but runs independently and contributes nothing to
> the irrigation status, amount, timing, confidence, or factors. It was kept
> outside the pipeline deliberately: the irrigation recommendation must stay
> exactly as testable and as explainable as it is today, and an advisory signal
> that cannot change the outcome should not be able to change it by accident.

---

# Objectives

The Decision Engine must answer four questions:

1. Should irrigation be performed today?

2. How much water should be applied?

3. When should irrigation be performed?

4. Why was this recommendation generated?

Every recommendation must answer all four questions.

---

# Design Principles

The engine should be:

- Explainable
- Predictable
- Consistent
- Modular
- Testable

The same inputs should always generate the same recommendation.

---

# Decision Pipeline

Every recommendation follows the same sequence.

```
Farm Profile
      │
      ▼
Validation
      │
      ▼
Knowledge Retrieval
      │
      ▼
Weather Analysis
      │
      ▼
Recommendation Logic
      │
      ▼
Water Estimation
      │
      ▼
Explanation Generation
      │
      ▼
Final Recommendation
```

Each stage has a single responsibility.

---

# Stage 1 — Validation

Purpose

Ensure sufficient information exists before generating recommendations.

Required Inputs

- Crop
- Soil Type
- Field Size
- Irrigation Method
- Location

If any required information is missing, the engine should stop and request the missing data.

No recommendation should be generated using incomplete profiles.

---

# Stage 2 — Knowledge Retrieval

Purpose

Retrieve agricultural reference data.

Examples include:

- Crop water requirements
- Crop growth stages
- Soil water retention
- Irrigation efficiency
- Reference crop coefficients

The engine does not modify this data.

It only reads from the knowledge base.

---

# Stage 3 — Weather Analysis

Purpose

Analyze environmental conditions that influence irrigation.

Factors include:

- Temperature
- Rainfall forecast
- Humidity
- Wind speed
- Cloud cover

The output is a normalized weather summary that can be used by the recommendation logic.

---

# Stage 4 — Recommendation Logic

Purpose

Determine whether irrigation is required.

The engine evaluates:

- Crop demand
- Soil characteristics
- Recent rainfall
- Forecast rainfall
- Weather conditions
- Irrigation efficiency

Possible outcomes:

- Irrigate Today
- Delay Irrigation
- Monitor Tomorrow

No UI formatting occurs at this stage.

---

# Stage 5 — Water Estimation

Purpose

Estimate the amount of water required.

The estimate considers:

- Crop demand
- Field size
- Soil characteristics
- Irrigation method

The calculation method should remain modular so future scientific improvements can be introduced without affecting other stages.

---

# Stage 6 — Explanation Generation

Purpose

Convert technical reasoning into understandable language.

Example

Instead of

"Rainfall Probability = 82%"

Display

"Heavy rainfall is expected today, so irrigation is not recommended."

Instead of

"Kc = 1.05"

Display

"Your crop is currently in a stage where water demand is high."

Every recommendation must contain an explanation.

---

# Final Recommendation

The engine returns a structured recommendation containing:

- Irrigation Status
- Recommended Time
- Estimated Water Amount
- Explanation
- Confidence Level
- Timestamp

The user interface is responsible only for displaying this information.

---

# Confidence Levels

Every recommendation includes a confidence indicator.

Possible values:

- High
- Medium
- Low

Confidence is based on data completeness and freshness.

For example:

High

- Recent weather data
- Complete farm profile

Medium

- Slightly outdated weather

Low

- Missing optional information
- Cached weather beyond preferred age

Confidence should help users judge reliability rather than replace human decision-making.

---

# Edge Cases

The engine should gracefully handle situations such as:

- Missing internet connection
- Missing weather updates
- Newly created farm profile
- Unsupported crop
- Invalid inputs

The system should always provide meaningful feedback instead of failing silently.

---

# Future Enhancements

The architecture should support future modules including:

- Soil moisture sensors
- Satellite imagery
- Computer vision
- Yield prediction
- AI advisory
- Personalized irrigation history

These enhancements should integrate into existing stages rather than redesign the pipeline.

---

# Out of Scope

This document does not define:

- Scientific irrigation formulas
- Crop coefficient datasets
- Weather API implementation
- User interface
- Backend endpoints

Those are specified in separate documents.

---

# Success Criteria

The Decision Engine is considered successful if it:

- Produces consistent recommendations.
- Explains every recommendation.
- Works with incomplete connectivity.
- Can evolve without major architectural changes.
- Separates business logic from presentation.
- Remains understandable and testable.

---

# Related Documents

- 00_Product_Vision.md
- 01_System_Architecture.md
- 03_Data_Models.md
- 05_API_Design.md