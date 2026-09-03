# Leaf-photo model — v1 vs v2 measurement

**Status:** measurement complete, recorded 2026-08-18. Conclusion acted on; see
§6.

This document exists because of a field report: *"The model output seems to be
bad. Earlier it was more accurate and better."* That is a claim about a
regression, and a regression is a measurable thing, so it was measured rather
than argued about.

The short answer: **on the classes both models share, v2 is not worse than v1 —
they are indistinguishable.** What changed is that v2 added rice, and rice is
where this model performs badly on real field photographs. The app's design
persona grows rice, so "the model got worse" is a fair description of the
experience even though it is not a description of the weights.

---

## 1. What was compared

| | v1 | v2 |
|---|---|---|
| File | `frontend/public/models/plant-disease-mobilenetv3.onnx` | `frontend/public/models/plant-disease-mobilenetv3-v2.onnx` |
| Manifest | `plant-disease-labels.json` | `plant-disease-labels-v2.json` |
| Classes | 23 | 27 |
| Difference | — | v1's 23 classes **plus** `Rice___Bacterial_blight`, `Rice___Blast`, `Rice___Brown_spot`, `Rice___Tungro` |

v2 is a superset. No class was removed or renamed.

## 2. Method

A temporary page (`frontend/model-ab.html`, since deleted) loaded both ONNX
files in the browser and ran the same 44 images through each, using the
application's own `preprocess()`, `centreCrop()` and `argmax()` from
`frontend/src/services/diseaseVision.ts` — not a reimplementation. 224 px centre
crop, ImageNet mean/std from each model's own manifest, NCHW, softmax in-graph.
88 inferences in total.

The 44 images are the reference photographs already bundled in
`frontend/public/disease-reference/` (see `ATTRIBUTION.md` there). Using them has
one large advantage — every one has a verified identification and a known source
— and one large limitation, recorded in §3.

**The harness was deleted rather than committed.** It was a scratch page with no
tests behind it, and a half-maintained benchmark is worse than none. Re-running
this means rebuilding it; the numbers below are the record.

## 3. Group A — the 14 shared PlantVillage classes (28 images)

| | v1 | v2 |
|---|---|---|
| Top-1 correct | 28 / 28 (1.000) | 28 / 28 (1.000) |
| Mean confidence | 0.9569 | 0.9586 |

Per-image confidence deltas are within ±0.03 and go in both directions.

**This is a sanity check, not a generalisation estimate.** These 28 images ship
with the PlantVillage dataset the models were trained on, so they are very
probably inside both training sets. A perfect score here means "the export is
wired up correctly and the preprocessing matches", which is worth knowing and is
not evidence about field accuracy. It does, however, answer the narrow question
asked: whatever v2's retrain did, it did not damage v1's classes.

## 4. Group B — rice, on 6 independently sourced field photographs

The rice reference images were sourced from Wikimedia Commons and Bugwood for
the app's own UI, independently of the retrain's dataset, so they are unlikely
to be training images — though that cannot be proven from the dataset alone.

v1 has no rice classes at all, so its score is 0/6 by construction, not by
error. For v2:

| Image | v2 top-1 | Confidence | Verdict shown to the farmer |
|---|---|---|---|
| `rice-bacterial-blight/1.jpg` | `Rice___Bacterial_blight` ✓ | 0.7852 | `match` |
| `rice-blast/1.jpg` † | `Corn_(maize)___healthy` ✗ | 0.2109 | `unsure` |
| `rice-blast/2.jpg` | `Corn_(maize)___healthy` ✗ | 0.1621 | `unsure` |
| `rice-brown-spot/1.jpg` | `Rice___Brown_spot` ✓ | 0.2993 | `unsure` |
| `rice-brown-spot/2.jpg` | `Rice___Brown_spot` ✓ | 0.8751 | `match` |
| `rice-tungro/1.jpg` | `Corn_(maize)___healthy` ✗ | 0.3090 | `unsure` |

Top-1 correct **3 / 6 (0.50)**, mean confidence **0.4403**, and only **2 of 6**
clear `MIN_CONFIDENCE` (0.7) — so of six photographs of diseased rice, the app
would say something useful about two, correctly.

† **One of these six was not a photograph of a leaf.** The file then at
`rice-blast/1.jpg` was 255 × 137 pixels of light microscopy — hyphae and a
conidium of *Magnaporthe grisea* — which had been bundled as a farmer-facing
reference image by mistake and has since been removed from the app (the reason,
and the misattribution that came with it, are recorded in
`frontend/public/disease-reference/ATTRIBUTION.md` §3; the surviving lesion
photograph, then `2.jpg`, is now `rice-blast/1.jpg`). Feeding a microscope slide
to a leaf classifier measures nothing, so the honest restatement over the five
remaining leaf photographs is **3 / 5 correct**, mean confidence **0.4861**,
**2 / 5** clearing the threshold. The conclusion does not move: the model is
poor on field photographs of rice either way, and note that the good blast
lesion photograph — a clean close-up on a plain background, about as
in-distribution as a real photograph gets — was itself misread as healthy maize
at 0.1621.

