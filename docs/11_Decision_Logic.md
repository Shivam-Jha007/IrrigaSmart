# 11_Decision_Logic.md

# IrrigaSmart

## Decision Logic Specification

Version: 1.0

Status: Active

---

# Purpose

This document defines the **deterministic logic** that converts Knowledge Base facts and weather data into an irrigation recommendation.

It is the missing link between:

- `02_Decision_Engine.md` — which defines the pipeline **stages** but explicitly excludes formulas.
- `10_Knowledge_Base.md` — which defines agronomic **facts** but explicitly excludes algorithms.

This document owns **how facts combine into a recommendation**: the formulas, parameters, thresholds, and mappings required for the engine to satisfy the Engineering Rule "same input always produces the same output."

This document does not define code, data storage, or UI. It defines behavior precisely enough to be implemented and unit-tested directly.

---

# Relationship to Other Documents

| Concern | Owned by |
|--------|----------|
| Pipeline stages and responsibilities | `02_Decision_Engine.md` |
| Agronomic facts (crops, soils, methods, Kc) | `10_Knowledge_Base.md` |
| Deterministic formulas, parameters, thresholds | **This document** |
| Entity shapes | `03_Data_Models.md` |

If a numeric value influences a recommendation, it is defined **here** and nowhere else.

---

# Parameter Philosophy

All numeric constants in this document are **tunable engineering parameters**, not claimed scientific constants.

They are chosen to be:

- Consistent with the qualitative influence directions already documented in `10_Knowledge_Base.md`.
- Grounded in the FAO-56 framework the Knowledge Base adopts.
- Simple, bounded, and explainable.

Every parameter is defined in one place (Section 9) so it can be adjusted without touching engine logic. Changing a parameter must never require changing the pipeline.

---

# Inputs

The engine consumes exactly two inputs, both already defined elsewhere:

1. A **validated farm profile** (`Farm` + `Crop` + `Soil`, per `03_Data_Models.md`), including current **growth stage**.
2. A **normalized weather summary** (`WeatherData`, per `03_Data_Models.md`), including its observation timestamp.

Knowledge Base values (Kc, efficiencies, factors) are looked up, never passed in.

If any required profile field (Crop, Soil Type, Field Size, Irrigation Method, Location, Growth Stage) is missing, the engine returns a **validation result requesting the missing field** and generates no recommendation (per Decision Engine Stage 1).

---

# Overview of the Computation

```
1.  Look up Kc for crop + growth stage
2.  Compute crop water demand      ETc_adj  (mm/day)
3.  Compute effective rainfall     Pe       (mm)
4.  Compute net irrigation need    NIR      (mm)
5.  Decide outcome                 Irrigate / Delay / Monitor
6.  Compute applied water          depth (mm) and volume (liters)
7.  Determine recommended time
8.  Compute confidence
9.  Generate explanation
```

Each step is deterministic and depends only on its inputs.

---

# Step 1 — Crop Coefficient Lookup

`Kc_stage` is read from the Knowledge Base (`10_Knowledge_Base.md` §3.2):

- Initial, Mid Season, and Late Season are stored explicitly.
- **Development** is interpolated: `Kc_development = (Kc_initial + Kc_mid) / 2`.

Growth stage is a **farmer-provided input** (see Assumptions, Section 10).

---

# Step 2 — Crop Water Demand (ETc_adj)

The Knowledge Base adopts `ETc = Kc × ETo`. The MVP weather data model does not contain the variables required to compute ETo scientifically (no Tmin/Tmax, no solar radiation), so the MVP uses a **documented reference baseline** `ETo_ref` and modulates it with the available weather signals.

```
ETc_adj = Kc_stage × ETo_ref × weatherMultiplier
```

`ETo_ref` is a fixed baseline (Section 9). Future phases may replace it with a computed ETo without changing this pipeline.

## Weather Multiplier

A single bounded multiplier derived from the three weather factors the Knowledge Base treats as demand-affecting:

```
adjTemp = clamp( 1 + (T  - T_BASE)  × TEMP_SENS,  TEMP_MIN,  TEMP_MAX )
adjHum  = clamp( 1 + (H_BASE - H)   × HUM_SENS,   HUM_MIN,   HUM_MAX )
adjWind = clamp( 1 + (W  - W_BASE)  × WIND_SENS,  WIND_MIN,  WIND_MAX )

weatherMultiplier = clamp( adjTemp × adjHum × adjWind, WMULT_MIN, WMULT_MAX )
```

Where `T` = temperature (°C), `H` = humidity (%), `W` = wind speed (m/s).

Direction of each term matches the Knowledge Base:
- Hotter than baseline → higher demand.
- Drier than baseline → higher demand.
- Windier than baseline → higher demand.

Cloud cover is **not** used numerically in the MVP; it is available for future ETo computation. This is intentional and documented rather than silently ignored.

---

# Step 3 — Effective Rainfall (Pe)

