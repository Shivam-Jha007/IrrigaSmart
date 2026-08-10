# IrrigaSmart — Session Handover

**Written:** 2026-08-10
**For:** the next session (paste this file in first)
**Repo root:** `C:\ClaudeWorkspace\IrrigaSmart`
**Verified state at handover:** 267 tests passing, typecheck clean, lint clean.

> `HANDOFF.md` in this same folder is the **MVP-era** document from 2026-07-27. It is
> now badly out of date — it still lists disease detection, the chatbot and
> multi-language as "not built", all three of which exist. Read it for the
> architecture/deployment background only. **This file supersedes it for current
> state.**

---

## 1. Read this first — the one-paragraph situation

The user gave an 18-item improvement list, then interrupted it with this
instruction, which is the governing request:

> "Continue..working..
>
> But first can we just go ahead with the model addition ..And also the feature..of a
> chatbot...??If possible..Because the progres made yet isnt actually Visible"

That means **item 16 (disease detection model)** and **item 17 (farmer chatbot)**
jump the queue. The reason matters as much as the request: everything built before
them (backend providers, ETo ladder, soil chain, sunshine, terrain slope) was
invisible plumbing. So both features must land as **working, visible UI** — not
services and tests alone.

**Item 17 is DONE and visually verified. Item 16 is HALF done** — the model is
trained, exported and sitting in `frontend/public/models/`, but nothing in the
frontend loads it yet. That is the next task.

---

## 2. Hard constraints — do not violate these

These survive every compaction. They are not style preferences.

### 2.1 Item 0 is absolute
The user's item 0, verbatim: *"Make sure nothing is broken while executing these..
everything already built should be working ..Dot mess those.."*

Practical meaning: `npm run verify` must stay green, and the **52 pre-existing
golden snapshots must not be re-baselined** casually. The protocol is quoted in
`frontend/src/services/__tests__/decisionEngine.golden.test.ts:30` — inspect the
snapshot diff, confirm every changed line is explained by the phase you are
working on, then re-baseline with `npm test -- -u` and record the reason in the
commit.

### 2.2 The product boundary — permanent, and it applies to item 16
`docs/12_Product_Roadmap_v2.md` §"Product Boundaries" (line ~356). Quote it, do not
paraphrase it, and **never edit it**:

- shall **not** name a pesticide, fungicide, or any chemical product
- shall **not** state a dose, concentration, or spray schedule
- shall **not** claim a disease is present — only that conditions favour it
- shall direct the farmer to their local agricultural extension officer

The rationale line in that doc explicitly extends this to image features:
*"This restriction is permanent and also applies to any future image-based feature."*

Concretely, the disease-photo UI must say **"the photo looks similar to X"**, never
"you have X", and must always route to the local **Krishi Vigyan Kendra**.

Forbidden words anywhere in user-facing disease text: captan, myclobutanil,
mancozeb, chlorothalonil, copper oxychloride, streptomycin, Bordeaux mixture,
"fungicide", "pesticide". The backend already enforces this — see §5.3.

`frontend/src/services/diseaseKnowledge.ts:25` carries the rule as a header comment:
*"This module deliberately contains no fungicide, pesticide, chemical name, dose, or
spray interval, and no future version may add one (docs/10 §10.2)."*

### 2.3 Secrets
`ANTHROPIC_API_KEY` lives on the **backend only** and is never exposed to the
browser. `backend/src/index.ts` comments record why the assistant route is not a
provider proxy like the others.

### 2.4 Roadmap authorisation is still outstanding
`docs/CLAUDE.md` rule 5 forbids implementing future roadmap items. Items 16 and 17
are both still marked deferred in `docs/12_Product_Roadmap_v2.md`:

- line ~451 `## AI Recommendation Assistant` — no status line
- line ~481 `## Disease Diagnosis from Images` — **"Status: Deferred — not approved
  for implementation"**, with four open questions (field accuracy, offline
  behaviour, cost, pathologist validation)

**The user has verbally authorised both.** The docs have NOT yet been amended to
record that. This is a real outstanding task — see §7, task D. When you do amend
it, answer those four open questions with what was actually built (on-device ONNX =
offline + free; accuracy measured at 99.75% on the held-out split but *lab images*,
which is exactly the caveat the doc raises).

---

## 3. Four decisions the user already made

Do not re-litigate these; they were settled via AskUserQuestion.

