import type { Language } from '../types';

/**
 * UI translations (docs/12_Product_Roadmap_v2.md Feature 2 — Multi-language
 * Support).
 *
 * A flat key-value map is deliberately used instead of an i18n library — the
 * string set is small and the Engineering Rules require proving a dependency
 * is necessary before adding one (docs/07_Engineering_Rules.md). The English
 * table defines the key set; Hindi, Bengali, Assamese, and Urdu tables are typed against it so
 * a missing translation is a compile error. `{name}` placeholders are
 * interpolated by translate().
 */

const en = {
  'app.loading': 'Loading…',
  'app.initErrorTitle': 'Could not open the app data',
  'app.initErrorBody':
    'Please close all other IrrigaSmart tabs, then reload this page. Your saved farms are safe.',
  'app.reload': 'Reload',
  'app.offlineBanner':
    'You are offline. Showing saved data — recommendations use your last weather.',

  'nav.today': 'Today',
  'nav.farms': 'Farms',
  'nav.history': 'History',
  'nav.fertilizer': 'Fertilizer',
  'nav.settings': 'Settings',

  'dashboard.greeting': 'Namaste, {name}',
  'dashboard.addFirstFarm': "Add your first farm to see today's irrigation recommendation.",
  'dashboard.addFarm': 'Add a farm',
  'dashboard.checking': "Checking today's conditions…",
  'dashboard.errorGeneric': 'Something went wrong generating your recommendation.',
  'dashboard.errorMissing': 'This farm is missing some details. Please edit it and try again.',
  'dashboard.errorTabs': 'IrrigaSmart is open in another tab. Close it, then tap Refresh.',
  'dashboard.refresh': 'Refresh',
  'dashboard.noteNoWeather':
    'No weather data available yet. Connect to the internet once to enable weather-based advice.',
  'dashboard.noteCached':
    'Unable to reach the weather service. Using your most recent saved weather.',

  'farmcard.noRecToday': 'No recommendation yet today — tap to generate.',
  'farmcard.lastWeather': 'Weather updated {time}',
  'farmcard.noWeather': 'No weather yet',

  'weather.temperature': 'Temperature',
  'weather.rainToday': 'Rain today',
  'weather.humidity': 'Humidity',
  'weather.sunshine': 'Sunshine',
  'weather.dryingPoor': 'Dull day — leaves stay wet longer',
  'weather.dryingModerate': 'Some sun — leaves dry slowly',
  'weather.dryingGood': 'Bright day — leaves dry quickly',
  'weather.cacheNote': 'Showing your most recent saved weather — connect to update.',

  'rec.ariaLabel': "Today's recommendation",
  'rec.bestTime': 'Best time',
  'rec.waterDepth': 'Water depth',
  'rec.totalVolume': 'Total volume',
  'rec.confidenceBadge.high': 'High confidence',
  'rec.confidenceBadge.medium': 'Medium confidence',
  'rec.confidenceBadge.low': 'Low confidence',
  'rec.help.high': 'Based on fresh weather data.',
  'rec.help.medium': 'Based on slightly older weather data.',
  'rec.help.low': 'Limited or missing weather data — treat as a rough guide.',
  'rec.window': 'Irrigation window',
  'rec.duration': 'Run time',
  'rec.flow': 'Delivery rate',
  'rec.minutes': '{n} min',
  'rec.litersPerMin': '{n} L/min',
  'rec.windowValue': '{start} – {end}',
  'rec.windowTomorrow': 'Tomorrow {start} – {end}',
  'rec.why.morning-default': 'Early morning loses the least water to evaporation.',
  'rec.why.hot-season': 'Summer heat — starting earlier keeps more water in the soil.',
  'rec.why.hot-day': 'A hot day today, so start before the sun is strong.',
  'rec.why.windy': 'Wind blows sprinkler spray away — the calm early hours are better.',
  'rec.why.cool-season': 'Cool winter mornings — a slightly later start is kinder to the crop.',
  'rec.why.long-run': 'This is a long run, so start early enough to finish before midday.',
  'rec.why.later-today': 'The morning slot has passed, so the next possible time is shown.',
  'rec.why.evening-slot': 'Too late for the morning — irrigate in the cool of the evening.',
  'rec.why.drying-window':
    'Little sunshine today, so sprinkler water would sit on the leaves all night. Tomorrow morning is safer for the crop.',

  'enum.status.Irrigate Today': 'Irrigate Today',
  'enum.status.Delay Irrigation': 'Delay Irrigation',
  'enum.status.Monitor Tomorrow': 'Monitor Tomorrow',

  'enum.crop.Rice': 'Rice',
  'enum.crop.Wheat': 'Wheat',
  'enum.crop.Maize': 'Maize',
  'enum.crop.Cotton': 'Cotton',
  'enum.crop.Sugarcane': 'Sugarcane',
  'enum.crop.Soybean': 'Soybean',
  'enum.crop.Groundnut': 'Groundnut',
  'enum.crop.Tomato': 'Tomato',
  'enum.crop.Potato': 'Potato',
  'enum.crop.Onion': 'Onion',

  'enum.stage.Initial': 'Initial',
  'enum.stage.Development': 'Development',
  'enum.stage.Mid Season': 'Mid Season',
  'enum.stage.Late Season': 'Late Season',

  'enum.soil.Sandy': 'Sandy',
  'enum.soil.Sandy Loam': 'Sandy Loam',
  'enum.soil.Loamy': 'Loamy',
  'enum.soil.Silty Loam': 'Silty Loam',
  'enum.soil.Clay Loam': 'Clay Loam',
  'enum.soil.Clay': 'Clay',

  'enum.method.Drip': 'Drip',
  'enum.method.Sprinkler': 'Sprinkler',
  'enum.method.Furrow': 'Furrow',
  'enum.method.Flood': 'Flood',

  'enum.area.Square metre': 'Square metre',
  'enum.area.Acre': 'Acre',
  'enum.area.Hectare': 'Hectare',

  'farms.title': 'Your farms',
  'farms.add': '+ Add farm',
  'farms.empty': 'No farms yet. Add your first farm to get an irrigation recommendation.',
  'farms.edit': 'Edit',
  'farms.delete': 'Delete',
  'farms.confirm': 'Confirm',
  'farms.soilSuffix': 'soil',

  'form.titleAdd': 'Add farm',
  'form.titleEdit': 'Edit farm',
  'form.name': 'Farm name',
  'form.namePlaceholder': 'e.g. North field',
  'form.locationName': 'Location name',
  'form.locationPlaceholder': 'e.g. Bolpur',
  'form.latitude': 'Latitude',
  'form.longitude': 'Longitude',
  'form.useMyLocation': 'Use my location',
  'form.searchPlaceholder': 'Search your village or city',
  'form.search': 'Search',
  'form.searching': 'Searching…',
  'form.searchNone': 'No places found. Try a nearby town name.',
  'form.searchFailed': 'Search failed. Check your internet and try again.',
  'form.locating': 'Finding your location…',
  'form.locationError.unsupported':
    'Location is not supported on this device. Please enter coordinates manually.',
  'form.locationError.denied':
    'Location permission was denied. You can allow it in browser settings, or enter coordinates manually.',
  'form.locationError.unavailable':
    'Could not determine your location. Try again or enter coordinates manually.',
  'form.locationError.lookupFailed':
    'Location found, but place details could not be loaded. Coordinates were filled in.',
  'form.soilSuggestion': 'Suggested soil for this area: {soil}. Please confirm or choose your own.',
  'form.applySuggestion': 'Use {soil}',
  'form.fieldSize': 'Field size',
  'form.unit': 'Unit',
  'form.crop': 'Crop',
  'form.growthStage': 'Growth stage',
  'form.soilType': 'Soil type',
  'form.irrigationMethod': 'Irrigation method',
  'form.cancel': 'Cancel',
  'form.save': 'Save farm',
  'form.saving': 'Saving…',
  'form.error.name': 'Please enter a farm name.',
  'form.error.location': 'Please enter the farm location (latitude and longitude).',
  'form.error.coords':
    'Please enter a valid location (latitude -90 to 90, longitude -180 to 180).',
  'form.error.area': 'Field size must be a number greater than zero.',
  'form.error.save': 'Could not save the farm. Please try again.',

  'history.title': 'History',
  'history.farmLabel': 'Farm',
  'history.loading': 'Loading history…',
  'history.empty': 'No recommendations yet for this farm. Open the Today tab to generate one.',
  'history.noFarms': 'No farms yet. Add a farm to start building history.',
  'history.at': 'at',
  'history.unavailable': 'Recommendation details unavailable.',

  'settings.title': 'Settings',
  'settings.profile': 'Profile',
  'settings.yourName': 'Your name',
  'settings.saved': 'Profile saved.',
  'settings.preferences': 'Preferences',
  'settings.language': 'Language',
  'settings.units': 'Units',
  'settings.unitsMetric': 'Metric (°C, mm, litres)',
  'settings.comingSoon': 'Coming soon',
  'settings.notifications': 'Irrigation reminders',
  'settings.cloudSync': 'Cloud sync (future release)',

  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',
  'lang.as': 'অসমীয়া',
  'lang.ur': 'اردو',

  'factors.title': 'Why this recommendation',
  'factors.name.crop': 'Crop',
  'factors.name.growthStage': 'Growth stage',
  'factors.name.temperature': 'Temperature',
  'factors.name.rainfall': 'Rainfall',
  'factors.name.humidity': 'Humidity',
  'factors.name.wind': 'Wind',
  'factors.name.soil': 'Soil type',
  'factors.name.irrigationMethod': 'Irrigation method',
  'factors.influence.increases': 'Raises need',
  'factors.influence.decreases': 'Lowers need',
  'factors.influence.neutral': 'Neutral',
  'factors.legend': 'More stars = bigger effect on today’s decision',
  'factors.strength.strong': 'Big effect',
  'factors.strength.moderate': 'Some effect',
  'factors.strength.weak': 'Small effect',
  'factors.starsLabel': '{stars} of 3 stars — {strength}',

  'plan.title': 'Plan for the coming days',
  'plan.today': 'Today',
  'plan.tomorrow': 'Tomorrow',
  'plan.rain': '{mm} mm rain',
  'plan.action.Irrigate Today': 'Irrigate',
  'plan.action.Delay Irrigation': 'Rain covers needs',
  'plan.action.Monitor Tomorrow': 'Watch',
  'plan.note.irrigate': 'Plan to irrigate on {day}.',
  'plan.note.rain': 'Rain may cover crop needs on {day}.',
  'plan.note.none': 'No irrigation expected in the coming days.',

  'onb.welcome.title': 'Welcome to IrrigaSmart',
  'onb.welcome.tagline':
    'IrrigaSmart helps you make better irrigation decisions using weather, crop information, and agricultural knowledge.',
  'onb.welcome.start': 'Get Started',
  'onb.next': 'Next',
  'onb.back': 'Back',
  'onb.about.title': 'About IrrigaSmart',
  'onb.about.body':
    'IrrigaSmart was created to help farmers decide when and how much to irrigate. It works even without internet, explains every recommendation in simple language, and is designed for farmers first.',
  'onb.how.title': 'How it works',
  'onb.how.step1': 'Add your farm',
  'onb.how.step2': 'We check the weather',
  'onb.how.step3': 'The decision engine thinks',
  'onb.how.step4': 'You get a recommendation',
  'onb.how.step5': 'With a clear explanation',
  'onb.trust.title': 'Why trust the recommendation',
  'onb.trust.body':
    'Every recommendation considers your crop, its growth stage, your soil, the weather, and your irrigation method — and always explains itself. IrrigaSmart supports your decisions; it does not replace your experience.',
  'onb.offline.title': 'Works offline',
  'onb.offline.body':
    'Your farm information stays on your phone. Weather you already received stays available even without internet, so you always get advice.',
  'onb.privacy.title': 'Your privacy',
  'onb.privacy.body':
    'Your farm details stay on your device. No personal information is shared with anyone.',
  'onb.start.title': 'Getting started',
  'onb.start.step1': 'Add your farm',
  'onb.start.step2': 'Select your crop',
  'onb.start.step3': 'Choose your soil type',
  'onb.start.step4': 'Get your recommendation',

  'settings.about': 'Help & about IrrigaSmart',

  'notif.title': 'Reminders',
  'notif.reminderTitle': 'Irrigation reminder',
  'notif.reminderBody': 'Time to irrigate {farm} — about {volume} this morning.',
  'notif.reminderBodyTimed': 'Time to irrigate {farm} — about {volume}, roughly {minutes} minutes.',
  'notif.rainTitle': 'Rainfall warning',
  'notif.rainBody': 'About {mm} of rain expected {day} on {farm}. You may skip irrigation.',

  'season.title': 'Season guide',
  'season.Kharif': 'Kharif (monsoon)',
  'season.Rabi': 'Rabi (winter)',
  'season.Zaid': 'Zaid (summer)',
  'season.inSeason': '{crop} is in its main growing season.',
  'season.offSeason': '{crop} is usually grown in {season}.',
  'season.calendar': 'Sowing: {sow} · Harvest: {harvest}',
  'season.guide.Kharif':
    'Monsoon months: irrigate only during dry spells and let the rain do the work. Watch for waterlogging.',
  'season.guide.Rabi':
    'Cool, dry months: crops need regular irrigation, but demand is lower than in summer.',
  'season.guide.Zaid':
    'Hot summer months: water demand is highest — irrigate early morning to reduce evaporation.',

  // Disease risk (roadmap Version 1.3 Feature 9). Wording is deliberately about
  // WEATHER, never about a diagnosis, and never names a chemical (docs/11 §12f).
  'disease.title': 'Disease watch',
  'disease.level.None': 'No risk',
  'disease.level.Low': 'Low risk',
  'disease.level.Moderate': 'Moderate risk',
  'disease.level.High': 'High risk',
  'disease.none': 'Weather does not currently favour common {crop} diseases.',
  'disease.headline': 'Weather favours {disease}.',
  'disease.observed': 'Conditions have been favourable for {days} days in a row.',
  'disease.observedOne': 'Conditions turned favourable today.',
  'disease.forecast': 'Favourable conditions are expected for {days} more days.',
  'disease.forecastOne': 'Favourable conditions are expected to continue tomorrow.',
  'disease.overcast': 'Mostly dull over those days — wet leaves stay wet longer, which helps disease.',
  'disease.trigger': 'On {date}: {temp}, humidity {humidity}, rain {rain}.',
  'disease.inspectTitle': 'What to check',
  'disease.inspect': 'Look at {where}. {what}',
  'disease.advice':
    'This is a weather warning, not a diagnosis. If you find these signs, show a sample to your local agricultural extension officer before treating.',
  'disease.tipDry':
    'Irrigating early in the day lets leaves dry sooner, which lowers disease risk.',
  'disease.unavailable': 'Daily weather is unavailable, so disease risk cannot be assessed.',

  'moisture.title': 'Soil moisture',
  'moisture.unavailable': 'Daily weather is unavailable, so soil moisture balance cannot be shown.',
  'moisture.statusOk': 'Root zone has adequate available water.',
  'moisture.statusStress': 'Depletion has reached the stress threshold — irrigation is advised.',
  'moisture.available': 'Available water',
  'moisture.depletion': 'Depletion',
  'moisture.capacity': 'Total capacity',
  'moisture.rootDepth': 'Root depth',
  'moisture.help':
    'The gauge shows available water as a fraction of the total root-zone capacity. The marker shows where crop stress begins.',

  // Data source labels (PRD §7). Short enough to sit in a chip beside a figure,
  // so a farmer can see at a glance which numbers describe their own field and
  // which are estimates for the area around it.
  'provenance.MEASURED': 'Field test',
  'provenance.USER_PROVIDED': 'You told us',
  'provenance.REGIONAL_ESTIMATE': 'Area estimate',
  'provenance.FORECAST': 'Forecast',
  'provenance.CALCULATED': 'Calculated',
  'provenance.INFERRED': 'Worked out',
  'provenance.UNKNOWN': 'Not known',

  'ph.title': 'Soil pH suitability',
  'ph.unavailable':
    'No soil pH estimate is available for this farm yet, so suitability cannot be shown.',
  'ph.pending': 'Reading the soil map for this farm. This can take up to a minute.',
  'ph.unreachable':
    'Could not reach the soil map. Check your internet connection — this will be tried again on its own.',
  'ph.reading': 'Estimated soil pH: {ph}',
  'ph.source':
    'This is an estimate from a 250 m soil map, not a test of your field. A Soil Health Card test at your local centre gives the exact figure for your plot.',
  'ph.optimalRange': 'Optimal for {crop}: pH {min}-{max}',
  'ph.level.suitable': 'Suitable',
  'ph.level.slightly-outside': 'Slightly outside optimal range',
  'ph.level.significant-issue': 'Significant pH issue',
  'ph.help.suitable': 'This soil pH suits the crop well; nutrients should be readily available.',
  'ph.help.slightly-outside':
    'A small adjustment (such as lime or sulphur, per a soil test) may improve nutrient availability.',
  'ph.help.significant-issue':
    'This pH is well outside the crop\'s tolerant range and likely limits nutrient uptake. Consider an amendment plan with your local Krishi Vigyan Kendra or agriculture extension officer.',

  'disease.name.riceBlast': 'rice blast',
  'disease.name.riceBacterialLeafBlight': 'bacterial leaf blight',
  'disease.name.wheatStripeRust': 'stripe (yellow) rust',
  'disease.name.wheatLeafRust': 'leaf (brown) rust',
  'disease.name.maizeTurcicumLeafBlight': 'turcicum leaf blight',
  'disease.name.maizeCommonRust': 'common rust',
  'disease.name.cottonAlternariaLeafSpot': 'alternaria leaf spot',
  'disease.name.cottonBacterialBlight': 'bacterial blight',
  'disease.name.sugarcaneRedRot': 'red rot',
  'disease.name.sugarcaneRust': 'rust',
  'disease.name.soybeanRust': 'soybean rust',
  'disease.name.soybeanAnthracnose': 'anthracnose',
  'disease.name.groundnutLateLeafSpot': 'late leaf spot',
  'disease.name.groundnutRust': 'groundnut rust',
  'disease.name.lateBlight': 'late blight',
  'disease.name.earlyBlight': 'early blight',
  'disease.name.onionPurpleBlotch': 'purple blotch',
  'disease.name.onionDownyMildew': 'downy mildew',

  'disease.where.riceBlast': 'leaves, then the nodes and the neck of the panicle',
  'disease.where.riceBacterialLeafBlight': 'leaf tips and margins, upper leaves first',
  'disease.where.wheatStripeRust': 'the upper leaf surface, lower leaves first',
  'disease.where.wheatLeafRust': 'both leaf surfaces',
  'disease.where.maizeTurcicumLeafBlight': 'lower leaves first, moving upward',
  'disease.where.maizeCommonRust': 'both leaf surfaces',
  'disease.where.cottonAlternariaLeafSpot': 'older leaves near the base',
  'disease.where.cottonBacterialBlight': 'leaves, stems and bolls',
  'disease.where.sugarcaneRedRot': 'the inside of a suspect cane, split lengthwise',
  'disease.where.sugarcaneRust': 'the underside of leaves',
  'disease.where.soybeanRust': 'the underside of lower leaves',
  'disease.where.soybeanAnthracnose': 'stems and pods',
  'disease.where.groundnutLateLeafSpot': 'the underside of older leaves',
  'disease.where.groundnutRust': 'the underside of leaves',
  'disease.where.lateBlight': 'lower leaves first, then stems and the crop itself',
  'disease.where.earlyBlight': 'the oldest, lowest leaves first',
  'disease.where.onionPurpleBlotch': 'older leaves, from the tips downward',
  'disease.where.onionDownyMildew': 'older leaves, early in the morning',

  'disease.what.riceBlast': 'Spindle-shaped spots with grey centres and brown borders.',
  'disease.what.riceBacterialLeafBlight':
    'Water-soaked yellow streaks running from the tip, drying to straw colour.',
  'disease.what.wheatStripeRust':
    'Yellow-orange powdery pustules in stripes between the veins.',
  'disease.what.wheatLeafRust': 'Scattered orange-brown round pustules, not in stripes.',
  'disease.what.maizeTurcicumLeafBlight': 'Long grey-green cigar-shaped lesions.',
  'disease.what.maizeCommonRust': 'Small cinnamon-brown pustules scattered over the blade.',
  'disease.what.cottonAlternariaLeafSpot':
    'Brown spots with concentric rings and a pale halo.',
  'disease.what.cottonBacterialBlight':
    'Angular water-soaked spots turning black, with blackened veins.',
  'disease.what.sugarcaneRedRot':
    'Reddened inner tissue with white cross-bands, and a sour smell.',
  'disease.what.sugarcaneRust': 'Elongated orange-brown pustules.',
  'disease.what.soybeanRust': 'Small raised tan pustules that shed powder when rubbed.',
  'disease.what.soybeanAnthracnose': 'Dark irregular blotches with tiny black spines.',
  'disease.what.groundnutLateLeafSpot':
    'Dark spots without a yellow halo, with pustules underneath.',
  'disease.what.groundnutRust': 'Orange pustules that rupture and release powder.',
  'disease.what.lateBlight':
    'Dark water-soaked patches with a white mould ring underneath in the morning.',
  'disease.what.earlyBlight': 'Dark spots with concentric rings, like a target.',
  'disease.what.onionPurpleBlotch':
    'Small white sunken spots enlarging into purple-brown zoned patches.',
  'disease.what.onionDownyMildew': 'Pale oval patches with a violet-grey furry growth.',

  // Photo check (V1.7 item 16). Every string here obeys docs/12 §Product
  // Boundaries: no chemical, no dose, no claim that a disease is PRESENT. The
  // model compares a photo to its training photos, and that is exactly what the
  // wording says — "looks similar to", never "you have". The referral to the
  // extension officer appears in every outcome, healthy included.
  'vision.title': 'Check a leaf photo',
  'vision.onDevice': 'Works offline',
  'vision.lede':
    'Take a photo of a single affected leaf. The check runs on your phone, so the photo is never uploaded.',
  'vision.choose': 'Choose or take a photo',
  // ~9 MB is the COMPRESSED figure actually transferred: the model (5.5 MB
  // gzipped) plus the ONNX runtime (3.3 MB gzipped), measured from the build
  // output. Quoting the 6 MB model alone would understate the real cost of a
  // first check by threefold, which on a metered rural connection is the kind
  // of surprise that gets an app deleted.
  'vision.firstUseHint':
    'The first check downloads about 9 MB, so use Wi-Fi if you can. After that it works without a network.',
  'vision.working': 'Looking at the photo…',
  'vision.again': 'Check another photo',
  'vision.previewAlt': 'The leaf photo you chose',
  'vision.healthyName': 'a healthy leaf',
  // "Similar to", with the percentage described as visual similarity rather
  // than as a probability that the farmer has the disease.
  'vision.similarTo': 'This leaf looks similar to photos of {name} ({percent}% similar).',
  'vision.healthy': 'This leaf looks similar to healthy leaves ({percent}% similar).',
  'vision.healthyCaveat':
    'That covers this one leaf only. Keep checking other plants, especially lower and inner leaves.',
  'vision.unsure':
    'The photo could not be matched confidently, so no result is shown. A wrong name here could cost you a crop.',
  'vision.retakeTips':
    'Try again with one leaf filling the frame, in daylight, against a plain background, with the camera steady.',
  'vision.unknownClass': 'This photo returned a result the app does not recognise.',
  'vision.otherPlant':
    'This looks like a {plant} leaf, but this field is {crop}. If you did photograph {crop}, treat the result below as unreliable.',
  // The measured failure mode, stated plainly. This model files leaves it does
  // not recognise under "healthy maize" — including both diseased onion photos
  // tested, at 89% and 96%. A healthy reading for a plant the farmer is not
  // growing is evidence about nothing, so it is never shown as reassurance.
  'vision.otherPlantHealthy':
    'The photo was matched to a healthy {plant} leaf, not to {crop}. That tells you nothing about your {crop} — usually it means the leaf was not recognised at all. Try again with one {crop} leaf filling the frame.',
  // Rice only, and derived from the model rather than hard-coded: the training
  // set has no healthy-rice folder, so for rice the model has no way to output
  // "this leaf is fine" and must name a condition instead.
  'vision.noHealthyClass':
    'The photo check has no example of a healthy {crop} leaf, so for {crop} it always names one of the conditions it knows — even when the leaf is fine. Take this as a reason to look more closely, not as a finding.',
  'vision.cropNotCovered':
    'The photo check has not been trained on {crop}. It only knows {covered}, so a result for another crop cannot be trusted. Disease watch above still works for {crop}.',
  'vision.caveat':
    'This compares your photo with training photographs. It is not a diagnosis, and it is far less reliable on real field photos than in a laboratory.',
  'vision.advice':
    'Before treating anything, show a sample to your local agricultural extension officer or Krishi Vigyan Kendra.',
  'vision.referenceTitle': 'Reference photos',
  'vision.referenceNote':
    'Compare the shape, colour and pattern only. Field symptoms may look different.',
  // Some conditions have exactly one freely licensed, correctly identified
  // photograph behind them. Saying so beats hiding the reference block entirely,
  // which is what used to happen and left the rice conditions with no pictures.
  'vision.referenceSingle': 'Only one reference photo is available for this one.',
  'vision.referenceAlt': 'Reference photo {number} showing {name}',
  'vision.referenceCredit': 'Photo: {credits}',

  'vision.plant.Apple': 'apple',
  'vision.plant.Maize': 'maize',
  'vision.plant.PepperBell': 'bell pepper',
  'vision.plant.Potato': 'potato',
  'vision.plant.Rice': 'rice',
  'vision.plant.Tomato': 'tomato',

  'vision.name.appleScab': 'apple scab',
  'vision.name.appleBlackRot': 'black rot',
  'vision.name.cedarAppleRust': 'cedar apple rust',
  'vision.name.grayLeafSpot': 'grey leaf spot',
  'vision.name.pepperBacterialSpot': 'bacterial spot',
  'vision.name.tomatoBacterialSpot': 'bacterial spot',
  'vision.name.tomatoLeafMould': 'leaf mould',
  'vision.name.septoriaLeafSpot': 'septoria leaf spot',
  'vision.name.spiderMites': 'two-spotted spider mite damage',
  'vision.name.targetSpot': 'target spot',
  'vision.name.tomatoYellowLeafCurlVirus': 'yellow leaf curl virus',
  'vision.name.tomatoMosaicVirus': 'mosaic virus',
  'vision.name.riceBrownSpot': 'brown spot',
  'vision.name.riceLeafScald': 'leaf scald',
  'vision.name.riceSheathBlight': 'sheath blight',
  'vision.name.riceTungro': 'tungro',

  'vision.error.modelUnavailable':
    'The photo check could not be downloaded. Connect to a network once and try again.',
  'vision.error.runtimeUnavailable': 'This browser cannot run the photo check on this device.',
  'vision.error.imageUnreadable': 'That file could not be read as a photo. Try another one.',
  'vision.error.inferenceFailed': 'The photo check failed on this device.',

  'settings.notifDenied':
    'Notifications are blocked by the browser. Allow them in your browser settings to get reminders.',
  'settings.notifUnsupported': 'This device does not support notifications.',

  'onb.skip': 'Skip',
  'onb.feature.weather': 'Weather-based advice',
  'onb.feature.offline': 'Works fully offline',
  'onb.feature.explain': 'Every recommendation explained',
  'onb.feature.language': 'English, हिन्दी, বাংলা, অসমীয়া, اردو',

  'reminder.title': 'Remind me',
  'reminder.auto': 'Auto',
  'reminder.custom': 'Custom',
  'reminder.add': 'Add',
  'reminder.remove': 'Remove',
  'reminder.timeLabel': 'Reminder time',
  'reminder.tomorrowTag': 'Tomorrow',
  'reminder.setForTomorrow': 'That time has passed today — the reminder is set for tomorrow.',
  'reminder.addError': 'Could not add that reminder. Please try again.',
  'reminder.note':
    'Reminders alert you while the app is open, or when you next open it — online or offline.',

  'water.title': 'Water checklist',
  'water.target': 'To give today',
  'water.done': 'Given so far',
  'water.remaining': 'Still to give',
  'water.nothingToday': 'No irrigation needed today — the crop and the rain have it covered.',
  'water.logFull': 'Mark irrigation done',
  'water.logPart': '+{n} min',
  'water.undo': 'Undo today',
  'water.complete': 'Today’s water is complete',
  'water.progressLabel': '{percent}% of today’s water given',
  'water.savedToday': 'Saved today',
  'water.savedTotal': 'Saved so far',
  'water.savedDays': 'across {days} days',
  'water.savedDay': 'across 1 day',
  'water.savedFromRain': 'from using rainfall',
  'water.savedFromMethod': 'from your irrigation method',
  'water.savedNote':
    'Compared with flooding the field for the full crop demand and ignoring rainfall.',

  // --- Farmer assistant (item 17) ---
  // The rule answers below are the OFFLINE ones: they are assembled on the
  // device from figures the decision engine already computed, so every number
  // in them is quoted, never re-derived. They must never name a chemical, and
  // must never claim a disease is present (V1.3 Product Boundaries, docs/10
  // §10.2) — the same boundaries the backend prompt states for the model.
  'assistant.open': 'Ask a question',
  'assistant.fabLabel': 'Ask',
  'assistant.title': 'Ask about your farm',
  'assistant.close': 'Close',
  'assistant.intro':
    'Ask me about today’s irrigation — how much water, when to give it, or why. I can answer without internet.',
  'assistant.placeholder': 'Type your question…',
  'assistant.listening': 'Listening…',
  'assistant.speakNow': 'Speak your question',
  'assistant.stopListening': 'Stop listening',
  'assistant.send': 'Send',
  'assistant.thinking': 'Thinking…',
  'assistant.readAloud': 'Read aloud',
  'assistant.sourceDevice': 'Answered on your phone',
  'assistant.sourceOnline': 'Answered online',
  'assistant.sourceUnavailable': 'Needs internet',
  'assistant.note':
    'This assistant explains the app’s advice. It cannot recommend any medicine, spray or fertiliser.',
  'assistant.voiceDenied':
    'Microphone permission was refused. Allow it in your browser settings, or type your question.',
  'assistant.voiceNoSpeech': 'I did not hear anything. Please try again.',
  'assistant.voiceLanguageUnsupported':
    'This browser cannot listen in your chosen language. Try switching to English in Settings, or type your question.',
  'assistant.voiceNetwork':
    'Voice input needs a working connection to understand speech, and it just lost one. Please type your question, or try the microphone again once you have signal.',
  'assistant.voiceError': 'Voice input is not working right now. Please type your question.',
  'assistant.offlineFallback':
    'I cannot answer that one without internet. Try asking about today’s water amount, timing, rain or soil moisture — I can answer those offline.',

  'assistant.suggest.amount': 'How much water today?',
  'assistant.suggest.timing': 'What time should I irrigate?',
  'assistant.suggest.why': 'Why this advice?',
  'assistant.suggest.moisture': 'How dry is my soil?',
  'assistant.topic.today': 'Today',
  'assistant.topic.irrigation': 'Irrigation',
  'assistant.topic.soil': 'Soil',
  'assistant.topic.weather': 'Weather',
  'assistant.topic.fertilizer': 'Fertilizer',
  'assistant.topic.disease': 'Disease watch',
  'assistant.topic.todayQuestion': 'What should I do today?',
  'assistant.topic.irrigationQuestion': 'When and how much should I irrigate?',
  'assistant.topic.soilQuestion': 'What is my current soil condition?',
  'assistant.topic.weatherQuestion': 'What is today’s weather doing to my farm?',
  'assistant.topic.fertilizerQuestion': 'What should I know about my soil fertility?',
  'assistant.topic.diseaseQuestion': 'What disease risk does the weather favour?',
  'assistant.briefing.today': '{farm}: {crop} Today’s advice is {status}.',
  'assistant.briefing.noRecommendation': 'No recommendation is available yet.',

  'assistant.rule.empty': 'Please type or speak a question.',
  'assistant.rule.referral':
    'I cannot name medicines, sprays or doses — a wrong one costs you money and can harm the crop. If you are worried about a disease: take a leaf photo in the “Check a leaf photo” card on the Today screen, and if you see signs, show that photo to your local Krishi Vigyan Kendra or input dealer — they can see your crop and know what is approved locally. I can help with irrigation timing, water amounts, your soil’s pH and fertility, and the official fertilizer schedule for covered crops.',
  'assistant.rule.capability':
    'I can tell you how much water to give today, when to give it, why the app advises it, what the weather and rain are doing, how dry your soil is, your soil’s pH and fertility, the official fertilizer schedule for covered crops, and how much water you have saved. I cannot name a medicine or spray — but for a disease worry I can tell you where to look, what the signs look like, and how to use the leaf photo check.',
  'assistant.rule.greeting':
    'Namaste. Ask me how much water to give today, when to irrigate, or why the app advises it.',
  'assistant.rule.today': 'Today’s farm action is: {status}.',
  'assistant.rule.amount': 'Give {mm} mm today — about {litres} litres for your field.',
  'assistant.rule.amountRun': 'That is about {minutes} minutes of running time.',
  'assistant.rule.amountNone': 'No irrigation is needed today.',
  'assistant.rule.timing': 'Irrigate between {start} and {end}.',
  'assistant.rule.timingWhy':
    'Watering then loses less to evaporation and lets the leaves dry during the day.',
  'assistant.rule.timingNone': 'There is no irrigation time today, because no irrigation is advised.',
  'assistant.rule.confidence': 'Confidence in this advice: {level}.',
  'assistant.rule.rain': 'About {mm} mm of rain is expected today.',
  'assistant.rule.rainNone': 'No meaningful rain is expected today.',
  'assistant.rule.rainAdvice': 'That is already counted in today’s advice: {status}.',
  'assistant.rule.moisture':
    'Your root zone is {short} mm short of full, out of {capacity} mm this soil can hold.',
  'assistant.rule.moistureOk': 'The crop starts to feel stress past {threshold} mm, so it is still comfortable.',
  'assistant.rule.moistureStress':
    'That has passed the {threshold} mm point where the crop starts to feel stress, which is why irrigation is advised.',
  'assistant.rule.disease': 'The weather is currently {level} for {disease}.',
  'assistant.rule.diseaseNone': 'The weather does not currently favour the common diseases of this crop.',
  'assistant.rule.diseaseCaveat':
    'This is about the weather only — I have not seen your crop and cannot say any disease is present.',
  'assistant.rule.diseaseScout': 'While you are in the field, look at {where} — best in the morning while the leaves are dry.',
  'assistant.rule.diseaseSigns': 'The signs to look for: {what}',
  'assistant.rule.diseasePhoto':
    'Not sure? Take a leaf photo in the “Check a leaf photo” card on the Today screen — the app compares it with common diseases right on your phone, no internet needed.',
  'assistant.rule.diseaseNext':
    'If you do find signs like these, show the photo to your Krishi Vigyan Kendra or input dealer — they will confirm it and tell you what is approved for your crop stage.',

  // --- Latest leaf-photo check (V2.2). Pre-worded verdicts: "similar to",
  // similarity percent, never a diagnosis. ---
  'assistant.photo.match': 'The photo looks similar to {name} ({percent}% similar).',
  'assistant.photo.tentative': 'The photo only weakly resembles {name} ({percent}% similar).',
  'assistant.photo.healthy': 'The photo looks like a healthy leaf ({percent}% similar).',
  'assistant.photo.otherPlant': 'The photo looks like a {plant} leaf, not your {crop}.',
  'assistant.rule.photoAnswer': 'That is a resemblance, not a diagnosis — the app cannot say the disease is present.',
  'assistant.rule.photoNext': 'If the leaf does show signs, take it (or the photo) to your Krishi Vigyan Kendra or input dealer for confirmation.',
  'assistant.rule.photoNone': 'I do not have a photo check to report yet. Take a leaf photo in the “Check a leaf photo” card on the Today screen — it works on your phone, no internet needed.',
  'assistant.rule.savedToday': 'You saved about {litres} litres today.',
  'assistant.rule.savedTotal': 'Across all your recorded days, about {litres} litres.',
  'assistant.rule.savedBasis':
    'That is measured against flooding the field for the full crop demand and ignoring the rain that fell.',
  'assistant.rule.plan': 'Tomorrow’s plan is: {status}.',
  'assistant.rule.planCaveat': 'That is based on the forecast, so it can change if the weather does.',
  'assistant.rule.weatherTemp': 'It is about {temp}°C right now.',
  'assistant.rule.weatherHumidity': 'Humidity is around {humidity}%.',
  'assistant.rule.weatherRain': 'Rain expected today: {mm} mm.',

  // pH and soil character, answered offline and BEFORE the model (PRD §33).
  //
  // The caveat is a separate key from the reading, and `answerFromRules` emits
  // the two together with no branch that can drop the second. That is what makes
  // Guardrail 1 testable: there is no code path in which the app speaks a pH
  // number without saying, in the same reply, what produced it. `phAdvice` is
  // unconditional for the same reason — a farmer told their soil is acidic asks
  // "how much lime?" next, and that question has one honest answer.
  'assistant.rule.ph': 'The app’s figure for your topsoil pH is {ph}.',
  'assistant.rule.phEstimate':
    'That is an estimate for your area from a 250 m soil map — it is not a test of your field. A Soil Health Card test at your local centre gives the figure for your own plot.',
  'assistant.rule.phMeasured': 'That one comes from a test of your own field.',
  'assistant.rule.phUnknown':
    'I do not have a soil pH figure for this farm. Even when the app shows one it is an estimate for your area from a 250 m soil map, never a test of your field — a Soil Health Card test at your local centre is what gives your own figure.',
  'assistant.rule.phSuitability':
    'Your crop prefers pH {min} to {max}, so this reads as: {verdict}.',
  'assistant.rule.phAdvice':
    'I cannot tell you how much lime, gypsum or any other amendment to add — that needs a soil test and your local Krishi Vigyan Kendra.',
  'assistant.rule.fertilityUnknown':
    'I do not have a fertility estimate for this farm yet. Even when the app shows a pH or organic-carbon figure it is an estimate for your area, not a soil test — a Soil Health Card test at your local centre gives the figure for your own plot, and your Krishi Vigyan Kendra can turn that into a fertiliser plan.',
  'assistant.rule.fertilityNoEstimate':
    'This farm has no soil pH or organic-carbon estimate yet.',
  'assistant.rule.fertilityReading':
    'Your own Soil Health Card reading for this field: N {n}, P₂O₅ {p}, K₂O {k} kg/ha — overall fertility: {band}.',
  'assistant.rule.fertilityAdvice':
    'I cannot tell you an exact amount of fertiliser, urea, lime, gypsum or any other amendment to add — that needs a soil test. Please take a soil or leaf sample to your local Krishi Vigyan Kendra or agriculture extension officer; they can give you the exact quantity for your field.',
  'assistant.rule.testInterpreted': 'I read these farmer-provided soil results: pH {ph}, organic carbon {oc}%, and {values}. These are field-test values, so they are more useful for this field than the area map estimate.',
  'assistant.rule.testLow': 'The low nutrient group is {nutrients}; this can limit crop growth and should be addressed through a crop-stage fertilizer plan.',
  'assistant.rule.testNoLow': 'No low N, P₂O₅, or K₂O result was found in the values provided.',
  'assistant.rule.testHigh': 'The high nutrient group is {nutrients}; avoid adding more of those nutrients until the crop plan and next test support it.',
  'assistant.rule.testNextSteps': 'Use these results to select the matching crop and soil zone in the Fertilizer section, follow split timing rather than applying everything at once, and confirm any exact product or rate with the local recommendation. I can explain the result, but I will not invent a dose.',
  'assistant.rule.testPrompt': 'Yes — two ways. Send me the numbers here in this format: pH 6.2, EC 0.3, organic carbon 0.8%, N 240, P 12, K 150, S 10, Zn 1.2, B 0.5, Fe 8, Mn 5, Cu 0.4 — and I will classify N/P/K for your crop. Or open the Fertilizer tab, choose your crop and soil zone, tap the soil-test option, type your card’s numbers and tap “Save reading” — the app stores them on your farm, uses your fertility band for the official dose, and remembers them for next time.',
  'assistant.rule.phAmendAcidic':
    'To bring pH up into this crop’s range, the usual correction on these soils is lime or dolomite — the amount needs a soil test and your local Krishi Vigyan Kendra.',
  'assistant.rule.phAmendAlkaline':
    'To bring pH down into this crop’s range, the usual correction on these soils is gypsum — the amount needs a soil test and your local Krishi Vigyan Kendra.',
  'assistant.rule.phAlts': 'At this pH, the crops the app’s data suits best are: {crops}.',
  'assistant.rule.fertScheduleQuote':
    'As per the State schedule for {variety} in the {zone} zone, on {band}-fertility soil: {npk}.',
  'assistant.rule.fertScheduleMore':
    'The manure, amendment and split-timing lines for this schedule are on the Fertilizer tab.',
  'assistant.rule.fertScheduleNote':
    'Confirm the final plan with your local Krishi Vigyan Kendra — they can adjust it for your field’s history.',
  'assistant.rule.soilType': 'You recorded this field’s soil as {soil}.',
  'assistant.rule.soilCarbon':
    'The soil map estimates about {oc}% organic carbon in your topsoil.',
  'assistant.rule.soilMapCaveat':
    'That carbon figure is a prediction for a 250 m area, not a test of your field.',

  // --- Fertilizer recommendation ---
  'fert.title': 'Fertilizer recommendation',
  'fert.selectPrompt': 'Choose a crop, zone and fertility level to see the recommendation.',
  'fert.noCropSelected': 'Select a crop to begin.',
  'fert.cropNotCovered':
    'This tool does not yet have a fertilizer schedule for {crop}. It currently covers Rice, Wheat, Maize, Cotton, Potato and Groundnut.',
  'fert.noZoneEntry':
    'This variety has no recommendation for the {zone} soil zone in the source schedule.',
  'fert.zone.Hill': 'Hill',
  'fert.zone.Terai': 'Terai',
  'fert.zone.GangeticAlluvium': 'Gangetic Alluvium',
  'fert.zone.VindhyaAlluviumRedLateritic': 'Vindhya Alluvium, Red & Lateritic',
  'fert.zone.Coastal': 'Coastal',
  'fert.fertility.Low': 'Low',
  'fert.fertility.Medium': 'Medium',
  'fert.fertility.High': 'High',
  'fert.districts': 'Districts in this zone',
  'fert.npkN': 'Nitrogen (N)',
  'fert.npkP': 'Phosphorus (P₂O₅)',
  'fert.npkK': 'Potash (K₂O)',
  'fert.kgHaShort': 'kg/ha',
  'fert.noNpk': 'No NPK figure is given for this zone and fertility level in the source schedule.',
  'fert.ameliorantTitle': 'Soil amendment',
  'fert.manureTitle': 'Manure / bio-fertilizer',
  'fert.sulphurTitle': 'Sulphur',
  'fert.micronutrientsTitle': 'Micronutrients',
  'fert.remarksTitle': 'Application timing',
  'fert.tableNoteTitle': 'General note for this crop',
  'fert.disclaimer':
    'This is a general district-level schedule, not a reading of your own field. Your actual soil test result should always override it. For anything beyond irrigation and fertilizer timing — pest, disease, or a schedule that does not match your soil test — please ask your local Krishi Vigyan Kendra or agriculture extension officer.',
  'fert.sourceCredit': 'Source: State Agriculture Department soil-test-based fertilizer recommendation schedule.',
  'fert.prefillFromFarm': 'Filled in from {farm} — change any field to see a different recommendation.',
  'fert.moreInfo': 'More information',
  'fert.stepCrop': '1. Your crop',
  'fert.stepVariety': '2. Season / variety',
  'fert.stepZone': '3. Your soil zone',
  'fert.stepFertility': '4. Soil fertility',
  'fert.fertilityModeNumbers': 'I have soil-test numbers',
  'fert.fertilityModeSimple': 'I am not sure',
  'fert.kgHaPlaceholder': 'kg/ha',
  'fert.npkInputHint': 'From your Soil Health Card or lab report, in kg/ha.',
  'fert.npkIncomplete': 'Enter all three numbers (N, P, K) to see the recommendation.',
  'fert.classifiedAs': 'Your soil fertility: {level}',
  'fert.saveReading': 'Save this reading for this farm',
  'fert.readingSaved': 'Saved',
  'fert.phFromFarm': 'This farm\'s soil pH is {ph} (optimal for this crop: {min}-{max}) — {verdict}.',

  // --- Farm improvement plan (PRD §15) ---
  'improve.title': 'What you could improve',
  'improve.subtitle': 'The biggest things first. Nothing appears here unless the app has data to back it up.',
  'improve.none': 'Nothing stands out today',
  'improve.noneHint': 'Nothing in this farm’s records needs your attention right now.',
  'improve.moreCount': '{count} more',
  'improve.actions': 'What you could do',
  'improve.severity.HIGH': 'Important',
  'improve.severity.MEDIUM': 'Worth checking',
  'improve.severity.LOW': 'Minor',
  'improve.disclaimer':
    'Some of this rests on maps and forecasts rather than tests of your own field. Each item says what it is based on.',
  'improve.ph.title': 'Soil pH may not suit {crop}',
  'improve.ph.explain':
    'The soil map estimates a topsoil pH of {ph} here, while {crop} does best between {min} and {max}. That estimate is for a 250 m map square, not a test of your field, so treat it as a reason to check rather than a result.',
  'improve.ph.actionTest':
    'Get a Soil Health Card test at your nearest Krishi Vigyan Kendra so you know your own field’s pH.',
  'improve.ph.actionKvk':
    'This app cannot tell you how much lime, gypsum or sulphur to add. Take your test result to your agriculture extension officer for that.',
  'improve.texture.title': 'The soil map reads this field differently',
  'improve.texture.explain':
    'You recorded {yours}. The soil map for this location reads more like {theirs}. Your own answer is the one the app uses, and it should be — you have stood in this field and the map has not. But the water figures are built on it, so it is worth being sure.',
  'improve.texture.action':
    'Rub some damp soil between your fingers. If it does not feel like {yours}, change the soil type in the farm details.',
  'improve.soilProfile.title': 'No soil map data for this field',
  'improve.soilProfile.explain':
    'The app is using the general figures for {soil} because it has no soil map reading stored for this location. The water figures still work, but they describe {soil} in general rather than your field.',
  'improve.soilProfile.action':
    'Open the farm details while you have a connection so the app can fetch the soil map for this location.',
  'improve.soilWater.title': 'Water figures fall back on general {soil} values',
  'improve.soilWater.explain':
    'There is soil map data for this field, but it does not reach deep enough to cover your crop’s roots, so the app used the general figures for {soil} instead. Stretching shallow readings over a deep root zone would turn a guess into a measurement.',
  'improve.soilWater.action':
    'Nothing is wrong with your field. Open the farm details with a connection to refresh the soil data.',
  'improve.slopeMethod.title': '{method} irrigation on sloping land',
  'improve.slopeMethod.explain':
    'The elevation map reads about {slope}% slope here, and {method} irrigation moves water across the surface, so some of it runs downhill before it soaks in. The map is coarse and often reads a slope where the ground is flat, so check it against what you can see.',
  'improve.slopeMethod.actionShorter':
    'If the field really does slope, water in shorter runs across the slope rather than down it.',
  'improve.slopeMethod.actionAsk':
    'Ask your Krishi Vigyan Kendra about bunds or a contour layout for this field.',
  'improve.retentionMethod.title': '{method} irrigation on soil that drains quickly',
  'improve.retentionMethod.explain':
    'You recorded {soil}, which holds little water. Water put on faster than this soil takes it in drains below the roots, so one long run loses more of it than the crop can use.',
  'improve.retentionMethod.actionSplit':
    'Split the same amount of water into smaller, more frequent runs instead of one long one.',
  'improve.retentionMethod.actionAsk':
    'Ask your Krishi Vigyan Kendra about building up organic matter in this soil, and whether drip suits your crop and your budget.',
  'improve.disease.title': 'Weather favours {disease}',
  'improve.disease.explain':
    'The recent and forecast weather suits {disease} on this crop. This is about the weather, not about your plants — the app has not seen your crop and cannot say that any disease is present.',
  'improve.disease.actionLook': 'Walk the field and look closely at the leaves, the lower ones first.',
  'improve.disease.actionPhoto':
    'If you find marks on a leaf, use the leaf photo check on the dashboard.',
  'improve.disease.actionKvk':
    'Show anything you find to your Krishi Vigyan Kendra or agriculture extension officer. This app does not name plant protection products and does not give quantities.',
  'improve.weatherData.titleMissing': 'Today’s advice was made without weather',
  'improve.weatherData.titleCached': 'Today’s advice uses saved weather',
  'improve.weatherData.explainMissing':
    'The weather could not be fetched, so today’s figures rest on your soil, crop and irrigation records alone. Rain and heat are not in them.',
  'improve.weatherData.explainCached':
    'The weather could not be fetched just now, so the app used the last figures it saved. Today’s rain and heat may differ from them.',
  'improve.weatherData.action':
    'Open the app again once you have a connection and the advice will be worked out with fresh weather.',
  'improve.fertTable.title': 'No fertilizer schedule for {crop}',
  'improve.fertTable.explain':
    'The app carries the state fertilizer schedule for six crops and {crop} is not one of them. It will not fill that gap with a guessed amount.',
  'improve.fertTable.action':
    'Ask your Krishi Vigyan Kendra or agriculture extension officer for the schedule for {crop}, and take your soil test result with you.',
} as const;

export type TranslationKey = keyof typeof en;

const hi: Record<TranslationKey, string> = {
  'app.loading': 'लोड हो रहा है…',
  'app.initErrorTitle': 'ऐप डेटा नहीं खुल सका',
  'app.initErrorBody':
    'कृपया IrrigaSmart के अन्य सभी टैब बंद करें, फिर इस पेज को रीलोड करें। आपके सहेजे खेत सुरक्षित हैं।',
  'app.reload': 'रीलोड करें',
  'app.offlineBanner':
    'आप ऑफ़लाइन हैं। सहेजा गया डेटा दिख रहा है — सिफ़ारिशें आपके अंतिम मौसम पर आधारित हैं।',

  'nav.today': 'आज',
  'nav.farms': 'खेत',
  'nav.history': 'रिकॉर्ड',
  'nav.fertilizer': 'खाद',
  'nav.settings': 'सेटिंग्स',

  'dashboard.greeting': 'नमस्ते, {name}',
  'dashboard.addFirstFarm': 'आज की सिंचाई सिफ़ारिश देखने के लिए अपना पहला खेत जोड़ें।',
  'dashboard.addFarm': 'खेत जोड़ें',
  'dashboard.checking': 'आज के हालात जाँचे जा रहे हैं…',
  'dashboard.errorGeneric': 'सिफ़ारिश बनाते समय कुछ गड़बड़ हो गई।',
  'dashboard.errorMissing': 'इस खेत की कुछ जानकारी अधूरी है। कृपया उसे बदलकर फिर कोशिश करें।',
  'dashboard.errorTabs': 'IrrigaSmart दूसरे टैब में खुला है। उसे बंद करें, फिर रिफ़्रेश दबाएँ।',
  'dashboard.refresh': 'ताज़ा करें',
  'dashboard.noteNoWeather':
    'अभी कोई मौसम डेटा उपलब्ध नहीं है। मौसम-आधारित सलाह पाने के लिए एक बार इंटरनेट से जुड़ें।',
  'dashboard.noteCached':
    'मौसम सेवा से संपर्क नहीं हो पा रहा। आपका सबसे हालिया सहेजा हुआ मौसम इस्तेमाल हो रहा है।',

  'farmcard.noRecToday': 'आज की सिफ़ारिश अभी नहीं — बनाने के लिए टैप करें।',
  'farmcard.lastWeather': 'मौसम {time} बजे अपडेट हुआ',
  'farmcard.noWeather': 'अभी कोई मौसम नहीं',

  'weather.temperature': 'तापमान',
  'weather.rainToday': 'आज की बारिश',
  'weather.humidity': 'नमी',
  'weather.sunshine': 'धूप',
  'weather.dryingPoor': 'बादल छाए दिन — पत्तियाँ देर तक गीली रहेंगी',
  'weather.dryingModerate': 'कुछ धूप — पत्तियाँ धीरे सूखेंगी',
  'weather.dryingGood': 'तेज़ धूप — पत्तियाँ जल्दी सूखेंगी',
  'weather.cacheNote': 'आपका सबसे हालिया सहेजा हुआ मौसम दिख रहा है — अपडेट करने के लिए जुड़ें।',

  'rec.ariaLabel': 'आज की सिफ़ारिश',
  'rec.bestTime': 'सही समय',
  'rec.waterDepth': 'पानी की गहराई',
  'rec.totalVolume': 'कुल पानी',
  'rec.confidenceBadge.high': 'उच्च विश्वास',
  'rec.confidenceBadge.medium': 'मध्यम विश्वास',
  'rec.confidenceBadge.low': 'कम विश्वास',
  'rec.help.high': 'ताज़ा मौसम डेटा पर आधारित।',
  'rec.help.medium': 'थोड़े पुराने मौसम डेटा पर आधारित।',
  'rec.help.low': 'मौसम डेटा कम या अनुपलब्ध है — इसे मोटे अनुमान की तरह लें।',
  'rec.window': 'सिंचाई का समय',
  'rec.duration': 'कितनी देर चलाएँ',
  'rec.flow': 'पानी की रफ़्तार',
  'rec.minutes': '{n} मिनट',
  'rec.litersPerMin': '{n} लीटर/मिनट',
  'rec.windowValue': '{start} – {end}',
  'rec.windowTomorrow': 'कल {start} – {end}',
  'rec.why.morning-default': 'सुबह जल्दी सिंचाई में भाप बनकर सबसे कम पानी उड़ता है।',
  'rec.why.hot-season': 'गर्मी का मौसम — जल्दी शुरू करने से मिट्टी में पानी ज़्यादा टिकता है।',
  'rec.why.hot-day': 'आज दिन गर्म है, इसलिए धूप तेज़ होने से पहले शुरू करें।',
  'rec.why.windy': 'हवा फुहार को उड़ा देती है — शांत सुबह के घंटे बेहतर हैं।',
  'rec.why.cool-season': 'सर्दी की ठंडी सुबह — थोड़ा देर से शुरू करना फ़सल के लिए बेहतर है।',
  'rec.why.long-run': 'सिंचाई लंबी चलेगी, इसलिए दोपहर से पहले पूरी हो जाए इतनी जल्दी शुरू करें।',
  'rec.why.later-today': 'सुबह का समय निकल चुका है, इसलिए अगला संभव समय दिखाया गया है।',
  'rec.why.evening-slot': 'सुबह के लिए देर हो गई — शाम की ठंडक में सिंचाई करें।',
  'rec.why.drying-window':
    'आज धूप कम है, इसलिए फुहारे का पानी रातभर पत्तियों पर रहेगा। कल सुबह सिंचाई फ़सल के लिए सुरक्षित है।',

  'enum.status.Irrigate Today': 'आज सिंचाई करें',
  'enum.status.Delay Irrigation': 'सिंचाई टालें',
  'enum.status.Monitor Tomorrow': 'कल फिर जाँचें',

  'enum.crop.Rice': 'धान',
  'enum.crop.Wheat': 'गेहूं',
  'enum.crop.Maize': 'मक्का',
  'enum.crop.Cotton': 'कपास',
  'enum.crop.Sugarcane': 'गन्ना',
  'enum.crop.Soybean': 'सोयाबीन',
  'enum.crop.Groundnut': 'मूंगफली',
  'enum.crop.Tomato': 'टमाटर',
  'enum.crop.Potato': 'आलू',
  'enum.crop.Onion': 'प्याज़',

  'enum.stage.Initial': 'प्रारंभिक',
  'enum.stage.Development': 'विकास',
  'enum.stage.Mid Season': 'मध्य मौसम',
  'enum.stage.Late Season': 'अंतिम मौसम',

  'enum.soil.Sandy': 'रेतीली',
  'enum.soil.Sandy Loam': 'रेतीली दोमट',
  'enum.soil.Loamy': 'दोमट',
  'enum.soil.Silty Loam': 'गाद दोमट',
  'enum.soil.Clay Loam': 'चिकनी दोमट',
  'enum.soil.Clay': 'चिकनी',

  'enum.method.Drip': 'ड्रिप',
  'enum.method.Sprinkler': 'स्प्रिंकलर',
  'enum.method.Furrow': 'फ़रो (नाली)',
  'enum.method.Flood': 'फ्लड (बाढ़)',

  'enum.area.Square metre': 'वर्ग मीटर',
  'enum.area.Acre': 'एकड़',
  'enum.area.Hectare': 'हेक्टेयर',

  'farms.title': 'आपके खेत',
  'farms.add': '+ खेत जोड़ें',
  'farms.empty': 'अभी कोई खेत नहीं। सिंचाई सिफ़ारिश पाने के लिए अपना पहला खेत जोड़ें।',
  'farms.edit': 'बदलें',
  'farms.delete': 'हटाएँ',
  'farms.confirm': 'पक्का करें',
  'farms.soilSuffix': 'मिट्टी',

  'form.titleAdd': 'खेत जोड़ें',
  'form.titleEdit': 'खेत बदलें',
  'form.name': 'खेत का नाम',
  'form.namePlaceholder': 'जैसे: उत्तर वाला खेत',
  'form.locationName': 'जगह का नाम',
  'form.locationPlaceholder': 'जैसे: बोलपुर',
  'form.latitude': 'अक्षांश',
  'form.longitude': 'देशांतर',
  'form.useMyLocation': 'मेरी लोकेशन इस्तेमाल करें',
  'form.searchPlaceholder': 'अपना गाँव या शहर खोजें',
  'form.search': 'खोजें',
  'form.searching': 'खोजा जा रहा है…',
  'form.searchNone': 'कोई जगह नहीं मिली। पास के कस्बे का नाम आज़माएँ।',
  'form.searchFailed': 'खोज विफल रही। इंटरनेट जाँचें और फिर कोशिश करें।',
  'form.locating': 'आपकी लोकेशन खोजी जा रही है…',
  'form.locationError.unsupported':
    'इस डिवाइस पर लोकेशन उपलब्ध नहीं है। कृपया निर्देशांक हाथ से डालें।',
  'form.locationError.denied':
    'लोकेशन की अनुमति नहीं मिली। आप ब्राउज़र सेटिंग्स में अनुमति दे सकते हैं या निर्देशांक हाथ से डालें।',
  'form.locationError.unavailable': 'आपकी लोकेशन नहीं मिल पाई। फिर कोशिश करें या निर्देशांक हाथ से डालें।',
  'form.locationError.lookupFailed':
    'लोकेशन मिल गई, लेकिन जगह की जानकारी नहीं मिल पाई। निर्देशांक भर दिए गए हैं।',
  'form.soilSuggestion': 'इस क्षेत्र के लिए सुझाई गई मिट्टी: {soil}। कृपया पक्का करें या अपनी पसंद चुनें।',
  'form.applySuggestion': '{soil} चुनें',
  'form.fieldSize': 'खेत का आकार',
  'form.unit': 'इकाई',
  'form.crop': 'फ़सल',
  'form.growthStage': 'वृद्धि अवस्था',
  'form.soilType': 'मिट्टी का प्रकार',
  'form.irrigationMethod': 'सिंचाई की विधि',
  'form.cancel': 'रद्द करें',
  'form.save': 'खेत सहेजें',
  'form.saving': 'सहेजा जा रहा है…',
  'form.error.name': 'कृपया खेत का नाम डालें।',
  'form.error.location': 'कृपया खेत की लोकेशन (अक्षांश और देशांतर) डालें।',
  'form.error.coords': 'कृपया सही लोकेशन डालें (अक्षांश -90 से 90, देशांतर -180 से 180)।',
  'form.error.area': 'खेत का आकार शून्य से बड़ा होना चाहिए।',
  'form.error.save': 'खेत सहेजा नहीं जा सका। कृपया फिर कोशिश करें।',

  'history.title': 'पुरानी सिफ़ारिशें',
  'history.farmLabel': 'खेत',
  'history.loading': 'रिकॉर्ड लोड हो रहा है…',
  'history.empty': 'इस खेत के लिए अभी कोई सिफ़ारिश नहीं। नई सिफ़ारिश के लिए आज टैब खोलें।',
  'history.noFarms': 'अभी कोई खेत नहीं। रिकॉर्ड शुरू करने के लिए खेत जोड़ें।',
  'history.at': 'समय',
  'history.unavailable': 'सिफ़ारिश की जानकारी उपलब्ध नहीं है।',

  'settings.title': 'सेटिंग्स',
  'settings.profile': 'प्रोफ़ाइल',
  'settings.yourName': 'आपका नाम',
  'settings.saved': 'प्रोफ़ाइल सहेज ली गई।',
  'settings.preferences': 'पसंद',
  'settings.language': 'भाषा',
  'settings.units': 'इकाइयाँ',
  'settings.unitsMetric': 'मीट्रिक (°C, मि.मी., लीटर)',
  'settings.comingSoon': 'जल्द आ रहा है',
  'settings.notifications': 'सिंचाई अनुस्मारक',
  'settings.cloudSync': 'क्लाउड सिंक (आने वाले संस्करण में)',

  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',
  'lang.as': 'অসমীয়া',
  'lang.ur': 'اردو',

  'factors.title': 'यह सिफ़ारिश क्यों',
  'factors.name.crop': 'फ़सल',
  'factors.name.growthStage': 'वृद्धि अवस्था',
  'factors.name.temperature': 'तापमान',
  'factors.name.rainfall': 'बारिश',
  'factors.name.humidity': 'नमी',
  'factors.name.wind': 'हवा',
  'factors.name.soil': 'मिट्टी का प्रकार',
  'factors.name.irrigationMethod': 'सिंचाई की विधि',
  'factors.influence.increases': 'ज़रूरत बढ़ाता है',
  'factors.influence.decreases': 'ज़रूरत घटाता है',
  'factors.influence.neutral': 'कोई खास असर नहीं',
  'factors.legend': 'जितने ज़्यादा तारे, आज के फ़ैसले पर उतना बड़ा असर',
  'factors.strength.strong': 'बड़ा असर',
  'factors.strength.moderate': 'कुछ असर',
  'factors.strength.weak': 'थोड़ा असर',
  'factors.starsLabel': '3 में से {stars} तारे — {strength}',

  'plan.title': 'आने वाले दिनों की योजना',
  'plan.today': 'आज',
  'plan.tomorrow': 'कल',
  'plan.rain': '{mm} मि.मी. बारिश',
  'plan.action.Irrigate Today': 'सिंचाई करें',
  'plan.action.Delay Irrigation': 'बारिश काफ़ी है',
  'plan.action.Monitor Tomorrow': 'नज़र रखें',
  'plan.note.irrigate': '{day} को सिंचाई की योजना बनाएँ।',
  'plan.note.rain': '{day} को बारिश फ़सल की ज़रूरत पूरी कर सकती है।',
  'plan.note.none': 'आने वाले दिनों में सिंचाई की उम्मीद नहीं है।',

  'onb.welcome.title': 'IrrigaSmart में आपका स्वागत है',
  'onb.welcome.tagline':
    'IrrigaSmart मौसम, फ़सल जानकारी और कृषि ज्ञान से बेहतर सिंचाई निर्णय लेने में आपकी मदद करता है।',
  'onb.welcome.start': 'शुरू करें',
  'onb.next': 'आगे',
  'onb.back': 'पीछे',
  'onb.about.title': 'IrrigaSmart के बारे में',
  'onb.about.body':
    'IrrigaSmart किसानों को यह तय करने में मदद के लिए बनाया गया है कि कब और कितनी सिंचाई करनी है। यह बिना इंटरनेट के भी काम करता है, हर सिफ़ारिश सरल भाषा में समझाता है, और किसानों को ध्यान में रखकर बनाया गया है।',
  'onb.how.title': 'यह कैसे काम करता है',
  'onb.how.step1': 'अपना खेत जोड़ें',
  'onb.how.step2': 'हम मौसम देखते हैं',
  'onb.how.step3': 'निर्णय इंजन गणना करता है',
  'onb.how.step4': 'आपको सिफ़ारिश मिलती है',
  'onb.how.step5': 'स्पष्ट व्याख्या के साथ',
  'onb.trust.title': 'सिफ़ारिश पर भरोसा क्यों करें',
  'onb.trust.body':
    'हर सिफ़ारिश आपकी फ़सल, उसकी अवस्था, आपकी मिट्टी, मौसम और सिंचाई विधि को ध्यान में रखती है — और हमेशा अपनी वजह बताती है। IrrigaSmart आपके निर्णयों में मदद करता है; यह आपके अनुभव की जगह नहीं लेता।',
  'onb.offline.title': 'ऑफ़लाइन भी काम करता है',
  'onb.offline.body':
    'आपके खेत की जानकारी आपके फ़ोन पर ही रहती है। मिल चुका मौसम बिना इंटरनेट के भी उपलब्ध रहता है, ताकि सलाह हमेशा मिले।',
  'onb.privacy.title': 'आपकी निजता',
  'onb.privacy.body':
    'आपके खेत की जानकारी आपके डिवाइस पर ही रहती है। कोई भी निजी जानकारी किसी के साथ साझा नहीं की जाती।',
  'onb.start.title': 'शुरुआत कैसे करें',
  'onb.start.step1': 'अपना खेत जोड़ें',
  'onb.start.step2': 'अपनी फ़सल चुनें',
  'onb.start.step3': 'अपनी मिट्टी चुनें',
  'onb.start.step4': 'अपनी सिफ़ारिश पाएँ',

  'settings.about': 'सहायता और IrrigaSmart के बारे में',

  'notif.title': 'अनुस्मारक',
  'notif.reminderTitle': 'सिंचाई अनुस्मारक',
  'notif.reminderBody': '{farm} में सिंचाई का समय — आज सुबह लगभग {volume}।',
  'notif.reminderBodyTimed': '{farm} में सिंचाई का समय — लगभग {volume}, करीब {minutes} मिनट।',
  'notif.rainTitle': 'बारिश की चेतावनी',
  'notif.rainBody': '{farm} में {day} लगभग {mm} मि.मी. बारिश की उम्मीद है। आप सिंचाई छोड़ सकते हैं।',

  'season.title': 'मौसम मार्गदर्शिका',
  'season.Kharif': 'ख़रीफ़ (मानसून)',
  'season.Rabi': 'रबी (सर्दी)',
  'season.Zaid': 'ज़ायद (गर्मी)',
  'season.inSeason': '{crop} अपने मुख्य मौसम में है।',
  'season.offSeason': '{crop} आमतौर पर {season} में उगाई जाती है।',
  'season.calendar': 'बुवाई: {sow} · कटाई: {harvest}',
  'season.guide.Kharif':
    'मानसून के महीने: केवल सूखे दिनों में सिंचाई करें और बारिश को काम करने दें। जलभराव पर नज़र रखें।',
  'season.guide.Rabi':
    'ठंडे, सूखे महीने: फ़सलों को नियमित सिंचाई चाहिए, लेकिन गर्मियों की तुलना में ज़रूरत कम होती है।',
  'season.guide.Zaid':
    'गर्मियों के महीने: पानी की ज़रूरत सबसे ज़्यादा — वाष्पीकरण कम करने के लिए सुबह जल्दी सिंचाई करें।',

  'disease.title': 'रोग निगरानी',
  'disease.level.None': 'कोई ख़तरा नहीं',
  'disease.level.Low': 'कम ख़तरा',
  'disease.level.Moderate': 'मध्यम ख़तरा',
  'disease.level.High': 'अधिक ख़तरा',
  'disease.none': 'मौसम इस समय {crop} के आम रोगों के अनुकूल नहीं है।',
  'disease.headline': 'मौसम {disease} के अनुकूल है।',
  'disease.observed': 'लगातार {days} दिनों से परिस्थितियाँ अनुकूल रही हैं।',
  'disease.observedOne': 'आज परिस्थितियाँ अनुकूल हो गई हैं।',
  'disease.forecast': 'अगले {days} दिन और अनुकूल परिस्थितियाँ रहने की संभावना है।',
  'disease.forecastOne': 'कल भी अनुकूल परिस्थितियाँ बनी रहने की संभावना है।',
  'disease.overcast': 'इन दिनों ज़्यादातर बादल छाए रहे — गीली पत्तियाँ देर तक गीली रहती हैं, जिससे रोग बढ़ता है।',
  'disease.trigger': '{date} को: {temp}, नमी {humidity}, बारिश {rain}।',
  'disease.inspectTitle': 'क्या देखें',
  'disease.inspect': '{where} देखें। {what}',
  'disease.advice':
    'यह मौसम की चेतावनी है, रोग की पहचान नहीं। ये लक्षण दिखें तो कोई भी दवा देने से पहले अपने कृषि विस्तार अधिकारी को नमूना दिखाएँ।',
  'disease.tipDry': 'दिन में जल्दी सिंचाई करने से पत्तियाँ जल्दी सूखती हैं, जिससे रोग का ख़तरा घटता है।',
  'disease.unavailable': 'दैनिक मौसम जानकारी उपलब्ध नहीं है, इसलिए रोग का ख़तरा नहीं आँका जा सकता।',

  'moisture.title': 'मिट्टी की नमी',
  'moisture.unavailable':
    'दैनिक मौसम जानकारी उपलब्ध नहीं है, इसलिए मिट्टी की नमी का हिसाब नहीं दिखाया जा सकता।',
  'moisture.statusOk': 'जड़ क्षेत्र में पर्याप्त पानी उपलब्ध है।',
  'moisture.statusStress': 'कमी उस स्तर तक पहुँच गई है जहाँ फ़सल पर दबाव पड़ता है — सिंचाई करें।',
  'moisture.available': 'उपलब्ध पानी',
  'moisture.depletion': 'कमी',
  'moisture.capacity': 'कुल क्षमता',
  'moisture.rootDepth': 'जड़ की गहराई',
  'moisture.help':
    'पट्टी जड़ क्षेत्र की कुल क्षमता में से बचे हुए पानी को दिखाती है। निशान वह बिंदु है जहाँ से फ़सल पर दबाव शुरू होता है।',

  'provenance.MEASURED': 'खेत की जाँच',
  'provenance.USER_PROVIDED': 'आपने बताया',
  'provenance.REGIONAL_ESTIMATE': 'क्षेत्रीय अनुमान',
  'provenance.FORECAST': 'पूर्वानुमान',
  'provenance.CALCULATED': 'गणना से',
  'provenance.INFERRED': 'अनुमानित',
  'provenance.UNKNOWN': 'ज्ञात नहीं',

  'ph.title': 'मिट्टी pH उपयुक्तता',
  'ph.unavailable': 'इस फ़ार्म के लिए अभी मिट्टी pH का अनुमान उपलब्ध नहीं है, इसलिए उपयुक्तता नहीं दिखाई जा सकती।',
  'ph.pending': 'इस फ़ार्म के लिए मिट्टी का नक़्शा पढ़ा जा रहा है। इसमें एक मिनट तक लग सकता है।',
  'ph.unreachable':
    'मिट्टी के नक़्शे तक पहुँच नहीं हो सकी। अपना इंटरनेट कनेक्शन देखें — यह अपने आप फिर से आज़माया जाएगा।',
  'ph.reading': 'अनुमानित मिट्टी pH: {ph}',
  'ph.source':
    'यह 250 मीटर के मृदा नक़्शे से लिया गया अनुमान है, आपके खेत की जाँच नहीं। अपने प्लॉट का सही आँकड़ा मृदा स्वास्थ्य कार्ड की जाँच से मिलेगा।',
  'ph.optimalRange': '{crop} के लिए उपयुक्त: pH {min}-{max}',
  'ph.level.suitable': 'उपयुक्त',
  'ph.level.slightly-outside': 'उपयुक्त सीमा से थोड़ा बाहर',
  'ph.level.significant-issue': 'गंभीर pH समस्या',
  'ph.help.suitable': 'यह मिट्टी pH फ़सल के लिए उपयुक्त है; पोषक तत्व सामान्यतः उपलब्ध रहेंगे।',
  'ph.help.slightly-outside':
    'मृदा परीक्षण के अनुसार एक छोटा सुधार (जैसे चूना या सल्फ़र) पोषक तत्वों की उपलब्धता बेहतर कर सकता है।',
  'ph.help.significant-issue':
    'यह pH फ़सल की सहन सीमा से बहुत बाहर है और पोषक तत्वों के अवशोषण को सीमित कर सकता है। अपने स्थानीय कृषि विज्ञान केंद्र या कृषि विस्तार अधिकारी से सुधार योजना के बारे में पूछें।',

  'disease.name.riceBlast': 'धान का झोंका (ब्लास्ट)',
  'disease.name.riceBacterialLeafBlight': 'जीवाणु पत्ती अंगमारी',
  'disease.name.wheatStripeRust': 'पीला रतुआ',
  'disease.name.wheatLeafRust': 'भूरा रतुआ',
  'disease.name.maizeTurcicumLeafBlight': 'टर्सिकम पत्ती अंगमारी',
  'disease.name.maizeCommonRust': 'सामान्य रतुआ',
  'disease.name.cottonAlternariaLeafSpot': 'अल्टरनेरिया पत्ती धब्बा',
  'disease.name.cottonBacterialBlight': 'जीवाणु अंगमारी',
  'disease.name.sugarcaneRedRot': 'लाल सड़न',
  'disease.name.sugarcaneRust': 'रतुआ',
  'disease.name.soybeanRust': 'सोयाबीन रतुआ',
  'disease.name.soybeanAnthracnose': 'एंथ्रैक्नोज़',
  'disease.name.groundnutLateLeafSpot': 'पछेती पत्ती धब्बा',
  'disease.name.groundnutRust': 'मूंगफली रतुआ',
  'disease.name.lateBlight': 'पछेती अंगमारी',
  'disease.name.earlyBlight': 'अगेती अंगमारी',
  'disease.name.onionPurpleBlotch': 'बैंगनी धब्बा',
  'disease.name.onionDownyMildew': 'मृदुरोमिल आसिता',

  'disease.where.riceBlast': 'पत्तियाँ, फिर गाँठें और बाली की गर्दन',
  'disease.where.riceBacterialLeafBlight': 'पत्तियों के सिरे और किनारे, पहले ऊपरी पत्तियाँ',
  'disease.where.wheatStripeRust': 'पत्ती की ऊपरी सतह, पहले नीचे की पत्तियाँ',
  'disease.where.wheatLeafRust': 'पत्ती की दोनों सतहें',
  'disease.where.maizeTurcicumLeafBlight': 'पहले नीचे की पत्तियाँ, फिर ऊपर की ओर',
  'disease.where.maizeCommonRust': 'पत्ती की दोनों सतहें',
  'disease.where.cottonAlternariaLeafSpot': 'नीचे की पुरानी पत्तियाँ',
  'disease.where.cottonBacterialBlight': 'पत्तियाँ, तने और घेंटे',
  'disease.where.sugarcaneRedRot': 'संदिग्ध गन्ने को लंबाई में चीरकर अंदर',
  'disease.where.sugarcaneRust': 'पत्तियों की निचली सतह',
  'disease.where.soybeanRust': 'नीचे की पत्तियों की निचली सतह',
  'disease.where.soybeanAnthracnose': 'तने और फलियाँ',
  'disease.where.groundnutLateLeafSpot': 'पुरानी पत्तियों की निचली सतह',
  'disease.where.groundnutRust': 'पत्तियों की निचली सतह',
  'disease.where.lateBlight': 'पहले नीचे की पत्तियाँ, फिर तने और फ़सल',
  'disease.where.earlyBlight': 'पहले सबसे पुरानी, सबसे नीचे की पत्तियाँ',
  'disease.where.onionPurpleBlotch': 'पुरानी पत्तियाँ, सिरे से नीचे की ओर',
  'disease.where.onionDownyMildew': 'पुरानी पत्तियाँ, सुबह जल्दी',

  'disease.what.riceBlast': 'तकुए जैसे धब्बे, बीच में भूरा-सलेटी और किनारे भूरे।',
  'disease.what.riceBacterialLeafBlight':
    'सिरे से शुरू होकर पानी-भरी पीली धारियाँ, जो सूखकर भूसे जैसी हो जाती हैं।',
  'disease.what.wheatStripeRust': 'शिराओं के बीच धारियों में पीले-नारंगी चूर्णी फफोले।',
  'disease.what.wheatLeafRust': 'बिखरे हुए नारंगी-भूरे गोल फफोले, धारियों में नहीं।',
  'disease.what.maizeTurcicumLeafBlight': 'लंबे सलेटी-हरे सिगार जैसे धब्बे।',
  'disease.what.maizeCommonRust': 'पत्ती पर बिखरे छोटे दालचीनी-भूरे फफोले।',
  'disease.what.cottonAlternariaLeafSpot': 'गोल छल्लों वाले भूरे धब्बे, चारों ओर हल्का घेरा।',
  'disease.what.cottonBacterialBlight': 'कोणीय पानी-भरे धब्बे जो काले पड़ते हैं, शिराएँ काली।',
  'disease.what.sugarcaneRedRot': 'अंदर का गूदा लाल, बीच-बीच में सफ़ेद पट्टियाँ, खट्टी गंध।',
  'disease.what.sugarcaneRust': 'लंबे नारंगी-भूरे फफोले।',
  'disease.what.soybeanRust': 'छोटे उभरे भूरे-पीले फफोले, रगड़ने पर चूर्ण झड़ता है।',
  'disease.what.soybeanAnthracnose': 'गहरे बेढंगे धब्बे, उन पर बारीक काले काँटे।',
  'disease.what.groundnutLateLeafSpot': 'पीले घेरे रहित गहरे धब्बे, नीचे फफोले।',
  'disease.what.groundnutRust': 'नारंगी फफोले जो फटकर चूर्ण छोड़ते हैं।',
  'disease.what.lateBlight': 'गहरे पानी-भरे धब्बे, सुबह नीचे की ओर सफ़ेद फफूँद का घेरा।',
  'disease.what.earlyBlight': 'निशाने जैसे गोल छल्लों वाले गहरे धब्बे।',
  'disease.what.onionPurpleBlotch': 'छोटे सफ़ेद धँसे धब्बे, जो बढ़कर बैंगनी-भूरे घेरेदार हो जाते हैं।',
  'disease.what.onionDownyMildew': 'हल्के अंडाकार धब्बे, उन पर बैंगनी-सलेटी रोएँदार परत।',

  // फ़ोटो जाँच (item 16) — कोई दवा, कोई मात्रा, कोई निदान नहीं (docs/12 §Product Boundaries)।
  'vision.title': 'पत्ती की फ़ोटो जाँचें',
  'vision.onDevice': 'बिना नेटवर्क चलता है',
  'vision.lede':
    'प्रभावित एक पत्ती की फ़ोटो लें। जाँच आपके फ़ोन पर ही होती है, फ़ोटो कहीं नहीं भेजी जाती।',
  'vision.choose': 'फ़ोटो चुनें या लें',
  'vision.firstUseHint':
    'पहली जाँच में लगभग 9 MB डाउनलोड होता है, इसलिए हो सके तो वाई-फ़ाई पर करें। उसके बाद यह बिना नेटवर्क काम करती है।',
  'vision.working': 'फ़ोटो देखी जा रही है…',
  'vision.again': 'दूसरी फ़ोटो जाँचें',
  'vision.previewAlt': 'आपकी चुनी हुई पत्ती की फ़ोटो',
  'vision.healthyName': 'स्वस्थ पत्ती',
  'vision.similarTo': 'यह पत्ती {name} की फ़ोटो जैसी दिखती है ({percent}% समानता)।',
  'vision.healthy': 'यह पत्ती स्वस्थ पत्तियों जैसी दिखती है ({percent}% समानता)।',
  'vision.healthyCaveat':
    'यह केवल इसी एक पत्ती के बारे में है। दूसरे पौधे भी देखते रहें, खासकर नीचे और भीतर की पत्तियाँ।',
  'vision.unsure':
    'फ़ोटो का मिलान भरोसे से नहीं हो सका, इसलिए कोई परिणाम नहीं दिखाया गया। यहाँ गलत नाम आपकी फ़सल पर भारी पड़ सकता है।',
  'vision.retakeTips':
    'फिर कोशिश करें — एक ही पत्ती पूरे फ़्रेम में हो, दिन के उजाले में, सादे पीछे के साथ, कैमरा स्थिर रखें।',
  'vision.unknownClass': 'इस फ़ोटो से ऐसा परिणाम आया जिसे ऐप पहचानता नहीं।',
  'vision.otherPlant':
    'यह {plant} की पत्ती लगती है, पर यह खेत {crop} का है। यदि आपने {crop} की ही फ़ोटो ली है, तो नीचे का परिणाम भरोसेमंद न मानें।',
  'vision.otherPlantHealthy':
    'फ़ोटो {plant} की स्वस्थ पत्ती से मिली, {crop} से नहीं। इससे आपके {crop} के बारे में कुछ पता नहीं चलता — आम तौर पर इसका मतलब यह है कि पत्ती पहचानी ही नहीं गई। {crop} की एक पत्ती पूरे फ़्रेम में भरकर दोबारा कोशिश करें।',
  'vision.noHealthyClass':
    'फ़ोटो जाँच के पास {crop} की स्वस्थ पत्ती का कोई नमूना नहीं है, इसलिए {crop} के लिए यह हमेशा अपनी जानी हुई किसी बीमारी का नाम बताती है — पत्ती ठीक हो तब भी। इसे और ध्यान से देखने का कारण मानें, नतीजा नहीं।',
  'vision.cropNotCovered':
    'फ़ोटो जाँच {crop} पर प्रशिक्षित नहीं है। यह केवल {covered} जानती है, इसलिए दूसरी फ़सल का परिणाम भरोसेमंद नहीं। ऊपर दी गई रोग निगरानी {crop} के लिए काम करती रहती है।',
  'vision.caveat':
    'यह आपकी फ़ोटो की तुलना प्रशिक्षण की फ़ोटो से करती है। यह निदान नहीं है, और खेत की असली फ़ोटो पर यह प्रयोगशाला की तुलना में कहीं कम भरोसेमंद है।',
  'vision.advice':
    'कुछ भी इलाज करने से पहले नमूना अपने कृषि विस्तार अधिकारी या कृषि विज्ञान केंद्र को दिखाएँ।',
  'vision.referenceTitle': 'संदर्भ फ़ोटो',
  'vision.referenceNote': 'केवल आकार, रंग और पैटर्न मिलाएँ। खेत में लक्षण अलग दिख सकते हैं।',
  'vision.referenceSingle': 'इसके लिए केवल एक संदर्भ फ़ोटो उपलब्ध है।',
  'vision.referenceAlt': '{name} दिखाने वाली संदर्भ फ़ोटो {number}',
  'vision.referenceCredit': 'फ़ोटो: {credits}',

  'vision.plant.Apple': 'सेब',
  'vision.plant.Maize': 'मक्का',
  'vision.plant.PepperBell': 'शिमला मिर्च',
  'vision.plant.Potato': 'आलू',
  'vision.plant.Rice': 'धान',
  'vision.plant.Tomato': 'टमाटर',

  'vision.name.appleScab': 'सेब का स्कैब',
  'vision.name.appleBlackRot': 'काला सड़न',
  'vision.name.cedarAppleRust': 'सीडर एप्पल रस्ट',
  'vision.name.grayLeafSpot': 'धूसर पर्ण धब्बा',
  'vision.name.pepperBacterialSpot': 'जीवाणु धब्बा',
  'vision.name.tomatoBacterialSpot': 'जीवाणु धब्बा',
  'vision.name.tomatoLeafMould': 'पर्ण फफूँद',
  'vision.name.septoriaLeafSpot': 'सेप्टोरिया पर्ण धब्बा',
  'vision.name.spiderMites': 'दो-धब्बेदार मकड़ी माइट का नुकसान',
  'vision.name.targetSpot': 'टार्गेट स्पॉट',
  'vision.name.tomatoYellowLeafCurlVirus': 'पीला पत्ती मरोड़ विषाणु',
  'vision.name.tomatoMosaicVirus': 'मोज़ेक विषाणु',
  'vision.name.riceBrownSpot': 'भूरा धब्बा',
  'vision.name.riceLeafScald': 'पत्ती झुलसा',
  'vision.name.riceSheathBlight': 'शीथ ब्लाइट',
  'vision.name.riceTungro': 'टुंग्रो',

  'vision.error.modelUnavailable':
    'फ़ोटो जाँच डाउनलोड नहीं हो सकी। एक बार नेटवर्क से जुड़कर फिर कोशिश करें।',
  'vision.error.runtimeUnavailable': 'यह ब्राउज़र इस डिवाइस पर फ़ोटो जाँच नहीं चला सकता।',
  'vision.error.imageUnreadable': 'वह फ़ाइल फ़ोटो के रूप में नहीं पढ़ी जा सकी। दूसरी आज़माएँ।',
  'vision.error.inferenceFailed': 'इस डिवाइस पर फ़ोटो जाँच विफल रही।',

  'settings.notifDenied': 'ब्राउज़र ने सूचनाएँ रोकी हैं। अनुस्मारक पाने के लिए ब्राउज़र सेटिंग्स में अनुमति दें।',
  'settings.notifUnsupported': 'यह डिवाइस सूचनाओं का समर्थन नहीं करता।',

  'onb.skip': 'छोड़ें',
  'onb.feature.weather': 'मौसम-आधारित सलाह',
  'onb.feature.offline': 'पूरी तरह ऑफ़लाइन काम करता है',
  'onb.feature.explain': 'हर सिफ़ारिश की व्याख्या',
  'onb.feature.language': 'English, हिन्दी, বাংলা, অসমীয়া, اردو',

  'reminder.title': 'मुझे याद दिलाएँ',
  'reminder.auto': 'ऑटो',
  'reminder.custom': 'मेरा चुना हुआ',
  'reminder.add': 'जोड़ें',
  'reminder.remove': 'हटाएँ',
  'reminder.timeLabel': 'अनुस्मारक समय',
  'reminder.tomorrowTag': 'कल',
  'reminder.setForTomorrow': 'वह समय आज बीत चुका है — अनुस्मारक कल के लिए लगा दिया गया है।',
  'reminder.addError': 'अनुस्मारक नहीं जुड़ सका। कृपया फिर कोशिश करें।',
  'reminder.note': 'अनुस्मारक ऐप खुले होने पर या अगली बार खोलने पर सूचित करते हैं — ऑनलाइन या ऑफ़लाइन।',

  'water.title': 'पानी की सूची',
  'water.target': 'आज देना है',
  'water.done': 'अब तक दिया',
  'water.remaining': 'अभी बाकी',
  'water.nothingToday': 'आज सिंचाई की ज़रूरत नहीं — फ़सल और बारिश ने काम कर दिया है।',
  'water.logFull': 'सिंचाई पूरी हुई',
  'water.logPart': '+{n} मिनट',
  'water.undo': 'आज का हटाएँ',
  'water.complete': 'आज का पानी पूरा हो गया',
  'water.progressLabel': 'आज का {percent}% पानी दिया गया',
  'water.savedToday': 'आज बचाया',
  'water.savedTotal': 'अब तक बचाया',
  'water.savedDays': '{days} दिनों में',
  'water.savedDay': '1 दिन में',
  'water.savedFromRain': 'बारिश के इस्तेमाल से',
  'water.savedFromMethod': 'आपकी सिंचाई विधि से',
  'water.savedNote': 'पूरी ज़रूरत के लिए खेत भर देने और बारिश को न गिनने की तुलना में।',

  'assistant.open': 'सवाल पूछें',
  'assistant.fabLabel': 'पूछें',
  'assistant.title': 'अपने खेत के बारे में पूछें',
  'assistant.close': 'बंद करें',
  'assistant.intro':
    'आज की सिंचाई के बारे में पूछें — कितना पानी, कब देना है, या क्यों। मैं बिना इंटरनेट के भी जवाब दे सकता हूँ।',
  'assistant.placeholder': 'अपना सवाल लिखें…',
  'assistant.listening': 'सुन रहा हूँ…',
  'assistant.speakNow': 'अपना सवाल बोलें',
  'assistant.stopListening': 'सुनना बंद करें',
  'assistant.send': 'भेजें',
  'assistant.thinking': 'सोच रहा हूँ…',
  'assistant.readAloud': 'पढ़कर सुनाएँ',
  'assistant.sourceDevice': 'आपके फ़ोन पर जवाब',
  'assistant.sourceOnline': 'ऑनलाइन जवाब',
  'assistant.sourceUnavailable': 'इंटरनेट चाहिए',
  'assistant.note':
    'यह सहायक ऐप की सलाह समझाता है। यह कोई दवा, छिड़काव या खाद नहीं बता सकता।',
  'assistant.voiceDenied':
    'माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग्स में अनुमति दें, या सवाल लिखें।',
  'assistant.voiceNoSpeech': 'मुझे कुछ सुनाई नहीं दिया। कृपया फिर कोशिश करें।',
  'assistant.voiceLanguageUnsupported':
    'यह ब्राउज़र आपकी चुनी हुई भाषा में नहीं सुन सकता। सेटिंग्स में अंग्रेज़ी में बदलें, या अपना सवाल लिखें।',
  'assistant.voiceNetwork':
    'आवाज़ को समझने के लिए इंटरनेट कनेक्शन ज़रूरी है, और यह अभी टूट गया। कृपया अपना सवाल लिखें, या नेटवर्क आने पर माइक्रोफ़ोन दोबारा आज़माएँ।',
  'assistant.voiceError': 'अभी आवाज़ काम नहीं कर रही। कृपया अपना सवाल लिखें।',
  'assistant.offlineFallback':
    'इसका जवाब बिना इंटरनेट नहीं दे सकता। आज के पानी की मात्रा, समय, बारिश या मिट्टी की नमी के बारे में पूछें — वे मैं ऑफ़लाइन बता सकता हूँ।',

  'assistant.suggest.amount': 'आज कितना पानी दें?',
  'assistant.suggest.timing': 'सिंचाई किस समय करें?',
  'assistant.suggest.why': 'यह सलाह क्यों?',
  'assistant.suggest.moisture': 'मेरी मिट्टी कितनी सूखी है?',
  'assistant.topic.today': 'आज',
  'assistant.topic.irrigation': 'सिंचाई',
  'assistant.topic.soil': 'मिट्टी',
  'assistant.topic.weather': 'मौसम',
  'assistant.topic.fertilizer': 'उर्वरता',
  'assistant.topic.disease': 'रोग जोखिम',
  'assistant.topic.todayQuestion': 'मुझे आज क्या करना चाहिए?',
  'assistant.topic.irrigationQuestion': 'मुझे कब और कितना पानी देना चाहिए?',
  'assistant.topic.soilQuestion': 'मेरी मिट्टी की अभी क्या स्थिति है?',
  'assistant.topic.weatherQuestion': 'आज का मौसम मेरे खेत को कैसे प्रभावित कर रहा है?',
  'assistant.topic.fertilizerQuestion': 'मेरी मिट्टी की उर्वरता के बारे में क्या पता है?',
  'assistant.topic.diseaseQuestion': 'मौसम किस रोग के जोखिम को बढ़ा रहा है?',
  'assistant.briefing.today': '{farm}: {crop} आज की सलाह {status} है।',
  'assistant.briefing.noRecommendation': 'अभी कोई सलाह उपलब्ध नहीं है।',

  'assistant.rule.empty': 'कृपया कोई सवाल लिखें या बोलें।',
  'assistant.rule.referral':
    'मैं दवा, छिड़काव या खुराक का नाम नहीं बता सकता — ग़लत सलाह से पैसा और फ़सल दोनों डूब सकते हैं। अगर आपको रोग की चिंता है तो आज की स्क्रीन पर “पत्ते की फ़ोटो जाँचें” कार्ड में पत्ते की फ़ोटो लें, और लक्षण दिखें तो वह फ़ोटो अपने नज़दीकी कृषि विज्ञान केंद्र या बीज-दवा दुकान को दिखाएँ — वे आपकी फ़सल देख सकते हैं और जानते हैं कि यहाँ क्या मान्य है। मैं सिंचाई के समय, पानी की मात्रा, मिट्टी के pH व उर्वरता, और मान्य उर्वरक अनुसूची में मदद कर सकता हूँ।',
  'assistant.rule.capability':
    'मैं बता सकता हूँ कि आज कितना पानी देना है, कब देना है, ऐप ऐसा क्यों कहता है, मौसम और बारिश कैसी है, मिट्टी कितनी सूखी है, आपकी मिट्टी का pH व उर्वरता, शामिल फसलों की मान्य उर्वरक अनुसूची, और आपने कितना पानी बचाया। मैं कोई दवा या छिड़काव नहीं बता सकता — पर रोग की चिंता पर मैं बता सकता हूँ कि कहाँ देखना है, लक्षण कैसे दिखते हैं, और पत्ते की फ़ोटो जाँच कैसे चलानी है।',
  'assistant.rule.greeting':
    'नमस्ते। पूछिए कि आज कितना पानी देना है, कब सिंचाई करनी है, या ऐप ऐसा क्यों कहता है।',
  'assistant.rule.today': 'आज खेत में यह करना है: {status}।',
  'assistant.rule.amount': 'आज {mm} मिमी दें — आपके खेत के लिए लगभग {litres} लीटर।',
  'assistant.rule.amountRun': 'यानी लगभग {minutes} मिनट चलाना होगा।',
  'assistant.rule.amountNone': 'आज सिंचाई की ज़रूरत नहीं है।',
  'assistant.rule.timing': '{start} से {end} के बीच सिंचाई करें।',
  'assistant.rule.timingWhy':
    'उस समय पानी देने से भाप कम बनती है और दिन में पत्ते सूख जाते हैं।',
  'assistant.rule.timingNone': 'आज सिंचाई का कोई समय नहीं है, क्योंकि आज सिंचाई की सलाह नहीं है।',
  'assistant.rule.confidence': 'इस सलाह पर भरोसा: {level}।',
  'assistant.rule.rain': 'आज लगभग {mm} मिमी बारिश की उम्मीद है।',
  'assistant.rule.rainNone': 'आज कोई ख़ास बारिश की उम्मीद नहीं है।',
  'assistant.rule.rainAdvice': 'यह आज की सलाह में पहले से गिना गया है: {status}।',
  'assistant.rule.moisture':
    'आपकी जड़ों का क्षेत्र भरने से {short} मिमी कम है, जबकि यह मिट्टी कुल {capacity} मिमी रख सकती है।',
  'assistant.rule.moistureOk': '{threshold} मिमी के बाद फ़सल पर दबाव पड़ता है, तो अभी ठीक है।',
  'assistant.rule.moistureStress':
    'यह {threshold} मिमी की सीमा पार कर चुका है जहाँ फ़सल पर दबाव पड़ने लगता है, इसीलिए सिंचाई की सलाह है।',
  'assistant.rule.disease': 'मौसम इस समय {disease} के लिए {level} है।',
  'assistant.rule.diseaseNone': 'मौसम इस समय इस फ़सल के आम रोगों के अनुकूल नहीं है।',
  'assistant.rule.diseaseCaveat':
    'यह केवल मौसम की बात है — मैंने आपकी फ़सल नहीं देखी और नहीं कह सकता कि कोई रोग लगा है।',
  'assistant.rule.diseaseScout': 'खेत में हों तो {where} देखें — सुबह, जब पत्ते सूखे हों, सबसे अच्छा है।',
  'assistant.rule.diseaseSigns': 'जो लक्षण ढूँढने हैं: {what}',
  'assistant.rule.diseasePhoto':
    'पक्का नहीं? आज की स्क्रीन पर “पत्ते की फ़ोटो जाँचें” कार्ड में पत्ते की फ़ोटो लें — ऐप उसे आपके फ़ोन पर ही आम रोगों से मिलाता है, इंटरनेट की ज़रूरत नहीं।',
  'assistant.rule.diseaseNext':
    'अगर ऐसे लक्षण मिलें तो फ़ोटो कृषि विज्ञान केंद्र या बीज-दवा दुकान को दिखाएँ — वे पक्का करेंगे और बताएँगे कि आपकी फ़सल के चरण के लिए क्या मान्य है।',

  // --- Latest leaf-photo check (V2.2) ---
  'assistant.photo.match': 'फ़ोटो {name} से मिलती-जुलती लगती है ({percent}% समान)।',
  'assistant.photo.tentative': 'फ़ोटो {name} से केवल हल्की-सी मिलती है ({percent}% समान)।',
  'assistant.photo.healthy': 'फ़ोटो स्वस्थ पत्ते जैसी लगती है ({percent}% समान)।',
  'assistant.photo.otherPlant': 'फ़ोटो {plant} के पत्ते जैसी लगती है, आपकी {crop} नहीं।',
  'assistant.rule.photoAnswer': 'यह समानता है, निदान नहीं — ऐप नहीं कह सकता कि रोग है ही।',
  'assistant.rule.photoNext': 'अगर पत्ते पर लक्षण दिखें तो उसे (या फ़ोटो) पक्का कराने कृषि विज्ञान केंद्र या बीज-दवा दुकान ले जाएँ।',
  'assistant.rule.photoNone': 'अभी कोई फ़ोटो जाँच मेरे पास नहीं है। आज की स्क्रीन पर “पत्ते की फ़ोटो जाँचें” कार्ड में पत्ते की फ़ोटो लें — यह आपके फ़ोन पर चलती है, इंटरनेट नहीं चाहिए।',
  'assistant.rule.savedToday': 'आज आपने लगभग {litres} लीटर बचाए।',
  'assistant.rule.savedTotal': 'अब तक दर्ज सभी दिनों में लगभग {litres} लीटर।',
  'assistant.rule.savedBasis':
    'यह पूरी ज़रूरत के लिए खेत भर देने और बारिश को न गिनने की तुलना में मापा गया है।',
  'assistant.rule.plan': 'कल की योजना: {status}।',
  'assistant.rule.planCaveat': 'यह पूर्वानुमान पर आधारित है, मौसम बदले तो यह भी बदल सकता है।',
  'assistant.rule.weatherTemp': 'अभी लगभग {temp}°से. है।',
  'assistant.rule.weatherHumidity': 'नमी लगभग {humidity}% है।',
  'assistant.rule.weatherRain': 'आज अपेक्षित बारिश: {mm} मिमी।',

  'assistant.rule.ph': 'ऐप के अनुसार आपकी ऊपरी मिट्टी का pH {ph} है।',
  'assistant.rule.phEstimate':
    'यह 250 मीटर के मृदा नक़्शे से लिया गया आपके इलाके का अनुमान है — आपके खेत की जाँच नहीं। अपने प्लॉट का आँकड़ा नज़दीकी केंद्र पर मृदा स्वास्थ्य कार्ड की जाँच से मिलेगा।',
  'assistant.rule.phMeasured': 'यह आँकड़ा आपके ही खेत की जाँच से आया है।',
  'assistant.rule.phUnknown':
    'इस फ़ार्म के लिए मेरे पास मिट्टी के pH का आँकड़ा नहीं है। ऐप जो आँकड़ा दिखाता है वह भी 250 मीटर के मृदा नक़्शे से आपके इलाके का अनुमान होता है, आपके खेत की जाँच नहीं — अपना आँकड़ा नज़दीकी केंद्र पर मृदा स्वास्थ्य कार्ड की जाँच से ही मिलेगा।',
  'assistant.rule.phSuitability':
    'आपकी फ़सल के लिए pH {min} से {max} ठीक रहता है, इसलिए यह इस तरह पढ़ा जाता है: {verdict}।',
  'assistant.rule.phAdvice':
    'कितना चूना, जिप्सम या कोई और सुधारक डालना है, यह मैं नहीं बता सकता — उसके लिए मिट्टी की जाँच और आपके स्थानीय कृषि विज्ञान केंद्र की सलाह चाहिए।',
  'assistant.rule.fertilityUnknown':
    'इस फ़ार्म के लिए मेरे पास उर्वरता का अंदाज़ा नहीं है। ऐप जो pH या जैविक कार्बन का आँकड़ा दिखाता है वह भी आपके इलाके का अनुमान है, मिट्टी की जाँच नहीं — अपने प्लॉट का आँकड़ा नज़दीकी केंद्र पर मृदा स्वास्थ्य कार्ड की जाँच से मिलेगा, और आपका कृषि विज्ञान केंद्र उसे खाद की योजना में बदल सकता है।',
  'assistant.rule.fertilityNoEstimate':
    'इस फ़ार्म के लिए अभी मिट्टी का pH या जैविक कार्बन का कोई अंदाज़ा नहीं है।',
  'assistant.rule.fertilityReading':
    'आपकी इस खेत की अपनी मृदा स्वास्थ्य कार्ड रीडिंग: N {n}, P₂O₅ {p}, K₂O {k} किग्रा/हेक्टेयर — कुल उर्वरता: {band}।',
  'assistant.rule.fertilityAdvice':
    'मैं खाद, यूरिया, चूना, जिप्सम या किसी और सुधारक की सटीक मात्रा नहीं बता सकता — उसके लिए मिट्टी की जाँच चाहिए। कृपया मिट्टी या पत्ती का नमूना अपने नज़दीकी कृषि विज्ञान केंद्र या कृषि विस्तार अधिकारी को दिखाएँ; वे आपके खेत के लिए सटीक मात्रा बता सकते हैं।',
  'assistant.rule.testInterpreted': 'मैंने आपके दिए हुए मिट्टी परीक्षण के परिणाम पढ़े: pH {ph}, जैविक कार्बन {oc}%, और {values}। ये खेत की जाँच के आँकड़े हैं, इसलिए इस खेत के लिए क्षेत्रीय नक्शे के अनुमान से अधिक उपयोगी हैं।',
  'assistant.rule.testLow': 'कम पोषक तत्व: {nutrients}। इससे फ़सल की बढ़त सीमित हो सकती है; इसे फ़सल की अवस्था के अनुसार खाद योजना में देखें।',
  'assistant.rule.testNoLow': 'दिए गए N, P₂O₅ और K₂O में कोई कम परिणाम नहीं मिला।',
  'assistant.rule.testHigh': 'अधिक पोषक तत्व: {nutrients}। फ़सल योजना और अगली जाँच के बिना इनकी अतिरिक्त मात्रा न डालें।',
  'assistant.rule.testNextSteps': 'अब Fertilizer भाग में अपनी फ़सल और मिट्टी का क्षेत्र चुनें, खाद को फ़सल की अवस्था के अनुसार बाँटकर दें, और स्थानीय अनुसूची से मात्रा मिलाएँ। मैं परिणाम समझा सकता हूँ, लेकिन मात्रा का अनुमान नहीं लगाऊँगा।',
  'assistant.rule.testPrompt': 'हाँ — दो तरीके हैं। यहाँ संख्याएँ इस रूप में भेजें: pH 6.2, organic carbon 0.8%, N 240, P 12, K 150 kg/ha — मैं हर मान वर्गीकृत करके समझाऊँगा। या Fertilizer टैब खोलें, फ़सल और मिट्टी का क्षेत्र चुनें, मिट्टी-परीक्षण विकल्प दबाएँ, कार्ड की संख्याएँ भरें और “रीडिंग सहेजें” दबाएँ — ऐप उन्हें आपके खेत पर सहेज लेगा, आधिकारिक खुराक उसी अनुसार दिखाएगा, और अगली बार भी याद रखेगा।',
  'assistant.rule.phAmendAcidic':
    'इस फ़सल की सीमा तक pH बढ़ाने के लिए इन मिट्टियों में सामान्य उपाय चूना या डोलोमाइट है — मात्रा के लिए मिट्टी परीक्षण और आपके कृषि विज्ञान केंद्र की सलाह ज़रूरी है।',
  'assistant.rule.phAmendAlkaline':
    'इस फ़सल की सीमा तक pH घटाने के लिए इन मिट्टियों में सामान्य उपाय जिप्सम है — मात्रा के लिए मिट्टी परीक्षण और आपके कृषि विज्ञान केंद्र की सलाह ज़रूरी है।',
  'assistant.rule.phAlts': 'इस pH पर ऐप के आँकड़ों के अनुसार सबसे उपयुक्त फ़सलें हैं: {crops}।',
  'assistant.rule.fertScheduleQuote':
    'राज्य अनुसूची के अनुसार, {zone} क्षेत्र की {variety} के लिए, {band} उर्वरता वाली मिट्टी पर: {npk}।',
  'assistant.rule.fertScheduleMore':
    'इस अनुसूची की गोबर खाद, मिट्टी-संशोधन और विभाजन-समय की पंक्तियाँ Fertilizer टैब पर देखें।',
  'assistant.rule.fertScheduleNote':
    'अंतिम योजना अपने कृषि विज्ञान केंद्र से पक्की करें — वे आपके खेत के इतिहास के हिसाब से उसे बदल सकते हैं।',
  'assistant.rule.soilType': 'आपने इस खेत की मिट्टी {soil} दर्ज की है।',
  'assistant.rule.soilCarbon':
    'मृदा नक़्शे के अनुसार आपकी ऊपरी मिट्टी में लगभग {oc}% जैविक कार्बन है।',
  'assistant.rule.soilMapCaveat':
    'कार्बन का यह आँकड़ा 250 मीटर इलाके का अनुमान है, आपके खेत की जाँच नहीं।',

  // --- Fertilizer recommendation ---
  'fert.title': 'खाद की सिफ़ारिश',
  'fert.selectPrompt': 'सिफ़ारिश देखने के लिए फ़सल, क्षेत्र और उर्वरता स्तर चुनें।',
  'fert.noCropSelected': 'शुरू करने के लिए एक फ़सल चुनें।',
  'fert.cropNotCovered':
    'इस उपकरण में अभी {crop} के लिए खाद अनुसूची नहीं है। यह अभी धान, गेहूं, मक्का, कपास, आलू और मूंगफली को शामिल करता है।',
  'fert.noZoneEntry': 'स्रोत अनुसूची में इस किस्म के लिए {zone} मिट्टी क्षेत्र की कोई सिफ़ारिश नहीं है।',
  'fert.zone.Hill': 'पहाड़ी',
  'fert.zone.Terai': 'तराई',
  'fert.zone.GangeticAlluvium': 'गंगा जलोढ़',
  'fert.zone.VindhyaAlluviumRedLateritic': 'विंध्य जलोढ़, लाल व लैटेराइट',
  'fert.zone.Coastal': 'तटीय',
  'fert.fertility.Low': 'कम',
  'fert.fertility.Medium': 'मध्यम',
  'fert.fertility.High': 'अधिक',
  'fert.districts': 'इस क्षेत्र के ज़िले',
  'fert.npkN': 'नाइट्रोजन (N)',
  'fert.npkP': 'फ़ॉस्फ़ोरस (P₂O₅)',
  'fert.npkK': 'पोटाश (K₂O)',
  'fert.kgHaShort': 'किग्रा/हेक्टेयर',
  'fert.noNpk': 'स्रोत अनुसूची में इस क्षेत्र और उर्वरता स्तर के लिए कोई NPK आँकड़ा नहीं दिया गया है।',
  'fert.ameliorantTitle': 'मिट्टी सुधारक',
  'fert.manureTitle': 'खाद / जैव-उर्वरक',
  'fert.sulphurTitle': 'सल्फ़र',
  'fert.micronutrientsTitle': 'सूक्ष्म पोषक तत्व',
  'fert.remarksTitle': 'डालने का समय',
  'fert.tableNoteTitle': 'इस फ़सल के लिए सामान्य टिप्पणी',
  'fert.disclaimer':
    'यह एक सामान्य ज़िला-स्तरीय अनुसूची है, आपके अपने खेत की जाँच नहीं। आपकी वास्तविक मृदा परीक्षण रिपोर्ट को हमेशा प्राथमिकता दें। सिंचाई और खाद के समय के अलावा कुछ भी — कीट, रोग, या मृदा परीक्षण से मेल न खाने वाली अनुसूची — के लिए कृपया अपने स्थानीय कृषि विज्ञान केंद्र या कृषि विस्तार अधिकारी से पूछें।',
  'fert.sourceCredit': 'स्रोत: राज्य कृषि विभाग की मृदा-परीक्षण आधारित खाद सिफ़ारिश अनुसूची।',
  'fert.prefillFromFarm': '{farm} से भरा गया — अलग सिफ़ारिश देखने के लिए कोई भी फ़ील्ड बदलें।',
  'fert.moreInfo': 'अधिक जानकारी',
  'fert.stepCrop': '1. आपकी फ़सल',
  'fert.stepVariety': '2. मौसम / किस्म',
  'fert.stepZone': '3. आपका मिट्टी क्षेत्र',
  'fert.stepFertility': '4. मिट्टी की उर्वरता',
  'fert.fertilityModeNumbers': 'मेरे पास मृदा-परीक्षण के आँकड़े हैं',
  'fert.fertilityModeSimple': 'मुझे पक्का नहीं है',
  'fert.kgHaPlaceholder': 'किग्रा/हेक्टेयर',
  'fert.npkInputHint': 'अपने सॉइल हेल्थ कार्ड या लैब रिपोर्ट से, किग्रा/हेक्टेयर में।',
  'fert.npkIncomplete': 'सिफ़ारिश देखने के लिए तीनों आँकड़े (N, P, K) भरें।',
  'fert.classifiedAs': 'आपकी मिट्टी की उर्वरता: {level}',
  'fert.saveReading': 'यह आँकड़ा इस खेत के लिए सहेजें',
  'fert.readingSaved': 'सहेजा गया',
  'fert.phFromFarm': 'इस खेत की मिट्टी का pH {ph} है (इस फ़सल के लिए उपयुक्त: {min}-{max}) — {verdict}।',

  // --- Farm improvement plan (PRD §15) ---
  'improve.title': 'आप क्या सुधार सकते हैं',
  'improve.subtitle':
    'सबसे ज़रूरी बात पहले। जब तक ऐप के पास पक्का आधार न हो, यहाँ कुछ नहीं दिखता।',
  'improve.none': 'आज ध्यान देने वाली कोई बात नहीं',
  'improve.noneHint': 'इस खेत के रिकॉर्ड में अभी ऐसा कुछ नहीं जिस पर आपको ध्यान देना पड़े।',
  'improve.moreCount': '{count} और',
  'improve.actions': 'आप क्या कर सकते हैं',
  'improve.severity.HIGH': 'ज़रूरी',
  'improve.severity.MEDIUM': 'देख लेना अच्छा',
  'improve.severity.LOW': 'छोटी बात',
  'improve.disclaimer':
    'इसमें कुछ बातें नक्शों और मौसम के अनुमान पर टिकी हैं, आपके खेत की जाँच पर नहीं। हर बात के साथ लिखा है कि वह किस आधार पर है।',
  'improve.ph.title': 'मिट्टी का pH {crop} के लिए ठीक नहीं हो सकता',
  'improve.ph.explain':
    'मिट्टी के नक्शे के अनुसार यहाँ ऊपरी मिट्टी का pH लगभग {ph} है, जबकि {crop} के लिए {min} से {max} सबसे अच्छा रहता है। यह अनुमान 250 मीटर के नक्शे के खाने का है, आपके खेत की जाँच नहीं — इसलिए इसे नतीजा न मानें, जाँच करने की वजह मानें।',
  'improve.ph.actionTest':
    'अपने नज़दीकी कृषि विज्ञान केंद्र पर मृदा स्वास्थ्य कार्ड की जाँच कराएँ, तभी आपके खेत का असली pH पता चलेगा।',
  'improve.ph.actionKvk':
    'कितना चूना, जिप्सम या गंधक डालना है, यह ऐप नहीं बता सकता। जाँच की रिपोर्ट लेकर अपने कृषि विस्तार अधिकारी से पूछें।',
  'improve.texture.title': 'मिट्टी का नक्शा इस खेत को अलग बताता है',
  'improve.texture.explain':
    'आपने {yours} दर्ज किया है। इस जगह का मिट्टी का नक्शा इसे {theirs} जैसा बताता है। ऐप आपकी ही बात मानता है और यही ठीक है — आप इस खेत में खड़े हुए हैं, नक्शा नहीं। पर पानी के आँकड़े इसी पर बने हैं, इसलिए एक बार पक्का कर लेना अच्छा है।',
  'improve.texture.action':
    'थोड़ी गीली मिट्टी उँगलियों में मलकर देखें। अगर वह {yours} जैसी न लगे, तो खेत के विवरण में मिट्टी बदल दें।',
  'improve.soilProfile.title': 'इस खेत के लिए मिट्टी के नक्शे का आँकड़ा नहीं है',
  'improve.soilProfile.explain':
    'इस जगह के लिए नक्शे का कोई आँकड़ा सेव नहीं है, इसलिए ऐप {soil} के आम आँकड़े इस्तेमाल कर रहा है। पानी के आँकड़े काम करते रहेंगे, पर वे आम तौर पर {soil} के हैं, ख़ास आपके खेत के नहीं।',
  'improve.soilProfile.action':
    'इंटरनेट रहते हुए खेत का विवरण खोलें, तब ऐप इस जगह के लिए मिट्टी का नक्शा ले आएगा।',
  'improve.soilWater.title': 'पानी के आँकड़े {soil} के आम मानों पर आ गए',
  'improve.soilWater.explain':
    'इस खेत के लिए नक्शे का आँकड़ा है, पर वह आपकी फ़सल की जड़ों तक नहीं पहुँचता, इसलिए ऐप ने {soil} के आम आँकड़े ले लिए। ऊपरी थोड़ी गहराई के पाठ को पूरी जड़ की गहराई पर खींचना अंदाज़े को माप बना देता है।',
  'improve.soilWater.action':
    'आपके खेत में कोई गड़बड़ी नहीं है। इंटरनेट रहते हुए खेत का विवरण खोलें, मिट्टी का आँकड़ा नया हो जाएगा।',
  'improve.slopeMethod.title': 'ढलान वाली ज़मीन पर {method} सिंचाई',
  'improve.slopeMethod.explain':
    'ऊँचाई के नक्शे के अनुसार यहाँ लगभग {slope}% ढलान है, और {method} सिंचाई में पानी ज़मीन की सतह पर बहता है, इसलिए कुछ पानी सोखने से पहले नीचे बह जाता है। यह नक्शा मोटा है और समतल ज़मीन पर भी अक्सर ढलान दिखा देता है, इसलिए अपनी आँखों से भी देख लें।',
  'improve.slopeMethod.actionShorter':
    'अगर खेत में सच में ढलान है, तो पानी ढलान के आड़े छोटी-छोटी क्यारियों में दें, ढलान के साथ नीचे की ओर नहीं।',
  'improve.slopeMethod.actionAsk':
    'इस खेत के लिए मेड़बंदी या कंटूर बनाने के बारे में अपने कृषि विज्ञान केंद्र से पूछें।',
  'improve.retentionMethod.title': 'जल्दी पानी छोड़ने वाली मिट्टी पर {method} सिंचाई',
  'improve.retentionMethod.explain':
    'आपने {soil} दर्ज किया है, जो पानी कम रोकती है। जितना पानी यह मिट्टी सोख सकती है, उससे तेज़ पानी देने पर वह जड़ों के नीचे चला जाता है — इसलिए एक बार में लंबी सिंचाई में फ़सल के काम से ज़्यादा पानी बर्बाद होता है।',
  'improve.retentionMethod.actionSplit':
    'उतना ही पानी एक लंबी सिंचाई के बजाय थोड़ा-थोड़ा, ज़्यादा बार दें।',
  'improve.retentionMethod.actionAsk':
    'इस मिट्टी में जैविक पदार्थ बढ़ाने के बारे में, और आपकी फ़सल तथा बजट के हिसाब से ड्रिप ठीक रहेगी या नहीं, अपने कृषि विज्ञान केंद्र से पूछें।',
  'improve.disease.title': 'मौसम {disease} के अनुकूल है',
  'improve.disease.explain':
    'पिछले और आने वाले दिनों का मौसम इस फ़सल में {disease} के लिए अनुकूल है। यह बात मौसम की है, आपके पौधों की नहीं — ऐप ने आपकी फ़सल देखी नहीं है और यह नहीं कह सकता कि कोई रोग लगा है।',
  'improve.disease.actionLook': 'खेत में घूमकर पत्तियाँ ध्यान से देखें, पहले नीचे की पत्तियाँ।',
  'improve.disease.actionPhoto':
    'किसी पत्ती पर धब्बे दिखें तो डैशबोर्ड पर पत्ती की फ़ोटो जाँच का उपयोग करें।',
  'improve.disease.actionKvk':
    'जो कुछ दिखे उसे अपने कृषि विज्ञान केंद्र या कृषि विस्तार अधिकारी को दिखाएँ। यह ऐप किसी भी फ़सल-सुरक्षा उत्पाद का नाम नहीं बताता और मात्रा नहीं बताता।',
  'improve.weatherData.titleMissing': 'आज की सलाह मौसम के बिना बनी है',
  'improve.weatherData.titleCached': 'आज की सलाह सेव किए मौसम पर बनी है',
  'improve.weatherData.explainMissing':
    'मौसम नहीं मिल सका, इसलिए आज के आँकड़े सिर्फ़ आपकी मिट्टी, फ़सल और सिंचाई के रिकॉर्ड पर टिके हैं। बारिश और गर्मी इनमें शामिल नहीं हैं।',
  'improve.weatherData.explainCached':
    'इस समय मौसम नहीं मिल सका, इसलिए ऐप ने पिछली बार सेव किए आँकड़े इस्तेमाल किए। आज की बारिश और गर्मी उनसे अलग हो सकती है।',
  'improve.weatherData.action':
    'इंटरनेट आने पर ऐप फिर खोलें, सलाह नए मौसम के साथ दोबारा बन जाएगी।',
  'improve.fertTable.title': '{crop} के लिए खाद की तालिका नहीं है',
  'improve.fertTable.explain':
    'ऐप में राज्य की खाद तालिका छह फ़सलों के लिए है और {crop} उनमें नहीं है। यह कमी किसी अंदाज़े की मात्रा से नहीं भरी जाएगी।',
  'improve.fertTable.action':
    '{crop} के लिए खाद की तालिका अपने कृषि विज्ञान केंद्र या कृषि विस्तार अधिकारी से पूछें, और मिट्टी की जाँच की रिपोर्ट साथ ले जाएँ।',
};

const bn: Record<TranslationKey, string> = {
  'app.loading': 'লোড হচ্ছে…',
  'app.initErrorTitle': 'অ্যাপ ডেটা খোলা যায়নি',
  'app.initErrorBody':
    'অনুগ্রহ করে IrrigaSmart-এর অন্য সব ট্যাব বন্ধ করুন, তারপর এই পৃষ্ঠাটি রিলোড করুন। আপনার সংরক্ষিত জমি নিরাপদ আছে।',
  'app.reload': 'রিলোড করুন',
  'app.offlineBanner':
    'আপনি অফলাইনে আছেন। সংরক্ষিত তথ্য দেখানো হচ্ছে — সুপারিশগুলি আপনার শেষ আবহাওয়ার উপর ভিত্তি করে।',

  'nav.today': 'আজ',
  'nav.farms': 'জমি',
  'nav.history': 'রেকর্ড',
  'nav.fertilizer': 'সার',
  'nav.settings': 'সেটিংস',

  'dashboard.greeting': 'নমস্কার, {name}',
  'dashboard.addFirstFarm': 'আজকের সেচ সুপারিশ দেখতে আপনার প্রথম জমি যোগ করুন।',
  'dashboard.addFarm': 'জমি যোগ করুন',
  'dashboard.checking': 'আজকের অবস্থা দেখা হচ্ছে…',
  'dashboard.errorGeneric': 'সুপারিশ তৈরি করতে সমস্যা হয়েছে।',
  'dashboard.errorMissing': 'এই জমির কিছু তথ্য অসম্পূর্ণ। অনুগ্রহ করে সম্পাদনা করে আবার চেষ্টা করুন।',
  'dashboard.errorTabs': 'IrrigaSmart অন্য ট্যাবে খোলা আছে। সেটি বন্ধ করে রিফ্রেশ চাপুন।',
  'dashboard.refresh': 'রিফ্রেশ করুন',
  'dashboard.noteNoWeather':
    'এখনও কোনো আবহাওয়ার তথ্য নেই। আবহাওয়া-ভিত্তিক পরামর্শ পেতে একবার ইন্টারনেটে সংযোগ করুন।',
  'dashboard.noteCached':
    'আবহাওয়া পরিষেবায় পৌঁছানো যাচ্ছে না। আপনার সর্বশেষ সংরক্ষিত আবহাওয়া ব্যবহার করা হচ্ছে।',

  'farmcard.noRecToday': 'আজ এখনও সুপারিশ নেই — তৈরি করতে ট্যাপ করুন।',
  'farmcard.lastWeather': 'আবহাওয়া হালনাগাদ {time}',
  'farmcard.noWeather': 'এখনও আবহাওয়া নেই',

  'weather.temperature': 'তাপমাত্রা',
  'weather.rainToday': 'আজকের বৃষ্টি',
  'weather.humidity': 'আর্দ্রতা',
  'weather.sunshine': 'রোদ',
  'weather.dryingPoor': 'মেঘলা দিন — পাতা অনেকক্ষণ ভেজা থাকবে',
  'weather.dryingModerate': 'কিছুটা রোদ — পাতা ধীরে শুকোবে',
  'weather.dryingGood': 'ঝলমলে দিন — পাতা তাড়াতাড়ি শুকোবে',
  'weather.cacheNote': 'আপনার সর্বশেষ সংরক্ষিত আবহাওয়া দেখানো হচ্ছে — হালনাগাদ করতে সংযোগ করুন।',

  'rec.ariaLabel': 'আজকের সুপারিশ',
  'rec.bestTime': 'সেরা সময়',
  'rec.waterDepth': 'জলের গভীরতা',
  'rec.totalVolume': 'মোট জল',
  'rec.confidenceBadge.high': 'উচ্চ আস্থা',
  'rec.confidenceBadge.medium': 'মাঝারি আস্থা',
  'rec.confidenceBadge.low': 'কম আস্থা',
  'rec.help.high': 'সাম্প্রতিক আবহাওয়ার তথ্যের ভিত্তিতে।',
  'rec.help.medium': 'কিছুটা পুরনো আবহাওয়ার তথ্যের ভিত্তিতে।',
  'rec.help.low': 'আবহাওয়ার তথ্য সীমিত বা অনুপস্থিত — এটিকে মোটামুটি ধারণা হিসেবে নিন।',
  'rec.window': 'সেচের সময়',
  'rec.duration': 'কত সময় চালাবেন',
  'rec.flow': 'জলের গতি',
  'rec.minutes': '{n} মিনিট',
  'rec.litersPerMin': '{n} লিটার/মিনিট',
  'rec.windowValue': '{start} – {end}',
  'rec.windowTomorrow': 'কাল {start} – {end}',
  'rec.why.morning-default': 'ভোরে সেচ দিলে বাষ্প হয়ে সবচেয়ে কম জল নষ্ট হয়।',
  'rec.why.hot-season': 'গ্রীষ্মকাল — আগে শুরু করলে মাটিতে জল বেশি থাকে।',
  'rec.why.hot-day': 'আজ গরম দিন, তাই রোদ চড়ার আগে শুরু করুন।',
  'rec.why.windy': 'বাতাসে স্প্রিঙ্কলারের জল উড়ে যায় — শান্ত ভোরের সময় ভালো।',
  'rec.why.cool-season': 'শীতের ঠান্ডা সকাল — কিছুটা দেরিতে শুরু করা ফসলের জন্য ভালো।',
  'rec.why.long-run': 'সেচ দীর্ঘ সময় চলবে, তাই দুপুরের আগে শেষ হওয়ার মতো আগেই শুরু করুন।',
  'rec.why.later-today': 'সকালের সময় পেরিয়ে গেছে, তাই পরের সম্ভাব্য সময় দেখানো হচ্ছে।',
  'rec.why.evening-slot': 'সকালের জন্য দেরি হয়ে গেছে — সন্ধ্যার ঠান্ডায় সেচ দিন।',
  'rec.why.drying-window':
    'আজ রোদ কম, তাই স্প্রিঙ্কলারের জল সারা রাত পাতায় থেকে যাবে। কাল সকালে সেচ দেওয়া ফসলের জন্য নিরাপদ।',

  'enum.status.Irrigate Today': 'আজ সেচ দিন',
  'enum.status.Delay Irrigation': 'সেচ পিছিয়ে দিন',
  'enum.status.Monitor Tomorrow': 'আগামীকাল দেখুন',

  'enum.crop.Rice': 'ধান',
  'enum.crop.Wheat': 'গম',
  'enum.crop.Maize': 'ভুট্টা',
  'enum.crop.Cotton': 'তুলা',
  'enum.crop.Sugarcane': 'আখ',
  'enum.crop.Soybean': 'সয়াবিন',
  'enum.crop.Groundnut': 'চিনাবাদাম',
  'enum.crop.Tomato': 'টমেটো',
  'enum.crop.Potato': 'আলু',
  'enum.crop.Onion': 'পেঁয়াজ',

  'enum.stage.Initial': 'প্রাথমিক',
  'enum.stage.Development': 'বৃদ্ধি',
  'enum.stage.Mid Season': 'মধ্য মৌসুম',
  'enum.stage.Late Season': 'শেষ মৌসুম',

  'enum.soil.Sandy': 'বালুকাময়',
  'enum.soil.Sandy Loam': 'বালুকাময় দোঁআশ',
  'enum.soil.Loamy': 'দোঁআশ',
  'enum.soil.Silty Loam': 'পলি দোঁআশ',
  'enum.soil.Clay Loam': 'এঁটেল দোঁআশ',
  'enum.soil.Clay': 'এঁটেল',

  'enum.method.Drip': 'ড্রিপ',
  'enum.method.Sprinkler': 'স্প্রিংকলার',
  'enum.method.Furrow': 'ফুরো (নালা)',
  'enum.method.Flood': 'ফ্লাড (প্লাবন)',

  'enum.area.Square metre': 'বর্গ মিটার',
  'enum.area.Acre': 'একর',
  'enum.area.Hectare': 'হেক্টর',

  'farms.title': 'আপনার জমি',
  'farms.add': '+ জমি যোগ করুন',
  'farms.empty': 'এখনও কোনো জমি নেই। সেচ সুপারিশ পেতে আপনার প্রথম জমি যোগ করুন।',
  'farms.edit': 'সম্পাদনা',
  'farms.delete': 'মুছুন',
  'farms.confirm': 'নিশ্চিত করুন',
  'farms.soilSuffix': 'মাটি',

  'form.titleAdd': 'জমি যোগ করুন',
  'form.titleEdit': 'জমি সম্পাদনা',
  'form.name': 'জমির নাম',
  'form.namePlaceholder': 'যেমন: উত্তরের জমি',
  'form.locationName': 'জায়গার নাম',
  'form.locationPlaceholder': 'যেমন: বোলপুর',
  'form.latitude': 'অক্ষাংশ',
  'form.longitude': 'দ্রাঘিমাংশ',
  'form.useMyLocation': 'আমার অবস্থান ব্যবহার করুন',
  'form.searchPlaceholder': 'আপনার গ্রাম বা শহর খুঁজুন',
  'form.search': 'খুঁজুন',
  'form.searching': 'খোঁজা হচ্ছে…',
  'form.searchNone': 'কোনো জায়গা পাওয়া যায়নি। কাছের শহরের নাম দেখুন।',
  'form.searchFailed': 'অনুসন্ধান ব্যর্থ। ইন্টারনেট দেখে আবার চেষ্টা করুন।',
  'form.locating': 'আপনার অবস্থান খোঁজা হচ্ছে…',
  'form.locationError.unsupported': 'এই ডিভাইসে অবস্থান সমর্থিত নয়। অনুগ্রহ করে স্থানাঙ্ক হাতে লিখুন।',
  'form.locationError.denied':
    'অবস্থানের অনুমতি দেওয়া হয়নি। আপনি ব্রাউজার সেটিংসে অনুমতি দিতে পারেন বা স্থানাঙ্ক হাতে লিখুন।',
  'form.locationError.unavailable': 'আপনার অবস্থান নির্ণয় করা যায়নি। আবার চেষ্টা করুন বা স্থানাঙ্ক হাতে লিখুন।',
  'form.locationError.lookupFailed':
    'অবস্থান পাওয়া গেছে, কিন্তু জায়গার বিবরণ আনা যায়নি। স্থানাঙ্ক পূরণ করা হয়েছে।',
  'form.soilSuggestion': 'এই এলাকার জন্য প্রস্তাবিত মাটি: {soil}। অনুগ্রহ করে নিশ্চিত করুন বা নিজের পছন্দ বেছে নিন।',
  'form.applySuggestion': '{soil} ব্যবহার করুন',
  'form.fieldSize': 'জমির আকার',
  'form.unit': 'একক',
  'form.crop': 'ফসল',
  'form.growthStage': 'বৃদ্ধির পর্যায়',
  'form.soilType': 'মাটির ধরন',
  'form.irrigationMethod': 'সেচের পদ্ধতি',
  'form.cancel': 'বাতিল',
  'form.save': 'জমি সংরক্ষণ',
  'form.saving': 'সংরক্ষণ হচ্ছে…',
  'form.error.name': 'অনুগ্রহ করে জমির নাম লিখুন।',
  'form.error.location': 'অনুগ্রহ করে জমির অবস্থান (অক্ষাংশ ও দ্রাঘিমাংশ) লিখুন।',
  'form.error.coords': 'অনুগ্রহ করে সঠিক অবস্থান লিখুন (অক্ষাংশ -90 থেকে 90, দ্রাঘিমাংশ -180 থেকে 180)।',
  'form.error.area': 'জমির আকার শূন্যের বেশি হতে হবে।',
  'form.error.save': 'জমি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',

  'history.title': 'পুরনো সুপারিশ',
  'history.farmLabel': 'জমি',
  'history.loading': 'রেকর্ড লোড হচ্ছে…',
  'history.empty': 'এই জমির জন্য এখনও কোনো সুপারিশ নেই। নতুন সুপারিশের জন্য আজ ট্যাব খুলুন।',
  'history.noFarms': 'এখনও কোনো জমি নেই। রেকর্ড শুরু করতে জমি যোগ করুন।',
  'history.at': 'সময়',
  'history.unavailable': 'সুপারিশের বিবরণ পাওয়া যাচ্ছে না।',

  'settings.title': 'সেটিংস',
  'settings.profile': 'প্রোফাইল',
  'settings.yourName': 'আপনার নাম',
  'settings.saved': 'প্রোফাইল সংরক্ষণ হয়েছে।',
  'settings.preferences': 'পছন্দ',
  'settings.language': 'ভাষা',
  'settings.units': 'একক',
  'settings.unitsMetric': 'মেট্রিক (°C, মি.মি., লিটার)',
  'settings.comingSoon': 'শীঘ্রই আসছে',
  'settings.notifications': 'সেচ অনুস্মারক',
  'settings.cloudSync': 'ক্লাউড সিংক (ভবিষ্যৎ সংস্করণে)',

  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',
  'lang.as': 'অসমীয়া',
  'lang.ur': 'اردو',

  'factors.title': 'কেন এই সুপারিশ',
  'factors.name.crop': 'ফসল',
  'factors.name.growthStage': 'বৃদ্ধির পর্যায়',
  'factors.name.temperature': 'তাপমাত্রা',
  'factors.name.rainfall': 'বৃষ্টি',
  'factors.name.humidity': 'আর্দ্রতা',
  'factors.name.wind': 'বাতাস',
  'factors.name.soil': 'মাটির ধরন',
  'factors.name.irrigationMethod': 'সেচের পদ্ধতি',
  'factors.influence.increases': 'প্রয়োজন বাড়ায়',
  'factors.influence.decreases': 'প্রয়োজন কমায়',
  'factors.influence.neutral': 'নিরপেক্ষ',
  'factors.legend': 'যত বেশি তারা, আজকের সিদ্ধান্তে তত বড় প্রভাব',
  'factors.strength.strong': 'বড় প্রভাব',
  'factors.strength.moderate': 'কিছু প্রভাব',
  'factors.strength.weak': 'অল্প প্রভাব',
  'factors.starsLabel': '৩-এর মধ্যে {stars} তারা — {strength}',

  'plan.title': 'আগামী দিনের পরিকল্পনা',
  'plan.today': 'আজ',
  'plan.tomorrow': 'আগামীকাল',
  'plan.rain': '{mm} মি.মি. বৃষ্টি',
  'plan.action.Irrigate Today': 'সেচ দিন',
  'plan.action.Delay Irrigation': 'বৃষ্টিতেই চলবে',
  'plan.action.Monitor Tomorrow': 'নজরে রাখুন',
  'plan.note.irrigate': '{day} সেচের পরিকল্পনা করুন।',
  'plan.note.rain': '{day} বৃষ্টি ফসলের প্রয়োজন মেটাতে পারে।',
  'plan.note.none': 'আগামী দিনগুলোতে সেচের প্রয়োজন নেই।',

  'onb.welcome.title': 'IrrigaSmart-এ আপনাকে স্বাগতম',
  'onb.welcome.tagline':
    'IrrigaSmart আবহাওয়া, ফসলের তথ্য এবং কৃষি জ্ঞান দিয়ে আপনাকে ভালো সেচের সিদ্ধান্ত নিতে সাহায্য করে।',
  'onb.welcome.start': 'শুরু করুন',
  'onb.next': 'পরবর্তী',
  'onb.back': 'পেছনে',
  'onb.about.title': 'IrrigaSmart সম্পর্কে',
  'onb.about.body':
    'কখন এবং কতটা সেচ দেওয়া উচিত তা ঠিক করতে কৃষকদের সাহায্য করার জন্য IrrigaSmart তৈরি হয়েছে। এটি ইন্টারনেট ছাড়াও কাজ করে, প্রতিটি সুপারিশ সহজ ভাষায় বুঝিয়ে দেয় এবং কৃষকদের কথা ভেবে তৈরি।',
  'onb.how.title': 'এটি কীভাবে কাজ করে',
  'onb.how.step1': 'আপনার জমি যোগ করুন',
  'onb.how.step2': 'আমরা আবহাওয়া দেখি',
  'onb.how.step3': 'সিদ্ধান্ত ইঞ্জিন হিসাব করে',
  'onb.how.step4': 'আপনি সুপারিশ পান',
  'onb.how.step5': 'স্পষ্ট ব্যাখ্যা সহ',
  'onb.trust.title': 'সুপারিশে ভরসা কেন করবেন',
  'onb.trust.body':
    'প্রতিটি সুপারিশ আপনার ফসল, এর পর্যায়, আপনার মাটি, আবহাওয়া এবং সেচ পদ্ধতি বিবেচনা করে — এবং সবসময় কারণ ব্যাখ্যা করে। IrrigaSmart আপনার সিদ্ধান্তে সাহায্য করে; এটি আপনার অভিজ্ঞতার বিকল্প নয়।',
  'onb.offline.title': 'অফলাইনেও কাজ করে',
  'onb.offline.body':
    'আপনার জমির তথ্য আপনার ফোনেই থাকে। একবার পাওয়া আবহাওয়া ইন্টারনেট ছাড়াও পাওয়া যায়, তাই পরামর্শ সবসময় পাবেন।',
  'onb.privacy.title': 'আপনার গোপনীয়তা',
  'onb.privacy.body':
    'আপনার জমির বিবরণ আপনার ডিভাইসেই থাকে। কোনো ব্যক্তিগত তথ্য কারো সাথে শেয়ার করা হয় না।',
  'onb.start.title': 'শুরু করার উপায়',
  'onb.start.step1': 'আপনার জমি যোগ করুন',
  'onb.start.step2': 'আপনার ফসল বেছে নিন',
  'onb.start.step3': 'আপনার মাটির ধরন বেছে নিন',
  'onb.start.step4': 'আপনার সুপারিশ পান',

  'settings.about': 'সহায়তা ও IrrigaSmart সম্পর্কে',

  'notif.title': 'মনে করিয়ে দেওয়া',
  'notif.reminderTitle': 'সেচ অনুস্মারক',
  'notif.reminderBody': '{farm}-এ সেচের সময় — আজ সকালে প্রায় {volume}।',
  'notif.reminderBodyTimed': '{farm}-এ সেচের সময় — প্রায় {volume}, মোটামুটি {minutes} মিনিট।',
  'notif.rainTitle': 'বৃষ্টির সতর্কতা',
  'notif.rainBody': '{farm}-এ {day} প্রায় {mm} মি.মি. বৃষ্টির সম্ভাবনা। আপনি সেচ এড়িয়ে যেতে পারেন।',

  'season.title': 'মৌসুম নির্দেশিকা',
  'season.Kharif': 'খরিফ (বর্ষা)',
  'season.Rabi': 'রবি (শীত)',
  'season.Zaid': 'জায়েদ (গ্রীষ্ম)',
  'season.inSeason': '{crop} এখন তার মূল মৌসুমে আছে।',
  'season.offSeason': '{crop} সাধারণত {season} মৌসুমে চাষ হয়।',
  'season.calendar': 'বপন: {sow} · ফসল কাটা: {harvest}',
  'season.guide.Kharif':
    'বর্ষার মাসগুলো: শুধু শুকনো সময়ে সেচ দিন, বৃষ্টিকেই কাজ করতে দিন। জলাবদ্ধতার দিকে নজর রাখুন।',
  'season.guide.Rabi': 'ঠান্ডা, শুষ্ক মাস: ফসলের নিয়মিত সেচ প্রয়োজন, তবে গ্রীষ্মের তুলনায় চাহিদা কম।',
  'season.guide.Zaid': 'গরম গ্রীষ্মের মাস: জলের চাহিদা সর্বাধিক — বাষ্পীভবন কমাতে ভোরে সেচ দিন।',

  'disease.title': 'রোগ পর্যবেক্ষণ',
  'disease.level.None': 'ঝুঁকি নেই',
  'disease.level.Low': 'কম ঝুঁকি',
  'disease.level.Moderate': 'মাঝারি ঝুঁকি',
  'disease.level.High': 'বেশি ঝুঁকি',
  'disease.none': 'আবহাওয়া এখন {crop}-এর সাধারণ রোগের অনুকূল নয়।',
  'disease.headline': 'আবহাওয়া {disease}-এর অনুকূল।',
  'disease.observed': 'একটানা {days} দিন পরিস্থিতি অনুকূল রয়েছে।',
  'disease.observedOne': 'আজ পরিস্থিতি অনুকূল হয়েছে।',
  'disease.forecast': 'আরও {days} দিন অনুকূল পরিস্থিতি থাকার সম্ভাবনা।',
  'disease.forecastOne': 'কালও অনুকূল পরিস্থিতি বজায় থাকার সম্ভাবনা।',
  'disease.overcast': 'এই দিনগুলো বেশিরভাগ মেঘলা ছিল — ভেজা পাতা অনেকক্ষণ ভেজা থাকে, তাতে রোগ বাড়ে।',
  'disease.trigger': '{date} তারিখে: {temp}, আর্দ্রতা {humidity}, বৃষ্টি {rain}।',
  'disease.inspectTitle': 'কী দেখবেন',
  'disease.inspect': '{where} দেখুন। {what}',
  'disease.advice':
    'এটি আবহাওয়ার সতর্কতা, রোগ নির্ণয় নয়। এই লক্ষণ দেখলে কোনও ওষুধ দেওয়ার আগে স্থানীয় কৃষি বিস্তার আধিকারিককে নমুনা দেখান।',
  'disease.tipDry': 'দিনের শুরুতে সেচ দিলে পাতা তাড়াতাড়ি শুকোয়, ফলে রোগের ঝুঁকি কমে।',
  'disease.unavailable': 'দৈনিক আবহাওয়ার তথ্য নেই, তাই রোগের ঝুঁকি নির্ণয় করা যাচ্ছে না।',

  'moisture.title': 'মাটির আর্দ্রতা',
  'moisture.unavailable': 'দৈনিক আবহাওয়ার তথ্য নেই, তাই মাটির আর্দ্রতার হিসাব দেখানো যাচ্ছে না।',
  'moisture.statusOk': 'মূল অঞ্চলে পর্যাপ্ত জল আছে।',
  'moisture.statusStress':
    'ঘাটতি চাপের সীমায় পৌঁছেছে — সেচ দেওয়ার পরামর্শ দেওয়া হচ্ছে।',
  'moisture.available': 'উপলব্ধ জল',
  'moisture.depletion': 'ঘাটতি',
  'moisture.capacity': 'মোট ক্ষমতা',
  'moisture.rootDepth': 'মূলের গভীরতা',
  'moisture.help':
    'গেজটি মূল অঞ্চলের মোট ক্ষমতার ভগ্নাংশ হিসাবে উপলব্ধ জল দেখায়। চিহ্ন দেখায় কোথায় ফসলের চাপ শুরু হয়।',

  'provenance.MEASURED': 'খেতের পরীক্ষা',
  'provenance.USER_PROVIDED': 'আপনি জানিয়েছেন',
  'provenance.REGIONAL_ESTIMATE': 'এলাকার অনুমান',
  'provenance.FORECAST': 'পূর্বাভাস',
  'provenance.CALCULATED': 'হিসাব করা',
  'provenance.INFERRED': 'অনুমান করা',
  'provenance.UNKNOWN': 'জানা নেই',

  'ph.title': 'মাটির pH উপযুক্ততা',
  'ph.unavailable': 'এই খেতের জন্য এখনও মাটির pH-এর কোনও অনুমান নেই, তাই উপযুক্ততা দেখানো যাচ্ছে না।',
  'ph.pending': 'এই খেতের জন্য মাটির মানচিত্র পড়া হচ্ছে। এতে এক মিনিট পর্যন্ত লাগতে পারে।',
  'ph.unreachable':
    'মাটির মানচিত্রে পৌঁছানো যায়নি। আপনার ইন্টারনেট সংযোগ দেখুন — এটি নিজে থেকেই আবার চেষ্টা করা হবে।',
  'ph.reading': 'অনুমানিক মাটির pH: {ph}',
  'ph.source':
    'এটি 250 মিটার মাটির মানচিত্র থেকে পাওয়া একটি অনুমান, আপনার খেতের পরীক্ষা নয়। আপনার জমির সঠিক মান পেতে মাটি স্বাস্থ্য কার্ডের পরীক্ষা করান।',
  'ph.optimalRange': '{crop}-এর জন্য উপযুক্ত: pH {min}-{max}',
  'ph.level.suitable': 'উপযুক্ত',
  'ph.level.slightly-outside': 'উপযুক্ত সীমার সামান্য বাইরে',
  'ph.level.significant-issue': 'গুরুতর pH সমস্যা',
  'ph.help.suitable': 'এই মাটির pH ফসলের জন্য উপযুক্ত; পুষ্টি উপাদান সাধারণত সহজলভ্য থাকবে।',
  'ph.help.slightly-outside':
    'মাটি পরীক্ষা অনুযায়ী একটি ছোট সংশোধন (যেমন চুন বা সালফার) পুষ্টির প্রাপ্যতা উন্নত করতে পারে।',
  'ph.help.significant-issue':
    'এই pH ফসলের সহনশীল সীমার থেকে অনেক বাইরে এবং সম্ভবত পুষ্টি গ্রহণ সীমিত করছে। আপনার স্থানীয় কৃষি বিজ্ঞান কেন্দ্র বা কৃষি সম্প্রসারণ কর্মকর্তার সাথে সংশোধন পরিকল্পনা নিয়ে কথা বলুন।',

  'disease.name.riceBlast': 'ধানের ব্লাস্ট',
  'disease.name.riceBacterialLeafBlight': 'ব্যাক্টেরিয়াজনিত পাতা ঝলসা',
  'disease.name.wheatStripeRust': 'হলুদ মরিচা',
  'disease.name.wheatLeafRust': 'বাদামি মরিচা',
  'disease.name.maizeTurcicumLeafBlight': 'টারসিকাম পাতা ঝলসা',
  'disease.name.maizeCommonRust': 'সাধারণ মরিচা',
  'disease.name.cottonAlternariaLeafSpot': 'অল্টারনারিয়া পাতার দাগ',
  'disease.name.cottonBacterialBlight': 'ব্যাক্টেরিয়াজনিত ঝলসা',
  'disease.name.sugarcaneRedRot': 'লাল পচা',
  'disease.name.sugarcaneRust': 'মরিচা',
  'disease.name.soybeanRust': 'সয়াবিন মরিচা',
  'disease.name.soybeanAnthracnose': 'অ্যানথ্রাকনোজ',
  'disease.name.groundnutLateLeafSpot': 'নাবি পাতার দাগ',
  'disease.name.groundnutRust': 'চিনাবাদাম মরিচা',
  'disease.name.lateBlight': 'নাবি ধ্বসা',
  'disease.name.earlyBlight': 'আগাম ধ্বসা',
  'disease.name.onionPurpleBlotch': 'বেগুনি দাগ',
  'disease.name.onionDownyMildew': 'ডাউনি মিলডিউ',

  'disease.where.riceBlast': 'পাতা, তারপর গিঁট ও শিষের গলা',
  'disease.where.riceBacterialLeafBlight': 'পাতার আগা ও কিনারা, আগে উপরের পাতা',
  'disease.where.wheatStripeRust': 'পাতার উপরের পিঠ, আগে নিচের পাতা',
  'disease.where.wheatLeafRust': 'পাতার দুই পিঠ',
  'disease.where.maizeTurcicumLeafBlight': 'আগে নিচের পাতা, পরে উপরের দিকে',
  'disease.where.maizeCommonRust': 'পাতার দুই পিঠ',
  'disease.where.cottonAlternariaLeafSpot': 'গোড়ার দিকের পুরোনো পাতা',
  'disease.where.cottonBacterialBlight': 'পাতা, কাণ্ড ও বল',
  'disease.where.sugarcaneRedRot': 'সন্দেহজনক আখ লম্বালম্বি চিরে ভিতরে',
  'disease.where.sugarcaneRust': 'পাতার নিচের পিঠ',
  'disease.where.soybeanRust': 'নিচের পাতার নিচের পিঠ',
  'disease.where.soybeanAnthracnose': 'কাণ্ড ও শুঁটি',
  'disease.where.groundnutLateLeafSpot': 'পুরোনো পাতার নিচের পিঠ',
  'disease.where.groundnutRust': 'পাতার নিচের পিঠ',
  'disease.where.lateBlight': 'আগে নিচের পাতা, পরে কাণ্ড ও ফসল',
  'disease.where.earlyBlight': 'আগে সবচেয়ে পুরোনো, নিচের পাতা',
  'disease.where.onionPurpleBlotch': 'পুরোনো পাতা, আগা থেকে নিচের দিকে',
  'disease.where.onionDownyMildew': 'পুরোনো পাতা, ভোরের দিকে',

  'disease.what.riceBlast': 'মাকু-আকৃতির দাগ, মাঝখানে ধূসর ও কিনারা বাদামি।',
  'disease.what.riceBacterialLeafBlight':
    'আগা থেকে শুরু হওয়া জলে-ভেজা হলুদ দাগরেখা, শুকিয়ে খড়ের রঙ হয়।',
  'disease.what.wheatStripeRust': 'শিরার মাঝে সারি ধরে হলুদ-কমলা গুঁড়ো ফোস্কা।',
  'disease.what.wheatLeafRust': 'ছড়ানো কমলা-বাদামি গোল ফোস্কা, সারি ধরে নয়।',
  'disease.what.maizeTurcicumLeafBlight': 'লম্বা ধূসর-সবুজ চুরুট-আকৃতির দাগ।',
  'disease.what.maizeCommonRust': 'পাতা জুড়ে ছড়ানো ছোট দারচিনি-বাদামি ফোস্কা।',
  'disease.what.cottonAlternariaLeafSpot': 'বাদামি দাগে গোল বলয়, চারপাশে ফ্যাকাশে বেষ্টনী।',
  'disease.what.cottonBacterialBlight': 'কোণাকৃতি জলে-ভেজা দাগ কালো হয়ে যায়, শিরা কালচে।',
  'disease.what.sugarcaneRedRot': 'ভিতরের অংশ লালচে, মাঝে সাদা আড়াআড়ি দাগ, টক গন্ধ।',
  'disease.what.sugarcaneRust': 'লম্বাটে কমলা-বাদামি ফোস্কা।',
  'disease.what.soybeanRust': 'ছোট উঁচু হালকা বাদামি ফোস্কা, ঘষলে গুঁড়ো ঝরে।',
  'disease.what.soybeanAnthracnose': 'গাঢ় অনিয়মিত ছোপ, তার উপর সূক্ষ্ম কালো কাঁটা।',
  'disease.what.groundnutLateLeafSpot': 'হলুদ বেষ্টনী ছাড়া গাঢ় দাগ, নিচে ফোস্কা।',
  'disease.what.groundnutRust': 'কমলা ফোস্কা, ফেটে গুঁড়ো বেরোয়।',
  'disease.what.lateBlight': 'গাঢ় জলে-ভেজা ছোপ, সকালে নিচের দিকে সাদা ছাতার বলয়।',
  'disease.what.earlyBlight': 'লক্ষ্যবস্তুর মতো গোল বলয়যুক্ত গাঢ় দাগ।',
  'disease.what.onionPurpleBlotch': 'ছোট সাদা বসা দাগ, বেড়ে বেগুনি-বাদামি বলয়যুক্ত ছোপ হয়।',
  'disease.what.onionDownyMildew': 'ফ্যাকাশে ডিম্বাকৃতি ছোপ, তার উপর বেগুনি-ধূসর নরম আস্তরণ।',

  // ফটো পরীক্ষা (item 16) — কোনো ওষুধ নয়, কোনো মাত্রা নয়, কোনো রোগ নির্ণয় নয় (docs/12 §Product Boundaries)।
  'vision.title': 'পাতার ফটো পরীক্ষা করুন',
  'vision.onDevice': 'নেটওয়ার্ক ছাড়াই চলে',
  'vision.lede':
    'আক্রান্ত একটি মাত্র পাতার ফটো তুলুন। পরীক্ষা আপনার ফোনেই হয়, ফটো কোথাও পাঠানো হয় না।',
  'vision.choose': 'ফটো বেছে নিন বা তুলুন',
  'vision.firstUseHint':
    'প্রথম পরীক্ষায় প্রায় ৯ MB ডাউনলোড হয়, তাই সম্ভব হলে ওয়াই-ফাই ব্যবহার করুন। তারপর এটি নেটওয়ার্ক ছাড়াই কাজ করে।',
  'vision.working': 'ফটো দেখা হচ্ছে…',
  'vision.again': 'আরেকটি ফটো পরীক্ষা করুন',
  'vision.previewAlt': 'আপনার বেছে নেওয়া পাতার ফটো',
  'vision.healthyName': 'স্বাস্থ্যকর পাতা',
  'vision.similarTo': 'এই পাতাটি {name}-এর ফটোর মতো দেখতে ({percent}% মিল)।',
  'vision.healthy': 'এই পাতাটি স্বাস্থ্যকর পাতার মতো দেখতে ({percent}% মিল)।',
  'vision.healthyCaveat':
    'এটি কেবল এই একটি পাতার বিষয়ে। অন্য গাছপালাও দেখতে থাকুন, বিশেষ করে নিচের ও ভিতরের পাতাগুলো।',
  'vision.unsure':
    'ফটোটির মিল আত্মবিশ্বাসের সঙ্গে করা গেল না, তাই কোনো ফলাফল দেখানো হলো না। এখানে ভুল নাম আপনার ফসলের বড় ক্ষতি করতে পারে।',
  'vision.retakeTips':
    'আবার চেষ্টা করুন — একটি পাতা পুরো ফ্রেমে, দিনের আলোয়, সাধারণ পটভূমিতে, ক্যামেরা স্থির রেখে।',
  'vision.unknownClass': 'এই ফটো থেকে এমন ফলাফল এসেছে যা অ্যাপ চেনে না।',
  'vision.otherPlant':
    'এটি {plant}-এর পাতা মনে হচ্ছে, কিন্তু এই জমি {crop}-এর। যদি আপনি সত্যিই {crop}-এর ছবি তুলে থাকেন, নিচের ফলাফল নির্ভরযোগ্য নয়।',
  'vision.otherPlantHealthy':
    'ছবিটি {plant}-এর একটি সুস্থ পাতার সঙ্গে মিলেছে, {crop}-এর সঙ্গে নয়। এতে আপনার {crop} সম্পর্কে কিছুই বোঝা যায় না — সাধারণত এর মানে পাতাটি চেনাই যায়নি। {crop}-এর একটি পাতা পুরো ফ্রেমে ভরে আবার চেষ্টা করুন।',
  'vision.noHealthyClass':
    'ফটো পরীক্ষার কাছে {crop}-এর সুস্থ পাতার কোনো নমুনা নেই, তাই {crop}-এর জন্য এটি সব সময় তার জানা কোনো রোগের নাম বলে — পাতা ভালো থাকলেও। এটিকে আরও ভালো করে দেখার কারণ ভাবুন, ফলাফল নয়।',
  'vision.cropNotCovered':
    'ফটো পরীক্ষাটি {crop}-এর উপর প্রশিক্ষিত নয়। এটি কেবল {covered} জানে, তাই অন্য ফসলের ফলাফল বিশ্বাস করা যাবে না। উপরের রোগ পর্যবেক্ষণ {crop}-এর জন্য কাজ করতে থাকে।',
  'vision.caveat':
    'এটি আপনার ফটোর তুলনা প্রশিক্ষণের ছবির সঙ্গে করে। এটি রোগ নির্ণয় নয়, আর খেতের সত্যিকারের ছবিতে এটি পরীক্ষাগারের তুলনায় অনেক কম নির্ভরযোগ্য।',
  'vision.advice':
    'কিছু চিকিৎসা করার আগে নমুনা স্থানীয় কৃষি সম্প্রসারণ কর্মকর্তা বা কৃষি বিজ্ঞান কেন্দ্রকে দেখান।',
  'vision.referenceTitle': 'রেফারেন্স ফটো',
  'vision.referenceNote': 'শুধু আকার, রং ও নকশা তুলনা করুন। মাঠে লক্ষণ আলাদা দেখাতে পারে।',
  'vision.referenceSingle': 'এটির জন্য কেবল একটি রেফারেন্স ফটো পাওয়া গেছে।',
  'vision.referenceAlt': '{name} দেখানো রেফারেন্স ফটো {number}',
  'vision.referenceCredit': 'ছবি: {credits}',

  'vision.plant.Apple': 'আপেল',
  'vision.plant.Maize': 'ভুট্টা',
  'vision.plant.PepperBell': 'ক্যাপসিকাম',
  'vision.plant.Potato': 'আলু',
  'vision.plant.Rice': 'ধান',
  'vision.plant.Tomato': 'টমেটো',

  'vision.name.appleScab': 'আপেল স্ক্যাব',
  'vision.name.appleBlackRot': 'কালো পচা',
  'vision.name.cedarAppleRust': 'সিডার আপেল রাস্ট',
  'vision.name.grayLeafSpot': 'ধূসর পাতা-দাগ',
  'vision.name.pepperBacterialSpot': 'জীবাণু দাগ',
  'vision.name.tomatoBacterialSpot': 'জীবাণু দাগ',
  'vision.name.tomatoLeafMould': 'পাতার ছত্রাক',
  'vision.name.septoriaLeafSpot': 'সেপ্টোরিয়া পাতা-দাগ',
  'vision.name.spiderMites': 'দুই-দাগি মাকড়সা মাইটের ক্ষতি',
  'vision.name.targetSpot': 'টার্গেট স্পট',
  'vision.name.tomatoYellowLeafCurlVirus': 'হলুদ পাতা কুঁকড়ানো ভাইরাস',
  'vision.name.tomatoMosaicVirus': 'মোজাইক ভাইরাস',
  'vision.name.riceBrownSpot': 'বাদামি দাগ',
  'vision.name.riceLeafScald': 'পাতা ঝলসানো',
  'vision.name.riceSheathBlight': 'শীথ ব্লাইট',
  'vision.name.riceTungro': 'টুংরো',

  'vision.error.modelUnavailable':
    'ফটো পরীক্ষাটি ডাউনলোড করা গেল না। একবার নেটওয়ার্কে যুক্ত হয়ে আবার চেষ্টা করুন।',
  'vision.error.runtimeUnavailable': 'এই ব্রাউজার এই ডিভাইসে ফটো পরীক্ষা চালাতে পারে না।',
  'vision.error.imageUnreadable': 'সেই ফাইলটি ফটো হিসেবে পড়া গেল না। অন্যটি চেষ্টা করুন।',
  'vision.error.inferenceFailed': 'এই ডিভাইসে ফটো পরীক্ষা ব্যর্থ হয়েছে।',

  'settings.notifDenied':
    'ব্রাউজার বিজ্ঞপ্তি ব্লক করেছে। মনে করিয়ে দেওয়ার জন্য ব্রাউজার সেটিংসে অনুমতি দিন।',
  'settings.notifUnsupported': 'এই ডিভাইসে বিজ্ঞপ্তি সমর্থিত নয়।',

  'onb.skip': 'এড়িয়ে যান',
  'onb.feature.weather': 'আবহাওয়া-ভিত্তিক পরামর্শ',
  'onb.feature.offline': 'সম্পূর্ণ অফলাইনে কাজ করে',
  'onb.feature.explain': 'প্রতিটি সুপারিশের ব্যাখ্যা',
  'onb.feature.language': 'English, हिन्दी, বাংলা, অসমীয়া, اردو',

  'reminder.title': 'মনে করিয়ে দিন',
  'reminder.auto': 'অটো',
  'reminder.custom': 'নিজের পছন্দ',
  'reminder.add': 'যোগ করুন',
  'reminder.remove': 'সরান',
  'reminder.timeLabel': 'অনুস্মারকের সময়',
  'reminder.tomorrowTag': 'কাল',
  'reminder.setForTomorrow': 'সেই সময় আজ পেরিয়ে গেছে — অনুস্মারক কালের জন্য দেওয়া হয়েছে।',
  'reminder.addError': 'অনুস্মারক যোগ করা গেল না। আবার চেষ্টা করুন।',
  'reminder.note': 'অ্যাপ খোলা থাকলে বা পরের বার খোলার সময় মনে করিয়ে দেয় — অনলাইন বা অফলাইন।',

  'water.title': 'জলের তালিকা',
  'water.target': 'আজ দিতে হবে',
  'water.done': 'এখন পর্যন্ত দেওয়া',
  'water.remaining': 'এখনও বাকি',
  'water.nothingToday': 'আজ সেচের দরকার নেই — ফসল আর বৃষ্টি কাজ সারছে।',
  'water.logFull': 'সেচ শেষ হয়েছে',
  'water.logPart': '+{n} মিনিট',
  'water.undo': 'আজকের হিসাব মুছুন',
  'water.complete': 'আজকের জল সম্পূর্ণ',
  'water.progressLabel': 'আজকের {percent}% জল দেওয়া হয়েছে',
  'water.savedToday': 'আজ বাঁচল',
  'water.savedTotal': 'এখন পর্যন্ত বাঁচল',
  'water.savedDays': '{days} দিনে',
  'water.savedDay': '1 দিনে',
  'water.savedFromRain': 'বৃষ্টি কাজে লাগিয়ে',
  'water.savedFromMethod': 'আপনার সেচ পদ্ধতিতে',
  'water.savedNote': 'পুরো চাহিদার জন্য খেত ভাসিয়ে দেওয়া ও বৃষ্টি না ধরার তুলনায়।',

  // --- Farmer assistant (item 17) ---
  'assistant.open': 'প্রশ্ন করুন',
  'assistant.fabLabel': 'জিজ্ঞাসা',
  'assistant.title': 'আপনার খেত সম্পর্কে জিজ্ঞাসা করুন',
  'assistant.close': 'বন্ধ করুন',
  'assistant.intro':
    'আজকের সেচ নিয়ে আমাকে জিজ্ঞাসা করুন — কত জল, কখন দেবেন, বা কেন। ইন্টারনেট ছাড়াই আমি উত্তর দিতে পারি।',
  'assistant.placeholder': 'আপনার প্রশ্ন লিখুন…',
  'assistant.listening': 'শুনছি…',
  'assistant.speakNow': 'আপনার প্রশ্ন বলুন',
  'assistant.stopListening': 'শোনা বন্ধ করুন',
  'assistant.send': 'পাঠান',
  'assistant.thinking': 'ভাবছি…',
  'assistant.readAloud': 'পড়ে শোনান',
  'assistant.sourceDevice': 'আপনার ফোনে উত্তর',
  'assistant.sourceOnline': 'অনলাইনে উত্তর',
  'assistant.sourceUnavailable': 'ইন্টারনেট দরকার',
  'assistant.note':
    'এই সহায়ক অ্যাপের পরামর্শ বুঝিয়ে দেয়। এটি কোনও ওষুধ, স্প্রে বা সারের পরামর্শ দিতে পারে না।',
  'assistant.voiceDenied':
    'মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজারের সেটিংসে অনুমতি দিন, অথবা প্রশ্নটি লিখুন।',
  'assistant.voiceNoSpeech': 'আমি কিছু শুনতে পাইনি। আবার চেষ্টা করুন।',
  'assistant.voiceLanguageUnsupported':
    'এই ব্রাউজার আপনার নির্বাচিত ভাষায় শুনতে পারছে না। সেটিংসে ইংরেজিতে পরিবর্তন করুন, বা আপনার প্রশ্নটি লিখুন।',
  'assistant.voiceNetwork':
    'কথা বুঝতে ইন্টারনেট সংযোগ প্রয়োজন, এবং সেটি এইমাত্র চলে গেছে। অনুগ্রহ করে আপনার প্রশ্নটি লিখুন, বা সংযোগ ফিরে এলে মাইক্রোফোন আবার চেষ্টা করুন।',
  'assistant.voiceError': 'এখন কণ্ঠস্বর কাজ করছে না। অনুগ্রহ করে প্রশ্নটি লিখুন।',
  'assistant.offlineFallback':
    'ইন্টারনেট ছাড়া ওটার উত্তর দিতে পারছি না। আজকের জলের পরিমাণ, সময়, বৃষ্টি বা মাটির আর্দ্রতা নিয়ে জিজ্ঞাসা করুন — ওগুলি অফলাইনেই বলতে পারি।',

  'assistant.suggest.amount': 'আজ কত জল দেব?',
  'assistant.suggest.timing': 'কখন সেচ দেব?',
  'assistant.suggest.why': 'এই পরামর্শ কেন?',
  'assistant.suggest.moisture': 'আমার মাটি কতটা শুকনো?',
  'assistant.topic.today': 'আজ',
  'assistant.topic.irrigation': 'সেচ',
  'assistant.topic.soil': 'মাটি',
  'assistant.topic.weather': 'আবহাওয়া',
  'assistant.topic.fertilizer': 'উর্বরতা',
  'assistant.topic.disease': 'রোগের ঝুঁকি',
  'assistant.topic.todayQuestion': 'আজ আমার কী করা উচিত?',
  'assistant.topic.irrigationQuestion': 'কখন এবং কতটা সেচ দেব?',
  'assistant.topic.soilQuestion': 'এখন আমার মাটির অবস্থা কী?',
  'assistant.topic.weatherQuestion': 'আজকের আবহাওয়া আমার খেতকে কীভাবে প্রভাবিত করছে?',
  'assistant.topic.fertilizerQuestion': 'আমার মাটির উর্বরতা সম্পর্কে কী জানা আছে?',
  'assistant.topic.diseaseQuestion': 'আবহাওয়া কোন রোগের ঝুঁকি বাড়াচ্ছে?',
  'assistant.briefing.today': '{farm}: {crop} আজকের পরামর্শ হল {status}।',
  'assistant.briefing.noRecommendation': 'এখনও কোনও পরামর্শ নেই।',

  'assistant.rule.empty': 'অনুগ্রহ করে একটি প্রশ্ন লিখুন বা বলুন।',
  'assistant.rule.referral':
    'ওষুধ, স্প্রে বা মাত্রার নাম আমি বলতে পারি না — ভুল পরামর্শে টাকা ও ফসল দুটোই যেতে পারে। রোগের শঙ্কা থাকলে আজকের পর্দার “পাতার ছবি দেখুন” কার্ডে পাতার একটি ছবি তুলুন, আর লক্ষণ দেখলে সেই ছবি আপনার নিকটবর্তী কৃষি বিজ্ঞান কেন্দ্র বা বীজ-ওষুধের দোকানে দেখান — তাঁরা ফসল দেখে বলতে পারবেন এবং স্থানীয়ভাবে কী অনুমোদিত তা জানেন। আমি সেচের সময়, জলের পরিমাণ, মাটির pH ও উর্বরতা, এবং অন্তর্ভুক্ত ফসলের সরকারি সারের অনুসূচিত মাত্রা নিয়ে সাহায্য করতে পারি।',
  'assistant.rule.capability':
    'আমি বলতে পারি আজ কত জল দিতে হবে, কখন দিতে হবে, অ্যাপ কেন এই পরামর্শ দিচ্ছে, আবহাওয়া ও বৃষ্টি কেমন, আপনার মাটি কতটা শুকনো, আপনার মাটির pH ও উর্বরতা, অন্তর্ভুক্ত ফসলের সরকারি সারের অনুসূচি, আর আপনি কত জল বাঁচিয়েছেন। কোনও ওষুধ বা স্প্রের নাম বলতে পারি না — কিন্তু রোগের শঙ্কায় বলতে পারি কোথায় দেখবেন, লক্ষণ কেমন দেখায়, আর পাতার ছবির পরীক্ষা কীভাবে চালাবেন।',
  'assistant.rule.greeting':
    'নমস্কার। জিজ্ঞাসা করুন আজ কত জল দেবেন, কখন সেচ দেবেন, বা অ্যাপ কেন এই পরামর্শ দিচ্ছে।',
  'assistant.rule.today': 'আজ খেতে এই কাজটি করুন: {status}।',
  'assistant.rule.amount': 'আজ {mm} মিমি দিন — আপনার খেতের জন্য প্রায় {litres} লিটার।',
  'assistant.rule.amountRun': 'অর্থাৎ প্রায় {minutes} মিনিট চালাতে হবে।',
  'assistant.rule.amountNone': 'আজ সেচের দরকার নেই।',
  'assistant.rule.timing': '{start} থেকে {end}-এর মধ্যে সেচ দিন।',
  'assistant.rule.timingWhy':
    'তখন জল দিলে বাষ্প হয়ে কম নষ্ট হয় এবং দিনের বেলায় পাতা শুকিয়ে যায়।',
  'assistant.rule.timingNone': 'আজ সেচের কোনও সময় নেই, কারণ আজ সেচের পরামর্শ দেওয়া হয়নি।',
  'assistant.rule.confidence': 'এই পরামর্শে আস্থা: {level}।',
  'assistant.rule.rain': 'আজ প্রায় {mm} মিমি বৃষ্টির সম্ভাবনা।',
  'assistant.rule.rainNone': 'আজ উল্লেখযোগ্য বৃষ্টির সম্ভাবনা নেই।',
  'assistant.rule.rainAdvice': 'সেটি আজকের পরামর্শে ইতিমধ্যেই ধরা আছে: {status}।',
  'assistant.rule.moisture':
    'এই মাটি যে {capacity} মিমি ধরে রাখতে পারে, তার তুলনায় আপনার শিকড়ের স্তর {short} মিমি কম।',
  'assistant.rule.moistureOk': '{threshold} মিমি পার হলে ফসলে চাপ পড়তে শুরু করে, তাই এখনও স্বাভাবিক আছে।',
  'assistant.rule.moistureStress':
    'এটি {threshold} মিমি সীমা পার করেছে, যেখান থেকে ফসলে চাপ পড়তে শুরু করে — সেজন্যই সেচের পরামর্শ।',
  'assistant.rule.disease': 'এই আবহাওয়া এখন {disease}-এর জন্য {level}।',
  'assistant.rule.diseaseNone': 'এই ফসলের সাধারণ রোগের পক্ষে আবহাওয়া এখন অনুকূল নয়।',
  'assistant.rule.diseaseCaveat':
    'এটি কেবল আবহাওয়ার কথা — আমি আপনার ফসল দেখিনি, তাই কোনও রোগ হয়েছে বলতে পারি না।',
  'assistant.rule.diseaseScout': 'খেতে থাকলে {where} দেখুন — সকালে, পাতা শুকনো থাকলে, সবচেয়ে ভালো।',
  'assistant.rule.diseaseSigns': 'যে লক্ষণগুলি খুঁজবেন: {what}',
  'assistant.rule.diseasePhoto':
    'নিশ্চিত নন? আজকের পর্দার “পাতার ছবি দেখুন” কার্ডে পাতার ছবি তুলুন — অ্যাপ সেটি আপনার ফোনেই সাধারণ রোগের সঙ্গে মেলায়, ইন্টারনেট লাগে না।',
  'assistant.rule.diseaseNext':
    'এমন লক্ষণ পেলে ছবিটি কৃষি বিজ্ঞান কেন্দ্র বা বীজ-ওষুধের দোকানে দেখান — তাঁরা নিশ্চিত করে বলবেন আপনার ফসলের পর্যায়ে কী অনুমোদিত।',

  // --- Latest leaf-photo check (V2.2) ---
  'assistant.photo.match': 'ছবিটি {name}-এর ছবির সঙ্গে মিলতে দেখাচ্ছে ({percent}% সদৃশ)।',
  'assistant.photo.tentative': 'ছবিটি {name}-এর সঙ্গে খানিকটাই মেলে ({percent}% সদৃশ)।',
  'assistant.photo.healthy': 'ছবিটি সুস্থ পাতার মতো দেখাচ্ছে ({percent}% সদৃশ)।',
  'assistant.photo.otherPlant': 'ছবিটি {plant}-এর পাতার মতো দেখাচ্ছে, আপনার {crop} নয়।',
  'assistant.rule.photoAnswer': 'এটি সাদৃশ্য, রোগনির্ণয় নয় — রোগ আছে বলা অ্যাপের পক্ষে সম্ভব নয়।',
  'assistant.rule.photoNext': 'পাতায় লক্ষণ দেখলে নিশ্চিত করতে পাতাটি (বা ছবি) কৃষি বিজ্ঞান কেন্দ্র বা বীজ-ওষুধের দোকানে নিয়ে যান।',
  'assistant.rule.photoNone': 'এখনও কোনও ছবির পরীক্ষা আমার কাছে নেই। আজকের পর্দার “পাতার ছবি দেখুন” কার্ডে পাতার ছবি তুলুন — এটি আপনার ফোনেই চলে, ইন্টারনেট লাগে না।',
  'assistant.rule.savedToday': 'আজ আপনি প্রায় {litres} লিটার বাঁচিয়েছেন।',
  'assistant.rule.savedTotal': 'আপনার নথিভুক্ত সব দিন মিলিয়ে প্রায় {litres} লিটার।',
  'assistant.rule.savedBasis':
    'এটি মাপা হয়েছে পুরো চাহিদার জন্য খেত ভাসিয়ে দেওয়া ও পড়া বৃষ্টি না ধরার তুলনায়।',
  'assistant.rule.plan': 'আগামীকালের পরিকল্পনা: {status}।',
  'assistant.rule.planCaveat': 'এটি পূর্বাভাসের ভিত্তিতে, তাই আবহাওয়া বদলালে বদলাতে পারে।',
  'assistant.rule.weatherTemp': 'এখন তাপমাত্রা প্রায় {temp}°সে।',
  'assistant.rule.weatherHumidity': 'আর্দ্রতা প্রায় {humidity}%।',
  'assistant.rule.weatherRain': 'আজ প্রত্যাশিত বৃষ্টি: {mm} মিমি।',

  'assistant.rule.ph': 'অ্যাপের হিসাবে আপনার উপরের মাটির pH {ph}।',
  'assistant.rule.phEstimate':
    'এটি 250 মিটার মাটির মানচিত্র থেকে পাওয়া আপনার এলাকার একটি অনুমান — আপনার খেতের পরীক্ষা নয়। নিজের জমির মান পেতে স্থানীয় কেন্দ্রে মাটি স্বাস্থ্য কার্ডের পরীক্ষা করান।',
  'assistant.rule.phMeasured': 'এই মানটি আপনার নিজের খেতের পরীক্ষা থেকে এসেছে।',
  'assistant.rule.phUnknown':
    'এই খেতের জন্য মাটির pH আমার কাছে নেই। অ্যাপ যা দেখায় সেটিও 250 মিটার মাটির মানচিত্র থেকে আপনার এলাকার অনুমান, আপনার খেতের পরীক্ষা নয় — নিজের জমির মান পেতে স্থানীয় কেন্দ্রে মাটি স্বাস্থ্য কার্ডের পরীক্ষা করাতে হবে।',
  'assistant.rule.phSuitability':
    'আপনার ফসলের জন্য pH {min} থেকে {max} উপযুক্ত, তাই এটি দাঁড়ায়: {verdict}।',
  'assistant.rule.phAdvice':
    'কত চুন, জিপসাম বা অন্য কোনও সংশোধক দিতে হবে তা আমি বলতে পারি না — তার জন্য মাটি পরীক্ষা এবং আপনার স্থানীয় কৃষি বিজ্ঞান কেন্দ্রের পরামর্শ দরকার।',
  'assistant.rule.fertilityUnknown':
    'এই খেতের জন্য উর্বরতার কোনও অনুমান আমার কাছে নেই। অ্যাপ যে pH বা জৈব কার্বনের মান দেখায় সেটিও আপনার এলাকার অনুমান, মাটি পরীক্ষা নয় — নিজের জমির মান পেতে স্থানীয় কেন্দ্রে মাটি স্বাস্থ্য কার্ডের পরীক্ষা করান, এবং আপনার কৃষি বিজ্ঞান কেন্দ্র তা থেকে সারের পরিকল্পনা করে দিতে পারবে।',
  'assistant.rule.fertilityNoEstimate':
    'এই খেতের জন্য এখনও মাটির pH বা জৈব কার্বনের কোনও অনুমান নেই।',
  'assistant.rule.fertilityReading':
    'এই খেতের জন্য আপনার নিজের মাটি স্বাস্থ্য কার্ড রিডিং: N {n}, P₂O₅ {p}, K₂O {k} কেজি/হেক্টর — সার্বিক উর্বরতা: {band}।',
  'assistant.rule.fertilityAdvice':
    'সার, ইউরিয়া, চুন, জিপসাম বা অন্য কোনও সংশোধকের সঠিক পরিমাণ আমি বলতে পারি না — তার জন্য মাটি পরীক্ষা প্রয়োজন। অনুগ্রহ করে মাটি বা পাতার নমুনা আপনার নিকটবর্তী কৃষি বিজ্ঞান কেন্দ্র বা কৃষি সম্প্রসারণ আধিকারিককে দেখান; তাঁরা আপনার জমির জন্য সঠিক পরিমাণ বলতে পারবেন।',
  'assistant.rule.testInterpreted': 'আমি আপনার দেওয়া মাটি পরীক্ষার ফল পড়েছি: pH {ph}, জৈব কার্বন {oc}%, এবং {values}। এগুলি খেতের পরীক্ষার মান, তাই এই খেতের জন্য এলাকার মানচিত্রের অনুমানের চেয়ে বেশি কার্যকর।',
  'assistant.rule.testLow': 'কম পুষ্টি: {nutrients}। এটি ফসলের বৃদ্ধি সীমিত করতে পারে; ফসলের পর্যায় অনুযায়ী সার পরিকল্পনায় এটিকে অগ্রাধিকার দিন।',
  'assistant.rule.testNoLow': 'দেওয়া N, P₂O₅ এবং K₂O মানে কোনও কম ফল পাওয়া যায়নি।',
  'assistant.rule.testHigh': 'বেশি পুষ্টি: {nutrients}। ফসল পরিকল্পনা ও পরবর্তী পরীক্ষা সমর্থন না করা পর্যন্ত এগুলি আর যোগ করবেন না।',
  'assistant.rule.testNextSteps': 'এখন Fertilizer বিভাগে ফসল ও মাটির অঞ্চল বেছে নিন, ফসলের পর্যায় অনুযায়ী ভাগ করে প্রয়োগ করুন, এবং স্থানীয় সূচির সঙ্গে পরিমাণ মিলিয়ে নিন। আমি ফল ব্যাখ্যা করব, কিন্তু মাত্রা অনুমান করব না।',
  'assistant.rule.testPrompt': 'হ্যাঁ — দুটি উপায়। এখানে মানগুলি এইভাবে পাঠান: pH 6.2, organic carbon 0.8%, N 240, P 12, K 150 kg/ha — আমি প্রতিটি মান শ্রেণিবদ্ধ করে বুঝিয়ে দেব। অথবা Fertilizer ট্যাব খুলুন, ফসল ও মাটির অঞ্চল বেছে নিন, মাটি-পরীক্ষা অপশন ট্যাপ করুন, কার্ডের সংখ্যাগুলি লিখুন এবং “রিডিং সংরক্ষণ” চাপুন — অ্যাপ সেগুলি আপনার খেতে সংরক্ষণ করবে, সরকারি খুরাক সেই অনুযায়ী দেখাবে, আর পরের বারও মনে রাখবে।',
  'assistant.rule.phAmendAcidic':
    'এই ফসলের সীমায় pH বাড়াতে এই মাটিতে সাধারণ প্রতিকার চুন বা ডলোমাইট — পরিমাণ জানতে মাটি পরীক্ষা ও আপনার কৃষি বিজ্ঞান কেন্দ্রের পরামর্শ দরকার।',
  'assistant.rule.phAmendAlkaline':
    'এই ফসলের সীমায় pH কমাতে এই মাটিতে সাধারণ প্রতিকার জিপসাম — পরিমাণ জানতে মাটি পরীক্ষা ও আপনার কৃষি বিজ্ঞান কেন্দ্রের পরামর্শ দরকার।',
  'assistant.rule.phAlts': 'এই pH-এ অ্যাপের তথ্য অনুযায়ী সবচেয়ে উপযোগী ফসল: {crops}।',
  'assistant.rule.fertScheduleQuote':
    'রাজ্য সূচি অনুযায়ী, {zone} অঞ্চলের {variety}-এর জন্য, {band} উর্বরতার মাটিতে: {npk}।',
  'assistant.rule.fertScheduleMore':
    'এই সূচির গোবর সার, মাটি-সংশোধন ও ভাগ করে প্রয়োগের নির্দেশ Fertilizer ট্যাবে দেখুন।',
  'assistant.rule.fertScheduleNote':
    'চূড়ান্ত পরিকল্পনা আপনার কৃষি বিজ্ঞান কেন্দ্রে নিশ্চিত করুন — তাঁরা আপনার খেতের ইতিহাস অনুযায়ী বদলাতে পারবেন।',
  'assistant.rule.soilType': 'আপনি এই খেতের মাটি {soil} হিসেবে লিখেছেন।',
  'assistant.rule.soilCarbon':
    'মাটির মানচিত্র অনুসারে আপনার উপরের মাটিতে প্রায় {oc}% জৈব কার্বন আছে।',
  'assistant.rule.soilMapCaveat':
    'কার্বনের এই মান 250 মিটার এলাকার অনুমান, আপনার খেতের পরীক্ষা নয়।',

  // --- Fertilizer recommendation ---
  'fert.title': 'সার সুপারিশ',
  'fert.selectPrompt': 'সুপারিশ দেখতে ফসল, অঞ্চল এবং উর্বরতা স্তর বেছে নিন।',
  'fert.noCropSelected': 'শুরু করতে একটি ফসল বেছে নিন।',
  'fert.cropNotCovered':
    'এই টুলে এখনও {crop}-এর জন্য সার সূচি নেই। এটি এখন ধান, গম, ভুট্টা, তুলা, আলু ও চিনাবাদাম কভার করে।',
  'fert.noZoneEntry': 'উৎস সূচিতে এই জাতের জন্য {zone} মাটি অঞ্চলের কোনো সুপারিশ নেই।',
  'fert.zone.Hill': 'পাহাড়ি',
  'fert.zone.Terai': 'তরাই',
  'fert.zone.GangeticAlluvium': 'গাঙ্গেয় পলিমাটি',
  'fert.zone.VindhyaAlluviumRedLateritic': 'বিন্ধ্য পলিমাটি, লাল ও ল্যাটেরাইট',
  'fert.zone.Coastal': 'উপকূলীয়',
  'fert.fertility.Low': 'কম',
  'fert.fertility.Medium': 'মাঝারি',
  'fert.fertility.High': 'বেশি',
  'fert.districts': 'এই অঞ্চলের জেলা',
  'fert.npkN': 'নাইট্রোজেন (N)',
  'fert.npkP': 'ফসফরাস (P₂O₅)',
  'fert.npkK': 'পটাশ (K₂O)',
  'fert.kgHaShort': 'কেজি/হেক্টর',
  'fert.noNpk': 'উৎস সূচিতে এই অঞ্চল ও উর্বরতা স্তরের জন্য কোনো NPK পরিমাণ দেওয়া নেই।',
  'fert.ameliorantTitle': 'মাটি সংশোধক',
  'fert.manureTitle': 'সার / জৈব-সার',
  'fert.sulphurTitle': 'সালফার',
  'fert.micronutrientsTitle': 'অণুপুষ্টি',
  'fert.remarksTitle': 'প্রয়োগের সময়',
  'fert.tableNoteTitle': 'এই ফসলের জন্য সাধারণ নোট',
  'fert.disclaimer':
    'এটি একটি সাধারণ জেলা-স্তরের সূচি, আপনার নিজের জমির পরীক্ষা নয়। আপনার আসল মাটি পরীক্ষার ফল সবসময় এর চেয়ে বেশি গুরুত্ব পাবে। সেচ ও সার প্রয়োগের সময় ছাড়া অন্য কিছুর জন্য — পোকা, রোগ, বা মাটি পরীক্ষার সাথে না মেলা সূচি — অনুগ্রহ করে আপনার স্থানীয় কৃষি বিজ্ঞান কেন্দ্র বা কৃষি সম্প্রসারণ কর্মকর্তাকে জিজ্ঞাসা করুন।',
  'fert.sourceCredit': 'উৎস: রাজ্য কৃষি বিভাগের মাটি-পরীক্ষা ভিত্তিক সার সুপারিশ সূচি।',
  'fert.prefillFromFarm': '{farm} থেকে পূরণ করা হয়েছে — অন্য সুপারিশ দেখতে কোনো ক্ষেত্র পরিবর্তন করুন।',
  'fert.moreInfo': 'আরও তথ্য',
  'fert.stepCrop': '১. আপনার ফসল',
  'fert.stepVariety': '২. মৌসুম / জাত',
  'fert.stepZone': '৩. আপনার মাটি অঞ্চল',
  'fert.stepFertility': '৪. মাটির উর্বরতা',
  'fert.fertilityModeNumbers': 'আমার কাছে মাটি-পরীক্ষার সংখ্যা আছে',
  'fert.fertilityModeSimple': 'আমি নিশ্চিত না',
  'fert.kgHaPlaceholder': 'কেজি/হেক্টর',
  'fert.npkInputHint': 'আপনার সয়েল হেলথ কার্ড বা ল্যাব রিপোর্ট থেকে, কেজি/হেক্টরে।',
  'fert.npkIncomplete': 'সুপারিশ দেখতে তিনটি সংখ্যা (N, P, K) লিখুন।',
  'fert.classifiedAs': 'আপনার মাটির উর্বরতা: {level}',
  'fert.saveReading': 'এই খেতের জন্য এই তথ্য সংরক্ষণ করুন',
  'fert.readingSaved': 'সংরক্ষিত হয়েছে',
  'fert.phFromFarm': 'এই খেতের মাটির pH {ph} (এই ফসলের জন্য উপযুক্ত: {min}-{max}) — {verdict}।',

  // --- Farm improvement plan (PRD §15) ---
  'improve.title': 'আপনি কী উন্নত করতে পারেন',
  'improve.subtitle':
    'সবচেয়ে দরকারি কথা আগে। অ্যাপের কাছে পাকা ভিত্তি না থাকলে এখানে কিছু দেখায় না।',
  'improve.none': 'আজ নজর দেওয়ার মতো কিছু নেই',
  'improve.noneHint': 'এই খেতের নথিতে এখন এমন কিছু নেই যাতে আপনার নজর দিতে হবে।',
  'improve.moreCount': 'আরও {count}টি',
  'improve.actions': 'আপনি কী করতে পারেন',
  'improve.severity.HIGH': 'জরুরি',
  'improve.severity.MEDIUM': 'দেখে নেওয়া ভালো',
  'improve.severity.LOW': 'ছোট বিষয়',
  'improve.disclaimer':
    'এর কিছু কথা মানচিত্র আর আবহাওয়ার পূর্বাভাসের উপর দাঁড়িয়ে আছে, আপনার খেতের পরীক্ষার উপর নয়। প্রতিটি কথার সঙ্গে লেখা আছে সেটি কিসের উপর ভিত্তি করে।',
  'improve.ph.title': 'মাটির pH {crop}-এর জন্য উপযুক্ত না হতে পারে',
  'improve.ph.explain':
    'মাটির মানচিত্র অনুযায়ী এখানে উপরের মাটির pH প্রায় {ph}, আর {crop}-এর জন্য {min} থেকে {max} সবচেয়ে ভালো। এই হিসাব 250 মিটার মানচিত্রের ঘরের, আপনার খেতের পরীক্ষা নয় — তাই এটিকে ফলাফল না ধরে পরীক্ষা করার কারণ ধরুন।',
  'improve.ph.actionTest':
    'নিকটবর্তী কৃষি বিজ্ঞান কেন্দ্রে মাটি স্বাস্থ্য কার্ডের পরীক্ষা করান, তবেই আপনার খেতের নিজের pH জানা যাবে।',
  'improve.ph.actionKvk':
    'কতটা চুন, জিপসাম বা গন্ধক দিতে হবে তা এই অ্যাপ বলতে পারে না। পরীক্ষার ফল নিয়ে আপনার কৃষি বিস্তার আধিকারিকের সঙ্গে কথা বলুন।',
  'improve.texture.title': 'মাটির মানচিত্র এই খেতকে অন্যভাবে দেখছে',
  'improve.texture.explain':
    'আপনি {yours} লিখেছেন। এই জায়গার মাটির মানচিত্র এটিকে {theirs}-এর মতো দেখছে। অ্যাপ আপনার কথাই মানে এবং সেটিই ঠিক — আপনি এই খেতে দাঁড়িয়েছেন, মানচিত্র দাঁড়ায়নি। তবে জলের হিসাব এর উপরেই তৈরি, তাই একবার নিশ্চিত হয়ে নেওয়া ভালো।',
  'improve.texture.action':
    'সামান্য ভেজা মাটি আঙুলে ঘষে দেখুন। {yours}-এর মতো না লাগলে খেতের বিবরণে মাটির ধরন বদলে দিন।',
  'improve.soilProfile.title': 'এই খেতের জন্য মাটির মানচিত্রের তথ্য নেই',
  'improve.soilProfile.explain':
    'এই জায়গার জন্য মানচিত্রের কোনো পাঠ জমা নেই, তাই অ্যাপ {soil}-এর সাধারণ হিসাব ব্যবহার করছে। জলের হিসাব কাজ করবে, তবে তা সাধারণভাবে {soil}-এর, বিশেষ করে আপনার খেতের নয়।',
  'improve.soilProfile.action':
    'ইন্টারনেট থাকতে খেতের বিবরণ খুলুন, তখন অ্যাপ এই জায়গার মাটির মানচিত্র নিয়ে আসবে।',
  'improve.soilWater.title': 'জলের হিসাব {soil}-এর সাধারণ মানে ফিরে গেছে',
  'improve.soilWater.explain':
    'এই খেতের জন্য মানচিত্রের তথ্য আছে, কিন্তু তা আপনার ফসলের শিকড় পর্যন্ত পৌঁছায় না, তাই অ্যাপ {soil}-এর সাধারণ হিসাব নিয়েছে। অল্প গভীরতার পাঠকে পুরো শিকড়ের গভীরতায় টেনে নেওয়া মানে অনুমানকে মাপ বানানো।',
  'improve.soilWater.action':
    'আপনার খেতে কোনো গোলমাল নেই। ইন্টারনেট থাকতে খেতের বিবরণ খুলুন, মাটির তথ্য নতুন হয়ে যাবে।',
  'improve.slopeMethod.title': 'ঢালু জমিতে {method} সেচ',
  'improve.slopeMethod.explain':
    'উচ্চতার মানচিত্র অনুযায়ী এখানে প্রায় {slope}% ঢাল, আর {method} সেচে জল মাটির উপর দিয়ে বয়ে যায়, তাই কিছু জল শুষে নেওয়ার আগেই নিচে গড়িয়ে যায়। এই মানচিত্র মোটা দাগের এবং সমতল জমিতেও প্রায়ই ঢাল দেখায়, তাই নিজের চোখেও দেখে নিন।',
  'improve.slopeMethod.actionShorter':
    'খেতে সত্যিই ঢাল থাকলে ঢালের আড়াআড়ি ছোট ছোট ভাগে জল দিন, ঢাল বেয়ে নিচের দিকে নয়।',
  'improve.slopeMethod.actionAsk':
    'এই খেতে বাঁধ বা কনট্যুর করা নিয়ে আপনার কৃষি বিজ্ঞান কেন্দ্রে জিজ্ঞেস করুন।',
  'improve.retentionMethod.title': 'তাড়াতাড়ি জল ছেড়ে দেওয়া মাটিতে {method} সেচ',
  'improve.retentionMethod.explain':
    'আপনি {soil} লিখেছেন, যা জল কম ধরে রাখে। এই মাটি যত জল শুষতে পারে তার চেয়ে জোরে জল দিলে তা শিকড়ের নিচে চলে যায় — তাই একবারে লম্বা সেচে ফসলের কাজের চেয়ে বেশি জল নষ্ট হয়।',
  'improve.retentionMethod.actionSplit':
    'একই পরিমাণ জল একবারে লম্বা সেচের বদলে অল্প অল্প করে বেশি বার দিন।',
  'improve.retentionMethod.actionAsk':
    'এই মাটিতে জৈব পদার্থ বাড়ানো নিয়ে, এবং আপনার ফসল ও খরচের হিসাবে ড্রিপ ঠিক হবে কি না, কৃষি বিজ্ঞান কেন্দ্রে জিজ্ঞেস করুন।',
  'improve.disease.title': 'আবহাওয়া {disease}-এর অনুকূল',
  'improve.disease.explain':
    'গত ও আগামী দিনের আবহাওয়া এই ফসলে {disease}-এর অনুকূল। এটি আবহাওয়ার কথা, আপনার গাছের কথা নয় — অ্যাপ আপনার ফসল দেখেনি এবং বলতে পারে না যে কোনো রোগ ধরেছে।',
  'improve.disease.actionLook': 'খেতে ঘুরে পাতা মন দিয়ে দেখুন, আগে নিচের পাতাগুলো।',
  'improve.disease.actionPhoto':
    'কোনো পাতায় দাগ দেখলে ড্যাশবোর্ডে পাতার ছবি পরীক্ষা ব্যবহার করুন।',
  'improve.disease.actionKvk':
    'যা কিছু দেখবেন তা আপনার কৃষি বিজ্ঞান কেন্দ্র বা কৃষি বিস্তার আধিকারিককে দেখান। এই অ্যাপ কোনো ফসল-সুরক্ষা পণ্যের নাম বলে না এবং পরিমাণ বলে না।',
  'improve.weatherData.titleMissing': 'আজের পরামর্শ আবহাওয়া ছাড়া তৈরি হয়েছে',
  'improve.weatherData.titleCached': 'আজের পরামর্শ জমা রাখা আবহাওয়ায় তৈরি',
  'improve.weatherData.explainMissing':
    'আবহাওয়া পাওয়া যায়নি, তাই আজের হিসাব কেবল আপনার মাটি, ফসল ও সেচের নথির উপর দাঁড়িয়ে আছে। বৃষ্টি আর গরম এতে ধরা নেই।',
  'improve.weatherData.explainCached':
    'এখন আবহাওয়া পাওয়া যায়নি, তাই অ্যাপ শেষবার জমা রাখা হিসাব ব্যবহার করেছে। আজের বৃষ্টি আর গরম তার থেকে আলাদা হতে পারে।',
  'improve.weatherData.action':
    'ইন্টারনেট এলে অ্যাপ আবার খুলুন, নতুন আবহাওয়া দিয়ে পরামর্শ ফের হিসাব হয়ে যাবে।',
  'improve.fertTable.title': '{crop}-এর জন্য সারের তালিকা নেই',
  'improve.fertTable.explain':
    'অ্যাপে রাজ্যের সারের তালিকা ছয়টি ফসলের জন্য আছে এবং {crop} তার মধ্যে নেই। এই ফাঁক কোনো অনুমানের পরিমাণ দিয়ে ভরা হবে না।',
  'improve.fertTable.action':
    '{crop}-এর সারের তালিকা আপনার কৃষি বিজ্ঞান কেন্দ্র বা কৃষি বিস্তার আধিকারিকের কাছে জিজ্ঞেস করুন, আর মাটি পরীক্ষার ফল সঙ্গে নিয়ে যান।',
};

const as: Record<TranslationKey, string> = {
  'app.loading': 'লোড হৈ আছে…',
  'app.initErrorTitle': 'এপৰ তথ্য খুলিব পৰা নগ’ল',
  'app.initErrorBody': 'অনুগ্ৰহ কৰি IrrigaSmart-ৰ আন সকলো টেব বন্ধ কৰি এই পৃষ্ঠা পুনৰ লোড কৰক। আপোনাৰ সংৰক্ষিত খেতি সুৰক্ষিত।',
  'app.reload': 'পুনৰ লোড কৰক',
  'app.offlineBanner': 'আপুনি অফলাইনত আছে। সংৰক্ষিত তথ্য দেখুওৱা হৈছে — পৰামৰ্শ আপোনাৰ শেষৰ বতৰৰ তথ্যৰ ওপৰত ভিত্তি কৰি দিয়া হৈছে।',

  'nav.today': 'আজি',
  'nav.farms': 'খেতি',
  'nav.history': 'ইতিহাস',
  'nav.fertilizer': 'সাৰ',
  'nav.settings': 'ছেটিংছ',

  'dashboard.greeting': 'নমস্কাৰ, {name}',
  'dashboard.addFirstFarm': 'আজিৰ জলসিঞ্চনৰ পৰামৰ্শ চাবলৈ আপোনাৰ প্ৰথমখন খেতি যোগ কৰক।',
  'dashboard.addFarm': 'খেতি যোগ কৰক',
  'dashboard.checking': 'আজিৰ পৰিস্থিতি পৰীক্ষা কৰা হৈছে…',
  'dashboard.errorGeneric': 'পৰামৰ্শ তৈয়াৰ কৰোঁতে কিবা ভুল হ’ল।',
  'dashboard.errorMissing': 'এই খেতিখনৰ কিছুমান তথ্য নাই। অনুগ্ৰহ কৰি সম্পাদনা কৰি পুনৰ চেষ্টা কৰক।',
  'dashboard.errorTabs': 'IrrigaSmart আন এটা টেবত খোলা আছে। সেইটো বন্ধ কৰি সতেজ কৰক।',
  'dashboard.refresh': 'সতেজ কৰক',
  'dashboard.noteNoWeather': 'এতিয়াও কোনো বতৰৰ তথ্য পোৱা হোৱা নাই। বতৰ-ভিত্তিক পৰামৰ্শ পাবলৈ এবাৰ ইণ্টাৰনেটৰ সৈতে সংযোগ কৰক।',
  'dashboard.noteCached': 'বতৰৰ সেৱাত সংযোগ কৰিব পৰা নগ’ল। আপোনাৰ শেহতীয়া সংৰক্ষিত বতৰৰ তথ্য ব্যৱহাৰ কৰা হৈছে।',

  'farmcard.noRecToday': 'আজি এতিয়াও কোনো পৰামৰ্শ নাই — তৈয়াৰ কৰিবলৈ টেপ কৰক।',
  'farmcard.lastWeather': 'বতৰ {time}-ত আপডেট কৰা হৈছে',
  'farmcard.noWeather': 'এতিয়াও বতৰৰ তথ্য নাই',

  'weather.temperature': 'উষ্ণতা',
  'weather.rainToday': 'আজিৰ বৰষুণ',
  'weather.humidity': 'আৰ্দ্ৰতা',
  'weather.sunshine': 'ৰ’দ',
  'weather.dryingPoor': 'মেঘলা দিন — পাত বহু সময় তিতি থাকিব',
  'weather.dryingModerate': 'কিছু ৰ’দ — পাত লাহে লাহে শুকাব',
  'weather.dryingGood': 'উজ্জ্বল দিন — পাত সোনকালে শুকাব',
  'weather.cacheNote': 'আপোনাৰ শেহতীয়া সংৰক্ষিত বতৰ দেখুওৱা হৈছে — আপডেট কৰিবলৈ সংযোগ কৰক।',

  'rec.ariaLabel': 'আজিৰ পৰামৰ্শ',
  'rec.bestTime': 'উপযুক্ত সময়',
  'rec.waterDepth': 'পানীৰ গভীৰতা',
  'rec.totalVolume': 'মুঠ পৰিমাণ',
  'rec.confidenceBadge.high': 'উচ্চ নিৰ্ভৰযোগ্যতা',
  'rec.confidenceBadge.medium': 'মধ্যম নিৰ্ভৰযোগ্যতা',
  'rec.confidenceBadge.low': 'কম নিৰ্ভৰযোগ্যতা',
  'rec.help.high': 'সতেজ বতৰৰ তথ্যৰ ওপৰত ভিত্তি কৰি।',
  'rec.help.medium': 'অলপ পুৰণি বতৰৰ তথ্যৰ ওপৰত ভিত্তি কৰি।',
  'rec.help.low': 'বতৰৰ তথ্য সীমিত বা নাই — ইয়াক আনুমানিক নিৰ্দেশনা হিচাপে লওক।',
  'rec.window': 'জলসিঞ্চনৰ সময়ছোৱা',
  'rec.duration': 'চলোৱাৰ সময়',
  'rec.flow': 'পানী দিয়াৰ হাৰ',
  'rec.minutes': '{n} মিনিট',
  'rec.litersPerMin': '{n} লিটাৰ/মিনিট',
  'rec.windowValue': '{start} – {end}',
  'rec.windowTomorrow': 'কাইলৈ {start} – {end}',
  'rec.why.morning-default': 'ৰাতিপুৱা সোনকালে জলসিঞ্চন কৰিলে বাষ্পীভৱনত কম পানী নষ্ট হয়।',
  'rec.why.hot-season': 'গ্ৰীষ্মৰ গৰম — সোনকালে আৰম্ভ কৰিলে মাটিত অধিক পানী থাকে।',
  'rec.why.hot-day': 'আজি দিনটো গৰম, সেয়ে ৰ’দ চোকা হোৱাৰ আগতে আৰম্ভ কৰক।',
  'rec.why.windy': 'বতাহে স্প্ৰিংকলাৰৰ পানী উৰুৱাই নিয়ে — শান্ত ৰাতিপুৱাৰ সময় ভাল।',
  'rec.why.cool-season': 'শীতৰ ঠাণ্ডা ৰাতিপুৱা — অলপ পলমকৈ আৰম্ভ কৰাটো শস্যৰ বাবে ভাল।',
  'rec.why.long-run': 'এইটো দীঘলীয়া সময় চলিব, সেয়ে দুপৰীয়াৰ আগতে শেষ হ’ব পৰাকৈ সোনকালে আৰম্ভ কৰক।',
  'rec.why.later-today': 'ৰাতিপুৱাৰ সময় পাৰ হৈ গ’ল, সেয়ে পৰৱৰ্তী সম্ভৱ সময় দেখুওৱা হৈছে।',
  'rec.why.evening-slot': 'ৰাতিপুৱাৰ বাবে পলম হ’ল — সন্ধিয়াৰ ঠাণ্ডাত জলসিঞ্চন কৰক।',
  'rec.why.drying-window':
    'আজি ৰ’দ কম, সেয়ে স্প্ৰিংকলাৰৰ পানী গোটেই ৰাতি পাতত থাকিব। কাইলৈ ৰাতিপুৱা জলসিঞ্চন কৰাটো শস্যৰ বাবে নিৰাপদ।',

  'enum.status.Irrigate Today': 'আজি জলসিঞ্চন কৰক',
  'enum.status.Delay Irrigation': 'জলসিঞ্চন পলম কৰক',
  'enum.status.Monitor Tomorrow': 'কাইলৈ নিৰীক্ষণ কৰক',

  'enum.crop.Rice': 'ধান',
  'enum.crop.Wheat': 'ঘেঁহু',
  'enum.crop.Maize': 'মাকৈ',
  'enum.crop.Cotton': 'কপাহ',
  'enum.crop.Sugarcane': 'কুঁহিয়াৰ',
  'enum.crop.Soybean': 'ছয়াবিন',
  'enum.crop.Groundnut': 'বাদাম',
  'enum.crop.Tomato': 'বিলাহী',
  'enum.crop.Potato': 'আলু',
  'enum.crop.Onion': 'পিয়াঁজ',

  'enum.stage.Initial': 'আৰম্ভণি',
  'enum.stage.Development': 'বিকাশ',
  'enum.stage.Mid Season': 'মাজভাগৰ বতৰ',
  'enum.stage.Late Season': 'শেষ বতৰ',

  'enum.soil.Sandy': 'বালিময়',
  'enum.soil.Sandy Loam': 'বালিময় পলসুৱা',
  'enum.soil.Loamy': 'পলসুৱা',
  'enum.soil.Silty Loam': 'পলিময় পলসুৱা',
  'enum.soil.Clay Loam': 'আঠালীয়া পলসুৱা',
  'enum.soil.Clay': 'আঠালীয়া',

  'enum.method.Drip': 'টোপাল সিঞ্চন',
  'enum.method.Sprinkler': 'স্প্ৰিংকলাৰ',
  'enum.method.Furrow': 'নলা পদ্ধতি',
  'enum.method.Flood': 'বানপানী পদ্ধতি',

  'enum.area.Square metre': 'বৰ্গ মিটাৰ',
  'enum.area.Acre': 'একৰ',
  'enum.area.Hectare': 'হেক্টৰ',

  'farms.title': 'আপোনাৰ খেতিসমূহ',
  'farms.add': '+ খেতি যোগ কৰক',
  'farms.empty': 'এতিয়াও কোনো খেতি নাই। জলসিঞ্চনৰ পৰামৰ্শ পাবলৈ প্ৰথমখন খেতি যোগ কৰক।',
  'farms.edit': 'সম্পাদনা',
  'farms.delete': 'মচক',
  'farms.confirm': 'নিশ্চিত কৰক',
  'farms.soilSuffix': 'মাটি',

  'form.titleAdd': 'খেতি যোগ কৰক',
  'form.titleEdit': 'খেতি সম্পাদনা কৰক',
  'form.name': 'খেতিৰ নাম',
  'form.namePlaceholder': 'যেনে: উত্তৰ পথাৰ',
  'form.locationName': 'স্থানৰ নাম',
  'form.locationPlaceholder': 'যেনে: বোলপুৰ',
  'form.latitude': 'অক্ষাংশ',
  'form.longitude': 'দ্ৰাঘিমাংশ',
  'form.useMyLocation': 'মোৰ অৱস্থান ব্যৱহাৰ কৰক',
  'form.searchPlaceholder': 'আপোনাৰ গাঁও বা চহৰ বিচাৰক',
  'form.search': 'বিচাৰক',
  'form.searching': 'বিচৰা হৈছে…',
  'form.searchNone': 'কোনো স্থান পোৱা নগ’ল। ওচৰৰ চহৰৰ নাম চেষ্টা কৰক।',
  'form.searchFailed': 'বিচৰা বিফল হ’ল। ইণ্টাৰনেট পৰীক্ষা কৰি পুনৰ চেষ্টা কৰক।',
  'form.locating': 'আপোনাৰ অৱস্থান বিচৰা হৈছে…',
  'form.locationError.unsupported': 'এই ডিভাইচত অৱস্থান সেৱা সমৰ্থিত নহয়। অনুগ্ৰহ কৰি স্থানাংক নিজে লিখক।',
  'form.locationError.denied': 'অৱস্থানৰ অনুমতি অস্বীকাৰ কৰা হৈছে। ব্ৰাউজাৰৰ ছেটিংছত অনুমতি দিয়ক, অথবা স্থানাংক নিজে লিখক।',
  'form.locationError.unavailable': 'আপোনাৰ অৱস্থান নিৰ্ধাৰণ কৰিব পৰা নগ’ল। পুনৰ চেষ্টা কৰক বা স্থানাংক নিজে লিখক।',
  'form.locationError.lookupFailed': 'অৱস্থান পোৱা গ’ল, কিন্তু স্থানৰ বিৱৰণ লোড কৰিব পৰা নগ’ল। স্থানাংক পূৰ কৰা হৈছে।',
  'form.soilSuggestion': 'এই অঞ্চলৰ বাবে পৰামৰ্শ দিয়া মাটি: {soil}। নিশ্চিত কৰক বা নিজৰ পছন্দ বাছক।',
  'form.applySuggestion': '{soil} ব্যৱহাৰ কৰক',
  'form.fieldSize': 'পথাৰৰ আকাৰ',
  'form.unit': 'একক',
  'form.crop': 'শস্য',
  'form.growthStage': 'বৃদ্ধিৰ পৰ্যায়',
  'form.soilType': 'মাটিৰ প্ৰকাৰ',
  'form.irrigationMethod': 'জলসিঞ্চনৰ পদ্ধতি',
  'form.cancel': 'বাতিল কৰক',
  'form.save': 'খেতি সংৰক্ষণ কৰক',
  'form.saving': 'সংৰক্ষণ কৰা হৈছে…',
  'form.error.name': 'অনুগ্ৰহ কৰি খেতিৰ নাম লিখক।',
  'form.error.location': 'অনুগ্ৰহ কৰি খেতিৰ অৱস্থান (অক্ষাংশ আৰু দ্ৰাঘিমাংশ) লিখক।',
  'form.error.coords': 'অনুগ্ৰহ কৰি বৈধ অৱস্থান লিখক (অক্ষাংশ -90ৰ পৰা 90, দ্ৰাঘিমাংশ -180ৰ পৰা 180)।',
  'form.error.area': 'পথাৰৰ আকাৰ শূন্যতকৈ ডাঙৰ সংখ্যা হ’ব লাগিব।',
  'form.error.save': 'খেতি সংৰক্ষণ কৰিব পৰা নগ’ল। পুনৰ চেষ্টা কৰক।',

  'history.title': 'ইতিহাস',
  'history.farmLabel': 'খেতি',
  'history.loading': 'ইতিহাস লোড হৈ আছে…',
  'history.empty': 'এই খেতিৰ বাবে এতিয়াও কোনো পৰামৰ্শ নাই। এটা তৈয়াৰ কৰিবলৈ আজি টেব খোলক।',
  'history.noFarms': 'এতিয়াও কোনো খেতি নাই। ইতিহাস আৰম্ভ কৰিবলৈ খেতি যোগ কৰক।',
  'history.at': 'সময়',
  'history.unavailable': 'পৰামৰ্শৰ বিৱৰণ উপলব্ধ নহয়।',

  'settings.title': 'ছেটিংছ',
  'settings.profile': 'প্ৰফাইল',
  'settings.yourName': 'আপোনাৰ নাম',
  'settings.saved': 'প্ৰফাইল সংৰক্ষণ কৰা হ’ল।',
  'settings.preferences': 'পছন্দসমূহ',
  'settings.language': 'ভাষা',
  'settings.units': 'এককসমূহ',
  'settings.unitsMetric': 'মেট্ৰিক (°C, মিমি, লিটাৰ)',
  'settings.comingSoon': 'শীঘ্ৰেই আহিব',
  'settings.notifications': 'জলসিঞ্চনৰ সোঁৱৰণী',
  'settings.cloudSync': 'ক্লাউড ছিংক (ভৱিষ্যৎ সংস্কৰণ)',

  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',
  'lang.as': 'অসমীয়া',
  'lang.ur': 'اردو',

  'factors.title': 'এই পৰামৰ্শ কিয়',
  'factors.name.crop': 'শস্য',
  'factors.name.growthStage': 'বৃদ্ধিৰ পৰ্যায়',
  'factors.name.temperature': 'উষ্ণতা',
  'factors.name.rainfall': 'বৰষুণ',
  'factors.name.humidity': 'আৰ্দ্ৰতা',
  'factors.name.wind': 'বতাহ',
  'factors.name.soil': 'মাটিৰ প্ৰকাৰ',
  'factors.name.irrigationMethod': 'জলসিঞ্চনৰ পদ্ধতি',
  'factors.influence.increases': 'প্ৰয়োজন বঢ়ায়',
  'factors.influence.decreases': 'প্ৰয়োজন কমায়',
  'factors.influence.neutral': 'নিৰপেক্ষ',
  'factors.legend': 'তৰা বেছি হ’লে আজিৰ সিদ্ধান্তত প্ৰভাৱো বেছি',
  'factors.strength.strong': 'ডাঙৰ প্ৰভাৱ',
  'factors.strength.moderate': 'কিছু প্ৰভাৱ',
  'factors.strength.weak': 'সৰু প্ৰভাৱ',
  'factors.starsLabel': '৩টাৰ ভিতৰত {stars}টা তৰা — {strength}',

  'plan.title': 'আগন্তুক দিনৰ পৰিকল্পনা',
  'plan.today': 'আজি',
  'plan.tomorrow': 'কাইলৈ',
  'plan.rain': '{mm} মিমি বৰষুণ',
  'plan.action.Irrigate Today': 'জলসিঞ্চন কৰক',
  'plan.action.Delay Irrigation': 'বৰষুণে প্ৰয়োজন পূৰাব',
  'plan.action.Monitor Tomorrow': 'লক্ষ্য ৰাখক',
  'plan.note.irrigate': '{day} জলসিঞ্চন কৰাৰ পৰিকল্পনা কৰক।',
  'plan.note.rain': '{day} বৰষুণে শস্যৰ প্ৰয়োজন পূৰাব পাৰে।',
  'plan.note.none': 'আগন্তুক দিনকেইটাত জলসিঞ্চনৰ আশা নাই।',

  'onb.welcome.title': 'IrrigaSmart-লৈ স্বাগতম',
  'onb.welcome.tagline': 'IrrigaSmart-এ বতৰ, শস্যৰ তথ্য আৰু কৃষিজ্ঞান ব্যৱহাৰ কৰি ভাল জলসিঞ্চনৰ সিদ্ধান্ত লোৱাত সহায় কৰে।',
  'onb.welcome.start': 'আৰম্ভ কৰক',
  'onb.next': 'আগলৈ',
  'onb.back': 'পিছলৈ',
  'onb.about.title': 'IrrigaSmart-ৰ বিষয়ে',
  'onb.about.body': 'কেতিয়া আৰু কিমান জলসিঞ্চন কৰিব লাগে সেই সিদ্ধান্তত কৃষকক সহায় কৰিবলৈ IrrigaSmart সৃষ্টি কৰা হৈছে। ই ইণ্টাৰনেট নোহোৱাকৈও কাম কৰে, প্ৰতিটো পৰামৰ্শ সহজ ভাষাত বুজায়, আৰু কৃষকক প্ৰথম স্থান দিয়ে।',
  'onb.how.title': 'ই কেনেকৈ কাম কৰে',
  'onb.how.step1': 'আপোনাৰ খেতি যোগ কৰক',
  'onb.how.step2': 'আমি বতৰ পৰীক্ষা কৰোঁ',
  'onb.how.step3': 'সিদ্ধান্ত ইঞ্জিনে বিশ্লেষণ কৰে',
  'onb.how.step4': 'আপুনি এটা পৰামৰ্শ পায়',
  'onb.how.step5': 'স্পষ্ট ব্যাখ্যাৰ সৈতে',
  'onb.trust.title': 'পৰামৰ্শক কিয় বিশ্বাস কৰিব',
  'onb.trust.body': 'প্ৰতিটো পৰামৰ্শই আপোনাৰ শস্য, বৃদ্ধিৰ পৰ্যায়, মাটি, বতৰ আৰু জলসিঞ্চনৰ পদ্ধতি বিবেচনা কৰে — আৰু সদায় কাৰণ বুজাই দিয়ে। IrrigaSmart-এ আপোনাৰ সিদ্ধান্তত সহায় কৰে; ই আপোনাৰ অভিজ্ঞতাৰ ঠাই নলয়।',
  'onb.offline.title': 'অফলাইনতো কাম কৰে',
  'onb.offline.body': 'আপোনাৰ খেতিৰ তথ্য আপোনাৰ ফোনতে থাকে। ইতিমধ্যে পোৱা বতৰৰ তথ্য ইণ্টাৰনেট নোহোৱাকৈও উপলব্ধ থাকে, সেয়ে আপুনি সদায় পৰামৰ্শ পায়।',
  'onb.privacy.title': 'আপোনাৰ গোপনীয়তা',
  'onb.privacy.body': 'আপোনাৰ খেতিৰ বিৱৰণ আপোনাৰ ডিভাইচতে থাকে। কোনো ব্যক্তিগত তথ্য কাৰো সৈতে ভাগ কৰা নহয়।',
  'onb.start.title': 'আৰম্ভ কৰাৰ নিয়ম',
  'onb.start.step1': 'আপোনাৰ খেতি যোগ কৰক',
  'onb.start.step2': 'আপোনাৰ শস্য বাছক',
  'onb.start.step3': 'আপোনাৰ মাটিৰ প্ৰকাৰ বাছক',
  'onb.start.step4': 'আপোনাৰ পৰামৰ্শ পাওক',

  'settings.about': 'সহায় আৰু IrrigaSmart-ৰ বিষয়ে',

  'notif.title': 'সোঁৱৰণীসমূহ',
  'notif.reminderTitle': 'জলসিঞ্চনৰ সোঁৱৰণী',
  'notif.reminderBody': '{farm}-ত জলসিঞ্চনৰ সময় — আজি ৰাতিপুৱা প্ৰায় {volume}।',
  'notif.reminderBodyTimed': '{farm}-ত জলসিঞ্চনৰ সময় — প্ৰায় {volume}, প্ৰায় {minutes} মিনিট।',
  'notif.rainTitle': 'বৰষুণৰ সতৰ্কবাণী',
  'notif.rainBody': '{farm}-ত {day} প্ৰায় {mm} বৰষুণৰ সম্ভাৱনা আছে। আপুনি জলসিঞ্চন এৰিব পাৰে।',

  'season.title': 'বতৰৰ পথপ্ৰদৰ্শক',
  'season.Kharif': 'খৰিফ (বৰ্ষা)',
  'season.Rabi': 'ৰবি (শীতকাল)',
  'season.Zaid': 'জায়েদ (গ্ৰীষ্মকাল)',
  'season.inSeason': '{crop} ইয়াৰ প্ৰধান খেতিৰ বতৰত আছে।',
  'season.offSeason': '{crop} সাধাৰণতে {season} কালত খেতি কৰা হয়।',
  'season.calendar': 'সিঁচা: {sow} · চপোৱা: {harvest}',
  'season.guide.Kharif': 'বৰ্ষাকাল: কেৱল শুকান সময়ত জলসিঞ্চন কৰক আৰু বৰষুণক কাম কৰিবলৈ দিয়ক। পানী জমা হোৱালৈ লক্ষ্য ৰাখক।',
  'season.guide.Rabi': 'ঠাণ্ডা, শুকান মাহ: শস্যক নিয়মীয়া জলসিঞ্চনৰ প্ৰয়োজন, কিন্তু গ্ৰীষ্মকালতকৈ চাহিদা কম।',
  'season.guide.Zaid': 'গৰম গ্ৰীষ্মকাল: পানীৰ চাহিদা সৰ্বাধিক — বাষ্পীভৱন কমাবলৈ ৰাতিপুৱা সোনকালে জলসিঞ্চন কৰক।',

  'disease.title': 'ৰোগ নিৰীক্ষণ',
  'disease.level.None': 'বিপদ নাই',
  'disease.level.Low': 'কম বিপদ',
  'disease.level.Moderate': 'মধ্যম বিপদ',
  'disease.level.High': 'অধিক বিপদ',
  'disease.none': 'বতৰ এতিয়া {crop}ৰ সাধাৰণ ৰোগৰ অনুকূল নহয়।',
  'disease.headline': 'বতৰ {disease}ৰ অনুকূল।',
  'disease.observed': 'একেৰাহে {days} দিন ধৰি পৰিস্থিতি অনুকূল হৈ আছে।',
  'disease.observedOne': 'আজি পৰিস্থিতি অনুকূল হৈছে।',
  'disease.forecast': 'আৰু {days} দিন অনুকূল পৰিস্থিতি থকাৰ সম্ভাৱনা আছে।',
  'disease.forecastOne': 'কাইলৈও অনুকূল পৰিস্থিতি থকাৰ সম্ভাৱনা আছে।',
  'disease.overcast': 'এই দিনবোৰত বেছিভাগেই মেঘলা আছিল — তিতা পাত বহু সময় তিতি থাকে, ইয়াৰ ফলত ৰোগ বাঢ়ে।',
  'disease.trigger': '{date} তাৰিখে: {temp}, আৰ্দ্ৰতা {humidity}, বৰষুণ {rain}।',
  'disease.inspectTitle': 'কি চাব',
  'disease.inspect': '{where} চাওক। {what}',
  'disease.advice':
    'এইটো বতৰৰ সতৰ্কবাণী, ৰোগ নিৰ্ণয় নহয়। এই লক্ষণ দেখিলে যিকোনো ঔষধ দিয়াৰ আগতে স্থানীয় কৃষি সম্প্ৰসাৰণ বিষয়াক নমুনা দেখুৱাওক।',
  'disease.tipDry': 'দিনৰ আৰম্ভণিতে জলসিঞ্চন কৰিলে পাত সোনকালে শুকায়, ফলত ৰোগৰ বিপদ কমে।',
  'disease.unavailable': 'দৈনিক বতৰৰ তথ্য নাই, সেয়েহে ৰোগৰ বিপদ নিৰূপণ কৰিব নোৱাৰি।',

  'moisture.title': 'মাটিৰ আৰ্দ্ৰতা',
  'moisture.unavailable': 'দৈনিক বতৰৰ তথ্য নাই, সেয়েহে মাটিৰ আৰ্দ্ৰতাৰ হিচাপ দেখুৱাব নোৱাৰি।',
  'moisture.statusOk': 'শিপাৰ অঞ্চলত পৰ্যাপ্ত পানী আছে।',
  'moisture.statusStress': 'হ্ৰাস শস্যৰ চাপৰ সীমাত উপনীত হৈছে — জলসিঞ্চনৰ পৰামৰ্শ দিয়া হৈছে।',
  'moisture.available': 'উপলব্ধ পানী',
  'moisture.depletion': 'হ্ৰাস',
  'moisture.capacity': 'মুঠ ক্ষমতা',
  'moisture.rootDepth': 'শিপাৰ গভীৰতা',
  'moisture.help':
    'গেজে শিপাৰ অঞ্চলৰ মুঠ ক্ষমতাৰ ভগ্নাংশ হিচাপে উপলব্ধ পানী দেখুৱায়। চিহ্নই দেখুৱায় শস্যৰ চাপ ক\'ত আৰম্ভ হয়।',

  'provenance.MEASURED': 'খেতিৰ পৰীক্ষা',
  'provenance.USER_PROVIDED': 'আপুনি জনালে',
  'provenance.REGIONAL_ESTIMATE': 'অঞ্চলৰ আনুমানিক',
  'provenance.FORECAST': 'পূৰ্বানুমান',
  'provenance.CALCULATED': 'হিচাপ কৰা',
  'provenance.INFERRED': 'অনুমান কৰা',
  'provenance.UNKNOWN': 'জনা নাই',

  'ph.title': 'মাটিৰ pH উপযোগিতা',
  'ph.unavailable': 'এই খেতীৰ বাবে এতিয়াও মাটিৰ pH-ৰ কোনো আনুমানিক মান নাই, সেয়েহে উপযোগিতা দেখুৱাব নোৱাৰি।',
  'ph.pending': 'এই খেতীৰ বাবে মাটিৰ মানচিত্ৰ পঢ়া হৈ আছে। ইয়াত এক মিনিটলৈকে সময় লাগিব পাৰে।',
  'ph.unreachable':
    'মাটিৰ মানচিত্ৰলৈ পাব পৰা নগ\'ল। আপোনাৰ ইণ্টাৰনেট সংযোগ চাওক — ই নিজে নিজেই পুনৰ চেষ্টা কৰিব।',
  'ph.reading': 'আনুমানিক মাটিৰ pH: {ph}',
  'ph.source':
    'এইটো 250 মিটাৰ মাটিৰ মানচিত্ৰৰ পৰা পোৱা এটা অনুমান, আপোনাৰ খেতিৰ পৰীক্ষা নহয়। আপোনাৰ মাটিৰ সঠিক মান পাবলৈ মৃত্তিকা স্বাস্থ্য কাৰ্ডৰ পৰীক্ষা কৰাওক।',
  'ph.optimalRange': '{crop}ৰ বাবে উপযোগী: pH {min}-{max}',
  'ph.level.suitable': 'উপযোগী',
  'ph.level.slightly-outside': 'উপযোগী সীমাৰ পৰা অলপ বাহিৰে',
  'ph.level.significant-issue': 'গুৰুতৰ pH সমস্যা',
  'ph.help.suitable': 'এই মাটিৰ pH শস্যৰ বাবে উপযোগী; পুষ্টি উপাদান সাধাৰণতে উপলব্ধ হ\'ব।',
  'ph.help.slightly-outside':
    'মাটি পৰীক্ষা অনুসৰি এক সৰু সংশোধন (যেন চূণ বা গন্ধক) পুষ্টিৰ উপলব্ধতা উন্নত কৰিব পাৰে।',
  'ph.help.significant-issue':
    'এই pH শস্যৰ সহনীয় সীমাৰ পৰা বহু বাহিৰে আছে আৰু সম্ভবত পুষ্টি গ্ৰহণ সীমিত কৰিছে। আপোনাৰ স্থানীয় কৃষি বিজ্ঞান কেন্দ্ৰ বা কৃষি প্ৰসাৰ বিষয়াৰ সৈতে সংশোধন পৰিকল্পনাৰ বিষয়ে কথা বাৰ্তা কৰক।',

  'disease.name.riceBlast': 'ধানৰ ব্লাষ্ট',
  'disease.name.riceBacterialLeafBlight': 'বেক্টেৰিয়াজনিত পাত পোৰা',
  'disease.name.wheatStripeRust': 'হালধীয়া মামৰ',
  'disease.name.wheatLeafRust': 'মটীয়া মামৰ',
  'disease.name.maizeTurcicumLeafBlight': 'টাৰচিকাম পাত পোৰা',
  'disease.name.maizeCommonRust': 'সাধাৰণ মামৰ',
  'disease.name.cottonAlternariaLeafSpot': 'অল্টাৰনেৰিয়া পাতৰ দাগ',
  'disease.name.cottonBacterialBlight': 'বেক্টেৰিয়াজনিত পোৰা ৰোগ',
  'disease.name.sugarcaneRedRot': 'ৰঙা পচন',
  'disease.name.sugarcaneRust': 'মামৰ',
  'disease.name.soybeanRust': 'সয়াবিন মামৰ',
  'disease.name.soybeanAnthracnose': 'এনথ্ৰেকনোজ',
  'disease.name.groundnutLateLeafSpot': 'পলম পাতৰ দাগ',
  'disease.name.groundnutRust': 'চিনাবাদাম মামৰ',
  'disease.name.lateBlight': 'পলম পোৰা ৰোগ',
  'disease.name.earlyBlight': 'সোনকালীয়া পোৰা ৰোগ',
  'disease.name.onionPurpleBlotch': 'বেঙুনীয়া দাগ',
  'disease.name.onionDownyMildew': 'ডাউনি মিলডিউ',

  'disease.where.riceBlast': 'পাত, তাৰ পিছত গাঁঠি আৰু থোকৰ ডিঙি',
  'disease.where.riceBacterialLeafBlight': 'পাতৰ আগ আৰু দাঁতি, প্ৰথমে ওপৰৰ পাত',
  'disease.where.wheatStripeRust': 'পাতৰ ওপৰ পিঠি, প্ৰথমে তলৰ পাত',
  'disease.where.wheatLeafRust': 'পাতৰ দুয়ো পিঠি',
  'disease.where.maizeTurcicumLeafBlight': 'প্ৰথমে তলৰ পাত, পিছত ওপৰলৈ',
  'disease.where.maizeCommonRust': 'পাতৰ দুয়ো পিঠি',
  'disease.where.cottonAlternariaLeafSpot': 'গুৰিৰ ফালৰ পুৰণি পাত',
  'disease.where.cottonBacterialBlight': 'পাত, ডাল আৰু বল',
  'disease.where.sugarcaneRedRot': 'সন্দেহজনক কুঁহিয়াৰ দীঘলকৈ ফালি ভিতৰত',
  'disease.where.sugarcaneRust': 'পাতৰ তলৰ পিঠি',
  'disease.where.soybeanRust': 'তলৰ পাতৰ তলৰ পিঠি',
  'disease.where.soybeanAnthracnose': 'ডাল আৰু শুঁটি',
  'disease.where.groundnutLateLeafSpot': 'পুৰণি পাতৰ তলৰ পিঠি',
  'disease.where.groundnutRust': 'পাতৰ তলৰ পিঠি',
  'disease.where.lateBlight': 'প্ৰথমে তলৰ পাত, পিছত ডাল আৰু শস্য',
  'disease.where.earlyBlight': 'প্ৰথমে আটাইতকৈ পুৰণি, তলৰ পাত',
  'disease.where.onionPurpleBlotch': 'পুৰণি পাত, আগৰ পৰা তললৈ',
  'disease.where.onionDownyMildew': 'পুৰণি পাত, ৰাতিপুৱা সোনকালে',

  'disease.what.riceBlast': 'মাকো-আকৃতিৰ দাগ, মাজত ধোঁৱাবৰণীয়া আৰু দাঁতি মটীয়া।',
  'disease.what.riceBacterialLeafBlight':
    'আগৰ পৰা আৰম্ভ হোৱা পানী-ভিজা হালধীয়া ৰেখা, শুকাই খেৰৰ ৰং হয়।',
  'disease.what.wheatStripeRust': 'শিৰাৰ মাজত শাৰী পাতি হালধীয়া-কমলা গুৰি ফোঁহা।',
  'disease.what.wheatLeafRust': 'সিঁচৰতি হৈ থকা কমলা-মটীয়া ঘূৰণীয়া ফোঁহা, শাৰী পাতি নহয়।',
  'disease.what.maizeTurcicumLeafBlight': 'দীঘল ধোঁৱাবৰণীয়া-সেউজীয়া চুৰুট-আকৃতিৰ দাগ।',
  'disease.what.maizeCommonRust': 'পাতজুৰি সিঁচৰতি সৰু দালচেনি-মটীয়া ফোঁহা।',
  'disease.what.cottonAlternariaLeafSpot': 'মটীয়া দাগত ঘূৰণীয়া বলয়, চাৰিওফালে পাতল বেৰ।',
  'disease.what.cottonBacterialBlight': 'চুকীয়া পানী-ভিজা দাগ ক’লা হৈ যায়, শিৰা ক’লাবৰণীয়া।',
  'disease.what.sugarcaneRedRot': 'ভিতৰৰ অংশ ৰঙা, মাজে মাজে বগা আঁৰ দাগ, টেঙা গোন্ধ।',
  'disease.what.sugarcaneRust': 'দীঘলীয়া কমলা-মটীয়া ফোঁহা।',
  'disease.what.soybeanRust': 'সৰু ওখ পাতল মটীয়া ফোঁহা, ঘঁহিলে গুৰি সৰে।',
  'disease.what.soybeanAnthracnose': 'গাঢ় অনিয়মীয়া দাগ, তাৰ ওপৰত সৰু ক’লা কাঁইট।',
  'disease.what.groundnutLateLeafSpot': 'হালধীয়া বেৰ নথকা গাঢ় দাগ, তলত ফোঁহা।',
  'disease.what.groundnutRust': 'কমলা ফোঁহা, ফাটি গুৰি ওলায়।',
  'disease.what.lateBlight': 'গাঢ় পানী-ভিজা দাগ, ৰাতিপুৱা তলফালে বগা কেঁচুৱাৰ বলয়।',
  'disease.what.earlyBlight': 'লক্ষ্যৰ দৰে ঘূৰণীয়া বলয়যুক্ত গাঢ় দাগ।',
  'disease.what.onionPurpleBlotch': 'সৰু বগা বহি যোৱা দাগ, বাঢ়ি বেঙুনীয়া-মটীয়া বলয়যুক্ত হয়।',
  'disease.what.onionDownyMildew': 'পাতল ডিম্বাকৃতিৰ দাগ, তাৰ ওপৰত বেঙুনীয়া-ধোঁৱাবৰণীয়া নোম।',

  // ফটো পৰীক্ষা (item 16) — কোনো ঔষধ নহয়, কোনো মাত্ৰা নহয়, কোনো ৰোগ নিৰ্ণয় নহয় (docs/12 §Product Boundaries)।
  'vision.title': 'পাতৰ ফটো পৰীক্ষা কৰক',
  'vision.onDevice': 'নেটৱৰ্ক নোহোৱাকৈ চলে',
  'vision.lede':
    'আক্ৰান্ত এখন পাতৰ ফটো লওক। পৰীক্ষা আপোনাৰ ফোনতে হয়, ফটো ক\'তো পঠোৱা নহয়।',
  'vision.choose': 'ফটো বাছনি কৰক বা লওক',
  'vision.firstUseHint':
    'প্ৰথম পৰীক্ষাত প্ৰায় ৯ MB ডাউনলোড হয়, গতিকে সম্ভৱ হ’লে ৱাই-ফাই ব্যৱহাৰ কৰক। তাৰ পিছত ই নেটৱৰ্ক নোহোৱাকৈ কাম কৰে।',
  'vision.working': 'ফটোখন চোৱা হৈ আছে…',
  'vision.again': 'আন এখন ফটো পৰীক্ষা কৰক',
  'vision.previewAlt': 'আপুনি বাছনি কৰা পাতৰ ফটো',
  'vision.healthyName': 'সুস্থ পাত',
  'vision.similarTo': 'এই পাতখন {name}-ৰ ফটোৰ দৰে দেখা যায় ({percent}% মিল)।',
  'vision.healthy': 'এই পাতখন সুস্থ পাতৰ দৰে দেখা যায় ({percent}% মিল)।',
  'vision.healthyCaveat':
    'ই কেৱল এই এখন পাতৰ বিষয়ে। আন গছবোৰো চাই থাকক, বিশেষকৈ তলৰ আৰু ভিতৰৰ পাতবোৰ।',
  'vision.unsure':
    'ফটোখনৰ মিল নিশ্চিতভাৱে কৰিব পৰা নগ\'ল, সেয়েহে কোনো ফলাফল দেখুওৱা হোৱা নাই। ইয়াত ভুল নামে আপোনাৰ শস্যৰ ক্ষতি কৰিব পাৰে।',
  'vision.retakeTips':
    'পুনৰ চেষ্টা কৰক — এখন পাত গোটেই ফ্ৰেমত, দিনৰ পোহৰত, সাধাৰণ পটভূমিত, কেমেৰা স্থিৰ ৰাখি।',
  'vision.unknownClass': 'এই ফটোৰ পৰা এনে ফলাফল আহিল যিটো এপে চিনি নাপায়।',
  'vision.otherPlant':
    'এইখন {plant}-ৰ পাত যেন লাগে, কিন্তু এই পথাৰখন {crop}-ৰ। যদি আপুনি সঁচাকৈ {crop}-ৰ ফটো লৈছে, তলৰ ফলাফল নিৰ্ভৰযোগ্য বুলি নাভাবিব।',
  'vision.otherPlantHealthy':
    'ফটোখন {plant}-ৰ এখন সুস্থ পাতৰ সৈতে মিলিছে, {crop}-ৰ সৈতে নহয়। ইয়াৰ পৰা আপোনাৰ {crop}-ৰ বিষয়ে কিছুই গম নাযায় — সাধাৰণতে ইয়াৰ অৰ্থ হ\'ল পাতখন চিনিবই পৰা নগ\'ল। {crop}-ৰ এখন পাত গোটেই ফ্ৰেমত ভৰাই পুনৰ চেষ্টা কৰক।',
  'vision.noHealthyClass':
    'ফটো পৰীক্ষাৰ হাতত {crop}-ৰ সুস্থ পাতৰ কোনো নমুনা নাই, সেয়েহে {crop}-ৰ বাবে ই সদায় নিজে জনা কোনো ৰোগৰ নাম কয় — পাত ভাল হ\'লেও। ইয়াক আৰু ভালকৈ চোৱাৰ কাৰণ বুলি ধৰক, ফলাফল বুলি নহয়।',
  'vision.cropNotCovered':
    'ফটো পৰীক্ষাটো {crop}-ৰ ওপৰত প্ৰশিক্ষিত নহয়। ই কেৱল {covered} জানে, সেয়েহে আন শস্যৰ ফলাফল বিশ্বাস কৰিব নোৱাৰি। ওপৰৰ ৰোগ নিৰীক্ষণ {crop}-ৰ বাবে কাম কৰি থাকে।',
  'vision.caveat':
    'ই আপোনাৰ ফটোখন প্ৰশিক্ষণৰ ফটোৰ সৈতে তুলনা কৰে। ই ৰোগ নিৰ্ণয় নহয়, আৰু পথাৰৰ প্ৰকৃত ফটোত ই পৰীক্ষাগাৰতকৈ বহু কম নিৰ্ভৰযোগ্য।',
  'vision.advice':
    'যিকোনো চিকিৎসা কৰাৰ আগতে নমুনা স্থানীয় কৃষি সম্প্ৰসাৰণ বিষয়া বা কৃষি বিজ্ঞান কেন্দ্ৰক দেখুৱাওক।',
  'vision.referenceTitle': 'প্ৰসংগ ফটো',
  'vision.referenceNote': 'কেৱল আকাৰ, ৰং আৰু বিন্যাস তুলনা কৰক। পথাৰত লক্ষণ বেলেগ দেখা যাব পাৰে।',
  'vision.referenceSingle': 'ইয়াৰ বাবে কেৱল এখন প্ৰসংগ ফটো উপলব্ধ।',
  'vision.referenceAlt': '{name} দেখুওৱা প্ৰসংগ ফটো {number}',
  'vision.referenceCredit': 'ছবি: {credits}',

  'vision.plant.Apple': 'আপেল',
  'vision.plant.Maize': 'মাকৈ',
  'vision.plant.PepperBell': 'কেপচিকাম',
  'vision.plant.Potato': 'আলু',
  'vision.plant.Rice': 'ধান',
  'vision.plant.Tomato': 'বিলাহী',

  'vision.name.appleScab': 'আপেল স্কেব',
  'vision.name.appleBlackRot': 'ক\'লা পচন',
  'vision.name.cedarAppleRust': 'চিডাৰ আপেল ৰাষ্ট',
  'vision.name.grayLeafSpot': 'ধোঁৱাবৰণীয়া পাত-দাগ',
  'vision.name.pepperBacterialSpot': 'বেক্টেৰিয়া দাগ',
  'vision.name.tomatoBacterialSpot': 'বেক্টেৰিয়া দাগ',
  'vision.name.tomatoLeafMould': 'পাতৰ ছত্ৰাক',
  'vision.name.septoriaLeafSpot': 'চেপ্টʼৰিয়া পাত-দাগ',
  'vision.name.spiderMites': 'দুই-দাগী মকৰা মাইটৰ ক্ষতি',
  'vision.name.targetSpot': 'টাৰ্গেট স্পট',
  'vision.name.tomatoYellowLeafCurlVirus': 'হালধীয়া পাত মেৰ খোৱা ভাইৰাছ',
  'vision.name.tomatoMosaicVirus': 'মʼজেইক ভাইৰাছ',
  'vision.name.riceBrownSpot': 'মটীয়া দাগ',
  'vision.name.riceLeafScald': 'পাত জ্বলা',
  'vision.name.riceSheathBlight': 'শীথ ব্লাইট',
  'vision.name.riceTungro': 'টুংগ্ৰো',

  'vision.error.modelUnavailable':
    'ফটো পৰীক্ষাটো ডাউনলোড কৰিব পৰা নগ\'ল। এবাৰ নেটৱৰ্কৰ সৈতে সংযোগ কৰি পুনৰ চেষ্টা কৰক।',
  'vision.error.runtimeUnavailable': 'এই ব্ৰাউজাৰে এই ডিভাইচত ফটো পৰীক্ষা চলাব নোৱাৰে।',
  'vision.error.imageUnreadable': 'সেই ফাইলটো ফটো হিচাপে পঢ়িব পৰা নগ\'ল। আনটো চেষ্টা কৰক।',
  'vision.error.inferenceFailed': 'এই ডিভাইচত ফটো পৰীক্ষা বিফল হ\'ল।',

  'settings.notifDenied': 'ব্ৰাউজাৰে জাননী বন্ধ কৰি ৰাখিছে। সোঁৱৰণী পাবলৈ ব্ৰাউজাৰৰ ছেটিংছত অনুমতি দিয়ক।',
  'settings.notifUnsupported': 'এই ডিভাইচত জাননী সমৰ্থিত নহয়।',

  'onb.skip': 'বাদ দিয়ক',
  'onb.feature.weather': 'বতৰ-ভিত্তিক পৰামৰ্শ',
  'onb.feature.offline': 'সম্পূৰ্ণ অফলাইনত কাম কৰে',
  'onb.feature.explain': 'প্ৰতিটো পৰামৰ্শৰ ব্যাখ্যা',
  'onb.feature.language': 'English, हिन्दी, বাংলা, অসমীয়া, اردو',

  'reminder.title': 'সোঁৱৰাই দিয়ক',
  'reminder.auto': 'স্বয়ংক্ৰিয়',
  'reminder.custom': 'নিজে বাছক',
  'reminder.add': 'যোগ কৰক',
  'reminder.remove': 'আঁতৰাওক',
  'reminder.timeLabel': 'সোঁৱৰণীৰ সময়',
  'reminder.tomorrowTag': 'কাইলৈ',
  'reminder.setForTomorrow': 'সেই সময় আজি পাৰ হৈ গ’ল — সোঁৱৰণী কাইলৈৰ বাবে নিৰ্ধাৰিত হৈছে।',
  'reminder.addError': 'সোঁৱৰণী যোগ কৰিব পৰা নগ’ল। পুনৰ চেষ্টা কৰক।',
  'reminder.note': 'এপটো খোলা থাকিলে বা পৰৱৰ্তী বাৰ খোলাৰ সময়ত সোঁৱৰণী পাব — অনলাইন বা অফলাইনত।',

  'water.title': 'পানীৰ তালিকা',
  'water.target': 'আজি দিবলগীয়া',
  'water.done': 'এতিয়ালৈ দিয়া',
  'water.remaining': 'এতিয়াও দিবলগীয়া',
  'water.nothingToday': 'আজি জলসিঞ্চনৰ প্ৰয়োজন নাই — শস্য আৰু বৰষুণে প্ৰয়োজন পূৰাইছে।',
  'water.logFull': 'জলসিঞ্চন সম্পূৰ্ণ বুলি চিহ্নিত কৰক',
  'water.logPart': '+{n} মিনিট',
  'water.undo': 'আজিৰটো বাতিল কৰক',
  'water.complete': 'আজিৰ পানী সম্পূৰ্ণ হৈছে',
  'water.progressLabel': 'আজিৰ পানীৰ {percent}% দিয়া হৈছে',
  'water.savedToday': 'আজি ৰাহি',
  'water.savedTotal': 'এতিয়ালৈ ৰাহি',
  'water.savedDays': '{days} দিনত',
  'water.savedDay': '১ দিনত',
  'water.savedFromRain': 'বৰষুণৰ পানী ব্যৱহাৰ কৰি',
  'water.savedFromMethod': 'আপোনাৰ জলসিঞ্চন পদ্ধতিৰ পৰা',
  'water.savedNote': 'সম্পূৰ্ণ শস্যৰ চাহিদাৰ বাবে পথাৰ বানপানীৰে বুৰাই আৰু বৰষুণ আওকাণ কৰাৰ তুলনাত।',

  // --- Farmer assistant (item 17) ---
  'assistant.open': 'প্ৰশ্ন সোধক',
  'assistant.fabLabel': 'সোধক',
  'assistant.title': 'আপোনাৰ পথাৰৰ বিষয়ে সোধক',
  'assistant.close': 'বন্ধ কৰক',
  'assistant.intro':
    'আজিৰ জলসিঞ্চনৰ বিষয়ে মোক সোধক — কিমান পানী, কেতিয়া দিব, বা কিয়। ইণ্টাৰনেট নোহোৱাকৈয়ে মই উত্তৰ দিব পাৰোঁ।',
  'assistant.placeholder': 'আপোনাৰ প্ৰশ্ন লিখক…',
  'assistant.listening': 'শুনি আছোঁ…',
  'assistant.speakNow': 'আপোনাৰ প্ৰশ্ন কওক',
  'assistant.stopListening': 'শুনা বন্ধ কৰক',
  'assistant.send': 'পঠিয়াওক',
  'assistant.thinking': 'ভাবি আছোঁ…',
  'assistant.readAloud': 'পঢ়ি শুনাওক',
  'assistant.sourceDevice': 'আপোনাৰ ফোনতে উত্তৰ',
  'assistant.sourceOnline': 'অনলাইনত উত্তৰ',
  'assistant.sourceUnavailable': 'ইণ্টাৰনেট লাগে',
  'assistant.note':
    'এই সহায়কে এপৰ পৰামৰ্শ বুজাই দিয়ে। ই কোনো ঔষধ, স্প্ৰে বা সাৰৰ পৰামৰ্শ দিব নোৱাৰে।',
  'assistant.voiceDenied':
    'মাইক্ৰোফোনৰ অনুমতি দিয়া হোৱা নাই। ব্ৰাউজাৰৰ ছেটিংত অনুমতি দিয়ক, বা প্ৰশ্নটো লিখক।',
  'assistant.voiceNoSpeech': 'মই কিবা শুনা নাপালোঁ। অনুগ্ৰহ কৰি আকৌ চেষ্টা কৰক।',
  'assistant.voiceLanguageUnsupported':
    'এই ব্ৰাউজাৰে আপোনাৰ বাছি লোৱা ভাষাত শুনিব নোৱাৰে। ছেটিংসত ইংৰাজীলে সলনি কৰক, বা আপোনাৰ প্ৰশ্নটো লিখক।',
  'assistant.voiceNetwork':
    'মাত বুঝিবলৈ ইণ্টাৰনেট সংযোগ লাগে, আৰু সেয়া এইমাত্ৰ গুচি গৈছে। অনুগ্ৰহ কৰি আপোনাৰ প্ৰশ্নটো লিখক, বা সংযোগ পুনৰ পালে মাইক্ৰোফোন আকৌ চেষ্টা কৰক।',
  'assistant.voiceError': 'এতিয়া মাত কাম কৰা নাই। অনুগ্ৰহ কৰি প্ৰশ্নটো লিখক।',
  'assistant.offlineFallback':
    'ইণ্টাৰনেট নোহোৱাকৈ সেইটোৰ উত্তৰ দিব নোৱাৰোঁ। আজিৰ পানীৰ পৰিমাণ, সময়, বৰষুণ বা মাটিৰ আদ্ৰতাৰ বিষয়ে সোধক — সেইবোৰ অফলাইনতে ক’ব পাৰোঁ।',

  'assistant.suggest.amount': 'আজি কিমান পানী দিম?',
  'assistant.suggest.timing': 'কেতিয়া জলসিঞ্চন কৰিম?',
  'assistant.suggest.why': 'এই পৰামৰ্শ কিয়?',
  'assistant.suggest.moisture': 'মোৰ মাটি কিমান শুকান?',
  'assistant.topic.today': 'আজি',
  'assistant.topic.irrigation': 'জলসিঞ্চন',
  'assistant.topic.soil': 'মাটি',
  'assistant.topic.weather': 'বতৰ',
  'assistant.topic.fertilizer': 'উৰ্বৰতা',
  'assistant.topic.disease': 'ৰোগৰ আশংকা',
  'assistant.topic.todayQuestion': 'আজি মই কি কৰিব লাগে?',
  'assistant.topic.irrigationQuestion': 'কেতিয়া আৰু কিমান পানী দিব লাগে?',
  'assistant.topic.soilQuestion': 'এতিয়া মোৰ মাটিৰ অৱস্থা কেনেকুৱা?',
  'assistant.topic.weatherQuestion': 'আজিৰ বতৰে মোৰ পথাৰত কেনে প্ৰভাৱ পেলাইছে?',
  'assistant.topic.fertilizerQuestion': 'মোৰ মাটিৰ উৰ্বৰতাৰ বিষয়ে কি জনা যায়?',
  'assistant.topic.diseaseQuestion': 'বতৰে কোনটো ৰোগৰ আশংকা বঢ়াইছে?',
  'assistant.briefing.today': '{farm}: {crop} আজিৰ পৰামৰ্শ হৈছে {status}।',
  'assistant.briefing.noRecommendation': 'এতিয়ালৈ কোনো পৰামৰ্শ নাই।',

  'assistant.rule.empty': 'অনুগ্ৰহ কৰি এটা প্ৰশ্ন লিখক বা কওক।',
  'assistant.rule.referral':
    'ঔষধ, স্প্ৰে বা মাত্ৰাৰ নাম মই ক’ব নোৱাৰোঁ — ভুল পৰামৰ্শত ধন আৰু শস্য দুয়োটাই যাব পাৰে। ৰোগৰ আশংকা থাকিলে আজিৰ পৰ্দাৰ “পাতৰ ফটো চাওক” কাৰ্ডত পাতৰ এখন ফটো তোলক, আৰু লক্ষণ দেখা প’লে সেই ফটোখন আপোনাৰ নিকটৱৰ্তী কৃষি বিজ্ঞান কেন্দ্ৰ বা বীজ-ঔষধৰ দোকানত দেখুৱাওক — তেওঁলোকে শস্য চাই ক’ব পাৰিব আৰু স্থানীয়ভাৱে কি অনুমোদিত সেয়া জানে। মই জলসিঞ্চনৰ সময়, পানীৰ পৰিমাণ, মাটিৰ pH ও উৰ্বৰতা, আৰু অন্তৰ্ভুক্ত শস্যৰ চৰকাৰী সাৰৰ অনুসূচিত পৰিমাণত সহায় কৰিব পাৰোঁ।',
  'assistant.rule.capability':
    'মই ক’ব পাৰোঁ আজি কিমান পানী দিব লাগে, কেতিয়া দিব লাগে, এপে কিয় এই পৰামৰ্শ দিছে, বতৰ আৰু বৰষুণ কেনে, আপোনাৰ মাটি কিমান শুকান, আপোনাৰ মাটিৰ pH ও উৰ্বৰতা, অন্তৰ্ভুক্ত শস্যৰ চৰকাৰী সাৰৰ অনুসূচি, আৰু আপুনি কিমান পানী ৰাহি কৰিছে। মই কোনো ঔষধ বা স্প্ৰেৰ নাম ক’ব নোৱাৰোঁ — কিন্তু ৰোগৰ আশংকাত ক’ব পাৰোঁ ক’ত চাব, লক্ষণ কেনেকুৱা দেখা যায়, আৰু পাতৰ ফটোৰ পৰীক্ষা কেনেকৈ চলাব।',
  'assistant.rule.greeting':
    'নমস্কাৰ। সোধক আজি কিমান পানী দিব, কেতিয়া জলসিঞ্চন কৰিব, বা এপে কিয় এই পৰামৰ্শ দিছে।',
  'assistant.rule.today': 'আজি পথাৰত এই কাম কৰক: {status}।',
  'assistant.rule.amount': 'আজি {mm} মিমি দিয়ক — আপোনাৰ পথাৰৰ বাবে প্ৰায় {litres} লিটাৰ।',
  'assistant.rule.amountRun': 'অৰ্থাৎ প্ৰায় {minutes} মিনিট চলাব লাগিব।',
  'assistant.rule.amountNone': 'আজি জলসিঞ্চনৰ প্ৰয়োজন নাই।',
  'assistant.rule.timing': '{start} ৰ পৰা {end} ৰ ভিতৰত জলসিঞ্চন কৰক।',
  'assistant.rule.timingWhy':
    'তেতিয়া পানী দিলে বাষ্প হৈ কম নষ্ট হয় আৰু দিনত পাত শুকাই যায়।',
  'assistant.rule.timingNone': 'আজি জলসিঞ্চনৰ কোনো সময় নাই, কাৰণ আজি জলসিঞ্চনৰ পৰামৰ্শ দিয়া হোৱা নাই।',
  'assistant.rule.confidence': 'এই পৰামৰ্শত আস্থা: {level}।',
  'assistant.rule.rain': 'আজি প্ৰায় {mm} মিমি বৰষুণৰ সম্ভাৱনা।',
  'assistant.rule.rainNone': 'আজি উল্লেখযোগ্য বৰষুণৰ সম্ভাৱনা নাই।',
  'assistant.rule.rainAdvice': 'সেয়া আজিৰ পৰামৰ্শত ইতিমধ্যে ধৰা আছে: {status}।',
  'assistant.rule.moisture':
    'এই মাটিয়ে ধৰি ৰাখিব পৰা {capacity} মিমিৰ তুলনাত আপোনাৰ শিপাৰ স্তৰ {short} মিমি কম।',
  'assistant.rule.moistureOk': '{threshold} মিমি পাৰ হ’লে শস্যত হেঁচা পৰিবলৈ আৰম্ভ কৰে, গতিকে এতিয়াও স্বাভাৱিক আছে।',
  'assistant.rule.moistureStress':
    'ই {threshold} মিমিৰ সীমা পাৰ কৰিছে, য’ৰ পিছত শস্যত হেঁচা পৰিবলৈ আৰম্ভ কৰে — সেয়েহে জলসিঞ্চনৰ পৰামৰ্শ।',
  'assistant.rule.disease': 'বতৰ এতিয়া {disease} ৰ বাবে {level}।',
  'assistant.rule.diseaseNone': 'এই শস্যৰ সাধাৰণ ৰোগৰ পক্ষে বতৰ এতিয়া অনুকূল নহয়।',
  'assistant.rule.diseaseCaveat':
    'এয়া কেৱল বতৰৰ কথা — মই আপোনাৰ শস্য দেখা নাই, গতিকে কোনো ৰোগ হৈছে বুলি ক’ব নোৱাৰোঁ।',
  'assistant.rule.diseaseScout': 'পথাৰত থাকিলে {where} চাওক — ৰাতিপুৱা, পাত শুকান থাকিলে সৰ্বোত্তম।',
  'assistant.rule.diseaseSigns': 'যি লক্ষণবোৰ বিচাৰিব: {what}',
  'assistant.rule.diseasePhoto':
    'নিশ্চিত নহয়? আজিৰ পৰ্দাৰ “পাতৰ ফটো চাওক” কাৰ্ডত পাতৰ ফটো তোলক — এপে সেয়া আপোনাৰ ফোনতে সাধাৰণ ৰোগৰ সৈতে মিলায়, ইণ্টাৰনেটৰ প্ৰয়োজন নাই।',
  'assistant.rule.diseaseNext':
    'এনে লক্ষণ পালে ফটোখন কৃষি বিজ্ঞান কেন্দ্ৰ বা বীজ-ঔষধৰ দোকানত দেখুৱাওক — তেওঁলোকে নিশ্চিত কৰি ক’ব যে আপোনাৰ শস্যৰ পৰ্যায়ত কি অনুমোদিত।',

  // --- Latest leaf-photo check (V2.2) ---
  'assistant.photo.match': 'ফটোখন {name}-ৰ ছবিৰ সৈতে মিল দেখা যায় ({percent}% সদৃশ)।',
  'assistant.photo.tentative': 'ফটোখন {name}-ৰ সৈতে কিছু পৰিমাণে মিলে ({percent}% সদৃশ)।',
  'assistant.photo.healthy': 'ফটোখন সুস্থ পাতৰ দৰে দেখা যায় ({percent}% সদৃশ)।',
  'assistant.photo.otherPlant': 'ফটোখন {plant}-ৰ পাতৰ দৰে দেখা যায়, আপোনাৰ {crop} নহয়।',
  'assistant.rule.photoAnswer': 'এয়া সাদৃশ্য, ৰোগনিৰ্ণয় নহয় — ৰোগ আছে বুলি এপে ক’ব নোৱাৰে।',
  'assistant.rule.photoNext': 'পাতত লক্ষণ দেখিলে নিশ্চিত কৰিবলৈ পাতখন (বা ফটো) কৃষি বিজ্ঞান কেন্দ্ৰ বা বীজ-ঔষধৰ দোকানলৈ লৈ যাওক।',
  'assistant.rule.photoNone': 'এতিয়ালৈ কোনো ফটোৰ পৰীক্ষা মোৰ হাতত নাই। আজিৰ পৰ্দাৰ “পাতৰ ফটো চাওক” কাৰ্ডত পাতৰ ফটো তোলক — এয়া আপোনাৰ ফোনতে চলে, ইণ্টাৰনেট নালাগে।',
  'assistant.rule.savedToday': 'আজি আপুনি প্ৰায় {litres} লিটাৰ ৰাহি কৰিছে।',
  'assistant.rule.savedTotal': 'আপোনাৰ লিপিবদ্ধ সকলো দিন মিলাই প্ৰায় {litres} লিটাৰ।',
  'assistant.rule.savedBasis':
    'এয়া মাপ কৰা হৈছে সম্পূৰ্ণ চাহিদাৰ বাবে পথাৰ বুৰাই আৰু পৰা বৰষুণ আওকাণ কৰাৰ তুলনাত।',
  'assistant.rule.plan': 'কাইলৈৰ পৰিকল্পনা: {status}।',
  'assistant.rule.planCaveat': 'এয়া পূৰ্বানুমানৰ ভিত্তিত, গতিকে বতৰ সলনি হ’লে সলনি হ’ব পাৰে।',
  'assistant.rule.weatherTemp': 'এতিয়া উষ্ণতা প্ৰায় {temp}°চে।',
  'assistant.rule.weatherHumidity': 'আদ্ৰতা প্ৰায় {humidity}%।',
  'assistant.rule.weatherRain': 'আজি প্ৰত্যাশিত বৰষুণ: {mm} মিমি।',

  'assistant.rule.ph': 'এপৰ হিচাপত আপোনাৰ ওপৰৰ মাটিৰ pH {ph}।',
  'assistant.rule.phEstimate':
    'এইটো 250 মিটাৰ মাটিৰ মানচিত্ৰৰ পৰা পোৱা আপোনাৰ অঞ্চলৰ এটা অনুমান — আপোনাৰ খেতিৰ পৰীক্ষা নহয়। নিজৰ মাটিৰ মান পাবলৈ স্থানীয় কেন্দ্ৰত মৃত্তিকা স্বাস্থ্য কাৰ্ডৰ পৰীক্ষা কৰাওক।',
  'assistant.rule.phMeasured': 'এই মানটো আপোনাৰ নিজৰ খেতিৰ পৰীক্ষাৰ পৰা আহিছে।',
  'assistant.rule.phUnknown':
    'এই খেতীৰ বাবে মাটিৰ pH মোৰ হাতত নাই। এপে যিটো দেখুৱায় সেইটোও 250 মিটাৰ মাটিৰ মানচিত্ৰৰ পৰা আপোনাৰ অঞ্চলৰ অনুমান, আপোনাৰ খেতিৰ পৰীক্ষা নহয় — নিজৰ মাটিৰ মান পাবলৈ স্থানীয় কেন্দ্ৰত মৃত্তিকা স্বাস্থ্য কাৰ্ডৰ পৰীক্ষা কৰাব লাগিব।',
  'assistant.rule.phSuitability':
    'আপোনাৰ শস্যৰ বাবে pH {min}ৰ পৰা {max} উপযোগী, গতিকে ইয়াৰ অৰ্থ: {verdict}।',
  'assistant.rule.phAdvice':
    'কিমান চুন, জিপচাম বা আন কোনো সংশোধক দিব লাগে সেয়া মই ক’ব নোৱাৰোঁ — তাৰ বাবে মাটি পৰীক্ষা আৰু আপোনাৰ স্থানীয় কৃষি বিজ্ঞান কেন্দ্ৰৰ পৰামৰ্শ লাগিব।',
  'assistant.rule.fertilityUnknown':
    'এই খেতিৰ বাবে উৰ্বৰতাৰ কোনো অনুমান মোৰ হাতত নাই। এপে যিটো pH বা জৈৱ কাৰ্বনৰ মান দেখুৱায় সেয়াও আপোনাৰ অঞ্চলৰ অনুমান, মাটি পৰীক্ষা নহয় — নিজৰ মাটিৰ মান পাবলৈ স্থানীয় কেন্দ্ৰত মৃত্তিকা স্বাস্থ্য কাৰ্ডৰ পৰীক্ষা কৰাব লাগিব, আৰু আপোনাৰ কৃষি বিজ্ঞান কেন্দ্ৰয়ে তাৰ পৰা সাৰৰ পৰিকল্পনা কৰি দিব পাৰিব।',
  'assistant.rule.fertilityNoEstimate':
    'এই খেতিৰ বাবে এতিয়াও মাটিৰ pH বা জৈৱ কাৰ্বনৰ কোনো অনুমান নাই।',
  'assistant.rule.fertilityReading':
    'এই খেতীৰ বাবে আপোনাৰ নিজৰ মৃত্তিকা স্বাস্থ্য কাৰ্ড ৰিডিং: N {n}, P₂O₅ {p}, K₂O {k} কিলোগ্ৰাম/হেক্টৰ — সামগ্ৰিক উৰ্বৰতা: {band}।',
  'assistant.rule.fertilityAdvice':
    'সাৰ, ইউৰিয়া, চুন, জিপচাম বা আন কোনো সংশোধকৰ সঠিক পৰিমাণ মই ক’ব নোৱাৰোঁ — তাৰ বাবে মাটি পৰীক্ষা লাগিব। অনুগ্ৰহ কৰি মাটি বা পাতৰ নমুনা আপোনাৰ নিকটৱৰ্তী কৃষি বিজ্ঞান কেন্দ্ৰ বা কৃষি প্ৰসাৰ বিষয়াক দেখুৱাওক; তেওঁলোকে আপোনাৰ খেতিৰ বাবে সঠিক পৰিমাণ ক’ব পাৰিব।',
  'assistant.rule.testInterpreted': 'আপুনি দিয়া মাটি পৰীক্ষাৰ ফল মই পঢ়িলোঁ: pH {ph}, জৈৱ কাৰ্বন {oc}%, আৰু {values}। এইবোৰ খেতিৰ পৰীক্ষাৰ মান, সেয়ে এই খেতিৰ বাবে অঞ্চলৰ মানচিত্ৰৰ অনুমানতকৈ অধিক উপযোগী।',
  'assistant.rule.testLow': 'কম পুষ্টি: {nutrients}। ইয়াৰ বাবে শস্যৰ বৃদ্ধি সীমিত হ’ব পাৰে; শস্যৰ পৰ্যায় অনুসৰি সাৰৰ পৰিকল্পনাত ইয়াক অগ্ৰাধিকাৰ দিয়ক।',
  'assistant.rule.testNoLow': 'দিয়া N, P₂O₅ আৰু K₂O মানত কোনো কম ফল পোৱা নগ’ল।',
  'assistant.rule.testHigh': 'বেছি পুষ্টি: {nutrients}। শস্য পৰিকল্পনা আৰু পৰৱৰ্তী পৰীক্ষাই সমৰ্থন নকৰালৈকে এইবোৰ আৰু নিদিব।',
  'assistant.rule.testNextSteps': 'এতিয়া Fertilizer অংশত শস্য আৰু মাটিৰ অঞ্চল বাছক, শস্যৰ পৰ্যায় অনুসৰি ভাগ কৰি প্ৰয়োগ কৰক, আৰু স্থানীয় সূচীৰ সৈতে পৰিমাণ মিলাওক। মই ফল বুজাই দিব পাৰোঁ, কিন্তু পৰিমাণ অনুমান নকৰোঁ।',
  'assistant.rule.testPrompt': 'হয় — দুটা উপায়। ইয়াত মানবোৰ এইদৰে পঠিয়াওক: pH 6.2, organic carbon 0.8%, N 240, P 12, K 150 kg/ha — মই প্ৰতিটো মান শ্ৰেণীবদ্ধ কৰি বুজাই দিম। নহ’লে Fertilizer টেব খোলক, শস্য আৰু মাটিৰ অঞ্চল বাছক, মাটি-পৰীক্ষা বিকল্প টেপ কৰক, কাৰ্ডৰ সংখ্যাবোৰ লিখক আৰু “ৰিডিং সাঁচক” টেপ কৰক — এপে সেয়া আপোনাৰ পথাৰত সাঁচি থ’ব, চৰকাৰী মাত্ৰা সেই অনুসৰি দেখুৱাব, আৰু পৰৱৰ্তী বাৰৰ বাবেও মনত ৰাখিব।',
  'assistant.rule.phAmendAcidic':
    'এই শস্যৰ সীমালৈ pH বঢ়াবলৈ এই মাটিত সাধাৰণ প্ৰতিকাৰ চুন বা ডলোমাইট — পৰিমাণ জানিবলৈ মাটি পৰীক্ষা আৰু আপোনাৰ কৃষি বিজ্ঞান কেন্দ্ৰৰ পৰামৰ্শ দৰকাৰ।',
  'assistant.rule.phAmendAlkaline':
    'এই শস্যৰ সীমালৈ pH কমাবলৈ এই মাটিত সাধাৰণ প্ৰতিকাৰ জিপচাম — পৰিমাণ জানিবলৈ মাটি পৰীক্ষা আৰু আপোনাৰ কৃষি বিজ্ঞান কেন্দ্ৰৰ পৰামৰ্শ দৰকাৰ।',
  'assistant.rule.phAlts': 'এই pH-ত এপৰ তথ্য অনুসৰি আটাইতকৈ উপযোগী শস্য: {crops}।',
  'assistant.rule.fertScheduleQuote':
    'ৰাজ্য অনুসূচি অনুসৰি, {zone} অঞ্চলৰ {variety}-ৰ বাবে, {band} উৰ্বৰতাৰ মাটিত: {npk}।',
  'assistant.rule.fertScheduleMore':
    'এই অনুসূচিৰ গোবৰ সাৰ, মাটি-সংশোধন আৰু ভাগ কৰি প্ৰয়োগৰ নিৰ্দেশ Fertilizer টেবত চাওক।',
  'assistant.rule.fertScheduleNote':
    'চূড়ান্ত পৰিকল্পনা আপোনাৰ কৃষি বিজ্ঞান কেন্দ্ৰত নিশ্চিত কৰক — তেওঁলোকে আপোনাৰ পথাৰৰ ইতিহাস অনুসৰি সলনি কৰিব পাৰিব।',
  'assistant.rule.soilType': 'আপুনি এই খেতিৰ মাটি {soil} বুলি লিখিছে।',
  'assistant.rule.soilCarbon':
    'মাটিৰ মানচিত্ৰ অনুসৰি আপোনাৰ ওপৰৰ মাটিত প্ৰায় {oc}% জৈৱ কাৰ্বন আছে।',
  'assistant.rule.soilMapCaveat':
    'কাৰ্বনৰ এই মান 250 মিটাৰ অঞ্চলৰ অনুমান, আপোনাৰ খেতিৰ পৰীক্ষা নহয়।',

  // --- Fertilizer recommendation ---
  'fert.title': 'সাৰৰ পৰামৰ্শ',
  'fert.selectPrompt': 'পৰামৰ্শ চাবলে শস্য, অঞ্চল আৰু উৰ্বৰতা স্তৰ বাছি লওক।',
  'fert.noCropSelected': 'আৰম্ভ কৰিবলে এটা শস্য বাছি লওক।',
  'fert.cropNotCovered':
    'এই সঁজুলিত এতিয়াও {crop}ৰ বাবে সাৰৰ সূচী নাই। ই এতিয়া ধান, ঘেঁহু, মাকৈ, কপাহ, আলু আৰু বাদাম আওতাত লয়।',
  'fert.noZoneEntry': 'উৎস সূচীত এই প্ৰজাতিৰ বাবে {zone} মাটি অঞ্চলৰ কোনো পৰামৰ্শ নাই।',
  'fert.zone.Hill': 'পাহাৰীয়া',
  'fert.zone.Terai': 'তৰাই',
  'fert.zone.GangeticAlluvium': 'গাঙ্গেয় পলিমাটি',
  'fert.zone.VindhyaAlluviumRedLateritic': 'বিন্ধ্য পলিমাটি, ৰঙা আৰু লেটেৰাইট',
  'fert.zone.Coastal': 'উপকূলীয়',
  'fert.fertility.Low': 'কম',
  'fert.fertility.Medium': 'মধ্যম',
  'fert.fertility.High': 'অধিক',
  'fert.districts': 'এই অঞ্চলৰ জিলা',
  'fert.npkN': 'নাইট্ৰোজেন (N)',
  'fert.npkP': 'ফছফৰাছ (P₂O₅)',
  'fert.npkK': 'পটাশ (K₂O)',
  'fert.kgHaShort': 'কিলোগ্ৰাম/হেক্টৰ',
  'fert.noNpk': 'উৎস সূচীত এই অঞ্চল আৰু উৰ্বৰতা স্তৰৰ বাবে কোনো NPK পৰিমাণ দিয়া নাই।',
  'fert.ameliorantTitle': 'মাটি সংশোধক',
  'fert.manureTitle': 'সাৰ / জৈব-সাৰ',
  'fert.sulphurTitle': 'গন্ধক',
  'fert.micronutrientsTitle': 'অণুপুষ্টি',
  'fert.remarksTitle': 'প্ৰয়োগৰ সময়',
  'fert.tableNoteTitle': 'এই শস্যৰ বাবে সাধাৰণ টোকা',
  'fert.disclaimer':
    'এইটো এটা সাধাৰণ জিলা-স্তৰীয় সূচী, আপোনাৰ নিজৰ পথাৰৰ পৰীক্ষা নহয়। আপোনাৰ প্ৰকৃত মাটি পৰীক্ষাৰ ফলাফল সদায় ইয়াতকৈ অধিক গুৰুত্ব পাব। জলসিঞ্চন আৰু সাৰ প্ৰয়োগৰ সময়ৰ বাহিৰে অন্য কিবা — পোক-পতংগ, ৰোগ, বা মাটি পৰীক্ষাৰ সৈতে মিল নথকা সূচী — এই বাবে অনুগ্ৰহ কৰি আপোনাৰ স্থানীয় কৃষি বিজ্ঞান কেন্দ্ৰ বা কৃষি প্ৰসাৰ বিষয়াক সোধক।',
  'fert.sourceCredit': 'উৎস: ৰাজ্য কৃষি বিভাগৰ মাটি-পৰীক্ষা আধাৰিত সাৰ পৰামৰ্শ সূচী।',
  'fert.prefillFromFarm': '{farm}ৰ পৰা পূৰ কৰা হৈছে — বেলেগ পৰামৰ্শ চাবলে যিকোনো ক্ষেত্ৰ সলনি কৰক।',
  'fert.moreInfo': 'অধিক তথ্য',
  'fert.stepCrop': '১. আপোনাৰ শস্য',
  'fert.stepVariety': '২. বতৰ / প্ৰজাতি',
  'fert.stepZone': '৩. আপোনাৰ মাটিৰ অঞ্চল',
  'fert.stepFertility': '৪. মাটিৰ উৰ্বৰতা',
  'fert.fertilityModeNumbers': 'মোৰ মাটি-পৰীক্ষাৰ সংখ্যা আছে',
  'fert.fertilityModeSimple': 'মই নিশ্চিত নহয়',
  'fert.kgHaPlaceholder': 'কিলোগ্ৰাম/হেক্টৰ',
  'fert.npkInputHint': 'আপোনাৰ সয়েল হেল্থ কাৰ্ড বা লেব ৰিপোর্টৰ পৰা, কিলোগ্ৰাম/হেক্টৰত।',
  'fert.npkIncomplete': 'পৰামৰ্শ চাবলে তিনিটা সংখ্যা (N, P, K) লিখক।',
  'fert.classifiedAs': 'আপোনাৰ মাটিৰ উৰ্বৰতা: {level}',
  'fert.saveReading': 'এই খেতীৰ বাবে এই তথ্য সংৰক্ষণ কৰক',
  'fert.readingSaved': 'সংৰক্ষিত হ\'ল',
  'fert.phFromFarm': 'এই খেতীৰ মাটিৰ pH {ph} (এই শস্যৰ বাবে উপযোগী: {min}-{max}) — {verdict}।',

  // --- Farm improvement plan (PRD §15) ---
  'improve.title': 'আপুনি কি উন্নত কৰিব পাৰে',
  'improve.subtitle':
    'আটাইতকৈ দৰকাৰী কথা প্ৰথমে। এপৰ হাতত পকা আধাৰ নাথাকিলে ইয়াত কিছুৱেই নেদেখুৱায়।',
  'improve.none': 'আজি মন দিব লগা কোনো কথা নাই',
  'improve.noneHint': 'এই খেতিৰ নথিত এতিয়া আপুনি মন দিব লগা এনে কিছু নাই।',
  'improve.moreCount': 'আৰু {count}টা',
  'improve.actions': 'আপুনি কি কৰিব পাৰে',
  'improve.severity.HIGH': 'দৰকাৰী',
  'improve.severity.MEDIUM': 'চাই লোৱা ভাল',
  'improve.severity.LOW': 'সৰু কথা',
  'improve.disclaimer':
    'ইয়াৰ কিছু কথা নক্সা আৰু বতৰৰ পূৰ্বানুমানৰ ওপৰত থিয় হৈ আছে, আপোনাৰ খেতিৰ পৰীক্ষাৰ ওপৰত নহয়। প্ৰতিটো কথাৰ লগত লিখা আছে সেইটো কিহৰ ওপৰত ভিত্তি কৰি।',
  'improve.ph.title': 'মাটিৰ pH {crop}ৰ বাবে উপযোগী নহ’ব পাৰে',
  'improve.ph.explain':
    'মাটিৰ নক্সা অনুসৰি ইয়াত ওপৰৰ মাটিৰ pH প্ৰায় {ph}, আৰু {crop}ৰ বাবে {min}ৰ পৰা {max} আটাইতকৈ ভাল। এই হিচাপ 250 মিটাৰ নক্সাৰ ঘৰৰ, আপোনাৰ খেতিৰ পৰীক্ষা নহয় — সেয়েহে ইয়াক ফলাফল বুলি নধৰি পৰীক্ষা কৰাৰ কাৰণ বুলি ধৰক।',
  'improve.ph.actionTest':
    'নিকটৱৰ্তী কৃষি বিজ্ঞান কেন্দ্ৰত মৃত্তিকা স্বাস্থ্য কাৰ্ডৰ পৰীক্ষা কৰাওক, তেতিয়াহে আপোনাৰ খেতিৰ নিজৰ pH জনা যাব।',
  'improve.ph.actionKvk':
    'কিমান চুন, জিপচাম বা গন্ধক দিব লাগিব সেয়া এই এপে ক’ব নোৱাৰে। পৰীক্ষাৰ ফল লৈ আপোনাৰ কৃষি বিস্তাৰ বিষয়াৰ লগত কথা পাতক।',
  'improve.texture.title': 'মাটিৰ নক্সাই এই খেতিক বেলেগ ধৰণে দেখিছে',
  'improve.texture.explain':
    'আপুনি {yours} লিখিছে। এই ঠাইৰ মাটিৰ নক্সাই ইয়াক {theirs}ৰ দৰে দেখিছে। এপে আপোনাৰ কথাই মানে আৰু সেয়াই ঠিক — আপুনি এই খেতিত থিয় দিছে, নক্সাই দিয়া নাই। তথাপি পানীৰ হিচাপ ইয়াৰেই ওপৰত তৈয়াৰ, সেয়েহে এবাৰ নিশ্চিত হৈ লোৱা ভাল।',
  'improve.texture.action':
    'অলপ তিতা মাটি আঙুলিত ঘঁহি চাওক। {yours}ৰ দৰে নালাগিলে খেতিৰ বিৱৰণত মাটিৰ ধৰণ সলনি কৰি দিয়ক।',
  'improve.soilProfile.title': 'এই খেতিৰ বাবে মাটিৰ নক্সাৰ তথ্য নাই',
  'improve.soilProfile.explain':
    'এই ঠাইৰ বাবে নক্সাৰ কোনো পাঠ জমা হৈ নাই, সেয়েহে এপে {soil}ৰ সাধাৰণ হিচাপ ব্যৱহাৰ কৰি আছে। পানীৰ হিচাপ কাম কৰি থাকিব, কিন্তু সেয়া সাধাৰণভাৱে {soil}ৰ, বিশেষকৈ আপোনাৰ খেতিৰ নহয়।',
  'improve.soilProfile.action':
    'ইণ্টাৰনেট থকা সময়ত খেতিৰ বিৱৰণ খোলক, তেতিয়া এপে এই ঠাইৰ মাটিৰ নক্সা আনি দিব।',
  'improve.soilWater.title': 'পানীৰ হিচাপ {soil}ৰ সাধাৰণ মানলৈ ঘূৰি গৈছে',
  'improve.soilWater.explain':
    'এই খেতিৰ বাবে নক্সাৰ তথ্য আছে, কিন্তু সেয়া আপোনাৰ শস্যৰ শিপা পৰ্যন্ত নাপায়, সেয়েহে এপে {soil}ৰ সাধাৰণ হিচাপ ল’লে। কম গভীৰতাৰ পাঠক গোটেই শিপাৰ গভীৰতালৈ টনা মানে অনুমানক মাপ কৰি তোলা।',
  'improve.soilWater.action':
    'আপোনাৰ খেতিত কোনো গোলমাল নাই। ইণ্টাৰনেট থকা সময়ত খেতিৰ বিৱৰণ খোলক, মাটিৰ তথ্য নতুন হৈ যাব।',
  'improve.slopeMethod.title': 'হেলনীয়া মাটিত {method} জলসিঞ্চন',
  'improve.slopeMethod.explain':
    'উচ্চতাৰ নক্সা অনুসৰি ইয়াত প্ৰায় {slope}% হেলনীয়া, আৰু {method} জলসিঞ্চনত পানী মাটিৰ ওপৰেদি বৈ যায়, সেয়েহে কিছু পানী শুহি লোৱাৰ আগতেই তললৈ বাগৰি যায়। এই নক্সা মটা ধৰণৰ আৰু সমতল মাটিতো প্ৰায়ে হেলনীয়া দেখুৱায়, সেয়েহে নিজৰ চকুৰেও চাই লওক।',
  'improve.slopeMethod.actionShorter':
    'খেতিত সঁচাকৈ হেলনীয়া থাকিলে হেলনীয়াৰ আঁৰে-বাঢ়ে সৰু সৰু ভাগত পানী দিয়ক, হেলনীয়া বাগৰি তললৈ নহয়।',
  'improve.slopeMethod.actionAsk':
    'এই খেতিত বান্ধ বা কনটুৰ কৰাৰ বিষয়ে আপোনাৰ কৃষি বিজ্ঞান কেন্দ্ৰত সোধক।',
  'improve.retentionMethod.title': 'সোনকালে পানী এৰি দিয়া মাটিত {method} জলসিঞ্চন',
  'improve.retentionMethod.explain':
    'আপুনি {soil} লিখিছে, যিয়ে পানী কম ধৰি ৰাখে। এই মাটিয়ে যিমান পানী শুহিব পাৰে তাৰ চেয়ে জোৰে পানী দিলে সেয়া শিপাৰ তললৈ গুচি যায় — সেয়েহে এবাৰতে দীঘল জলসিঞ্চনত শস্যৰ কামৰ চেয়ে বেছি পানী নষ্ট হয়।',
  'improve.retentionMethod.actionSplit':
    'একেই পৰিমাণৰ পানী এবাৰতে দীঘল জলসিঞ্চনৰ সলনি অলপ অলপ কৰি বেছি বাৰ দিয়ক।',
  'improve.retentionMethod.actionAsk':
    'এই মাটিত জৈৱ পদাৰ্থ বঢ়োৱাৰ বিষয়ে, আৰু আপোনাৰ শস্য আৰু খৰচৰ হিচাপত ড্ৰিপ ঠিক হ’ব নে নহয়, কৃষি বিজ্ঞান কেন্দ্ৰত সোধক।',
  'improve.disease.title': 'বতৰ {disease}ৰ অনুকূল',
  'improve.disease.explain':
    'যোৱা আৰু অহা দিনৰ বতৰ এই শস্যত {disease}ৰ অনুকূল। এইটো বতৰৰ কথা, আপোনাৰ গছৰ কথা নহয় — এপে আপোনাৰ শস্য দেখা নাই আৰু ক’ব নোৱাৰে যে কোনো ৰোগ লাগিছে।',
  'improve.disease.actionLook': 'খেতিত ঘূৰি পাত মন দি চাওক, প্ৰথমে তলৰ পাতবোৰ।',
  'improve.disease.actionPhoto':
    'কোনো পাতত দাগ দেখিলে ডেশব’ৰ্ডত পাতৰ ফটো পৰীক্ষা ব্যৱহাৰ কৰক।',
  'improve.disease.actionKvk':
    'যি দেখিব সেয়া আপোনাৰ কৃষি বিজ্ঞান কেন্দ্ৰ বা কৃষি বিস্তাৰ বিষয়াক দেখুৱাব। এই এপে কোনো শস্য-সুৰক্ষা সামগ্ৰীৰ নাম নকয় আৰু পৰিমাণ নকয়।',
  'improve.weatherData.titleMissing': 'আজিৰ পৰামৰ্শ বতৰৰ অবিহনে তৈয়াৰ হৈছে',
  'improve.weatherData.titleCached': 'আজিৰ পৰামৰ্শ জমা কৰি ৰখা বতৰত তৈয়াৰ',
  'improve.weatherData.explainMissing':
    'বতৰ পোৱা নগ’ল, সেয়েহে আজিৰ হিচাপ কেৱল আপোনাৰ মাটি, শস্য আৰু জলসিঞ্চনৰ নথিৰ ওপৰত থিয় হৈ আছে। বৰষুণ আৰু গৰম ইয়াত ধৰা নাই।',
  'improve.weatherData.explainCached':
    'এই সময়ত বতৰ পোৱা নগ’ল, সেয়েহে এপে শেষবাৰ জমা কৰি ৰখা হিচাপ ব্যৱহাৰ কৰিলে। আজিৰ বৰষুণ আৰু গৰম তাৰ পৰা বেলেগ হ’ব পাৰে।',
  'improve.weatherData.action':
    'ইণ্টাৰনেট আহিলে এপ পুনৰ খোলক, নতুন বতৰেৰে পৰামৰ্শ আকৌ হিচাপ হৈ যাব।',
  'improve.fertTable.title': '{crop}ৰ বাবে সাৰৰ তালিকা নাই',
  'improve.fertTable.explain':
    'এপত ৰাজ্যৰ সাৰৰ তালিকা ছয়টা শস্যৰ বাবে আছে আৰু {crop} তাৰ ভিতৰত নাই। এই খালী ঠাই কোনো অনুমানৰ পৰিমাণেৰে পূৰ কৰা নহ’ব।',
  'improve.fertTable.action':
    '{crop}ৰ সাৰৰ তালিকা আপোনাৰ কৃষি বিজ্ঞান কেন্দ্ৰ বা কৃষি বিস্তাৰ বিষয়াক সোধক, আৰু মাটি পৰীক্ষাৰ ফল লগত লৈ যাওক।',
};

const ur: Record<TranslationKey, string> = {
  ...en,
  'app.loading': 'لوڈ ہو رہا ہے…',
  'app.initErrorTitle': 'ایپ کا ڈیٹا نہیں کھل سکا',
  'app.initErrorBody': 'براہ کرم IrrigaSmart کے دوسرے تمام ٹیب بند کر کے یہ صفحہ دوبارہ لوڈ کریں۔ آپ کے محفوظ کھیت محفوظ ہیں۔',
  'app.reload': 'دوبارہ لوڈ کریں',
  'app.offlineBanner': 'آپ آف لائن ہیں۔ محفوظ شدہ ڈیٹا دکھایا جا رہا ہے — سفارشات آخری موسم کی معلومات استعمال کرتی ہیں۔',
  'nav.today': 'آج',
  'nav.farms': 'کھیت',
  'nav.history': 'تاریخچہ',
  'nav.fertilizer': 'کھاد',
  'nav.settings': 'ترتیبات',
  'dashboard.greeting': 'السلام علیکم، {name}',
  'dashboard.addFirstFarm': 'آج کی آبپاشی کی سفارش دیکھنے کے لیے اپنا پہلا کھیت شامل کریں۔',
  'dashboard.addFarm': 'کھیت شامل کریں',
  'dashboard.checking': 'آج کے حالات دیکھے جا رہے ہیں…',
  'dashboard.errorGeneric': 'سفارش بناتے وقت کچھ غلط ہو گیا۔',
  'dashboard.errorMissing': 'اس کھیت کی کچھ معلومات موجود نہیں۔ براہ کرم ترمیم کر کے دوبارہ کوشش کریں۔',
  'dashboard.errorTabs': 'IrrigaSmart دوسرے ٹیب میں کھلا ہے۔ اسے بند کر کے تازہ کریں۔',
  'dashboard.refresh': 'تازہ کریں',
  'dashboard.noteNoWeather': 'ابھی موسم کی معلومات دستیاب نہیں۔ موسم پر مبنی مشورے کے لیے ایک بار انٹرنیٹ سے جڑیں۔',
  'dashboard.noteCached': 'موسم کی سروس تک رسائی نہیں ہو سکی۔ آپ کی تازہ ترین محفوظ موسم کی معلومات استعمال ہو رہی ہے۔',
  'farmcard.noRecToday': 'آج کی سفارش ابھی نہیں بنی — بنانے کے لیے ٹیپ کریں۔',
  'farmcard.lastWeather': 'موسم {time} کو اپ ڈیٹ ہوا',
  'farmcard.noWeather': 'ابھی موسم کی معلومات نہیں',
  'weather.cacheNote': 'تازہ ترین محفوظ موسم دکھایا جا رہا ہے — اپ ڈیٹ کے لیے انٹرنیٹ سے جڑیں۔',
  'weather.sunshine': 'دھوپ',
  'weather.dryingPoor': 'ابر آلود دن — پتے زیادہ دیر گیلے رہیں گے',
  'weather.dryingModerate': 'کچھ دھوپ — پتے آہستہ سوکھیں گے',
  'weather.dryingGood': 'چمکدار دن — پتے جلدی سوکھیں گے',
  'rec.ariaLabel': 'آج کی سفارش',
  'rec.confidenceBadge.high': 'زیادہ اعتماد',
  'rec.confidenceBadge.medium': 'درمیانہ اعتماد',
  'rec.confidenceBadge.low': 'کم اعتماد',
  'rec.help.high': 'تازہ موسم کی معلومات پر مبنی۔',
  'rec.help.medium': 'کچھ پرانی موسم کی معلومات پر مبنی۔',
  'rec.help.low': 'موسم کی معلومات محدود یا موجود نہیں — اسے ایک عمومی رہنما سمجھیں۔',
  'rec.minutes': '{n} منٹ',
  'rec.litersPerMin': '{n} لیٹر/منٹ',
  'rec.windowValue': '{start} – {end}',
  'rec.windowTomorrow': 'کل {start} – {end}',
  'rec.why.morning-default': 'صبح سویرے آبپاشی کرنے سے بخارات کی وجہ سے کم پانی ضائع ہوتا ہے۔',
  'rec.why.hot-season': 'گرمی کا موسم ہے — جلدی شروع کرنے سے مٹی میں زیادہ پانی رہتا ہے۔',
  'rec.why.hot-day': 'آج دن گرم ہے، اس لیے دھوپ تیز ہونے سے پہلے شروع کریں۔',
  'rec.why.windy': 'ہوا چھڑکاؤ کا پانی اڑا دیتی ہے — پرسکون صبح بہتر ہے۔',
  'rec.why.cool-season': 'سردیوں کی ٹھنڈی صبح — فصل کے لیے کچھ دیر سے شروع کرنا بہتر ہے۔',
  'rec.why.long-run': 'یہ آبپاشی طویل ہے، اس لیے دوپہر سے پہلے مکمل کرنے کے لیے جلدی شروع کریں۔',
  'rec.why.later-today': 'صبح کا وقت گزر چکا ہے، اس لیے اگلا ممکنہ وقت دکھایا گیا ہے۔',
  'rec.why.evening-slot': 'صبح کے لیے دیر ہو گئی — شام کی ٹھنڈک میں آبپاشی کریں۔',
  'rec.why.drying-window':
    'آج دھوپ کم ہے، اس لیے چھڑکاؤ کا پانی رات بھر پتوں پر رہے گا۔ کل صبح آبپاشی فصل کے لیے محفوظ ہے۔',
  'enum.status.Irrigate Today': 'آج آبپاشی کریں',
  'enum.status.Delay Irrigation': 'آبپاشی مؤخر کریں',
  'enum.status.Monitor Tomorrow': 'کل نگرانی کریں',
  'enum.crop.Rice': 'چاول',
  'enum.crop.Wheat': 'گندم',
  'enum.crop.Maize': 'مکئی',
  'enum.crop.Cotton': 'کپاس',
  'enum.crop.Sugarcane': 'گنا',
  'enum.crop.Soybean': 'سویا بین',
  'enum.crop.Groundnut': 'مونگ پھلی',
  'enum.crop.Tomato': 'ٹماٹر',
  'enum.crop.Potato': 'آلو',
  'enum.crop.Onion': 'پیاز',
  'enum.stage.Initial': 'ابتدائی',
  'enum.stage.Development': 'نشوونما',
  'enum.stage.Mid Season': 'درمیانی موسم',
  'enum.stage.Late Season': 'آخری موسم',
  'enum.soil.Sandy': 'ریتلی',
  'enum.soil.Sandy Loam': 'ریتلی دوامی',
  'enum.soil.Loamy': 'دوامی',
  'enum.soil.Silty Loam': 'گاد والی دوامی',
  'enum.soil.Clay Loam': 'چکنی دوامی',
  'enum.soil.Clay': 'چکنی',
  'enum.method.Drip': 'ڈرِپ',
  'enum.method.Sprinkler': 'اسپرنکلر',
  'enum.method.Furrow': 'نالیاں',
  'enum.method.Flood': 'سیلابی آبپاشی',
  'factors.title': 'اس سفارش کی وجہ',
  'factors.name.crop': 'فصل',
  'factors.name.growthStage': 'نشوونما کا مرحلہ',
  'factors.name.temperature': 'درجہ حرارت',
  'factors.name.rainfall': 'بارش',
  'factors.name.humidity': 'نمی',
  'factors.name.wind': 'ہوا',
  'factors.name.soil': 'مٹی کی قسم',
  'factors.name.irrigationMethod': 'آبپاشی کا طریقہ',
  'factors.influence.increases': 'ضرورت بڑھاتا ہے',
  'factors.influence.decreases': 'ضرورت کم کرتا ہے',
  'factors.influence.neutral': 'غیر جانب دار',
  'factors.legend': 'زیادہ ستارے = آج کے فیصلے پر زیادہ اثر',
  'factors.strength.strong': 'زیادہ اثر',
  'factors.strength.moderate': 'کچھ اثر',
  'factors.strength.weak': 'کم اثر',
  'factors.starsLabel': '3 میں سے {stars} ستارے — {strength}',
  'plan.title': 'آنے والے دنوں کا منصوبہ',
  'plan.today': 'آج',
  'plan.tomorrow': 'کل',
  'plan.rain': '{mm} ملی میٹر بارش',
  'plan.action.Irrigate Today': 'آبپاشی کریں',
  'plan.action.Delay Irrigation': 'بارش ضرورت پوری کرتی ہے',
  'plan.action.Monitor Tomorrow': 'نگرانی کریں',
  'plan.note.irrigate': '{day} کو آبپاشی کا منصوبہ بنائیں۔',
  'plan.note.rain': '{day} کو بارش فصل کی ضرورت پوری کر سکتی ہے۔',
  'plan.note.none': 'آنے والے دنوں میں آبپاشی متوقع نہیں۔',
  'farms.title': 'آپ کے کھیت',
  'farms.add': '+ کھیت شامل کریں',
  'farms.empty': 'ابھی کوئی کھیت نہیں۔ آبپاشی کی سفارش کے لیے اپنا پہلا کھیت شامل کریں۔',
  'farms.edit': 'ترمیم',
  'farms.delete': 'حذف کریں',
  'farms.confirm': 'تصدیق کریں',
  'form.titleAdd': 'کھیت شامل کریں',
  'form.titleEdit': 'کھیت میں ترمیم کریں',
  'form.name': 'کھیت کا نام',
  'form.locationName': 'مقام کا نام',
  'form.search': 'تلاش کریں',
  'form.crop': 'فصل',
  'form.growthStage': 'نشوونما کا مرحلہ',
  'form.soilType': 'مٹی کی قسم',
  'form.irrigationMethod': 'آبپاشی کا طریقہ',
  'form.cancel': 'منسوخ کریں',
  'form.save': 'کھیت محفوظ کریں',
  'history.title': 'ریکارڈ',
  'history.farmLabel': 'کھیت',
  'settings.title': 'ترتیبات',
  'settings.profile': 'پروفائل',
  'settings.yourName': 'آپ کا نام',
  'settings.saved': 'پروفائل محفوظ ہو گیا۔',
  'settings.preferences': 'ترجیحات',
  'settings.language': 'زبان',
  'settings.units': 'اکائیاں',
  'settings.notifications': 'آبپاشی کی یاد دہانیاں',
  'settings.about': 'مدد اور IrrigaSmart کے بارے میں',
  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',
  'lang.as': 'অসমীয়া',
  'lang.ur': 'اردو',
  'onb.welcome.title': 'IrrigaSmart میں خوش آمدید',
  'onb.welcome.start': 'شروع کریں',
  'onb.next': 'اگلا',
  'onb.back': 'پیچھے',
  'onb.skip': 'چھوڑیں',
  'onb.feature.language': 'English, हिन्दी, বাংলা, অসমীয়া, اردو',
  'reminder.title': 'یاد دلائیں',
  'reminder.add': 'شامل کریں',
  'reminder.remove': 'ہٹائیں',
  'water.title': 'پانی کی فہرست',
  'water.target': 'آج دینا ہے',
  'water.done': 'اب تک دیا گیا',
  'water.remaining': 'اب بھی دینا ہے',
  'water.undo': 'آج کا عمل واپس کریں',
  'water.complete': 'آج کا پانی مکمل ہے',
  'disease.title': 'بیماری کی نگرانی',
  'disease.level.None': 'کوئی خطرہ نہیں',
  'disease.level.Low': 'کم خطرہ',
  'disease.level.Moderate': 'درمیانہ خطرہ',
  'disease.level.High': 'زیادہ خطرہ',
  'disease.none': 'موسم اس وقت {crop} کی عام بیماریوں کے موافق نہیں ہے۔',
  'disease.headline': 'موسم {disease} کے موافق ہے۔',
  'disease.observed': 'مسلسل {days} دن سے حالات موافق رہے ہیں۔',
  'disease.observedOne': 'آج حالات موافق ہو گئے ہیں۔',
  'disease.forecast': 'مزید {days} دن موافق حالات کی توقع ہے۔',
  'disease.forecastOne': 'کل بھی موافق حالات جاری رہنے کی توقع ہے۔',
  'disease.overcast': 'ان دنوں زیادہ تر ابر آلود رہا — گیلے پتے زیادہ دیر گیلے رہتے ہیں، جس سے بیماری بڑھتی ہے۔',
  'disease.trigger': '{date} کو: {temp}، نمی {humidity}، بارش {rain}۔',
  'disease.inspectTitle': 'کیا دیکھیں',
  'disease.inspect': '{where} دیکھیں۔ {what}',
  'disease.advice':
    'یہ موسم کی تنبیہ ہے، بیماری کی تشخیص نہیں۔ یہ علامات ملیں تو کوئی دوا دینے سے پہلے اپنے مقامی زراعتی توسیعی افسر کو نمونہ دکھائیں۔',
  'disease.tipDry': 'دن کے آغاز میں آبپاشی سے پتے جلد سوکھتے ہیں، جس سے بیماری کا خطرہ کم ہوتا ہے۔',
  'disease.unavailable': 'روزانہ موسمی معلومات دستیاب نہیں، اس لیے بیماری کے خطرے کا اندازہ نہیں لگایا جا سکتا۔',

  'moisture.title': 'مٹی کی نمی',
  'moisture.unavailable':
    'روزانہ موسمی معلومات دستیاب نہیں، اس لیے مٹی کی نمی کا حساب نہیں دکھایا جا سکتا۔',
  'moisture.statusOk': 'جڑوں کے علاقے میں کافی پانی موجود ہے۔',
  'moisture.statusStress': 'کمی اُس حد تک پہنچ گئی ہے جہاں فصل پر دباؤ پڑتا ہے — آبپاشی کریں۔',
  'moisture.available': 'دستیاب پانی',
  'moisture.depletion': 'کمی',
  'moisture.capacity': 'کل صلاحیت',
  'moisture.rootDepth': 'جڑ کی گہرائی',
  'moisture.help':
    'پٹی جڑوں کے علاقے کی کل صلاحیت میں سے بچا ہوا پانی دکھاتی ہے۔ نشان وہ مقام ہے جہاں سے فصل پر دباؤ شروع ہوتا ہے۔',

  // The pH block was previously inherited from English through the `...en`
  // spread above, so an Urdu-reading farmer saw the reading — and, worse, would
  // have seen the "this is only an estimate" caveat — in a script they may not
  // read. A Guardrail-1 caveat that the farmer cannot read does not protect
  // them, so these are translated rather than inherited.
  'provenance.MEASURED': 'کھیت کی جانچ',
  'provenance.USER_PROVIDED': 'آپ نے بتایا',
  'provenance.REGIONAL_ESTIMATE': 'علاقے کا اندازہ',
  'provenance.FORECAST': 'پیش گوئی',
  'provenance.CALCULATED': 'حساب سے',
  'provenance.INFERRED': 'اندازہ لگایا گیا',
  'provenance.UNKNOWN': 'معلوم نہیں',

  'ph.title': 'مٹی کے pH کی موزونیت',
  'ph.unavailable': 'اس کھیت کے لیے ابھی مٹی کے pH کا اندازہ دستیاب نہیں، اس لیے موزونیت نہیں دکھائی جا سکتی۔',
  'ph.pending': 'اس کھیت کے لیے مٹی کا نقشہ پڑھا جا رہا ہے۔ اس میں ایک منٹ تک لگ سکتا ہے۔',
  'ph.unreachable':
    'مٹی کے نقشے تک پہنچ نہیں ہو سکی۔ اپنا انٹرنیٹ کنکشن دیکھیں — یہ خود بخود دوبارہ کوشش کرے گا۔',
  'ph.reading': 'مٹی کا اندازاً pH: {ph}',
  'ph.source':
    'یہ 250 میٹر کے مٹی کے نقشے سے لیا گیا اندازہ ہے، آپ کے کھیت کی جانچ نہیں۔ اپنے کھیت کا درست عدد مٹی صحت کارڈ کی جانچ سے ملے گا۔',
  'ph.optimalRange': '{crop} کے لیے موزوں: pH {min}-{max}',
  'ph.level.suitable': 'موزوں',
  'ph.level.slightly-outside': 'موزوں حد سے تھوڑا باہر',
  'ph.level.significant-issue': 'pH کا سنگین مسئلہ',
  'ph.help.suitable': 'یہ مٹی کا pH فصل کے لیے موزوں ہے؛ غذائی اجزاء عام طور پر دستیاب رہیں گے۔',
  'ph.help.slightly-outside':
    'مٹی کی جانچ کے مطابق ایک چھوٹی اصلاح (جیسے چونا یا گندھک) غذائی اجزاء کی دستیابی بہتر کر سکتی ہے۔',
  'ph.help.significant-issue':
    'یہ pH فصل کی برداشت کی حد سے بہت باہر ہے اور غذائی اجزاء کے جذب کو محدود کر سکتا ہے۔ اصلاح کے منصوبے کے لیے اپنے مقامی کرشی وگیان کیندر یا زراعت توسیع افسر سے رجوع کریں۔',

  'disease.name.riceBlast': 'دھان کا بلاسٹ',
  'disease.name.riceBacterialLeafBlight': 'بیکٹیریائی پتہ جھلساؤ',
  'disease.name.wheatStripeRust': 'پیلی کنگی',
  'disease.name.wheatLeafRust': 'بھوری کنگی',
  'disease.name.maizeTurcicumLeafBlight': 'ٹرسیکم پتہ جھلساؤ',
  'disease.name.maizeCommonRust': 'عام کنگی',
  'disease.name.cottonAlternariaLeafSpot': 'الٹرنیریا پتوں کے دھبے',
  'disease.name.cottonBacterialBlight': 'بیکٹیریائی جھلساؤ',
  'disease.name.sugarcaneRedRot': 'سرخ سڑن',
  'disease.name.sugarcaneRust': 'کنگی',
  'disease.name.soybeanRust': 'سویابین کنگی',
  'disease.name.soybeanAnthracnose': 'اینتھریکنوز',
  'disease.name.groundnutLateLeafSpot': 'تاخیری پتوں کے دھبے',
  'disease.name.groundnutRust': 'مونگ پھلی کنگی',
  'disease.name.lateBlight': 'تاخیری جھلساؤ',
  'disease.name.earlyBlight': 'ابتدائی جھلساؤ',
  'disease.name.onionPurpleBlotch': 'جامنی دھبے',
  'disease.name.onionDownyMildew': 'ڈاؤنی ملڈیو',

  'disease.where.riceBlast': 'پتے، پھر گانٹھیں اور بالی کی گردن',
  'disease.where.riceBacterialLeafBlight': 'پتوں کے سرے اور کنارے، پہلے اوپر والے پتے',
  'disease.where.wheatStripeRust': 'پتے کی اوپری سطح، پہلے نیچے والے پتے',
  'disease.where.wheatLeafRust': 'پتے کی دونوں سطحیں',
  'disease.where.maizeTurcicumLeafBlight': 'پہلے نیچے والے پتے، پھر اوپر کی طرف',
  'disease.where.maizeCommonRust': 'پتے کی دونوں سطحیں',
  'disease.where.cottonAlternariaLeafSpot': 'جڑ کے قریب پرانے پتے',
  'disease.where.cottonBacterialBlight': 'پتے، تنے اور ٹینڈے',
  'disease.where.sugarcaneRedRot': 'مشتبہ گنے کو لمبائی میں چیر کر اندر سے',
  'disease.where.sugarcaneRust': 'پتوں کی نچلی سطح',
  'disease.where.soybeanRust': 'نیچے والے پتوں کی نچلی سطح',
  'disease.where.soybeanAnthracnose': 'تنے اور پھلیاں',
  'disease.where.groundnutLateLeafSpot': 'پرانے پتوں کی نچلی سطح',
  'disease.where.groundnutRust': 'پتوں کی نچلی سطح',
  'disease.where.lateBlight': 'پہلے نیچے والے پتے، پھر تنے اور خود فصل',
  'disease.where.earlyBlight': 'سب سے پرانے، نیچے والے پتے پہلے',
  'disease.where.onionPurpleBlotch': 'پرانے پتے، سروں سے نیچے کی طرف',
  'disease.where.onionDownyMildew': 'پرانے پتے، صبح سویرے',

  'disease.what.riceBlast': 'تکلے جیسے دھبے، بیچ میں سرمئی اور کنارے بھورے۔',
  'disease.what.riceBacterialLeafBlight':
    'سروں سے شروع ہو کر پیلی سے سفید ہوتی لہریا دار دھاریاں۔',
  'disease.what.wheatStripeRust': 'پتے کی رگوں کے ساتھ لمبی قطاروں میں چمکدار پیلے آبلے۔',
  'disease.what.wheatLeafRust': 'بکھرے ہوئے نارنجی بھورے گول آبلے، دھاریوں میں نہیں۔',
  'disease.what.maizeTurcicumLeafBlight': 'لمبے سرمئی سبز، سگار جیسے دھبے۔',
  'disease.what.maizeCommonRust': 'پتے پر بکھرے چھوٹے دارچینی بھورے آبلے۔',
  'disease.what.cottonAlternariaLeafSpot':
    'بھورے دھبے جن میں دائرے بنے ہوتے ہیں، گرد پیلا حاشیہ۔',
  'disease.what.cottonBacterialBlight':
    'پانی جیسے کونیدار دھبے جو بعد میں کالے پڑ جاتے ہیں۔',
  'disease.what.sugarcaneRedRot':
    'اندر سے سرخ رنگ جس میں سفید عرضی دھاریاں، اور ترش بو۔',
  'disease.what.sugarcaneRust': 'لمبے نارنجی بھورے آبلے۔',
  'disease.what.soybeanRust': 'چھوٹے ابھرے ہوئے بادامی آبلے، رگڑنے پر سفوف جھڑتا ہے۔',
  'disease.what.soybeanAnthracnose': 'گہرے بے ترتیب دھبے جن پر باریک کالے کانٹے۔',
  'disease.what.groundnutLateLeafSpot':
    'گہرے بھورے سے کالے دھبے، نچلی سطح پر بغیر پیلے حاشیے کے۔',
  'disease.what.groundnutRust': 'نارنجی آبلے جو پھٹ کر سفوف چھوڑتے ہیں۔',
  'disease.what.lateBlight':
    'پانی جیسے گہرے سبز دھبے جو تیزی سے بھورے ہوتے ہیں، نم موسم میں نیچے سفید روئیں دار نشوونما۔',
  'disease.what.earlyBlight': 'گہرے دھبے جن میں نشانے کی طرح ہم مرکز دائرے۔',
  'disease.what.onionPurpleBlotch':
    'سفید مرکز والے چھوٹے دھبے جو بڑھ کر جامنی ہو جاتے ہیں۔',
  'disease.what.onionDownyMildew': 'ہلکے بیضوی دھبے جن پر بنفشی سرمئی روئیں دار نشوونما۔',

  // تصویری جانچ (item 16) — کوئی دوا نہیں، کوئی مقدار نہیں، کوئی تشخیص نہیں (docs/12 §Product Boundaries)۔
  'vision.title': 'پتے کی تصویر جانچیں',
  'vision.onDevice': 'نیٹ ورک کے بغیر چلتا ہے',
  'vision.lede':
    'متاثرہ ایک پتے کی تصویر لیں۔ جانچ آپ کے فون پر ہی ہوتی ہے، تصویر کہیں نہیں بھیجی جاتی۔',
  'vision.choose': 'تصویر چنیں یا لیں',
  'vision.firstUseHint':
    'پہلی جانچ میں تقریباً 9 MB ڈاؤن لوڈ ہوتا ہے، اس لیے ہو سکے تو وائی فائی استعمال کریں۔ اس کے بعد یہ نیٹ ورک کے بغیر کام کرتی ہے۔',
  'vision.working': 'تصویر دیکھی جا رہی ہے…',
  'vision.again': 'دوسری تصویر جانچیں',
  'vision.previewAlt': 'آپ کی چنی ہوئی پتے کی تصویر',
  'vision.healthyName': 'صحت مند پتہ',
  'vision.similarTo': 'یہ پتہ {name} کی تصویروں جیسا لگتا ہے ({percent}% مشابہت)۔',
  'vision.healthy': 'یہ پتہ صحت مند پتوں جیسا لگتا ہے ({percent}% مشابہت)۔',
  'vision.healthyCaveat':
    'یہ صرف اسی ایک پتے کے بارے میں ہے۔ دوسرے پودے بھی دیکھتے رہیں، خاص طور پر نیچے اور اندر کے پتے۔',
  'vision.unsure':
    'تصویر کا اعتماد کے ساتھ ملان نہ ہو سکا، اس لیے کوئی نتیجہ نہیں دکھایا گیا۔ یہاں غلط نام آپ کی فصل کو مہنگا پڑ سکتا ہے۔',
  'vision.retakeTips':
    'دوبارہ کوشش کریں — ایک پتہ پورے فریم میں، دن کی روشنی میں، سادہ پس منظر کے ساتھ، کیمرہ مستحکم رکھیں۔',
  'vision.unknownClass': 'اس تصویر سے ایسا نتیجہ آیا جسے ایپ نہیں پہچانتی۔',
  'vision.otherPlant':
    'یہ {plant} کا پتہ لگتا ہے، مگر یہ کھیت {crop} کا ہے۔ اگر آپ نے واقعی {crop} کی تصویر لی ہے تو نیچے کے نتیجے کو قابلِ بھروسہ نہ سمجھیں۔',
  'vision.otherPlantHealthy':
    'تصویر {plant} کے ایک صحت مند پتے سے ملی، {crop} سے نہیں۔ اس سے آپ کے {crop} کے بارے میں کچھ معلوم نہیں ہوتا — عام طور پر اس کا مطلب یہ ہے کہ پتہ پہچانا ہی نہیں گیا۔ {crop} کا ایک پتہ پورے فریم میں بھر کر دوبارہ کوشش کریں۔',
  'vision.noHealthyClass':
    'تصویری جانچ کے پاس {crop} کے صحت مند پتے کا کوئی نمونہ نہیں ہے، اس لیے {crop} کے لیے یہ ہمیشہ اپنی جانی ہوئی کسی بیماری کا نام بتاتی ہے — پتہ ٹھیک ہو تب بھی۔ اسے مزید غور سے دیکھنے کی وجہ سمجھیں، نتیجہ نہیں۔',
  'vision.cropNotCovered':
    'تصویری جانچ {crop} پر تربیت یافتہ نہیں ہے۔ یہ صرف {covered} جانتی ہے، اس لیے کسی اور فصل کا نتیجہ قابلِ بھروسہ نہیں۔ اوپر دی گئی بیماری کی نگرانی {crop} کے لیے کام کرتی رہتی ہے۔',
  'vision.caveat':
    'یہ آپ کی تصویر کا موازنہ تربیتی تصویروں سے کرتی ہے۔ یہ تشخیص نہیں ہے، اور کھیت کی اصل تصویروں پر یہ تجربہ گاہ کے مقابلے میں کہیں کم قابلِ بھروسہ ہے۔',
  'vision.advice':
    'کچھ بھی علاج کرنے سے پہلے نمونہ اپنے مقامی زرعی توسیعی افسر یا کرشی وگیان کیندر کو دکھائیں۔',
  'vision.referenceTitle': 'حوالہ جاتی تصاویر',
  'vision.referenceNote': 'صرف شکل، رنگ اور نقش کا موازنہ کریں۔ کھیت میں علامات مختلف لگ سکتی ہیں۔',
  'vision.referenceSingle': 'اس کے لیے صرف ایک حوالہ جاتی تصویر دستیاب ہے۔',
  'vision.referenceAlt': '{name} دکھانے والی حوالہ جاتی تصویر {number}',
  'vision.referenceCredit': 'تصویر: {credits}',

  'vision.plant.Apple': 'سیب',
  'vision.plant.Maize': 'مکئی',
  'vision.plant.PepperBell': 'شملہ مرچ',
  'vision.plant.Potato': 'آلو',
  'vision.plant.Rice': 'دھان',
  'vision.plant.Tomato': 'ٹماٹر',

  'vision.name.appleScab': 'سیب کا اسکیب',
  'vision.name.appleBlackRot': 'کالا گلاؤ',
  'vision.name.cedarAppleRust': 'سیڈر ایپل رسٹ',
  'vision.name.grayLeafSpot': 'سرمئی پتہ دھبہ',
  'vision.name.pepperBacterialSpot': 'جراثیمی دھبہ',
  'vision.name.tomatoBacterialSpot': 'جراثیمی دھبہ',
  'vision.name.tomatoLeafMould': 'پتے کی پھپھوند',
  'vision.name.septoriaLeafSpot': 'سیپٹوریا پتہ دھبہ',
  'vision.name.spiderMites': 'دو دھبوں والے مکڑی مائٹ کا نقصان',
  'vision.name.targetSpot': 'ٹارگٹ اسپاٹ',
  'vision.name.tomatoYellowLeafCurlVirus': 'زرد پتہ مروڑ وائرس',
  'vision.name.tomatoMosaicVirus': 'موزیک وائرس',
  'vision.name.riceBrownSpot': 'بھورا دھبہ',
  'vision.name.riceLeafScald': 'پتے کا جھلساؤ',
  'vision.name.riceSheathBlight': 'شیٹھ بلائٹ',
  'vision.name.riceTungro': 'ٹنگرو',

  'vision.error.modelUnavailable':
    'تصویری جانچ ڈاؤن لوڈ نہ ہو سکی۔ ایک بار نیٹ ورک سے جڑ کر دوبارہ کوشش کریں۔',
  'vision.error.runtimeUnavailable': 'یہ براؤزر اس ڈیوائس پر تصویری جانچ نہیں چلا سکتا۔',
  'vision.error.imageUnreadable': 'وہ فائل تصویر کے طور پر پڑھی نہ جا سکی۔ دوسری آزمائیں۔',
  'vision.error.inferenceFailed': 'اس ڈیوائس پر تصویری جانچ ناکام رہی۔',

  // --- Farmer assistant (item 17) ---
  'assistant.open': 'سوال پوچھیں',
  'assistant.fabLabel': 'پوچھیں',
  'assistant.title': 'اپنے کھیت کے بارے میں پوچھیں',
  'assistant.close': 'بند کریں',
  'assistant.intro':
    'آج کی سیرابی کے بارے میں مجھ سے پوچھیں — کتنا پانی، کب دینا ہے، یا کیوں۔ میں انٹرنیٹ کے بغیر بھی جواب دے سکتا ہوں۔',
  'assistant.placeholder': 'اپنا سوال لکھیں…',
  'assistant.listening': 'سن رہا ہوں…',
  'assistant.speakNow': 'اپنا سوال بولیں',
  'assistant.stopListening': 'سننا بند کریں',
  'assistant.send': 'بھیجیں',
  'assistant.thinking': 'سوچ رہا ہوں…',
  'assistant.readAloud': 'پڑھ کر سنائیں',
  'assistant.sourceDevice': 'آپ کے فون پر جواب',
  'assistant.sourceOnline': 'آن لائن جواب',
  'assistant.sourceUnavailable': 'انٹرنیٹ درکار',
  'assistant.note':
    'یہ معاون ایپ کی سفارش سمجھاتا ہے۔ یہ کسی دوا، اسپرے یا کھاد کا مشورہ نہیں دے سکتا۔',
  'assistant.voiceDenied':
    'مائیکروفون کی اجازت نہیں دی گئی۔ براؤزر کی ترتیبات میں اجازت دیں، یا اپنا سوال لکھیں۔',
  'assistant.voiceNoSpeech': 'مجھے کچھ سنائی نہیں دیا۔ براہ کرم دوبارہ کوشش کریں۔',
  'assistant.voiceLanguageUnsupported':
    'یہ براؤزر آپ کی منتخب کردہ زبان میں نہیں سن سکتا۔ سیٹنگز میں انگریزی پر تبدیل کریں، یا اپنا سوال لکھیں۔',
  'assistant.voiceNetwork':
    'آواز سمجھنے کے لیے انٹرنیٹ کنکشن ضروری ہے، اور وہ ابھی ختم ہو گیا۔ براہ کرم اپنا سوال لکھیں، یا کنکشن آنے پر مائیکروفون دوبارہ آزمائیں۔',
  'assistant.voiceError': 'اس وقت آواز کام نہیں کر رہی۔ براہ کرم اپنا سوال لکھیں۔',
  'assistant.offlineFallback':
    'انٹرنیٹ کے بغیر اس کا جواب نہیں دے سکتا۔ آج کے پانی کی مقدار، وقت، بارش یا مٹی کی نمی کے بارے میں پوچھیں — یہ آف لائن بھی بتا سکتا ہوں۔',

  'assistant.suggest.amount': 'آج کتنا پانی دوں؟',
  'assistant.suggest.timing': 'سیرابی کب کروں؟',
  'assistant.suggest.why': 'یہ مشورہ کیوں؟',
  'assistant.suggest.moisture': 'میری مٹی کتنی خشک ہے؟',
  'assistant.topic.today': 'آج',
  'assistant.topic.irrigation': 'سیرابی',
  'assistant.topic.soil': 'مٹی',
  'assistant.topic.weather': 'موسم',
  'assistant.topic.fertilizer': 'زرخیزی',
  'assistant.topic.disease': 'بیماری کا خطرہ',
  'assistant.topic.todayQuestion': 'مجھے آج کیا کرنا چاہیے؟',
  'assistant.topic.irrigationQuestion': 'مجھے کب اور کتنا پانی دینا چاہیے؟',
  'assistant.topic.soilQuestion': 'میری مٹی کی موجودہ حالت کیا ہے؟',
  'assistant.topic.weatherQuestion': 'آج کا موسم میرے کھیت کو کیسے متاثر کر رہا ہے؟',
  'assistant.topic.fertilizerQuestion': 'میری مٹی کی زرخیزی کے بارے میں کیا معلوم ہے؟',
  'assistant.topic.diseaseQuestion': 'موسم کس بیماری کے خطرے کو بڑھا رہا ہے؟',
  'assistant.briefing.today': '{farm}: {crop} آج کا مشورہ {status} ہے۔',
  'assistant.briefing.noRecommendation': 'ابھی کوئی سفارش دستیاب نہیں ہے۔',

  'assistant.rule.empty': 'براہ کرم کوئی سوال لکھیں یا بولیں۔',
  'assistant.rule.referral':
    'میں دوائی، اسپرے یا مقدار کا نام نہیں بتا سکتا — غلط مشورے سے پیسہ اور فصل دونوں ڈوب سکتے ہیں۔ بیماری کا شبہ ہو تو آج کی اسکرین کے “پتے کی تصویر دیکھیں” کارڈ میں پتے کی تصویر لیں، اور علامات نظر آئیں تو وہ تصویر اپنے مقامی کرشی وگیان کیندر یا بیج-دوائی کی دکان کو دکھائیں — وہ آپ کی فصل دیکھ سکتے ہیں اور جانتے ہیں کہ مقامی طور پر کیا منظور ہے۔ میں سیرابی کے وقت، پانی کی مقدار، مٹی کے pH اور زرخیزی، اور شامل فصلوں کی سرکاری کھاد کے شیڈول میں مدد کر سکتا ہوں۔',
  'assistant.rule.capability':
    'میں بتا سکتا ہوں آج کتنا پانی دینا ہے، کب دینا ہے، ایپ یہ مشورہ کیوں دے رہی ہے، موسم اور بارش کیسی ہے، آپ کی مٹی کتنی خشک ہے، مٹی کا pH اور زرخیزی، شامل فصلوں کی سرکاری کھاد کا شیڈول، اور آپ نے کتنا پانی بچایا ہے۔ میں کوئی دوائی یا اسپرے کا نام نہیں بتا سکتا — مگر بیماری کے شبے میں بتا سکتا ہوں کہ کہاں دیکھنا ہے، علاماتیں کیسی ہوتی ہیں، اور پتے کی تصویر کی جانچ کیسے چلانی ہے۔',
  'assistant.rule.greeting':
    'آداب۔ پوچھیں آج کتنا پانی دینا ہے، کب سیرابی کرنی ہے، یا ایپ یہ مشورہ کیوں دے رہی ہے۔',
  'assistant.rule.today': 'آج کھیت میں یہ کام کریں: {status}۔',
  'assistant.rule.amount': 'آج {mm} ملی میٹر دیں — آپ کے کھیت کے لیے تقریباً {litres} لیٹر۔',
  'assistant.rule.amountRun': 'یعنی تقریباً {minutes} منٹ چلانا ہوگا۔',
  'assistant.rule.amountNone': 'آج سیرابی کی ضرورت نہیں۔',
  'assistant.rule.timing': '{start} سے {end} کے درمیان سیرابی کریں۔',
  'assistant.rule.timingWhy':
    'اس وقت پانی دینے سے بخارات میں کم ضائع ہوتا ہے اور دن میں پتے خشک ہو جاتے ہیں۔',
  'assistant.rule.timingNone': 'آج سیرابی کا کوئی وقت نہیں، کیونکہ آج سیرابی کی سفارش نہیں کی گئی۔',
  'assistant.rule.confidence': 'اس مشورے میں اعتماد: {level}۔',
  'assistant.rule.rain': 'آج تقریباً {mm} ملی میٹر بارش کی توقع ہے۔',
  'assistant.rule.rainNone': 'آج کوئی خاص بارش متوقع نہیں۔',
  'assistant.rule.rainAdvice': 'یہ آج کے مشورے میں پہلے ہی شمار ہے: {status}۔',
  'assistant.rule.moisture':
    'یہ مٹی جو {capacity} ملی میٹر روک سکتی ہے، اس کے مقابلے آپ کی جڑ کی تہہ {short} ملی میٹر کم ہے۔',
  'assistant.rule.moistureOk': '{threshold} ملی میٹر کے بعد فصل پر دباؤ شروع ہوتا ہے، اس لیے ابھی ٹھیک ہے۔',
  'assistant.rule.moistureStress':
    'یہ {threshold} ملی میٹر کی حد سے گزر چکی ہے جہاں فصل پر دباؤ شروع ہوتا ہے — اسی لیے سیرابی کا مشورہ ہے۔',
  'assistant.rule.disease': 'موسم فی الحال {disease} کے لیے {level} ہے۔',
  'assistant.rule.diseaseNone': 'اس فصل کی عام بیماریوں کے لیے موسم فی الحال سازگار نہیں۔',
  'assistant.rule.diseaseCaveat':
    'یہ صرف موسم کی بات ہے — میں نے آپ کی فصل نہیں دیکھی اور نہیں کہہ سکتا کہ کوئی بیماری موجود ہے۔',
  'assistant.rule.diseaseScout': 'کھیت میں ہوں تو {where} دیکھیں — صبح، جب پتے خشک ہوں، سب سے بہتر ہے۔',
  'assistant.rule.diseaseSigns': 'جو علاماتیں ڈھونڈنی ہیں: {what}',
  'assistant.rule.diseasePhoto':
    'یقین نہیں؟ آج کی اسکرین کے “پتے کی تصویر دیکھیں” کارڈ میں پتے کی تصویر لیں — ایپ اسے آپ کے فون پر ہی عام بیماریوں سے ملاتی ہے، انٹرنیٹ کی ضرورت نہیں۔',
  'assistant.rule.diseaseNext':
    'اگر ایسی علامات ملیں تو تصویر کرشی وگیان کیندر یا بیج-دوائی کی دکان کو دکھائیں — وہ تصدیق کر کے بتائیں گے کہ آپ کی فصل کے مرحلے کے لیے کیا منظور ہے۔',

  // --- Latest leaf-photo check (V2.2) ---
  'assistant.photo.match': 'تصویر {name} کی تصویروں سے ملتی جلتی لگتی ہے ({percent}% مشابہ)۔',
  'assistant.photo.tentative': 'تصویر {name} سے کچھ ہی ملتی ہے ({percent}% مشابہ)۔',
  'assistant.photo.healthy': 'تصویر صحت مند پتے جیسی لگتی ہے ({percent}% مشابہ)۔',
  'assistant.photo.otherPlant': 'تصویر {plant} کے پتے جیسی لگتی ہے، آپ کی {crop} نہیں۔',
  'assistant.rule.photoAnswer': 'یہ مشابہت ہے، تشخیص نہیں — ایپ یہ نہیں کہہ سکتی کہ بیماری موجود ہے۔',
  'assistant.rule.photoNext': 'پتے پر علامات دکھیں تو تصدیق کے لیے پتا (یا تصویر) کرشی وگیان کیندر یا بیج-دوائی کی دکان لے جائیں۔',
  'assistant.rule.photoNone': 'ابھی کوئی تصویر کی جانچ میرے پاس نہیں۔ آج کی اسکرین کے “پتے کی تصویر دیکھیں” کارڈ میں پتے کی تصویر لیں — یہ آپ کے فون پر چلتی ہے، انٹرنیٹ نہیں چاہیے۔',
  'assistant.rule.savedToday': 'آج آپ نے تقریباً {litres} لیٹر بچائے۔',
  'assistant.rule.savedTotal': 'آپ کے درج تمام دنوں میں تقریباً {litres} لیٹر۔',
  'assistant.rule.savedBasis':
    'یہ پوری ضرورت کے لیے کھیت بھر دینے اور ہوئی بارش کو نظر انداز کرنے کے مقابلے میں ناپا گیا ہے۔',
  'assistant.rule.plan': 'کل کا منصوبہ: {status}۔',
  'assistant.rule.planCaveat': 'یہ پیشن گوئی پر مبنی ہے، اس لیے موسم بدلنے پر بدل سکتا ہے۔',
  'assistant.rule.weatherTemp': 'ابھی درجہ حرارت تقریباً {temp}°C ہے۔',
  'assistant.rule.weatherHumidity': 'نمی تقریباً {humidity}% ہے۔',
  'assistant.rule.weatherRain': 'آج متوقع بارش: {mm} ملی میٹر۔',

  'assistant.rule.ph': 'ایپ کے مطابق آپ کی اوپری مٹی کا pH {ph} ہے۔',
  'assistant.rule.phEstimate':
    'یہ 250 میٹر کے مٹی کے نقشے سے لیا گیا آپ کے علاقے کا اندازہ ہے — آپ کے کھیت کی جانچ نہیں۔ اپنے کھیت کا عدد قریبی مرکز پر مٹی صحت کارڈ کی جانچ سے ملے گا۔',
  'assistant.rule.phMeasured': 'یہ عدد آپ کے اپنے کھیت کی جانچ سے آیا ہے۔',
  'assistant.rule.phUnknown':
    'اس کھیت کے لیے میرے پاس مٹی کا pH نہیں ہے۔ ایپ جو عدد دکھاتا ہے وہ بھی 250 میٹر کے مٹی کے نقشے سے آپ کے علاقے کا اندازہ ہوتا ہے، آپ کے کھیت کی جانچ نہیں — اپنا عدد قریبی مرکز پر مٹی صحت کارڈ کی جانچ سے ہی ملے گا۔',
  'assistant.rule.phSuitability':
    'آپ کی فصل کے لیے pH {min} سے {max} موزوں ہے، اس لیے یہ اس طرح بنتا ہے: {verdict}۔',
  'assistant.rule.phAdvice':
    'کتنا چونا، جپسم یا کوئی اور اصلاحی چیز ڈالنی ہے، یہ میں نہیں بتا سکتا — اس کے لیے مٹی کی جانچ اور آپ کے مقامی کرشی وگیان کیندر کا مشورہ ضروری ہے۔',
  'assistant.rule.phAmendAcidic':
    'اس فصل کی حد تک pH بڑھانے کے لیے ان مٹیوں میں عام طریقہ چونا یا ڈولومائٹ ہے — مقدار کے لیے مٹی کی جانچ اور آپ کے کرشی وگیان کیندر کی رائے ضروری ہے۔',
  'assistant.rule.phAmendAlkaline':
    'اس فصل کی حد تک pH گھٹانے کے لیے ان مٹیوں میں عام طریقہ جپسم ہے — مقدار کے لیے مٹی کی جانچ اور آپ کے کرشی وگیان کیندر کی رائے ضروری ہے۔',
  'assistant.rule.phAlts': 'اس pH پر ایپ کے ڈیٹا کے مطابق سب سے موزوں فصلیں: {crops}۔',
  'assistant.rule.fertScheduleQuote':
    'ریاستی شیڈول کے مطابق، {zone} علاقے کی {variety} کے لیے، {band} زرخیزی کی مٹی پر: {npk}۔',
  'assistant.rule.fertScheduleMore':
    'اس شیڈول کی گوبر کھاد، مٹی اصلاح اور تقسیم کے اوقات Fertilizer ٹیب پر دیکھیں۔',
  'assistant.rule.fertScheduleNote':
    'حتمی منصوبہ اپنے کرشی وگیان کیندر سے تصدیق کریں — وہ آپ کے کھیت کے حساب سے اسے بدل سکتے ہیں۔',
  'assistant.rule.testInterpreted':
    'میں نے آپ کی دی ہوئی مٹی جانچ کے نتائج پڑھے: pH {ph}، نامیاتی کاربن {oc}%، اور {values}۔ یہ کھیت کی جانچ کے اعداد ہیں، اس لیے علاقے کے نقشے کے اندازے سے زیادہ مفید ہیں۔',
  'assistant.rule.testLow':
    'کم غذائیت والے: {nutrients}۔ اس سے فصل کی بڑوتری متاثر ہو سکتی ہے؛ کھاد کی یو جانی فصل کے مرحلے کے مطابق بنائیں۔',
  'assistant.rule.testNoLow': 'دیے گئے N، P₂O₅ اور K₂O میں کوئی کم نتیجہ نہیں ملا۔',
  'assistant.rule.testHigh':
    'زیادہ غذائیت والے: {nutrients}۔ فصل کی منصوبہ بندی اور اگلی جانچ کی حمایت کے بغیر ان میں اضافہ ن کریں۔',
  'assistant.rule.testNextSteps':
    'اب Fertilizer سیکشن میں اپنی فصل اور مٹی کا علاقہ چنیں، کھاد کو مراحل میں تقسیم کر کے دیں، اور مقامی شیڈول سے مقدار ملائیں۔ میں نتیجہ سمجھا سکتا ہوں، مگر مقدار کا اندازہ نہیں لگاؤں گا۔',
  'assistant.rule.testPrompt': 'جی ہاں — دو طریقے ہیں۔ یہاں اعداد اس طرح بھیجیں: pH 6.2, organic carbon 0.8%, N 240, P 12, K 150 kg/ha — میں ہر عدد کی درجہ بندی کر کے سمجھا دوں گا۔ یا Fertilizer ٹیب کھولیں، فصل اور مٹی کا علاقہ چنیں، مٹی جانچ کا آپشن ٹیپ کریں، کارڈ کے اعداد لکھیں اور “ریڈنگ محفوظ کریں” ٹیپ کریں — ایپ انہیں آپ کے کھیت پر محفوظ رکھے گی، سرکاری خوراک اسی کے مطابق دکھائے گی، اور اگلی بار بھی یاد رکھے گی۔',
  'assistant.rule.soilType': 'آپ نے اس کھیت کی مٹی {soil} درج کی ہے۔',
  'assistant.rule.soilCarbon':
    'مٹی کے نقشے کے مطابق آپ کی اوپری مٹی میں تقریباً {oc}% نامیاتی کاربن ہے۔',
  'assistant.rule.soilMapCaveat':
    'کاربن کا یہ عدد 250 میٹر علاقے کا اندازہ ہے، آپ کے کھیت کی جانچ نہیں۔',

  // --- Farm improvement plan (PRD §15) ---
  'improve.title': 'آپ کیا بہتر کر سکتے ہیں',
  'improve.subtitle': 'سب سے ضروری بات پہلے۔ جب تک ایپ کے پاس پکی بنیاد نہ ہو، یہاں کچھ نہیں دکھتا۔',
  'improve.none': 'آج توجہ دینے والی کوئی بات نہیں',
  'improve.noneHint': 'اس کھیت کے ریکارڈ میں ابھی ایسا کچھ نہیں جس پر آپ کو توجہ دینی پڑے۔',
  'improve.moreCount': '{count} مزید',
  'improve.actions': 'آپ کیا کر سکتے ہیں',
  'improve.severity.HIGH': 'ضروری',
  'improve.severity.MEDIUM': 'دیکھ لینا اچھا',
  'improve.severity.LOW': 'چھوٹی بات',
  'improve.disclaimer':
    'اس میں کچھ باتیں نقشوں اور موسم کے اندازے پر ٹکی ہیں، آپ کے کھیت کی جانچ پر نہیں۔ ہر بات کے ساتھ لکھا ہے کہ وہ کس بنیاد پر ہے۔',
  'improve.ph.title': 'مٹی کا pH {crop} کے لیے موزوں نہ ہو سکتا ہے',
  'improve.ph.explain':
    'مٹی کے نقشے کے مطابق یہاں اوپری مٹی کا pH تقریباً {ph} ہے، جبکہ {crop} کے لیے {min} سے {max} سب سے بہتر رہتا ہے۔ یہ اندازہ 250 میٹر کے نقشے کے خانے کا ہے، آپ کے کھیت کی جانچ نہیں — اس لیے اسے نتیجہ نہ سمجھیں، جانچ کرانے کی وجہ سمجھیں۔',
  'improve.ph.actionTest':
    'اپنے قریبی کرشی وگیان کیندر پر مٹی صحت کارڈ کی جانچ کرائیں، تبھی آپ کے کھیت کا اصل pH معلوم ہوگا۔',
  'improve.ph.actionKvk':
    'کتنا چونا، جپسم یا گندھک ڈالنا ہے، یہ ایپ نہیں بتا سکتا۔ جانچ کی رپورٹ لے کر اپنے زرعی توسیعی افسر سے پوچھیں۔',
  'improve.texture.title': 'مٹی کا نقشہ اس کھیت کو الگ بتاتا ہے',
  'improve.texture.explain':
    'آپ نے {yours} درج کیا ہے۔ اس جگہ کا مٹی کا نقشہ اسے {theirs} جیسا بتاتا ہے۔ ایپ آپ ہی کی بات مانتا ہے اور یہی ٹھیک ہے — آپ اس کھیت میں کھڑے ہوئے ہیں، نقشہ نہیں۔ لیکن پانی کے اعداد اسی پر بنے ہیں، اس لیے ایک بار پکا کر لینا اچھا ہے۔',
  'improve.texture.action':
    'تھوڑی گیلی مٹی انگلیوں میں مل کر دیکھیں۔ اگر وہ {yours} جیسی نہ لگے تو کھیت کی تفصیل میں مٹی بدل دیں۔',
  'improve.soilProfile.title': 'اس کھیت کے لیے مٹی کے نقشے کا ڈیٹا نہیں ہے',
  'improve.soilProfile.explain':
    'اس جگہ کے لیے نقشے کا کوئی عدد محفوظ نہیں ہے، اس لیے ایپ {soil} کے عام اعداد استعمال کر رہا ہے۔ پانی کے اعداد کام کرتے رہیں گے، مگر وہ عام طور پر {soil} کے ہیں، خاص آپ کے کھیت کے نہیں۔',
  'improve.soilProfile.action':
    'انٹرنیٹ ہوتے ہوئے کھیت کی تفصیل کھولیں، تب ایپ اس جگہ کے لیے مٹی کا نقشہ لے آئے گا۔',
  'improve.soilWater.title': 'پانی کے اعداد {soil} کے عام اعداد پر آ گئے',
  'improve.soilWater.explain':
    'اس کھیت کے لیے نقشے کا ڈیٹا ہے، مگر وہ آپ کی فصل کی جڑوں تک نہیں پہنچتا، اس لیے ایپ نے {soil} کے عام اعداد لے لیے۔ کم گہرائی کے عدد کو پوری جڑ کی گہرائی پر کھینچنا اندازے کو پیمائش بنا دیتا ہے۔',
  'improve.soilWater.action':
    'آپ کے کھیت میں کوئی خرابی نہیں ہے۔ انٹرنیٹ ہوتے ہوئے کھیت کی تفصیل کھولیں، مٹی کا ڈیٹا نیا ہو جائے گا۔',
  'improve.slopeMethod.title': 'ڈھلوان زمین پر {method} آبپاشی',
  'improve.slopeMethod.explain':
    'بلندی کے نقشے کے مطابق یہاں تقریباً {slope}% ڈھلوان ہے، اور {method} آبپاشی میں پانی زمین کی سطح پر بہتا ہے، اس لیے کچھ پانی جذب ہونے سے پہلے نیچے بہہ جاتا ہے۔ یہ نقشہ موٹا ہے اور ہموار زمین پر بھی اکثر ڈھلوان دکھا دیتا ہے، اس لیے اپنی آنکھوں سے بھی دیکھ لیں۔',
  'improve.slopeMethod.actionShorter':
    'اگر کھیت میں واقعی ڈھلوان ہے تو پانی ڈھلوان کے آڑے چھوٹی چھوٹی کیاریوں میں دیں، ڈھلوان کے ساتھ نیچے کی طرف نہیں۔',
  'improve.slopeMethod.actionAsk':
    'اس کھیت کے لیے بندی یا کنٹور بنانے کے بارے میں اپنے کرشی وگیان کیندر سے پوچھیں۔',
  'improve.retentionMethod.title': 'جلدی پانی چھوڑ دینے والی مٹی پر {method} آبپاشی',
  'improve.retentionMethod.explain':
    'آپ نے {soil} درج کیا ہے، جو پانی کم روکتی ہے۔ جتنا پانی یہ مٹی جذب کر سکتی ہے، اس سے تیز پانی دینے پر وہ جڑوں کے نیچے چلا جاتا ہے — اس لیے ایک بار میں لمبی آبپاشی میں فصل کے کام سے زیادہ پانی ضائع ہوتا ہے۔',
  'improve.retentionMethod.actionSplit':
    'اتنا ہی پانی ایک لمبی آبپاشی کے بجائے تھوڑا تھوڑا، زیادہ بار دیں۔',
  'improve.retentionMethod.actionAsk':
    'اس مٹی میں نامیاتی مادہ بڑھانے کے بارے میں، اور آپ کی فصل اور بجٹ کے حساب سے ڈرپ ٹھیک رہے گی یا نہیں، اپنے کرشی وگیان کیندر سے پوچھیں۔',
  'improve.disease.title': 'موسم {disease} کے موافق ہے',
  'improve.disease.explain':
    'پچھلے اور آنے والے دنوں کا موسم اس فصل میں {disease} کے لیے موافق ہے۔ یہ بات موسم کی ہے، آپ کے پودوں کی نہیں — ایپ نے آپ کی فصل دیکھی نہیں ہے اور یہ نہیں کہہ سکتا کہ کوئی بیماری لگی ہے۔',
  'improve.disease.actionLook': 'کھیت میں گھوم کر پتوں کو غور سے دیکھیں، پہلے نیچے کے پتے۔',
  'improve.disease.actionPhoto':
    'کسی پتے پر دھبے دکھیں تو ڈیش بورڈ پر پتے کی تصویر جانچ استعمال کریں۔',
  'improve.disease.actionKvk':
    'جو کچھ دکھے وہ اپنے کرشی وگیان کیندر یا زرعی توسیعی افسر کو دکھائیں۔ یہ ایپ کسی بھی فصل کی حفاظت کی مصنوعات کا نام نہیں بتاتا اور مقدار نہیں بتاتا۔',
  'improve.weatherData.titleMissing': 'آج کا مشورہ موسم کے بغیر بنا ہے',
  'improve.weatherData.titleCached': 'آج کا مشورہ محفوظ موسم پر بنا ہے',
  'improve.weatherData.explainMissing':
    'موسم نہیں مل سکا، اس لیے آج کے اعداد صرف آپ کی مٹی، فصل اور آبپاشی کے ریکارڈ پر ٹکے ہیں۔ بارش اور گرمی ان میں شامل نہیں ہیں۔',
  'improve.weatherData.explainCached':
    'اس وقت موسم نہیں مل سکا، اس لیے ایپ نے پچھلی بار محفوظ کیے ہوئے اعداد استعمال کیے۔ آج کی بارش اور گرمی ان سے مختلف ہو سکتی ہے۔',
  'improve.weatherData.action':
    'انٹرنیٹ آنے پر ایپ پھر کھولیں، مشورہ نئے موسم کے ساتھ دوبارہ بن جائے گا۔',
  'improve.fertTable.title': '{crop} کے لیے کھاد کا جدول نہیں ہے',
  'improve.fertTable.explain':
    'ایپ میں ریاست کا کھاد کا جدول چھ فصلوں کے لیے ہے اور {crop} ان میں نہیں ہے۔ یہ کمی کسی اندازے کی مقدار سے نہیں بھری جائے گی۔',
  'improve.fertTable.action':
    '{crop} کے لیے کھاد کا جدول اپنے کرشی وگیان کیندر یا زرعی توسیعی افسر سے پوچھیں، اور مٹی کی جانچ کی رپورٹ ساتھ لے جائیں۔',
};

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = { en, hi, bn, as, ur };
