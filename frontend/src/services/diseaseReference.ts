import type { CropName } from '../types';
import type { DiseaseId } from './diseaseKnowledge';
import type { VisionClass } from './diseaseVisionMap';

/**
 * Who made a photograph, and under what licence.
 *
 * WHY THIS IS PER-IMAGE AND NOT ONE STRING PER CARD
 * Both cards used to print a single hardcoded credit: the weather card said
 * "USDA reference images · Public domain / CC BY 3.0" and the photo card said
 * "PlantVillage examples · CC BY-SA 3.0". Neither was true of the images beside
 * it. The weather card credited USDA for PlantVillage, EcoPort, DLR Rheinpfalz
 * and JIRCAS photographs and named two licences while displaying images under
 * five; the photo card credited PlantVillage for every rice image, none of which
 * came from PlantVillage. CC BY-SA 3.0, CC BY 4.0, CC BY 2.0 and CC BY 3.0 US
 * all *require* naming the author and the licence, so this was a licence breach
 * on the farmer's screen and not merely an inaccuracy — and it is the same class
 * of defect as the misattributed rice-blast image recorded in ATTRIBUTION.md §3.
 *
 * Attaching the credit to the image makes the wrong answer unrepresentable: an
 * image cannot be added without saying where it came from, and the rendered line
 * is derived from the images actually on screen.
 *
 * Deliberately NOT translated. `holder` is a person, an institution or an
 * archive and `licence` is the name of a legal instrument; translating either
 * would misattribute the work in five languages instead of one. Only the framing
 * label around them is translated (`vision.referenceCredit`).
 */
export interface ImageCredit {
  /** Attribution as the source requires it — author, and archive where relevant. */
  readonly holder: string;
  /** Short licence name, e.g. "CC BY-SA 3.0". */
  readonly licence: string;
}

export interface DiseaseReferenceImage {
  readonly src: string;
  readonly sourceFile: string;
  readonly credit: ImageCredit;
}

// Shared credits, named so that folders from one source cannot drift apart.
// Every value here is transcribed from `public/disease-reference/ATTRIBUTION.md`,
// which records the verification for each one.
const PLANTVILLAGE: ImageCredit = { holder: 'PlantVillage', licence: 'CC BY-SA 3.0' };
const GROTH: ImageCredit = {
  holder: 'Donald Groth, LSU AgCenter (Bugwood.org)',
  licence: 'CC BY 3.0 US',
};
const JIRCAS: ImageCredit = { holder: 'Nozaki Michio, TARC (JIRCAS)', licence: 'CC BY 2.0' };
const USDA_KOLMER: ImageCredit = { holder: 'James Kolmer, USDA ARS', licence: 'Public domain' };
const LANDCARE: ImageCredit = {
  holder: 'LandCare Ltd. New Zealand (EcoPort)',
  licence: 'CC BY-SA 3.0',
};
/**
 * Two Commons files whose author is not recorded on the file page. Public domain
 * imposes no attribution duty, so naming the repository is the honest maximum —
 * inventing an author to fill the column is exactly what went wrong before.
 */
const COMMONS_PD: ImageCredit = { holder: 'Wikimedia Commons', licence: 'Public domain' };

/**
 * At least one image per class; most have exactly two. The 14 PlantVillage
 * classes are bundled with the model export in confirmed same-licensed pairs;
 * the 4 rice classes are sourced individually — from Wikimedia Commons, Bugwood
 * and the JIRCAS photo archive — because rice has no PlantVillage entry, and for
 * one of them a second freely licensed photograph of the same condition on the
 * same host does not appear to exist. Showing one honest reference beats blocking
 * the whole feature on finding a second, or bundling one of uncertain licence, or
 * padding the pair with a lookalike. `ATTRIBUTION.md` records every gap and every
 * candidate that was rejected, with the reason.
 */