Forecast rainfall does not fully offset crop demand; a fraction is lost to runoff/evaporation, and its usefulness depends on soil (Knowledge Base §6.4).

```
Pe = rainfallForecast_mm × rainEffFactor(soil)
```

`rainEffFactor` per soil type is defined in Section 9. Clay retains a larger effective fraction than sandy soil, matching the Knowledge Base principle that the same rainfall remains effective longer on clay.

---

# Step 4 — Net Irrigation Need (NIR)

```
NIR = max( 0, ETc_adj − Pe )   // mm
```

`NIR` is the net water depth the crop needs today after accounting for rainfall.

---

# Step 5 — Decision Outcome

The engine returns exactly one of the three statuses defined in `02_Decision_Engine.md`:

```
if Pe ≥ ETc_adj:
        status = "Delay Irrigation"        // forecast rain meets or exceeds demand
else if NIR < skipThreshold(soil):
        status = "Monitor Tomorrow"        // deficit small; soil buffers to next day
else:
        status = "Irrigate Today"
```

`skipThreshold(soil)` is defined in Section 9. Clay has the highest threshold (buffers longest); sandy the lowest. This directly encodes the Knowledge Base soil-influence table.

No single factor is evaluated in isolation — the outcome is a function of crop stage (via Kc), soil (via threshold and rainfall factor), and weather (via ETc_adj and Pe) together, satisfying Reasoning Principle 1.

---

# Step 6 — Water Estimation

Applied only when `status = "Irrigate Today"`. For the other two statuses the estimated amount is `0` for today.

```
grossDepth_mm  = NIR / efficiency(method)
volume_liters  = grossDepth_mm × area_m2
```

- `efficiency(method)` is the numeric application efficiency per irrigation method (Section 9). Lower efficiency → more gross water for the same net need, matching Knowledge Base §5.
- `area_m2` is the farm area converted to square metres (Section 9 conversions). `1 mm applied over 1 m² = 1 litre`, so `volume_liters = grossDepth_mm × area_m2` exactly.

Both the **depth (mm)** and the **volume (liters)** are returned. The UI decides which to emphasize; units are metric (see Assumptions).

---

# Step 7 — Recommended Time

The MVP uses a deterministic, evaporation-minimizing heuristic rather than an optimization model:

```
if status == "Irrigate Today":
        recommendedTime = IRRIGATION_TIME_DEFAULT   // early morning
else:
        recommendedTime = null                       // not applicable today
```

Early morning is chosen to minimize evaporative loss. This is a documented heuristic, not a scientific scheduling claim. `IRRIGATION_TIME_DEFAULT` is in Section 9.

---

# Step 8 — Confidence

Confidence reflects **information quality**, not correctness (Reasoning Principle 6). It is derived from weather freshness and profile completeness only.

```
weatherAgeHours = now − weather.observationTime

if requiredProfileComplete AND weatherAgeHours ≤ FRESH_MAX_HOURS:
        confidence = "High"
else if requiredProfileComplete AND weatherAgeHours ≤ STALE_MAX_HOURS:
        confidence = "Medium"
else:
        confidence = "Low"     // stale/absent weather, or optional data missing
```

Thresholds (`FRESH_MAX_HOURS`, `STALE_MAX_HOURS`) are in Section 9. When weather is unavailable and cached weather is used, `weatherAgeHours` is computed from the cached observation time; if no weather exists at all, confidence is `Low` and the explanation states weather was unavailable.

`STALE_MAX_HOURS` is the "preferred age" referenced but left undefined in `02_Decision_Engine.md` — it is now defined here.

---

# Step 9 — Explanation Generation

Every recommendation includes a human-readable explanation naming the **major contributing factors** (Reasoning Principle 5). The explanation is assembled deterministically from the factors that drove the outcome:

- Growth stage and its demand level (from Kc).
- Soil behavior (retention/frequency).
- Rainfall contribution (whether it reduced or removed the need).
- Notable weather (only factors that moved the multiplier meaningfully).
- Irrigation method (as it affects applied amount).

The explanation must translate values into plain language (per Decision Engine Stage 6): e.g., "Rain expected today is enough to meet your crop's needs, so you can delay irrigation." Numeric internals (Kc, multipliers) are **not** shown to the farmer.

---

# Final Recommendation Object

The engine returns the structure defined in `02_Decision_Engine.md` / `03_Data_Models.md`:

- Recommendation Status
- Recommended Time
- Estimated Water Amount (depth mm and volume liters)
- Explanation
- Confidence Level
- Generated Time

No UI formatting occurs in the engine.

---

# Section 9 — Parameter Table (single source of truth)

All values are tunable engineering parameters. Changing any value here must not require any logic change.

## Reference ET

| Parameter | Value | Unit | Notes |
|-----------|-------|------|-------|
| ETo_ref | 5.0 | mm/day | Documented baseline reference ET for warm growing conditions (FAO indicative range 4–7 mm/day). Replaced by computed ETo in a future phase. |

