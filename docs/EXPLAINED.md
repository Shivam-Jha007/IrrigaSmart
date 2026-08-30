# EXPLAINED — How this project works, section by section

A plain-language walkthrough of what each part of IrrigaSmart does, how it does it, and why it was built that way. Written for understanding, not as a spec — the numbered docs in `docs/` remain the source of truth.

**Quick orientation (whole project):**

- **IrrigaSmart** is an offline-first PWA that helps smallholder farmers decide *when to irrigate, how much, and why*.
- **Monorepo:** `frontend/` (React + Vite + TypeScript PWA), `backend/` (Express + TypeScript; currently just weather proxying + health check), `docs/` (engineering spec).
- **Key architectural rule:** all business logic lives in `frontend/src/services/` (deterministic, framework-independent); `pages/` and `components/` are presentational only. Local persistence goes through IndexedDB (`storage/`), which is why the app works offline.

---

## 1. The Fertilizer section

### What it does

The Fertilizer tab is a **soil-test-based fertilizer dosing advisor**. A farmer answers three or four tap-style questions (crop → variety → soil zone → soil fertility), and the app shows the official NPK dose (kg/ha of N, P₂O₅, K₂O) to apply, plus organic manure guidance, soil amendments (lime/dolomite/gypsum), sulphur, micronutrients, and split-application timing.

It does **not** calculate or invent any dose. Every number shown is a **direct transcription of an official State Agriculture Department (West Bengal) soil-test-based fertilizer recommendation booklet**, typed into the code as data. The tool is essentially that government booklet, digitized into a tappable app.

### The files involved

| File | Role |
|---|---|
| `frontend/src/services/fertilizerKnowledge.ts` | **Everything agronomic.** The transcribed booklet tables, the soil-test band definitions, and the lookup/classification functions. No UI. |
| `frontend/src/pages/FertilizerPage.tsx` | The multi-step form flow (crop → variety → zone → fertility). Presentational; contains no agronomic data. |
| `frontend/src/components/FertilizerAdviceCard.tsx` | Renders the resolved recommendation: big NPK numbers, expandable "More information" details, always-visible disclaimer. |
| `frontend/src/types/soil.ts` | Defines `SoilNutrientReading` — the shape of a saved soil-test reading (N, P₂O₅, K₂O mandatory; pH, EC, organic carbon, S, Zn, B, Fe, Mn, Cu optional). |
| `frontend/src/app/useAppStore.ts` | `saveNutrientReading()` — persists the farmer's soil-test numbers to the farm's soil record in IndexedDB. |

### How it works, step by step

**1. Crop selection — a 10-crop icon grid, 6 of which work.**
The app supports 10 crops overall, but the booklet only covers **Rice (as two seasonal tables), Wheat, Maize, Cotton, Potato, and Groundnut**. The other four (Sugarcane, Soybean, Tomato, Onion) appear greyed-out ("muted") and tapping them shows an honest *"no data for this crop"* message instead of a guess. `fertilizerCoversCrop()` decides which is which.

**2. Variety selection — only where the booklet splits a crop.**
Rice is split into **Kharif** (monsoon) and **Boro** (dry-season, irrigated) because the booklet gives them different zones and different doses. Potato is split into **traditional (from tuber)** and **hybrid (from TPS seed)**. Crops with a single table skip this step. `fertilizerVarietiesFor()` provides the options, and a `useEffect` keeps the selection valid when the crop changes (it never leaves a stale variety id pointing into the wrong table).

**3. Soil zone selection — five West Bengal agro-ecological zones.**
Hill, Terai, Gangetic Alluvium, Vindhya Alluvium & Red-Lateritic, Coastal. Each zone entry in the data carries the districts it covers (e.g. Terai = Siliguri sub-division, Jalpaiguri, Coochbehar, Dinajpur-N) — display-only, to help the farmer recognize their zone. Not every crop table has a row for every zone; the selector only offers the zones that table actually has (`fertilizerZonesFor()`).

**4. Fertility selection — two modes that produce the same answer.**