const REFERENCE_IMAGES: Readonly<Record<string, readonly DiseaseReferenceImage[]>> = {
  'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': references(
    'maize-gray-leaf-spot',
    '00120a18-ff90-46e4-92fb-2b7a10345bd3___RS_GLSp 9357.JPG',
    '00a20f6f-e8bd-4453-9e25-36ea70feb626___RS_GLSp 4655.JPG',
  ),
  'Corn_(maize)___Common_rust_': references(
    'maize-common-rust',
    'RS_Rust 1563.JPG',
    'RS_Rust 1564.JPG',
  ),
  'Corn_(maize)___Northern_Leaf_Blight': references(
    'maize-northern-leaf-blight',
    '005318c8-a5fa-4420-843b-23bdda7322c2___RS_NLB 3853 copy.jpg',
    '0079c731-80f5-4fea-b6a2-4ff23a7ce139___RS_NLB 4121.JPG',
  ),
  Potato___Early_blight: references(
    'potato-early-blight',
    '001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG',
    '002a55fb-7a3d-4a3a-aca8-ce2d5ebc6925___RS_Early.B 8170.JPG',
  ),
  Potato___Late_blight: references(
    'potato-late-blight',
    '0051e5e8-d1c4-4a84-bf3a-a426cdad6285___RS_LB 4640.JPG',
    '00695906-210d-4a9d-822e-986a17384115___RS_LB 4026.JPG',
  ),
  Tomato_Bacterial_spot: references(
    'tomato-bacterial-spot',
    '00416648-be6e-4bd4-bc8d-82f43f8a7240___GCREC_Bact.Sp 3110.JPG',
    '0045ba29-ed1b-43b4-afde-719cc7adefdb___GCREC_Bact.Sp 6254.JPG',
  ),
  Tomato_Early_blight: references(
    'tomato-early-blight',
    '0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B 8389.JPG',
    '0034a551-9512-44e5-ba6c-827f85ecc688___RS_Erly.B 9432.JPG',
  ),
  Tomato_Late_blight: references(
    'tomato-late-blight',
    '0003faa8-4b27-4c65-bf42-6d9e352ca1a5___RS_Late.B 4946.JPG',
    '00355ec2-f12c-4015-b8f9-94354f69ce22___RS_Late.B 5311.JPG',
  ),
  Tomato_Leaf_Mold: references(
    'tomato-leaf-mould',
    '00694db7-3327-45e0-b4da-a8bb7ab6a4b7___Crnl_L.Mold 6923.JPG',
    '0160c3b5-d89e-40e5-a313-49ae1524040a___Crnl_L.Mold 6823.JPG',
  ),
  Tomato_Septoria_leaf_spot: references(
    'tomato-septoria-leaf-spot',
    '002533c1-722b-44e5-9d2e-91f7747b2543___Keller.St_CG 1831.JPG',
    '0025c401-7785-49c5-8bef-780a8a0d3652___Matt.S_CG 2694.JPG',
  ),
  Tomato_Spider_mites_Two_spotted_spider_mite: references(
    'tomato-spider-mites',
    '002835d1-c18e-4471-aa6e-8d8c29585e9b___Com.G_SpM_FL 8584.JPG',
    '003b7929-a364-4e74-be1c-37c4c0a6ec63___Com.G_SpM_FL 1414.JPG',
  ),
  Tomato__Target_Spot: references(
    'tomato-target-spot',
    '002213fb-b620-4593-b9ac-6a6cc119b100___Com.G_TgS_FL 8360.JPG',
    '003a5321-0430-42dd-a38d-30ac4563f4ba___Com.G_TgS_FL 8121.JPG',
  ),
  Tomato__Tomato_YellowLeaf__Curl_Virus: references(
    'tomato-yellow-leaf-curl-virus',
    '00139ae8-d881-4edb-925f-46584b0bd68c___YLCV_NREC 2944.JPG',
    '0036c89d-7743-4895-9fcf-b8d2c1fc8455___YLCV_NREC 0313.JPG',
  ),
  Tomato__Tomato_mosaic_virus: references(
    'tomato-mosaic-virus',
    '000ec6ea-9063-4c33-8abe-d58ca8a88878___PSU_CG 2169.JPG',
    '006e354b-c054-4b72-a83c-e3feb038942e___PSU_CG 2330.JPG',
  ),

  // --- Rice: sourced individually rather than bundled with the model export,
  // because rice has no PlantVillage entry. Blast reuses the rice-blast folder
  // already added for the weather-risk card (WEATHER_REFERENCE_IMAGES below);
  // the other three are new. See ATTRIBUTION.md for full source/licence details
  // of every folder, and for the gaps and the rejected candidates.
  Rice___Bacterial_blight: [
    {
      src: '/disease-reference/rice-bacterial-blight/1.jpg',
      sourceFile: 'Bacterial blight of rice.jpeg',
      credit: GROTH,
    },
  ],
  // One image. The folder used to hold two, and the first was light microscopy
  // of the pathogen's hyphae and a conidium at 255x137 — an image of the fungus,
  // not of a symptom, shown to a farmer under "compare your leaf against these".
  // It was removed rather than replaced: no second freely licensed photograph of
  // a blast LESION exists that is usable, and the alternatives are worse than one
  // (ATTRIBUTION.md records all three, including one carrying a named fungicide
  // burned into the image).
  Rice___Blast: [
    {
      src: '/disease-reference/rice-blast/1.jpg',
      sourceFile: 'Rice blast Magnaporthe grisea.jpg',
      credit: COMMONS_PD,
    },
  ],
  Rice___Brown_spot: [
    {
      src: '/disease-reference/rice-brown-spot/1.jpg',
      sourceFile: 'Cochliobolus miyabeanus.jpg',
      credit: GROTH,
    },
    {
      src: '/disease-reference/rice-brown-spot/2.jpg',
      sourceFile: 'Helminthosporium oryzae at Oryza sativa (01).jpg',
      credit: { holder: 'William M. Brown Jr. (Bugwood.org)', licence: 'CC BY 3.0 US' },
    },
  ],
  Rice___Tungro: [
    {
      src: '/disease-reference/rice-tungro/1.jpg',
      sourceFile: 'Rice plants affected by tungro disease1.jpg',
      credit: JIRCAS,
    },
    // Same photographer and archive as 1.jpg, from the JIRCAS Flickr collection
    // rather than Commons — Commons holds exactly one tungro photograph and it is
    // 1.jpg. Both are canopy views because that is how tungro presents: patchy
    // orange-yellow discolouration and stunting across a stand, not a single
    // lesion on a single blade.
    {
      src: '/disease-reference/rice-tungro/2.jpg',
      sourceFile: '35741758564_18c382be02_b.jpg',
      credit: JIRCAS,
    },
  ],
};