| Question | User's choice |
|---|---|
| VGG19 (558 MB) was too big to deploy | **Retrain small → on-device ONNX** (MobileNetV3-Small, offline-capable) |
| `cures.py` named fungicides, violating the boundary | **Strip chemicals, keep cultural advice** |
| Chatbot: item 17 wants reasoning, item 18 wants offline | **Hybrid** — offline deterministic rules always, Claude via backend when online |
| Disease example images (item 14) | **Dataset photos** for maize/potato/tomato + **SVG diagrams** for the other 15 |

---

## 4. The full 18-item list (overall scope)

There is no item 11; 1.5 and 1.75 are numbered as the user wrote them.

| # | Item | State |
|---|---|---|
| 0 | Nothing already built may break | **Standing constraint** |
| 1 | Soil API — better/latest/block-level data | Done (`soilService.ts`, backend `/api/soil`) |
| 1.5 | Verify calculations + APIs; free-tier/open-source sources | Partly done — findings not yet written to docs |
| 1.75 | Evaluate whether the backend is now better at this scale | Done — backend chosen |
| 2 | Show and use sunshine hours | Done (`sunshine.ts`, wired into disease risk) |
| 3 | Recheck recommendation engine + calculations | Partly done |
| 4 | Crop-specific growth stages (not all crops get the same 4) | **Not started** (approved Phase 2) |
| 5 | Keep depth of irrigation accurate | Partly done |
| 6 | Recommendations section — better crops/practices per field | **Not started** (Phase 4) |
| 7 | Suggest the next crop after harvesting | **Not started** (Phase 4) |
| 8 | Verify soil moisture meter accuracy | Partly done (`SoilMoistureCard.tsx` exists) |
| 9 | Irrigation frequency must differ per crop/soil | **Not started** |
| 10 | Detect and use slope | **Nearly done** — see §7 task C |
| 12 | Savings section separate; *"the numbers look big..and if thwey are correct now also then gell me how?"* | **Not started** (Phase 4) — the "how" explanation is explicitly requested |
| 13 | Dynamic layout for PC and phone — *"its only stickig to phone"* | **Not started** (Phase 5) |
| 14 | Show ≥2 example images per disease | **Not started** (Phase 5) |
| 15 | Make the UI more visual | **Not started** (Phase 5) |
| 16 | Disease detection model; *"we may add the rice model later..or multiple models"* | **HALF DONE — next task** |
| 17 | Farmer chatbot, voice or text, reasoning, circle icon in a dashboard corner | **DONE** |
| 18 | Most features work offline, or partially | Ongoing principle |

The user's closing instruction on that list:

> "And after doing all of these ,...briefluy tell me how accurate each one is and how u
> did it..and what i can do to verify it myskef.. please make sure to evaluate each one
> and see if it alll works correctly and nothng breaks.."

That is the eventual deliverable — `docs/13_Accuracy_And_Verification.md` (Phase 8).

---

## 5. What item 17 actually shipped (DONE — for context, not for redoing)

### 5.1 Files
| File | Lines | Role |
|---|---|---|
| `frontend/src/services/assistantRules.ts` | 713 | Offline deterministic rules — 12 intents, 5 languages + romanised |
| `frontend/src/services/assistantService.ts` | 136 | The hybrid dispatcher — rules first, model second |
| `frontend/src/services/assistantContext.ts` | 145 | Builds the shared context, translating enums at the boundary |
| `frontend/src/services/speech.ts` | 183 | Web Speech API wrapper (typed shim — `SpeechRecognition` is absent from `lib.dom.d.ts`) |
| `frontend/src/components/FarmerAssistant.tsx` | 336 | The FAB + panel |
| `backend/src/assistant.ts` | 468 | `POST /api/assistant`, prompt assembly, chemical safety net |
| `frontend/src/App.css` | +330 | `Farmer assistant (item 17)` section, appended after the 900px query |

### 5.2 The hybrid rule (the whole design)
Deterministic on-device rules run **first, always**. The model is consulted only
when rules return `null` **AND** `navigator.onLine !== false`. Every network failure
mode is therefore non-fatal by construction — 503/429/502/500, `TypeError`,
unparseable JSON, empty answer, `AbortError` and a bare thrown string all resolve to
`source: 'unavailable'` with an offline fallback string. `askAssistant` never throws.

`referral` is the **first** branch in `classify()` and short-circuits everything
else, so a spray question is answered offline with the KVK referral and never
reaches the model.

### 5.3 The backend safety net
`sanitizeReply()` replaces the **whole reply** when a plant-protection product is
named — not just the offending word, because a spray recommendation with the
chemical removed is still not sound advice. Whole-word matched and case-insensitive,
so "coppery colour" survives.