- **"Numbers" mode (🧪):** the farmer types the three numbers off an Indian **Soil Health Card** or lab report — available N, P₂O₅, K₂O in kg/ha. The app classifies each nutrient into Low/Medium/High using standard Indian soil-test bands, then takes the **worst of the three** as the overall band. Optional Soil Health Card fields (pH, EC, organic carbon, S, Zn, B, Fe, Mn, Cu) can also be entered; they are **saved but do not affect the dose** — the dosing tables key on N/P/K only.
- **"Simple" mode (🤷):** no soil test? The farmer just taps Low / Medium / High based on their best judgment.

Both paths produce the same `FertilityLevel` type, so everything downstream is identical.

**The classification logic (the only real "logic" in the feature):**

- Standard Indian lab bands, hardcoded in `NUTRIENT_BANDS`:
  - Nitrogen: **< 280 kg/ha = Low, > 560 = High** (alkaline permanganate method)
  - Phosphorus: **< 10 = Low, > 25 = High** (Olsen's method)
  - Potassium: **< 108 = Low, > 280 = High** (ammonium acetate extraction)
- `classifyNutrient()` bands one nutrient; `classifySoilFertility()` takes the **lowest** of the three. Rationale (documented in the code): if even one major nutrient is short, the crop responds to the higher dosing band — treating the soil as fertile because the other two nutrients are fine would under-fertilize the limiting one. This is the project's own deliberate, cautious simplification; the booklet itself assumes the farmer already knows their overall band.
- Important distinction the code is careful about: a **soil-test reading** (what's already *in* the soil) and a **dose** (how much fertilizer to *add*) are different quantities on different scales. The bands connect the two; you never compare them directly.
- A partial N/P/K entry (e.g. only N filled in) **refuses to classify** — a missing nutrient must not silently drop out of the worst-of-three rule and flatter the result.

**5. Lookup and display.**
`getFertilizerRecommendation(crop, varietyId, zone)` is a pure two-key table lookup — find the variety's table, find the zone's row. It returns `null` for any gap rather than a fallback. `FertilizerAdviceCard` then shows:

- The **NPK dose for the chosen fertility band** as three large icon-labelled numbers (the one thing a farmer needs at a glance).
- Everything else (soil ameliorant, manure/bio-fertilizer, sulphur, micronutrients, remarks, the table's general note, district list) tucked behind a "More information" disclosure — kept, not deleted, but not a wall of text by default.
- A **disclaimer and source credit, always visible** outside the disclosure.

**6. Saving the reading (optional).**
An explicit "Save reading" button writes the N/P/K numbers (plus any optional fields) into the farm's soil record via the store → IndexedDB. Next visit, the boxes are prefilled with the farmer's own numbers. Design details worth noting:

- **Explicit tap, not auto-save** — a farmer mid-typing "18" toward "180" must not have "18" written as their reading, and an explicit action gives a place to show confirmation.
- The "✓ already saved" state is **derived** (comparing inputs against stored values), not separate state — editing a saved number immediately un-confirms the button with no syncing logic.
- A saved reading also enriches other features: the assistant and farm-context services read `soil.nutrientReading`.

**7. The pH cross-check.**
If the farm has a measured soil profile, the page shows a one-line pH note (🟢/🟡/🔴) for the *selected* crop against the farm's pH, reusing the exact same `topsoilPh()` / `phSuitability()` functions the Dashboard uses — so the farmer never sees two differently-derived pH verdicts in the same app.

### Architectural choices, and why

1. **Pure frontend, zero backend involvement.** The fertilizer feature makes no API calls. Data is compiled into the bundle, so the tool works fully offline — consistent with the app's offline-first promise. (The backend exists for weather; fertilizer doesn't need it.)

2. **Data/logic separation.** `FertilizerPage.tsx` is explicitly "presentational only"; every agronomic figure and every rule lives in `services/fertilizerKnowledge.ts`. This follows the project-wide engineering rule (`docs/07_Engineering_Rules.md`): services are deterministic and testable, UI just displays.

3. **Lookup, not computation.** The module's own header says it best: it "contains no dosing logic of its own — every figure is a direct transcription of a booklet cell." Nothing is weighed, blended, or adjusted. Even things the booklet states as adjustment rules (late-sown wheat: −20 kg N, +10 kg P & K) are surfaced as **remarks text**, not computed. This is the app's scientific-integrity stance: the tool is exactly as authoritative as its government source, and never pretends to be more.

4. **Honest gaps instead of guesses.** Several places in the data are `null` or absent on purpose:
   - Hill has no recommendation row on several tables (transcribed as an explicit gap, **not** a zero dose).
   - Some source cells were faint/angled in the photographed booklet pages — those were **left out entirely** rather than guessed, and the code comments say to grep for `UNCERTAIN` to find them (e.g. Coastal wheat and Coastal cotton have no NPK dose). The stated principle: *"a wrong number a farmer acts on is worse than an honest gap."*
   - Crops the booklet doesn't cover say so plainly.

5. **Type system as documentation.** `FERTILIZER_TABLES` is `Partial<Record<CropName, ...>>` — the compiler itself knows which crops have tables. `getFertilizerRecommendation` returning `null` forces every caller to handle the "no answer" case.

6. **Visual-first, text-second UI.** Every choice is a grid of icon buttons (🌾 ⛰️ 🏖️ …) rather than a dropdown, designed for farmers who can't read comfortably. But every icon keeps its text label — icons support reading, they don't replace it. Long explanations live behind a disclosure, never inline in the main flow.

7. **One derivation per fact.** The pH verdict reuses the Dashboard's exact functions; the fertility band from either input mode is the same type. No two code paths can show the farmer conflicting numbers for the same soil.

8. **The recommendation carries all three L/M/H bands** (`FertilizerZoneEntry.npk` is a `Partial<Record<FertilityLevel, NpkDoseKgHa>>`), and the card displays the band matching the farmer's chosen/classified fertility — so switching from Low to High instantly shows the other dose without a new lookup.

### How realistic and helpful is it?

**Realistic — yes, in a specific and deliberate way.** The doses are not modeled or estimated; they are official government recommendations for the exact region, transcribed faithfully. The soil-test bands are the real, nationally-used Indian lab standards (same ones Soil Health Cards use). The guidance reflects actual West Bengal smallholder practice — FYM, green manuring with Dhaincha, Azolla, Rhizobium seed treatment, gypsum for coastal saline soils, split N applications by growth stage. An agronomist would recognize this content as legitimate.

**Helpful — genuinely, for its intended user.** A West Bengal smallholder with (or without) a Soil Health Card gets the agriculture department's own advice without needing to obtain and interpret the booklet. The two-mode fertility input means the ~majority of farmers without a soil test can still use the tool. The worst-of-three classification errs in the cautious direction (adequate rather than deficient fertilization).

**The honest limitations (all visible in the code/data itself):**

- **Coverage:** 6 of the app's 10 crops. Sugarcane, Soybean, Tomato, Onion have no table.
- **Geography:** the zones, districts, and doses are **West Bengal-specific**. Nothing in the flow checks where the farmer actually is — a farmer outside WB can still tap through and get WB-advice. The districts list is the only hint that this is regional.
- **Coarseness:** three fertility bands, not a continuous response. A farmer just under vs. just over a band boundary (e.g. N = 279 vs. 281 kg/ha) gets meaningfully different doses. That's a property of the source booklet's format, not a bug.
- **Illegible source cells:** a handful of zone/duration cells were unreadable in the photographed pages and are simply missing (marked `UNCERTAIN` in comments) — they should be corrected against the booklet before being relied on for a real application decision.
- **No dynamic adjustment:** yield target, previous crop, irrigation water quality, and the optional Soil-Health-Card fields (organic carbon, micronutrients…) do not influence the dose. The booklet itself is static in the same way, so the tool is no worse than its source — but it's a booklet-on-a-screen, not an agronomist.
- **Optional fields are storage-only here:** pH/EC/OC/S/Zn/B/Fe/Mn/Cu are saved with the reading (and feed the assistant's context elsewhere), but the dosing lookup keys on N/P/K alone, exactly as the booklet does.

**Bottom line:** it's a faithful, offline, low-literacy-friendly digitization of one State's official fertilizer schedule, with a small, well-reasoned classification layer (soil-test numbers → L/M/H band) in front of it. Its trustworthiness comes precisely from the fact that it computes nothing — and its ceiling is exactly the booklet it transcribes, region and crops included.

---

*Next sections will be appended here on request.*