Three of the six landed in `Corn_(maize)___healthy`. That is not a coincidence;
see §5.

A structural cause, not bad luck: **the retrain's rice dataset had four disease
folders and no healthy folder.** There is no `Rice___healthy` class, so "this
rice leaf is fine" is not a representable output. A healthy rice leaf's
probability mass has nowhere to go but blast, bacterial blight, brown spot,
tungro — or another plant entirely. This is asserted in
`diseaseVision.test.ts` ("gives every \*\_\_\_healthy class the healthy finding
and nothing else" expects **5**, not 6) and derived at runtime as
`PLANTS_WITH_HEALTHY_CLASS`.

## 5. Group C — out-of-domain, on 10 images of plants neither model knows

Groundnut rust, onion downy mildew, wheat stripe rust, wheat leaf rust and
soybean rust — five folders the *weather* path uses and the photo path does not
cover.

| | v1 | v2 |
|---|---|---|
| Mean confidence | 0.6229 | 0.5569 |
| ≥ `MIN_CONFIDENCE` (0.7) | 4 / 10 | 4 / 10 |

v2's four confident-wrong readings:

| Image | v2 top-1 | Confidence |
|---|---|---|
| `groundnut-rust/1.jpg` | `Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot` | 0.8193 |
| `onion-downy-mildew/1.jpg` | `Corn_(maize)___healthy` | 0.8864 |
| `onion-downy-mildew/2.jpg` | `Corn_(maize)___healthy` | 0.9630 |
| `wheat-stripe-rust/1.jpg` | `Rice___Blast` | 0.7027 |

Two findings here matter more than the averages:

1. **`MIN_CONFIDENCE` does not protect against out-of-domain photographs.** The
   threshold was chosen to suppress uncertain readings, and it does that; it has
   no opinion about a model that is confidently certain of the wrong plant. The
   crop-coverage gate (`visionCoversCrop`) is the real protection, and it only
   works for the six crops the app *knows* are uncovered.

2. **`Corn_(maize)___healthy` is this model's dumping ground for unfamiliar
   leaves.** It absorbed both onion photographs at 0.8864 and 0.9630, and three
   of the six rice photographs. Before this measurement, that class rendered
   through the same code path as any other healthy reading, which means a farmer
   holding a visibly diseased leaf could read *"this leaf looks similar to
   healthy leaves (96% similar)"* with a small mismatch note above it. A
   confident all-clear on a sick plant is worse than a wrong disease name,
   because it ends the investigation instead of misdirecting it.

Across all 44 images the two models disagreed on 15.

## 6. What was decided, and what shipped

The user's recorded decision was **keep v2 and gate rice honestly**, rather than
roll back — rolling back would drop rice coverage entirely, and v2's rice
answers, while poor, are better than nothing for two photographs in six.
Consequently:

- **Rice matches carry a caveat.** `VisionVerdict.match` now carries
  `plantHasHealthyClass`, derived from `PLANTS_WITH_HEALTHY_CLASS`; when false,
  `DiseasePhotoCard` says the check has no example of a healthy leaf for this
  crop and always names a condition. Retraining with a healthy-rice folder
  silences the caveat automatically.
- **A healthy reading for someone else's plant gets its own verdict kind.**
  `otherPlantHealthy` states no percentage and makes no health claim; it says
  the leaf was probably not recognised and asks for another photo. §5 finding 2
  is the reason it exists.
- **The covered-crop list is derived, not translated.** It had gone stale: the
  deleted `vision.coveredCrops` string still named three crops two months after
  rice made it four, so an uncovered-crop farmer was shown a false claim about
  the app's coverage. `DiseasePhotoCard` now builds the list from
  `COVERED_CROPS`.

Regression pins for all three live in
`frontend/src/services/__tests__/diseaseVision.test.ts` and
`frontend/src/components/DiseasePhotoCard.test.ts`, including the two measured
onion confidences.

## 7. Still open

- **Out-of-domain confidence is unsolved.** Nothing in the app detects "this is
  a plant I have never seen". A rejection class, or an out-of-distribution score,
  would be the real fix; the coverage gate is a partial substitute that depends
  on the farmer's declared crop being right.
- **Rice needs a healthy class.** Any future retrain should include a
  healthy-rice folder before anything else; it removes both the caveat and the
  structural pull towards `Corn_(maize)___healthy`.
- **Field images, not laboratory images, for evaluation.** Group A is
  near-certainly contaminated and Groups B and C are small. A held-out set of
  field photographs with verified identifications is what would actually measure
  this model.