### 5.4 Tests — 87 new
- `frontend/src/services/__tests__/assistantRules.test.ts` — 30
- `frontend/src/services/__tests__/assistantService.test.ts` — 18 (stubs **`fetch`**, not the apiClient, so real envelope/error/abort plumbing runs)
- `backend/src/__tests__/assistant.test.ts` — 39 (pure parts only; no SDK mock, because a test that mocks the SDK asserts only that the mock was called)

### 5.5 Two real production bugs these tests caught
1. **`\p{L}` stripped every Indic combining mark.** Combining marks are Unicode
   category **M**, not L — every Devanagari matra, every Bengali/Assamese vowel
   sign, the virama, the Urdu diacritics. `normalise('कितना पानी चाहिए?')` was
   producing `' क तन प न च ह ए '`. **Every native-script keyword in hi/bn/as/ur was
   unmatchable.** The feature worked only in English and romanised input and would
   have looked perfect in any English-only test. Fixed by adding `\p{M}` to the keep
   set (`assistantRules.ts:131`).
2. **"Spray" was missing from `REFERRAL_TERMS` in Bengali/Assamese/Urdu.**
   `classify('কোন স্প্রে করব?')` returned `null`, meaning a boundary question would
   have been escalated to the model. Added `স্প্রে`, `স্প্ৰে`, `ঔষধি`, `اسپرے`, `چھڑکاؤ`.

Neither was visible through English manual testing. This is the strongest argument
for writing the assertions before declaring item 16 done.

### 5.6 Browser-verified
Dev server on :5173, clicked through onboarding, opened the panel, submitted
**"which spray should I use for tomato leaf spot?"**. DOM confirmed:

> "I cannot advise on medicines, sprays, fertiliser doses, seed or prices. Please show
> a sample to your local Krishi Vigyan Kendra or agriculture extension officer — they
> can see your crop and know what is approved locally. I can help with irrigation
> timing and water amounts."

…with the green **"Answered on your phone"** badge, and the panel disclaimer *"This
assistant explains the app's advice. It cannot recommend any medicine, spray or
fertiliser."* — boundary holding, offline, no farm data, no backend running.

---

## 6. Item 16 — exactly where it stands

### 6.1 What EXISTS
`frontend/public/models/` (untracked, ~6 MB):

- `plant-disease-mobilenetv3.onnx` — 6,178,248 bytes
- `plant-disease-labels.json` — the manifest below

```json
{
  "architecture": "mobilenet_v3_small",
  "split": "grouped",
  "imageSize": 224,
  "normalisation": { "mean": [0.485,0.456,0.406], "std": [0.229,0.224,0.225] },
  "onnxAccuracy": 0.9975,
  "torchAccuracy": 0.9975,
  "validationImages": 7137,
  "classes": [ 23 classes ]
}
```

Softmax is **in-graph** — take argmax and read the confidence straight off the
output; do not apply softmax again.

The 23 classes: Apple ×4, Corn/maize ×4, Pepper bell ×2, Potato ×3, Tomato ×10.

### 6.2 What does NOT exist yet
- `onnxruntime-web` is **not installed** (`frontend/package.json` deps are only `idb`, `react`, `react-dom`)
- no inference service
- no camera/upload UI
- no class → `DiseaseId` mapping
- the model files are untracked in git

### 6.3 The crop-overlap problem — read this before designing the UI
The app supports 10 crops (`Rice, Wheat, Maize, Cotton, Sugarcane, Soybean,
Groundnut, Tomato, Potato, Onion`). The dataset covers Apple, Corn(maize), Pepper
bell, Potato, Tomato.

**Only Maize, Potato and Tomato overlap.** Seven of the app's ten crops — including
**Rice**, the design persona's crop — have no model coverage at all.

So the UI must handle "your crop is not one this model was trained on" as a
first-class state, not an error. The user anticipated this: *"remember we may add the
rice model later..or multiple models"* — so leave the loader multi-model-shaped.

Mapping the overlapping classes onto the existing `DiseaseId` union
(`frontend/src/services/diseaseKnowledge.ts:31`) is only partly clean:

| ONNX class | `DiseaseId` |
|---|---|
| `Corn_(maize)___Northern_Leaf_Blight` | `maizeTurcicumLeafBlight` (same disease, *Exserohilum turcicum*) |
| `Corn_(maize)___Common_rust_` | `maizeCommonRust` |
| `Potato___Early_blight`, `Tomato_Early_blight` | `earlyBlight` |
| `Potato___Late_blight`, `Tomato_Late_blight` | `lateBlight` |
| `*___healthy` | no DiseaseId — a distinct "looks healthy" state |
| `Corn_(maize)___Cercospora_leaf_spot`, all 7 remaining Tomato classes, all Apple, all Pepper | **no DiseaseId exists** |