const WEATHER_REFERENCE_IMAGES: Readonly<
  Partial<Record<`${CropName}:${DiseaseId}`, readonly DiseaseReferenceImage[]>>
> = {
  // Both rice entries reuse the photo path's folders: same disease, same host, so
  // the two cards must not disagree about what it looks like. Both are single
  // images — see the notes on REFERENCE_IMAGES above, and ATTRIBUTION.md. This is
  // why neither card can gate on "exactly two".
  'Rice:riceBlast': REFERENCE_IMAGES.Rice___Blast!,
  'Rice:riceBacterialLeafBlight': REFERENCE_IMAGES.Rice___Bacterial_blight!,
  'Wheat:wheatStripeRust': [
    {
      src: '/disease-reference/wheat-stripe-rust/1.jpg',
      sourceFile: 'Stripe rust on wheat.jpg',
      credit: COMMONS_PD,
    },
    {
      src: '/disease-reference/wheat-stripe-rust/2.jpg',
      sourceFile: 'Dz. rūsa z.tritikāle 2015.jpg',
      credit: { holder: 'Brauna55', licence: 'CC BY-SA 4.0' },
    },
  ],
  'Wheat:wheatLeafRust': [
    {
      src: '/disease-reference/wheat-leaf-rust/1.jpg',
      sourceFile: 'Wheat leaf rust on wheat.jpg',
      credit: USDA_KOLMER,
    },
    {
      src: '/disease-reference/wheat-leaf-rust/2.jpg',
      sourceFile: 'Wheat leaf rust on wheat (detail).jpg',
      credit: USDA_KOLMER,
    },
  ],
  'Maize:maizeTurcicumLeafBlight': REFERENCE_IMAGES['Corn_(maize)___Northern_Leaf_Blight']!,
  'Maize:maizeCommonRust': REFERENCE_IMAGES['Corn_(maize)___Common_rust_']!,
  'Soybean:soybeanRust': [
    {
      src: '/disease-reference/soybean-rust/1.jpg',
      sourceFile: 'Soybean rust symptoms.jpg',
      credit: { holder: 'Reid Frederick, USDA ARS (Bugwood.org)', licence: 'Public domain' },
    },
    {
      src: '/disease-reference/soybean-rust/2.jpg',
      sourceFile: 'Soybean rust sporulation.jpg',
      credit: {
        holder: 'Florida Division of Plant Industry Archive (Bugwood.org)',
        licence: 'CC BY 3.0 US',
      },
    },
  ],
  'Groundnut:groundnutRust': [
    {
      src: '/disease-reference/groundnut-rust/1.jpg',
      sourceFile: 'Puccinia arachidis.jpg',
      credit: LANDCARE,
    },
    {
      src: '/disease-reference/groundnut-rust/2.jpg',
      sourceFile: 'Puccinia arachidis2.jpg',
      credit: LANDCARE,
    },
  ],
  'Onion:onionDownyMildew': [
    {
      src: '/disease-reference/onion-downy-mildew/1.jpg',
      sourceFile: 'Peronospora destructor.JPG',
      credit: {
        holder: 'Howard F. Schwartz, Colorado State University (Bugwood.org)',
        licence: 'CC BY 3.0 US',
      },
    },
    {
      src: '/disease-reference/onion-downy-mildew/2.jpg',
      sourceFile: 'Falscher Mehltau 2 (Peronospora destructor)-DLR-NW-jk.jpg',
      credit: { holder: 'Jochen Kreiselmaier, DLR Rheinpfalz', licence: 'CC BY 4.0' },
    },
  ],
  // One image, not two. It is the only freely licensed photograph of
  // Puccinia melanocephala on sugarcane that exists on Commons, and it is small
  // (381x249) — but the pustules are legible, the host is right and the
  // identification is EcoPort's rather than an anonymous uploader's. The
  // rejected alternative is recorded in ATTRIBUTION.md: a file TITLED
  // "sugarcane leaf rust" that actually shows a split stalk with internal red
  // discolouration and a borer larva, which is not rust at all.
  'Sugarcane:sugarcaneRust': [
    {
      src: '/disease-reference/sugarcane-rust/1.jpg',
      sourceFile: 'Puccinia melanocephala.jpg',
      credit: { holder: 'K.C. Alexander (EcoPort)', licence: 'CC BY-SA 3.0' },
    },
  ],
  'Tomato:lateBlight': REFERENCE_IMAGES.Tomato_Late_blight!,
  'Tomato:earlyBlight': REFERENCE_IMAGES.Tomato_Early_blight!,
  'Potato:lateBlight': REFERENCE_IMAGES.Potato___Late_blight!,
  'Potato:earlyBlight': REFERENCE_IMAGES.Potato___Early_blight!,
};

