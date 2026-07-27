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

The MVP intentionally supports only a limited number of agricultural entities.

### Supported Crops

- Rice
- Wheat
- Maize

### Supported Soil Types

- Sandy
- Loamy
- Clay

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

Representative Kc values used by the MVP are:

| Crop | Initial | Mid Season | Late Season |
|------|---------|------------|--------------|
| Rice | 1.05 | 1.20 | 0.90 |
| Wheat | 0.30 | 1.15 | 0.25 |
| Maize | 0.30 | 1.20 | 0.35 |

Notes:

- Development-stage Kc values are not stored explicitly.
- They are interpolated between Initial and Mid Season when required.
- These values represent standard, well-managed crops under non-stressed conditions.
- Local climatic adjustment is outside the MVP scope.
- **ETo is not computed scientifically in the MVP.** The MVP weather data model lacks the inputs (Tmin/Tmax, solar radiation) required by FAO-56 ETo. A documented reference baseline is used instead; see `11_Decision_Logic.md` §2 and §9. Computed ETo is a future enhancement.

---

## 3.3 Agronomic Characteristics

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

## 3.4 Engineering Notes

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

## 4.3 Engineering Notes

The Decision Engine shall use soil type to influence:

- Estimated irrigation frequency
- Water retention assumptions
- Recommendation explanations

The MVP shall **not** estimate:

- Field capacity
- Soil moisture percentage
- Permanent wilting point
- Available Water Capacity (AWC)

Those features are reserved for future scientific enhancements.


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

## 9.4 Seasonal ETo Adjustment

A coarse seasonal factor shifts the ETo baseline used by the Decision Engine (monsoon and winter lower, hot summer higher). The numeric values are tunable engineering parameters owned by `11_Decision_Logic.md` §9 — this document owns only the agronomic rationale:

- **Kharif (< 1.0):** high humidity and cloud cover suppress evapotranspiration.
- **Rabi (< 1.0):** low temperatures suppress evapotranspiration.
- **Zaid (> 1.0):** heat and dry air raise evapotranspiration.

---

## Scope Disclaimer

The Knowledge Base provides simplified agronomic knowledge suitable for an offline decision-support application.

It does not replace field observations, local agricultural recommendations, or professional agronomic advice.

Future versions may incorporate region-specific datasets, sensor measurements, and advanced evapotranspiration models while preserving the architecture defined in this project.