Decide deliberately: either extend the `DiseaseId` union and add the 5-language
`disease.name.*` / `disease.where.*` / `disease.what.*` keys for each new one, or
render the unmapped classes with a generic "looks similar to <dataset label>"
treatment. Do not silently drop them — a farmer photographing tomato leaf mould
should not get a blank card.

### 6.4 The 99.75% figure needs an honest caveat
That is held-out accuracy on **PlantVillage-style laboratory images on uniform
backgrounds**. `docs/12_Product_Roadmap_v2.md` line ~499 raises exactly this:
*"published evaluations show accuracy collapsing on real field photographs. A model
that is confidently wrong is worse than no model."*

Do not put "99.75% accurate" in front of a farmer. The confidence number shown in
the UI should be framed as similarity to training photos, and the wording must stay
"the photo looks similar to X".

### 6.5 Suggested build order
1. `npm install onnxruntime-web --workspace frontend`
2. `frontend/src/services/diseaseVision.ts` — load `/models/*.onnx`, resize to
   224×224, ImageNet mean/std normalise, argmax + confidence. Pure-ish; keep DOM
   image decoding at the edge so the mapping logic is testable.
3. `frontend/src/services/diseaseVisionMap.ts` — 23 classes → `DiseaseId | 'healthy' | 'unmapped'`.
4. Tests for the mapping and the pre-processing **before** the UI (see §5.5 for why).
5. `frontend/src/components/DiseasePhotoCard.tsx` — camera/upload, "looks similar
   to X", confidence framing, KVK routing, unsupported-crop state.
6. Wire into `Dashboard.tsx` aside zone beside `DiseaseRiskCard`.
7. 5-language translation keys.
8. Amend the roadmap docs (§2.4).
9. Browser-verify with a real photo — the user's whole reason for this work is
   visibility.

Note: the model must be precached or explicitly excluded in `vite.config.ts`
(vite-plugin-pwa). 6 MB through Workbox's default precache will bloat the shell;
decide whether the model is precached (offline-capable, slow first load) or
runtime-cached on first use. **The user chose on-device specifically for offline**,
so precaching is probably right — but say so explicitly and check the generated
`sw.js`.

---

## 7. Task list at handover

| # | Task | State |
|---|---|---|
| A | Item 16 — on-device disease detection frontend | **Next. Not started.** |
| B | Write Phase 1 findings into `docs/11_Decision_Logic.md`, every constant traced to a source | Pending |
| C | Item 10 leftovers — `warnsSurfaceMethod` advisory card labelled "approximate terrain slope (~90 m DEM)" + 5-language keys | Nearly done |
| D | Amend roadmap docs to record the user's authorisation for items 16 and 17 (`docs/CLAUDE.md` rule 5) | Outstanding |
| E | Optional item-17 polish — a test for `assistantContext.ts`, and check the panel renders in a non-Latin language (only English was exercised in the browser) | Optional |

**Item 10 detail (task C):** the engine side is done — `decisionEngine.ts:702,796`
already calls `runoffFactor`/`intakeFactor`, `useAppStore.ts:349` fetches terrain,
`backend/src/terrain.ts` exists with 29 passing tests. What is missing is only the
farmer-facing advisory card for `warnsSurfaceMethod` (exported from
`services/index.ts:80` but **not consumed by any component** — verified by grep).

**Remaining approved phases after that:** Phase 2 (per-crop growth stages, rice
ponding + Rice Zr 0.3→0.5), Phase 3 (backend TTL cache), Phase 4 (crop advisory +
honest savings), Phase 5 (responsive layout + visual cues + disease images),
Phase 8 (`docs/13_Accuracy_And_Verification.md`).

---

## 8. Environment gotchas that cost real time last session

- **Git Bash strips Windows backslashes.** `cd C:\ClaudeWorkspace\IrrigaSmart\frontend` becomes
  `C:ClaudeWorkspace...: No such file or directory`. This bit repeatedly. Use the
  Read/Edit tools for file contents, and MSYS-style `/c/ClaudeWorkspace/IrrigaSmart/...`
  paths for Bash. The Read/Edit tools *do* accept `C:\ClaudeWorkspace\...` — only Bash
  does not.
