# Disease reference-image attribution

Every image in this directory is shown to a farmer as an example to compare against — never as evidence that a disease is present. This file records where each one came from, under what licence, and, just as importantly, **which diseases have no image and why**. A missing picture is a documented gap here, not an oversight to be quietly filled with a lookalike.

Original filenames are recorded alongside each path in `frontend/src/services/diseaseReference.ts`.

None of these images have been cropped, annotated, recoloured or otherwise modified. They were renamed to `1.jpg` / `2.jpg` for stable application URLs, and that is the only change. Several are CC BY-SA; because they are displayed unmodified and merely aggregated with the application, ShareAlike attaches to the images themselves and imposes nothing on the surrounding code.

## 1. PlantVillage images (bundled with the model export)

The 14 folders for maize, potato and tomato are reference examples from the **PlantVillage Dataset** by David P. Hughes and Marcel Salathé and the dataset contributors.

- Source: https://github.com/spMohanty/PlantVillage-Dataset
- Source commit: `7f7ecc7e1eaca78107e3affe7cb5abd9427e139a`
- Dataset licence declaration: https://huggingface.co/datasets/mohanty/PlantVillage
- Licence: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)

These are laboratory-style training images: a single detached leaf on a uniform background. They may differ substantially from the same disease photographed in a real field.

## 2. Individually sourced images

Rice has no PlantVillage entry, and the weather-risk card covers six crops the photo model does not. Those folders were sourced one image at a time from Wikimedia Commons, Bugwood.org and the JIRCAS photo archive.

| Folder | Source file | Author / archive | Licence |
|---|---|---|---|
| `rice-blast/1.jpg` | Rice blast Magnaporthe grisea.jpg | Not recorded on the Commons file page | Public domain |
| `rice-bacterial-blight/1.jpg` | Bacterial blight of rice.jpeg | Donald Groth, Louisiana State University AgCenter, Bugwood.org | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) |
| `rice-brown-spot/1.jpg` | Cochliobolus miyabeanus.jpg | Donald Groth, Louisiana State University AgCenter, Bugwood.org | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) |
| `rice-brown-spot/2.jpg` | Helminthosporium oryzae at Oryza sativa (01).jpg | William M. Brown Jr., Bugwood.org | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) |
| `rice-tungro/1.jpg` | Rice plants affected by tungro disease1.jpg | Nozaki Michio (TARC), JIRCAS Photo Archive, via Flickr | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| `rice-tungro/2.jpg` | 35741758564_18c382be02_b.jpg | Nozaki Michio (TARC), JIRCAS Photo Archive, via Flickr | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| `wheat-stripe-rust/1.jpg` | Stripe rust on wheat.jpg | Not recorded on the Commons file page | Public domain |
| `wheat-stripe-rust/2.jpg` | Dz. rūsa z.tritikāle 2015.jpg | Brauna55 (own work), via Wikimedia Commons | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `wheat-leaf-rust/1.jpg` | Wheat leaf rust on wheat.jpg | James Kolmer, USDA Agricultural Research Service | Public domain |
| `wheat-leaf-rust/2.jpg` | Wheat leaf rust on wheat (detail).jpg | James Kolmer, USDA Agricultural Research Service | Public domain |
| `soybean-rust/1.jpg` | Soybean rust symptoms.jpg | Reid Frederick, USDA Agricultural Research Service, Bugwood.org | Public domain |
| `soybean-rust/2.jpg` | Soybean rust sporulation.jpg | Florida Division of Plant Industry Archive, USDA Forest Service, Bugwood.org | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) |
| `groundnut-rust/1.jpg` | Puccinia arachidis.jpg | LandCare Ltd., New Zealand, via EcoPort | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `groundnut-rust/2.jpg` | Puccinia arachidis2.jpg | LandCare Ltd., New Zealand, via EcoPort | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `onion-downy-mildew/1.jpg` | Peronospora destructor.JPG | Howard F. Schwartz, Colorado State University, Bugwood.org | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) |
| `onion-downy-mildew/2.jpg` | Falscher Mehltau 2 (Peronospora destructor)-DLR-NW-jk.jpg | Jochen Kreiselmaier, DLR Rheinpfalz | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `sugarcane-rust/1.jpg` | Puccinia melanocephala.jpg | K.C. Alexander, via EcoPort and Wikimedia Commons | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |

### Qualifications a farmer would want to know

Three of the rows above are weaker than they look, and the app should not pretend otherwise:

- **`wheat-stripe-rust/2.jpg` is triticale, not wheat.** Its Latvian description reads *"Dzeltenā rūsa uz ziemas tritikāles lapām"* — yellow rust on winter triticale leaves. Same pathogen (*Puccinia striiformis*), and triticale is a wheat × rye hybrid whose rust stripes are visually indistinguishable, so it was kept. The host is still not wheat.
- **`wheat-leaf-rust/1.jpg` and `2.jpg` are one photograph, not two.** `2.jpg` is a 342 × 300 detail from the same 640 × 426 original. It is a closer look, not an independent second example.
- **`sugarcane-rust/1.jpg` is small** — 381 × 249. The pustules are legible and the identification is EcoPort's, which is why it was accepted, but it will look soft next to the PlantVillage images.

## 3. Diseases with only one image

`rice-blast`, `rice-bacterial-blight` and `sugarcane-rust` ship one image each. Both cards render one-or-two rather than requiring a pair, and tell the farmer when they are looking at a single example (`vision.referenceSingle`). The singleton lists are pinned in `DiseaseRiskCard.test.ts` and `diseaseVision.test.ts` so a pair cannot quietly drop to one.

**`rice-blast` used to ship two, and the first one should never have shipped.** It was `File:Magnaporthe grisea.jpg` — 255 × 137 pixels of light microscopy showing hyphae and a conidium of the pathogen. An image of the fungus, not of a symptom, offered to a farmer under the heading "compare your leaf against these photographs". It was also misattributed here as USDA ARS / public domain when it is in fact CC BY 2.5 by a Commons user. It has been removed, and the surviving lesion photograph renumbered from `2.jpg` to `1.jpg`.

**The `rice-blast` rows were the only misattributions found in this file**, but they were checked only because this file was being extended; the rest of section 2 was verified against the Wikimedia Commons API at the same time and is accurate as of 2026-08-18.

### The credit line the farmer actually saw was wrong

This file being right was never enough, because the farmer does not read this file. Until 2026-08-18 each card printed **one hardcoded credit string** under whatever images it happened to be showing:

- The weather card (`DiseaseRiskCard`) said *"USDA reference images · Public domain / CC BY 3.0"*. It showed photographs from PlantVillage, EcoPort, DLR Rheinpfalz, Bugwood and Wikimedia Commons under six different licences. Of the 27 images that card can display, **three are USDA**.
- The photo card (`DiseasePhotoCard`) said *"PlantVillage examples · CC BY-SA 3.0"*. Correct for the 14 bundled classes; wrong for all six rice images, which come from Bugwood and JIRCAS under CC BY 3.0 US and CC BY 2.0.

CC BY-SA 3.0, CC BY-SA 4.0, CC BY 4.0, CC BY 2.0 and CC BY 3.0 US all *require* the author and the licence to be named. So this was a licence breach on screen, not only an inaccurate caption — and it was invisible to the test suite, because no test read the credit.

Fixed by attaching the credit to each image (`ImageCredit` in `frontend/src/services/diseaseReference.ts`, transcribed from the table above) and deriving the rendered line from the images actually on screen, deduplicated. An image can no longer be added without saying where it came from. `disease.referenceCredit` was deleted from all five languages rather than left unused, and `diseaseVision.test.ts` now pins the licence set, the USDA list and the absence of both old strings.

## 4. Diseases with no image at all

Six of the twenty crop–disease pairs in `CROP_DISEASES` have no reference photograph:

| Crop | Disease | Pathogen searched for |
|---|---|---|
| Cotton | Alternaria leaf spot | *Alternaria macrospora*, *A. gossypina* |
| Cotton | Bacterial blight | *Xanthomonas citri* pv. *malvacearum* |
| Sugarcane | Red rot | *Colletotrichum falcatum*, *Glomerella tucumanensis* |
| Soybean | Anthracnose | *Colletotrichum truncatum* |
| Groundnut | Late leaf spot | *Nothopassalora personata*, *Cercosporidium personatum* |
| Onion | Purple blotch | *Alternaria porri* |