## Weather multiplier

| Parameter | Value | Notes |
|-----------|-------|-------|
| T_BASE | 30 | °C reference |
| TEMP_SENS | 0.02 | per °C |
| TEMP_MIN / TEMP_MAX | 0.80 / 1.30 | clamp |
| H_BASE | 55 | % reference |
| HUM_SENS | 0.003 | per % (drier = higher) |
| HUM_MIN / HUM_MAX | 0.90 / 1.10 | clamp |
| W_BASE | 2 | m/s reference |
| WIND_SENS | 0.02 | per m/s |
| WIND_MIN / WIND_MAX | 1.00 / 1.20 | clamp |
| WMULT_MIN / WMULT_MAX | 0.70 / 1.50 | overall clamp |

## Rainfall effectiveness (by soil)

| Soil | rainEffFactor |
|------|---------------|
| Sandy | 0.60 |
| Loamy | 0.75 |
| Clay | 0.85 |

## Skip threshold — "Monitor Tomorrow" cutoff (by soil)

| Soil | skipThreshold (mm) |
|------|--------------------|
| Sandy | 1.0 |
| Loamy | 1.5 |
| Clay | 2.0 |

## Irrigation application efficiency (by method)

| Method | efficiency |
|--------|-----------|
| Drip | 0.90 |
| Sprinkler | 0.75 |
| Furrow | 0.60 |
| Flood | 0.50 |

These are the numeric counterparts to the qualitative efficiency ratings in `10_Knowledge_Base.md` §5.1.

## Area conversions (to m²)

| Area Unit | Multiplier to m² |
|-----------|------------------|
| Square metre | 1 |
| Acre | 4046.86 |
| Hectare | 10000 |

## Confidence & timing

| Parameter | Value | Notes |
|-----------|-------|-------|
| FRESH_MAX_HOURS | 6 | ≤ this → High (if profile complete) |
| STALE_MAX_HOURS | 24 | ≤ this → Medium; above → Low |
| IRRIGATION_TIME_DEFAULT | 06:00 local | evaporation-minimizing heuristic |

---

# Section 10 — Assumptions (explicit)

These assumptions are required for the logic above and were previously implicit.

1. **Growth stage is a farmer-provided input** (selected when creating/editing the farm). It is not derived from a planting date in the MVP.
2. **One primary crop per farm**, and **one recommendation per farm per day**, generated on demand.
3. **ETo is not computed** in the MVP; a documented reference baseline (`ETo_ref`) is used. Cloud cover and any additional weather fields are retained for future ETo computation but are not used numerically now.
4. **Units are metric.** Water depth is reported in millimetres and volume in litres; area is converted from the farm's stored `Area Unit`.
5. **Effective rainfall** is a soil-scaled fraction of forecast rainfall; the MVP does not model multi-day soil moisture carryover.
6. **The Decision Engine runs client-side**, framework-independent, so recommendations work fully offline. Any backend "Generate Recommendation" endpoint in `04_System_Interfaces.md` is treated as future/optional.

---

# Worked Example (non-normative)

Farm: Rice, Clay soil, Flood irrigation, 2 acres, Mid Season. Weather: 34 °C, 50% humidity, 3 m/s wind, 2 mm forecast rain, observed 3 h ago.

```
Kc_stage = 1.20  (rice, mid)
adjTemp  = 1 + (34-30)×0.02 = 1.08
adjHum   = 1 + (55-50)×0.003 = 1.015
adjWind  = 1 + (3-2)×0.02 = 1.02
weatherMultiplier = 1.08 × 1.015 × 1.02 ≈ 1.118
ETc_adj  = 1.20 × 5.0 × 1.118 ≈ 6.71 mm

Pe   = 2 × 0.85 = 1.70 mm
NIR  = 6.71 − 1.70 = 5.01 mm
Pe (1.70) < ETc_adj (6.71) and NIR (5.01) ≥ clay skipThreshold (2.0)
→ status = "Irrigate Today"

grossDepth = 5.01 / 0.50 = 10.02 mm
area_m2    = 2 × 4046.86 = 8093.72 m²
volume     = 10.02 × 8093.72 ≈ 81,099 liters
recommendedTime = 06:00
confidence = High (profile complete, weather 3 h old ≤ 6 h)
```

Explanation (farmer-facing): "Your rice is at its peak water-demand stage and today is hot. The small forecast rain isn't enough to meet its needs, so irrigate this morning. Because you use flood irrigation, more water is needed to deliver the same amount to the crop."

---

# Success Criteria

This specification is successful if:

- The engine produces identical output for identical input.
- Every recommendation yields a status, amount, timing, confidence, and explanation.
- All numeric behavior is traceable to Section 9.
- Parameters can be tuned without changing pipeline logic.
- The logic runs entirely offline.

---

# Related Documents

- 02_Decision_Engine.md
- 03_Data_Models.md
- 04_System_Interfaces.md
- 10_Knowledge_Base.md
