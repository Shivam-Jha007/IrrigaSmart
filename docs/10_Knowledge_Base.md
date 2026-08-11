# 10. Knowledge Base

Version: 1.0

---

## 1. Purpose

This document defines the agronomic knowledge used by the IrrigaSmart Decision Engine.

It serves as the single source of truth for:

- Supported crops
- Crop growth stages
- Crop coefficients (Kc)
- Soil characteristics
- Irrigation methods
- Weather interpretation principles
- Agronomic assumptions

The purpose of this document is **not** to describe algorithms or implementation details. Those are defined in `02_Decision_Engine.md`.

Instead, this document defines the scientific facts and domain knowledge that the Decision Engine relies upon when generating irrigation recommendations.

---

## 2. Scope

The MVP intentionally supports only a limited number of agricultural entities. (Expanded in V2.1 from 3 crops / 3 soils to 10 crops / 6 soils covering India's major cropping regions.)

### Supported Crops

- Rice
- Wheat
- Maize
- Cotton
- Sugarcane
- Soybean
- Groundnut
- Tomato
- Potato
- Onion

### Supported Soil Types

- Sandy
- Sandy Loam
- Loamy
- Silty Loam
- Clay Loam
- Clay

Indicative mapping to Indian regional soils: Alluvial → Loamy / Silty Loam; Black (Regur) → Clay / Clay Loam; Red → Sandy Loam; Laterite → Sandy Loam / Clay Loam; Desert/Arid → Sandy.

### Supported Irrigation Methods

- Drip
- Sprinkler
- Furrow
- Flood

Additional crops, soils, and irrigation systems can be added in future versions without changing the architecture.

---

## 3. Scientific Basis

The IrrigaSmart recommendation engine follows internationally accepted irrigation principles wherever practical.

The MVP is primarily based on:

- FAO Irrigation and Drainage Paper No. 56 (Crop Evapotranspiration)
- FAO crop coefficient (Kc) methodology
- Standard soil texture classifications

The application **does not claim to replace professional agronomic advice**.

Recommendations are intended to support irrigation decisions using simplified, explainable, rule-based logic suitable for an offline-first application.

# 3. Supported Crops

The MVP supports three crops selected for their agricultural importance, availability of standardized irrigation guidance, and suitability for demonstrating the recommendation engine.

| Crop | Scientific Name | Typical Growing Season* |
|------|-----------------|-------------------------|
| Rice | Oryza sativa | 90–150 days |
| Wheat | Triticum aestivum | 120–240 days |
| Maize | Zea mays | 80–150 days |
| Cotton | Gossypium spp. | 150–210 days |
| Sugarcane | Saccharum officinarum | 300–360 days |
| Soybean | Glycine max | 90–120 days |
| Groundnut | Arachis hypogaea | 100–140 days |
| Tomato | Solanum lycopersicum | 90–150 days |
| Potato | Solanum tuberosum | 80–120 days |
| Onion | Allium cepa | 100–150 days |

\*Growing duration varies by cultivar, climate, and management practices.

---

## 3.1 Crop Growth Stages

The system models crop development using the four standard FAO-56 growth stages.

| Stage | Description |
|--------|-------------|
| Initial | Germination and early establishment. Water demand is relatively low. |
| Development | Rapid vegetative growth. Water demand increases progressively. |
| Mid Season | Flowering and peak canopy development. Highest water requirement. |
| Late Season | Crop maturation and senescence. Water demand decreases. |

---

## 3.2 Crop Coefficients (Kc)

The MVP adopts the FAO-56 single crop coefficient approach.

Crop evapotranspiration (ETc) is estimated using:

ETc = Kc × ETo

where:

- ETc = Crop Evapotranspiration
- Kc = Crop Coefficient
- ETo = Reference Evapotranspiration

Representative Kc values used by the MVP are (FAO-56 Table 12):

| Crop | Initial | Mid Season | Late Season |
|------|---------|------------|--------------|
| Rice | 1.05 | 1.20 | 0.90 |
| Wheat | 0.30 | 1.15 | 0.25 |
| Maize | 0.30 | 1.20 | 0.35 |
| Cotton | 0.35 | 1.15 | 0.70 |
| Sugarcane | 0.40 | 1.25 | 0.75 |
| Soybean | 0.50 | 1.15 | 0.50 |
| Groundnut | 0.40 | 1.15 | 0.60 |
| Tomato | 0.60 | 1.15 | 0.80 |
| Potato | 0.50 | 1.15 | 0.75 |
| Onion | 0.70 | 1.05 | 0.75 |

Notes:

- Development-stage Kc values are not stored explicitly.
- They are interpolated between Initial and Mid Season when required.
- These values represent standard, well-managed crops under non-stressed conditions.
- Local climatic adjustment is outside the MVP scope.
- **ETo is obtained from the weather provider (V1.5).** The provider computes daily reference evapotranspiration by the FAO-56 Penman-Monteith method from its own gridded inputs (Tmin/Tmax, solar radiation, humidity, wind), which the application never had to collect itself. The engine multiplies that ETo by Kc directly. A documented reference baseline remains as a per-day fallback for days with no provider ETo; see `11_Decision_Logic.md` §2 and §9.

## 3.3 Root Depths and Depletion Fractions (V1.6)

The FAO-56 soil water balance requires effective root depth (Zr) and the depletion fraction (p) — the portion of Total Available Water a crop can use without stress.

| Crop | Initial Zr (m) | Mid Zr (m) | Late Zr (m) | p (fraction) | Notes |
|------|----------------|------------|-------------|--------------|-------|
| Rice | 0.20 | 0.30 | 0.30 | 0.20 | Shallow roots; flooded cultivation tolerates low p |
| Wheat | 0.30 | 1.00 | 1.10 | 0.55 | Deep rooting by mid-season |
| Maize | 0.30 | 1.00 | 1.10 | 0.55 | Deep rooting; sensitive to mid-season stress |
| Cotton | 0.40 | 1.20 | 1.20 | 0.65 | Very deep roots; moderately tolerant |
| Sugarcane | 0.40 | 1.00 | 1.00 | 0.65 | Deep permanent crop |
| Soybean | 0.30 | 0.70 | 0.70 | 0.50 | Moderate depth |
| Groundnut | 0.30 | 0.60 | 0.60 | 0.50 | Moderate depth |
| Tomato | 0.30 | 0.70 | 0.70 | 0.40 | Vegetable; more stress-sensitive |
| Potato | 0.25 | 0.50 | 0.50 | 0.35 | Shallow tuber crop; very stress-sensitive |
| Onion | 0.20 | 0.40 | 0.40 | 0.30 | Very shallow; frequent irrigation needed |

**Reference:** FAO-56 Tables 22 (p values) and typical root depth progressions from agronomic literature.

**Interpolation:** Development-stage root depth is interpolated linearly between Initial and Mid, just as Kc is.

**What p means:** At p = 0.55, the crop uses 55% of TAW comfortably. The remaining 45% is still in the soil but harder to extract, so irrigation is advised when depletion reaches RAW = 0.55 × TAW.

---

## 3.4 Agronomic Characteristics

### Rice

- Requires consistently high water availability during most of the growing season.
- Water demand peaks during the mid-season stage.
- Commonly cultivated under flooded or controlled irrigation conditions.

### Wheat

- Moderate seasonal water requirement.
- Sensitive to water stress during flowering and grain filling.
- Excess irrigation near maturity should generally be avoided.

### Maize

- Water demand increases rapidly during vegetative growth.
- Highest requirement occurs during tasseling and grain filling.
- Water stress during mid-season can significantly reduce yield.

---

## 3.5 Engineering Notes

The Decision Engine shall use the following crop properties:

- Crop type
- Current growth stage
- Corresponding Kc value

No crop-specific recommendation logic shall be hardcoded outside the Knowledge Base.

# 4. Supported Soil Types

The MVP supports three generalized soil texture classes based on standard agricultural classifications.

The Decision Engine uses soil type to estimate how quickly water infiltrates, drains, and remains available to crops.

The MVP does **not** perform soil moisture simulation or calculate field capacity.

---

## 4.1 Supported Soil Types

| Soil Type | Water Holding Capacity | Drainage | Irrigation Frequency |
|------------|-----------------------|-----------|----------------------|
| Sandy | Low | High | Frequent |
| Loamy | Moderate | Moderate | Moderate |
| Clay | High | Slow | Less Frequent |

---

## 4.2 Agronomic Characteristics

### Sandy Soil

Characteristics:

- Large soil particles
- Rapid infiltration
- Drains quickly
- Holds relatively little plant-available water

Implications:

- Crops may require smaller but more frequent irrigation.
- Water stress can occur sooner after irrigation if rainfall is absent.

---

### Loamy Soil

Characteristics:

- Balanced mixture of sand, silt, and clay
- Good water retention
- Good drainage
- Generally considered ideal for most crops

Implications:

- Supports stable irrigation intervals.
- Suitable for most crop recommendations in the MVP.

---

### Clay Soil

Characteristics:

- Fine soil particles
- Slow infiltration
- Retains water for longer periods
- Poor drainage if excessive water is applied

Implications:

- Irrigation events should generally be less frequent.
- The Decision Engine should consider prolonged water availability after rainfall or irrigation.

---

## 4.3 Soil Hydraulic Properties (V1.6)

The FAO-56 soil water balance (Version 1.6) models root-zone depletion and requires field capacity (θ_FC) and permanent wilting point (θ_PWP) for each soil type. These cannot be measured from a farmer's phone, so the engine derives them from soil texture using the **Saxton & Rawls (2006) pedotransfer functions**.

| Soil Type | Sand % | Silt % | Clay % | θ_FC (vol %) | θ_PWP (vol %) | AWC (vol %) |
|-----------|--------|--------|--------|--------------|---------------|-------------|
| Sandy | 85 | 10 | 5 | 14.0 | 4.2 | 9.8 |
| Sandy Loam | 65 | 25 | 10 | 20.8 | 6.3 | 14.5 |
| Loamy | 40 | 40 | 20 | 27.0 | 11.7 | 15.3 |
| Silty Loam | 20 | 65 | 15 | 33.0 | 13.3 | 19.7 |
| Clay Loam | 30 | 35 | 35 | 31.8 | 19.7 | 12.1 |
| Clay | 20 | 20 | 60 | 39.6 | 27.2 | 12.4 |

**Reference:** Saxton, K. E., & Rawls, W. J. (2006). *Soil Water Characteristic Estimates by Texture and Organic Matter for Hydrologic Solutions.* Soil Science Society of America Journal, 70(5), 1569–1578.

**Texture assumptions:** representative midpoints for each USDA class. Sand/silt/clay sum to 100%; organic matter is not modelled in the MVP.

**Available Water Capacity (AWC)** = θ_FC − θ_PWP. This is the water a crop can actually extract from one metre of soil depth. A 60 cm root zone in Clay holds `0.124 × 600 = 74.4 mm` of available water.


# 5. Supported Irrigation Methods

The MVP supports four commonly used irrigation methods.

The selected irrigation method influences water application efficiency and contributes to irrigation recommendations.

The system does **not** recommend changing irrigation infrastructure.

---

## 5.1 Supported Methods

| Method | Water Application Efficiency* | Representative Value** | Characteristics |
|---------|------------------------------|------------------------|-----------------|
| Drip | High | 0.90 | Delivers water directly to the root zone with minimal losses. |
| Sprinkler | Moderate to High | 0.75 | Simulates rainfall; efficiency may decrease under windy conditions. |
| Furrow | Moderate | 0.60 | Water flows through channels between crop rows. |
| Flood | Low to Moderate | 0.50 | Entire field is intentionally inundated; highest conveyance and evaporation losses. |

\*Qualitative rating. Exact efficiency depends on field conditions and system design.

\*\*Representative numeric values used by the Decision Engine. These are tunable engineering parameters; the single source of truth is the parameter table in `11_Decision_Logic.md` §9.

---

## 5.2 Agronomic Characteristics

### Drip Irrigation

- Water is applied directly near plant roots.
- Minimizes evaporation and runoff.
- Suitable where water conservation is important.

---

### Sprinkler Irrigation

- Water is distributed above the crop.
- Provides relatively uniform coverage.
- Wind may reduce effectiveness.

---

### Furrow Irrigation

- Water moves through shallow channels.
- Requires proper field leveling.
- Distribution uniformity depends on field conditions.

---

### Flood Irrigation

- Water covers the soil surface.
- Commonly used in paddy rice cultivation.
- Higher water losses may occur through evaporation and seepage.

---

## 5.3 Engineering Notes

The Decision Engine shall use irrigation method to:

- Adjust estimated water application efficiency.
- Improve recommendation explanations.
- Support future water-use estimation.

The MVP shall **not** model:

- Pump performance
- Pipe losses
- Distribution uniformity
- Pressure calculations
- Irrigation scheduling optimization

## 5.4 Decision Profiles

Decision Profiles describe how irrigation methods influence recommendation interpretation.

---

### Drip

**Decision Influence**

- Highest water-use efficiency.
- Supports precise water application.
- Water estimation requires minimal adjustment.

---

### Sprinkler

**Decision Influence**

- Generally efficient under suitable weather conditions.
- Wind may reduce effective water application.

---

### Furrow

**Decision Influence**

- Moderate application efficiency.
- Water distribution depends on field conditions.

---

### Flood

**Decision Influence**

- Lower application efficiency.
- Water estimation should account for higher application losses.
- Commonly associated with rice cultivation.

---





# 6. Decision Influence Matrix

This section defines how agronomic factors influence irrigation recommendations.

The purpose of this section is to describe **domain reasoning**, not implementation logic.

The Decision Engine shall interpret these influences together rather than treating any single factor as an absolute rule.

---

## 6.1 Crop Growth Stage

### Scientific Basis

Crop water demand varies throughout the crop life cycle and is represented using FAO-56 crop coefficients.

### Decision Influence

| Growth Stage | Recommendation Influence |
|--------------|--------------------------|
| Initial | Lower irrigation priority |
| Development | Gradually increase irrigation priority |
| Mid Season | Highest irrigation priority |
| Late Season | Gradually reduce irrigation priority |

---

## 6.2 Soil Type

### Scientific Basis

Different soil textures retain and release water differently.

### Decision Influence

| Soil | Recommendation Influence |
|------|--------------------------|
| Sandy | Increase irrigation frequency; avoid long irrigation intervals. |
| Loamy | Balanced irrigation scheduling. |
| Clay | Increase irrigation interval; rainfall remains effective for longer. |

---

## 6.3 Temperature

### Scientific Basis

Higher temperatures generally increase evapotranspiration.

### Decision Influence

• Sustained high temperatures increase irrigation priority.

• Lower temperatures decrease irrigation priority.

Temperature shall never be evaluated independently of crop growth stage.

---

## 6.4 Rainfall

### Scientific Basis

Rainfall contributes directly to soil moisture.

### Decision Influence

• Recent rainfall reduces irrigation demand.

• Forecast rainfall should influence scheduling.

• Rainfall impact depends on soil type.

Example:

The same rainfall event generally remains beneficial longer on clay soil than on sandy soil.

---

## 6.5 Humidity

### Scientific Basis

Humidity influences evaporation and transpiration.

### Decision Influence

• High humidity slightly reduces irrigation priority.

• Low humidity slightly increases irrigation priority.

Humidity is considered a secondary influencing factor in the MVP.

---

## 6.6 Wind Speed

### Scientific Basis

Wind accelerates evapotranspiration.

### Decision Influence

• Higher wind speed increases irrigation priority.

Wind is considered a secondary influencing factor in the MVP.

---

## 6.7 Irrigation Method

### Scientific Basis

Different irrigation methods deliver water with different efficiencies.

### Decision Influence

The irrigation method influences estimated water application efficiency but does not change crop water requirement.

The system shall never recommend changing irrigation infrastructure.

# 7. Agronomic Reasoning Principles

This section defines the reasoning principles that the Decision Engine must follow when combining agronomic knowledge.

These principles describe **how multiple factors interact**, not implementation algorithms.

---

## Principle 1 — No Single Factor Determines the Recommendation

No individual parameter shall independently determine whether irrigation is recommended.

Recommendations shall always consider the combined influence of:

- Crop
- Growth Stage
- Soil Type
- Weather
- Irrigation Method

---

## Principle 2 — Crop Growth Stage Has Highest Influence

Among all crop-related factors, growth stage has the greatest influence on crop water demand.

---

## Principle 3 — Soil Modifies Rainfall Effect

Rainfall shall not be interpreted independently.

The influence of rainfall depends on soil texture.

Example:

The same rainfall event generally remains effective longer in clay soils than in sandy soils.

---

## Principle 4 — Weather Modifies Crop Demand

Weather conditions modify crop water demand rather than replace it.

Example:

High temperature increases irrigation priority, but the increase depends on crop growth stage.

---

## Principle 5 — Recommendations Shall Be Explainable

Every recommendation shall identify the major factors that influenced the final decision.

Typical explanation factors include:

- Crop
- Growth Stage
- Soil Type
- Temperature
- Rainfall
- Irrigation Method

---

## Principle 6 — Recommendations Shall Express Confidence

Confidence represents the quality of available information rather than certainty.

Confidence may decrease when:

- Weather information is outdated.
- Weather data is unavailable.
- Required farm information is incomplete.

---

## Principle 7 — Scientific Integrity

Only agronomic knowledge documented in this Knowledge Base may influence irrigation recommendations.

New agronomic rules shall reference authoritative agricultural sources before being added.

---

## Principle 8 — Decision Support

IrrigaSmart is a decision-support system.

Final irrigation decisions remain the responsibility of the farmer.

The application complements local knowledge rather than replacing it.


# 8. References

The MVP Knowledge Base is based on internationally recognized agricultural references.

Primary Sources

1. FAO Irrigation and Drainage Paper No. 56
   Crop Evapotranspiration – Guidelines for Computing Crop Water Requirements.
   Allen, Pereira, Raes & Smith.
   Food and Agriculture Organization (FAO), Rome, 1998.

2. USDA Soil Texture Classification
   United States Department of Agriculture.

3. FAO Water Management Resources
   Food and Agriculture Organization.

---

# 9. Regional & Seasonal Knowledge (V2.0)

Added for `12_Product_Roadmap_v2.md` Feature 8. The dataset is bundled with the application — the most offline-first form of a "locally cached dataset" — and requires no network access.

## 9.1 Indian Cropping Seasons

| Season | Months | Character |
|--------|--------|-----------|
| Kharif | June–September | Monsoon season; rain covers much of crop demand. |
| Rabi | October–February | Cool, dry season; regular irrigation needed, lower demand. |
| Zaid | March–May | Hot summer season; highest evaporative demand. |

## 9.2 Crop Calendars (typical Indian windows)

| Crop | Sowing | Harvest | Main Season |
|------|--------|---------|-------------|
| Rice | June–July | October–December | Kharif |
| Wheat | November–December | March–April | Rabi |
| Maize | June–July | September–October | Kharif |

Windows vary by region and cultivar; they are guidance, not rules.

## 9.3 Seasonal Irrigation Guidelines

- **Kharif:** irrigate only during dry spells and let the rain do the work; watch for waterlogging.
- **Rabi:** crops need regular irrigation, but demand is lower than in summer.
- **Zaid:** water demand is highest; irrigate early morning to reduce evaporation.

## 9.4 Seasonal ETo Adjustment (fallback only, V1.5)

A coarse seasonal factor shifts the ETo *baseline* used by the Decision Engine (monsoon and winter lower, hot summer higher). Since V1.5 this applies **only on days with no provider-computed ETo** — a measured FAO-56 ETo already reflects the season through its own temperature, humidity and radiation inputs, so the factor must not be applied on top of it. The numeric values are tunable engineering parameters owned by `11_Decision_Logic.md` §9 — this document owns only the agronomic rationale:

- **Kharif (< 1.0):** high humidity and cloud cover suppress evapotranspiration.
- **Rabi (< 1.0):** low temperatures suppress evapotranspiration.
- **Zaid (> 1.0):** heat and dry air raise evapotranspiration.

---

# 10. Crop Disease Risk Knowledge (V1.3)

Added for `12_Product_Roadmap_v2.md` Version 1.3 Feature 9. As in §9 the dataset is bundled with the application and requires no network access.

This section owns the **agronomic facts**: which diseases matter for each supported crop, the weather conditions under which they infect, and what the farmer should look for. It does not own the scoring rules or the tuning thresholds — those are engineering parameters owned by `11_Decision_Logic.md` §9.

## 10.1 Why Weather Predicts Disease

Fungal and bacterial crop diseases share one requirement: the pathogen needs a **temperature band** and **sustained surface wetness at the same time**. Spores germinate only when the leaf stays wet long enough, and only inside a temperature range specific to that pathogen. Neither condition alone is sufficient.

This is why weather data alone supports a useful statement about *risk* — and why it can never support a *diagnosis*. Favourable weather means infection is possible, not that it happened.

## 10.2 What This Knowledge Can and Cannot Do

It can:

- State that recent and forecast weather fall inside a documented infection window.
- Name the disease whose window is being met.
- Tell the farmer where on the plant to look.

It cannot:

- Confirm a disease is present.
- Rule a disease out.
- Recommend treatment.

### Restriction — No Chemical Advice

This Knowledge Base deliberately records **no** fungicide, pesticide, chemical name, dose, or spray interval, and no future version may add one.

Chemical choice depends on local product registration, resistance status, pre-harvest interval, and observed severity — none of which the application can see. Treatment decisions belong to a qualified agricultural extension officer. This restriction is an application of Principle 7 — Scientific Integrity and Principle 8 — Decision Support, and it also binds any future image-based feature.

## 10.3 Measurement Caveat

The published infection conditions in §10.4 are stated in the literature as **hourly or instantaneous** values: hours of leaf wetness, hours above a relative-humidity threshold, air temperature near the leaf.

The application holds **daily aggregates only** — daily maximum temperature, daily mean relative humidity, and daily rainfall total. That is what the weather provider supplies (`04_System_Interfaces.md`) and what is cached for offline use.

Each profile in §10.4 therefore records two distinct things:

1. The **published condition** and its source — the agronomic fact.
2. The **daily-aggregate band** used in its place — a documented approximation.

The approximation follows two rules, applied consistently across every profile:

- **Temperature.** Bands are expressed as *daily maximum* temperature and therefore sit above the published optimum air temperature, because a day's maximum exceeds its mean. A disease with a published optimum of 15–20 °C is matched against a daily maximum band of roughly 16–26 °C.
- **Humidity.** Thresholds are expressed as *daily mean* relative humidity and therefore sit below the published instantaneous threshold, because a day whose mean RH is 80% typically spends much of the night near saturation. A published requirement of "RH ≥ 90% for 11 hours" is matched against a daily mean RH of about 80%.

A day also counts as wet when measurable rain fell, whatever the mean humidity — rainfall wets the canopy directly.

These are **approximations, not measurements.** They are deliberately biased towards warning early: a false warning costs the farmer one inspection, while a missed warning can cost part of a crop. This bias is the reason the output is labelled *risk* and never *detection*.

## 10.4 Disease Profiles by Crop

Two profiles per crop, chosen as the economically significant weather-driven diseases of that crop in Indian conditions. `Max °C` is the daily-maximum temperature band; `Mean RH` is the daily-mean relative-humidity threshold.

### Rice

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Blast (*Magnaporthe oryzae*) | 25–33 | ≥ 80% | 24–28 °C with RH > 90% and long dew periods; cool nights favour sporulation |
| Bacterial leaf blight (*Xanthomonas oryzae* pv. *oryzae*) | 28–38 | ≥ 75% | 25–34 °C with high humidity; spread by rain, wind and standing water |

### Wheat

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Stripe (yellow) rust (*Puccinia striiformis*) | 12–24 | ≥ 75% | Sporulation optimum 10–15 °C; requires dew or free moisture on the leaf |
| Leaf (brown) rust (*Puccinia triticina*) | 18–30 | ≥ 70% | 15–22 °C with dew; warmer than stripe rust |

### Maize

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Turcicum leaf blight (*Exserohilum turcicum*) | 22–32 | ≥ 80% | 18–27 °C with 6–18 h leaf wetness and RH > 90% |
| Common rust (*Puccinia sorghi*) | 20–30 | ≥ 80% | 16–25 °C with RH near saturation |

### Cotton

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Alternaria leaf spot (*Alternaria macrospora*) | 28–36 | ≥ 75% | 25–30 °C with RH > 80% |
| Bacterial blight (*Xanthomonas citri* pv. *malvacearum*) | 32–40 | ≥ 75% | 30–36 °C with high humidity; rain-splash spread |

### Sugarcane

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Red rot (*Colletotrichum falcatum*) | 28–36 | ≥ 75% | 25–30 °C with high humidity; waterlogging aggravates |
| Rust (*Puccinia melanocephala*) | 24–32 | ≥ 80% | 20–25 °C with RH > 90% and long dew periods |

### Soybean

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Rust (*Phakopsora pachyrhizi*) | 22–30 | ≥ 80% | 20–25 °C with at least 6 h leaf wetness |
| Anthracnose (*Colletotrichum truncatum*) | 28–35 | ≥ 80% | 25–30 °C with prolonged wet weather |

### Groundnut

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Late leaf spot (*Nothopassalora personata*) | 27–35 | ≥ 80% | 25–30 °C with RH > 90% and extended leaf wetness |
| Rust (*Puccinia arachidis*) | 24–34 | ≥ 75% | 20–30 °C with RH > 85% |

### Tomato

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Late blight (*Phytophthora infestans*) | 16–26 | ≥ 80% | Smith period: two consecutive days with minimum temperature ≥ 10 °C and RH ≥ 90% for ≥ 11 h; optimum 15–20 °C |
| Early blight (*Alternaria linariae*) | 26–34 | ≥ 75% | 24–29 °C with RH > 85%, favoured by alternating wet and dry spells |

### Potato

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Late blight (*Phytophthora infestans*) | 16–26 | ≥ 80% | Smith period, as for tomato; the classic weather-driven epidemic disease |
| Early blight (*Alternaria solani*) | 26–34 | ≥ 75% | 24–29 °C with RH > 85%, favoured by alternating wet and dry spells |

### Onion

| Disease | Max °C | Mean RH | Published infection conditions |
|---------|--------|---------|--------------------------------|
| Purple blotch (*Alternaria porri*) | 25–34 | ≥ 75% | 21–30 °C with RH > 80% |
| Downy mildew (*Peronospora destructor*) | 14–24 | ≥ 80% | 10–22 °C with RH near saturation and cool wet nights |

## 10.5 Inspection Guidance

What the farmer should look at when a disease's window is being met. These are **observation prompts**, not diagnoses, and contain no treatment advice.

| Disease | Where to look | What it looks like |
|---------|---------------|--------------------|
| Rice blast | Leaves, then nodes and neck of the panicle | Spindle-shaped spots with grey centres and brown borders |
| Rice bacterial leaf blight | Leaf tips and margins, upper leaves first | Water-soaked yellow streaks from the tip, drying to straw colour |
| Wheat stripe rust | Upper leaf surface, lower leaves first | Yellow-orange powdery pustules in stripes between the veins |
| Wheat leaf rust | Both leaf surfaces | Scattered orange-brown round pustules, not in stripes |
| Maize turcicum leaf blight | Lower leaves first, moving upward | Long grey-green cigar-shaped lesions |
| Maize common rust | Both leaf surfaces | Small cinnamon-brown pustules scattered over the blade |
| Cotton alternaria leaf spot | Older leaves at the base | Brown spots with concentric rings and a pale halo |
| Cotton bacterial blight | Leaves, stems and bolls | Angular water-soaked spots turning black; blackened veins |
| Sugarcane red rot | Split a suspect cane lengthwise | Reddened internal tissue with white cross-bands; sour smell |
| Sugarcane rust | Underside of leaves | Elongated orange-brown pustules |
| Soybean rust | Underside of lower leaves | Small raised tan pustules that shed powder when rubbed |
| Soybean anthracnose | Stems and pods | Dark irregular blotches with tiny black spines |
| Groundnut late leaf spot | Underside of older leaves | Dark spots without a yellow halo; pustules beneath |
| Groundnut rust | Underside of leaves | Orange pustules that rupture and release powder |
| Potato / tomato late blight | Lower leaves, then stems and tubers or fruit | Dark water-soaked patches with a white mould ring underneath in the morning |
| Potato / tomato early blight | Oldest, lowest leaves first | Dark spots with concentric rings, like a target |
| Onion purple blotch | Older leaves, tips downward | Small white sunken spots enlarging to purple-brown zoned patches |
| Onion downy mildew | Older leaves, early morning | Pale oval patches with a violet-grey furry growth |

In every case the guidance ends the same way: if the symptoms are found, consult the local agricultural extension officer. The application does not advise treatment (§10.2).

## 10.6 Additional References

Extending §8. These support the disease conditions in §10.4.

4. Smith, L. P. (1956). *Potato blight forecasting by 90 per cent humidity criteria.* Plant Pathology 5(3), 83–87. — the Smith period.
5. Ou, S. H. (1985). *Rice Diseases*, 2nd edition. Commonwealth Mycological Institute, Kew.
6. Roelfs, A. P., Singh, R. P. & Saari, E. E. (1992). *Rust Diseases of Wheat: Concepts and Methods of Disease Management.* CIMMYT, Mexico.
7. Indian Council of Agricultural Research — crop protection advisories for the crops listed in §2.

Where a value in §10.4 is an approximation of a published condition rather than the condition itself, §10.3 states the rule used. No value in §10.4 may be changed without a source.

---

## Scope Disclaimer

The Knowledge Base provides simplified agronomic knowledge suitable for an offline decision-support application.

It does not replace field observations, local agricultural recommendations, or professional agronomic advice.

Future versions may incorporate region-specific datasets, sensor measurements, and advanced evapotranspiration models while preserving the architecture defined in this project.