**This is not achievable from freely licensed sources today.** Wikimedia Commons was searched by common name and by causal organism for every row above; the categories `Sugarcane diseases`, `Cotton diseases`, `Soybean diseases`, `Peanut diseases`, `Onion diseases` and `Rice diseases` do not exist; and Openverse was searched restricted to `by`, `by-sa`, `cc0` and `pdm`. For cotton Alternaria leaf spot, sugarcane red rot and soybean anthracnose there is **nothing at all** under a licence this app can use.

Closing these gaps needs either the project's own field photographs with verified identifications, or a licence from ICAR or a state agricultural university. It does not need a lookalike.

### Candidates found and rejected

Recorded so nobody re-litigates them:

| Candidate | Intended for | Why rejected |
|---|---|---|
| `File:Penyakit Karah (Reput Tangkai).jpg` (CC BY-SA 3.0, 4272 × 2848) | Rice blast | Correct host and disease, and a good photograph — but it carries a burned-in caption ending *"Cara Mengatasi - Fujione 40EC"*, naming a fungicide product and its formulation strength. `docs/12_Product_Roadmap_v2.md` §Product Boundaries forbids the app naming a chemical or stating a concentration; an image cannot be an exception to a rule the text obeys. |
| `File:LPCC-747-Arròs amb piriculariosi.jpg` (CC BY-SA 3.0) | Rice blast | Book-figure scan of detached panicles with leader lines and a Catalan annotation (*"Zona necrosada"*) burned in. Neck blast rather than leaf blast, annotated, and labelled in a language no user of this app reads. |
| `File:Rice blast.jpg` (public domain) | Rice blast | 163 × 252. Too small to compare a leaf against. |
| `File:Sugarcane leaf rust.jpg` (CC BY-SA 4.0, 2448 × 3264) | Sugarcane rust | **Titled** "sugarcane leaf rust", but the photograph shows a split stalk with internal red discolouration and a borer larva. That is not rust — rust is a leaf disease producing pustules on the blade. The uploader's own description says "red rust and a worm". A mislabelled file, and one that would teach the wrong symptom on the wrong plant part. |
| JIRCAS Flickr, *"Bacterial Leaf Blight Damage = しらはがれ病罹病稲"* (CC BY 2.0, 1024 × 712) | Rice bacterial blight (2nd image) | Institutional identification, correct host and disease — but a whole-plot canopy view at heading with trial signboards, in which no individual lesion is legible. A straw-coloured rice canopy at maturity looks much the same whether it is blighted or simply ripe, so as a comparison target it invites a false positive. The existing `1.jpg` shows the marginal lesions unambiguously; pairing them would subtract information. |
| `File:Xanthomonas-disease.jpg` (CC BY 4.0) | Rice bacterial blight (2nd image) | A composite plate of four diseases — cabbage black rot, citrus canker, rice bacterial leaf streak and rice bacterial blight. Showing a rice farmer cabbage and citrus is worse than showing nothing. |
| `File:Fig-1-...-cotton-leaf-displaying-the-bacterial-blight...gif` (CC BY 4.0) | Cotton bacterial blight | Correct host and disease, from a published genome paper — but a 472 × 176 **GIF** of a two-panel figure, so roughly 236 px per panel. Too small to compare a leaf against, and the wrong file format for the asset pipeline. |
| MycoKeys 81:67850 Figures 14 and 15 (CC BY 4.0) | Groundnut late leaf spot | Figure 14 puts *Nothopassalora personata* (late leaf spot) and *Passalora arachidicola* (**early** leaf spot) on the same plate, so it cannot be shown uncropped without illustrating the wrong disease. Figure 15 is conidiophore microscopy. |
| `File:Alternaria porri.jpg` (CC BY 3.0, 499 × 335) | Onion purple blotch | On **leek**, not onion — the French description reads *"Alternariose du poireau"*. |
| `File:Alternaria porri (396462144).jpg` (CC BY 2.0) | Onion purple blotch | A student's Flickr photograph with no host stated and no way to verify the identification. |