- **Shell working-directory drift.** After a `cd` into a workspace, `npm run verify`
  fails with `Missing script: "verify"` because it is a root script. Prefix with
  `cd C:\ClaudeWorkspace\IrrigaSmart &&` or just run from root.
- **`exactOptionalPropertyTypes: true`.** `{...ctx, key: undefined}` is NOT assignable
  where the property is `key?: string`. Tests must `delete` keys to model real
  absence — see the `without(...keys)` helper in `assistantRules.test.ts:66`.
- **Backend uses `moduleResolution: nodenext`** — relative imports need an explicit
  `.js` extension: `from '../assistant.js'`. Getting this wrong also cascades into
  spurious implicit-`any` errors on callback params.
- **The typechecker catches what vitest does not.** Three separate rounds of
  `exactOptionalPropertyTypes`/`nodenext` failures happened in files whose tests were
  already passing. `npm run verify` (typecheck + lint + test) is the gate, not
  `vitest` alone.
- **Zero-width characters in regexes:** write `\u200B` escapes, never the literal
  characters — the Edit tool cannot distinguish old from new when the chars are
  invisible, and shell one-liners mangle the escapes.

---

## 9. Commands

```bash
cd C:\ClaudeWorkspace\IrrigaSmart
npm run verify      # typecheck + lint + test — THE gate
npm run dev         # frontend :5173 + backend :3001
npm test -- -u      # re-baseline goldens — only per the protocol in §2.1
```

Current baseline to preserve:

```
frontend: 9 files, 180 tests passed
backend:  3 files,  87 tests passed
Total: 267 passed. Typecheck clean. Lint clean.
```

---

## 10. Git state

**Nothing from this whole effort is committed.** 91 changed/untracked paths on top
of `014b34c Improved accuracy and aded rhe checklist behaviour..`.

Untracked and significant: `frontend/public/models/` (~6 MB — decide on Git LFS or
`.gitignore` + a build step before committing), `backend/src/terrain.ts`,
`frontend/src/services/{assistantRules,assistantService,assistantContext,speech,diseaseKnowledge,diseaseRisk,evapotranspiration,slopeAdjustment,soilProfile,soilService,sunshine,terrainService}.ts`,
`frontend/src/components/{FarmerAssistant,DiseaseRiskCard,SoilMoistureCard}.tsx`,
all of `frontend/src/services/__tests__/`, `frontend/src/storage/__tests__/`,
`frontend/src/test/`, `frontend/vitest.config.ts`, `scripts/`.

Ask the user before committing — they have not requested it.

---

## 11. Stack facts worth having in context

- Frontend: React 18.3.1, Vite 6, TS strict (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, target ES2021),
  ESLint `no-explicit-any: 'error'`, `--max-warnings 0`, Vitest 3.2.7, PWA via
  vite-plugin-pwa, IndexedDB via `idb`, plain CSS custom properties, no router.
- Backend: Node 20, Express 4.21.2, TS strict + `nodenext`,
  `@anthropic-ai/sdk ^0.116.0`, model `claude-opus-5`.
- Claude API: thinking is adaptive-by-default — **omit `thinking`**.
  `temperature`/`top_p`/`top_k`/`budget_tokens` all return 400 on Opus 5.
- Backend routes: `/health`, `/api/weather`, `/api/location`, `/api/location/search`,
  `/api/soil`, `/api/terrain`, `POST /api/assistant`.
- Languages: en, hi, bn, as, ur. `hi`/`bn`/`as` are typed
  `Record<TranslationKey, string>` with **no `...en` spread**, so a missing key is a
  **compile error**. `ur` spreads `...en`. `frontend/src/i18n/translations.ts` is 2158
  lines — add keys to all five blocks.
- Deployment: Vercel (frontend) + Render (backend). Render build **must** use
  `npm install --include=dev`. See `DEPLOYMENT.md`.

---

## 12. Suggested opening move for the next session

> Continue item 16 — the on-device disease detection frontend. The model
> (`frontend/public/models/plant-disease-mobilenetv3.onnx`, MobileNetV3-Small, 23
> classes, in-graph softmax) is trained and exported; nothing loads it yet. Install
> `onnxruntime-web`, build the inference service and the class→DiseaseId mapping with
> tests first, then the camera/upload card, then browser-verify it. Respect the
> permanent product boundary: "the photo looks similar to X", never a diagnosis,
> always route to the Krishi Vigyan Kendra, and handle the seven app crops the model
> was never trained on as a first-class state.