/**
 * A PlantVillage pair. Used for the 14 folders that ship with the model export
 * and only for those, which is why the credit is not a parameter — every caller
 * would pass the same value, and a parameter would invite the next folder to be
 * added here with the wrong one.
 */
function references(
  slug: string,
  firstSourceFile: string,
  secondSourceFile: string,
): readonly DiseaseReferenceImage[] {
  return [
    { src: `/disease-reference/${slug}/1.jpg`, sourceFile: firstSourceFile, credit: PLANTVILLAGE },
    { src: `/disease-reference/${slug}/2.jpg`, sourceFile: secondSourceFile, credit: PLANTVILLAGE },
  ];
}

/**
 * The attribution line for a set of images, deduplicated in display order.
 *
 * Deduplication is the point as much as the concatenation: a PlantVillage pair
 * shares one credit, and printing it twice would read as two sources. Returns an
 * empty string for no images so the caller can skip the line entirely rather
 * than render a bare label.
 */
export function creditLineFor(images: readonly DiseaseReferenceImage[]): string {
  const parts: string[] = [];
  for (const { credit } of images) {
    const part = `${credit.holder} — ${credit.licence}`;
    if (!parts.includes(part)) parts.push(part);
  }
  return parts.join(' · ');
}

export function referenceImagesFor(
  rawClass: string,
  entry: VisionClass,
): readonly DiseaseReferenceImage[] {
  if (entry.finding.kind === 'healthy') return [];
  return REFERENCE_IMAGES[rawClass] ?? [];
}

export function weatherReferenceImagesFor(
  crop: CropName,
  disease: DiseaseId,
): readonly DiseaseReferenceImage[] {
  return WEATHER_REFERENCE_IMAGES[`${crop}:${disease}`] ?? [];
}

export { REFERENCE_IMAGES, WEATHER_REFERENCE_IMAGES };
