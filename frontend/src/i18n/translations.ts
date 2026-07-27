import type { Language } from '../types';

/**
 * UI translations (docs/12_Product_Roadmap_v2.md Feature 2 — Multi-language
 * Support).
 *
 * A flat key-value map is deliberately used instead of an i18n library — the
 * string set is small and the Engineering Rules require proving a dependency
 * is necessary before adding one (docs/07_Engineering_Rules.md). The English
 * table defines the key set; Hindi and Bengali tables are typed against it so
 * a missing translation is a compile error. `{name}` placeholders are
 * interpolated by translate().
 */

const en = {
  'app.loading': 'Loading…',
  'app.offlineBanner':
    'You are offline. Showing saved data — recommendations use your last weather.',

  'nav.today': 'Today',
  'nav.farms': 'Farms',
  'nav.history': 'History',
  'nav.settings': 'Settings',

  'dashboard.greeting': 'Namaste, {name}',
  'dashboard.addFirstFarm': "Add your first farm to see today's irrigation recommendation.",
  'dashboard.addFarm': 'Add a farm',
  'dashboard.checking': "Checking today's conditions…",
  'dashboard.errorGeneric': 'Something went wrong generating your recommendation.',
  'dashboard.errorMissing': 'This farm is missing some details. Please edit it and try again.',
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

  'enum.status.Irrigate Today': 'Irrigate Today',
  'enum.status.Delay Irrigation': 'Delay Irrigation',
  'enum.status.Monitor Tomorrow': 'Monitor Tomorrow',

  'enum.crop.Rice': 'Rice',
  'enum.crop.Wheat': 'Wheat',
  'enum.crop.Maize': 'Maize',

  'enum.stage.Initial': 'Initial',
  'enum.stage.Development': 'Development',
  'enum.stage.Mid Season': 'Mid Season',
  'enum.stage.Late Season': 'Late Season',

  'enum.soil.Sandy': 'Sandy',
  'enum.soil.Loamy': 'Loamy',
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
  'settings.notifications': 'Notifications (future release)',
  'settings.cloudSync': 'Cloud sync (future release)',

  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',

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

  'settings.about': 'About IrrigaSmart',
} as const;

export type TranslationKey = keyof typeof en;

const hi: Record<TranslationKey, string> = {
  'app.loading': 'लोड हो रहा है…',
  'app.offlineBanner':
    'आप ऑफ़लाइन हैं। सहेजा गया डेटा दिख रहा है — सिफ़ारिशें आपके अंतिम मौसम पर आधारित हैं।',

  'nav.today': 'आज',
  'nav.farms': 'खेत',
  'nav.history': 'रिकॉर्ड',
  'nav.settings': 'सेटिंग्स',

  'dashboard.greeting': 'नमस्ते, {name}',
  'dashboard.addFirstFarm': 'आज की सिंचाई सिफ़ारिश देखने के लिए अपना पहला खेत जोड़ें।',
  'dashboard.addFarm': 'खेत जोड़ें',
  'dashboard.checking': 'आज के हालात जाँचे जा रहे हैं…',
  'dashboard.errorGeneric': 'सिफ़ारिश बनाते समय कुछ गड़बड़ हो गई।',
  'dashboard.errorMissing': 'इस खेत की कुछ जानकारी अधूरी है। कृपया उसे बदलकर फिर कोशिश करें।',
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

  'enum.status.Irrigate Today': 'आज सिंचाई करें',
  'enum.status.Delay Irrigation': 'सिंचाई टालें',
  'enum.status.Monitor Tomorrow': 'कल फिर जाँचें',

  'enum.crop.Rice': 'धान',
  'enum.crop.Wheat': 'गेहूं',
  'enum.crop.Maize': 'मक्का',

  'enum.stage.Initial': 'प्रारंभिक',
  'enum.stage.Development': 'विकास',
  'enum.stage.Mid Season': 'मध्य मौसम',
  'enum.stage.Late Season': 'अंतिम मौसम',

  'enum.soil.Sandy': 'रेतीली',
  'enum.soil.Loamy': 'दोमट',
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
  'settings.notifications': 'सूचनाएँ (आने वाले संस्करण में)',
  'settings.cloudSync': 'क्लाउड सिंक (आने वाले संस्करण में)',

  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',

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

  'settings.about': 'IrrigaSmart के बारे में',
};

const bn: Record<TranslationKey, string> = {
  'app.loading': 'লোড হচ্ছে…',
  'app.offlineBanner':
    'আপনি অফলাইনে আছেন। সংরক্ষিত তথ্য দেখানো হচ্ছে — সুপারিশগুলি আপনার শেষ আবহাওয়ার উপর ভিত্তি করে।',

  'nav.today': 'আজ',
  'nav.farms': 'জমি',
  'nav.history': 'রেকর্ড',
  'nav.settings': 'সেটিংস',

  'dashboard.greeting': 'নমস্কার, {name}',
  'dashboard.addFirstFarm': 'আজকের সেচ সুপারিশ দেখতে আপনার প্রথম জমি যোগ করুন।',
  'dashboard.addFarm': 'জমি যোগ করুন',
  'dashboard.checking': 'আজকের অবস্থা দেখা হচ্ছে…',
  'dashboard.errorGeneric': 'সুপারিশ তৈরি করতে সমস্যা হয়েছে।',
  'dashboard.errorMissing': 'এই জমির কিছু তথ্য অসম্পূর্ণ। অনুগ্রহ করে সম্পাদনা করে আবার চেষ্টা করুন।',
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

  'enum.status.Irrigate Today': 'আজ সেচ দিন',
  'enum.status.Delay Irrigation': 'সেচ পিছিয়ে দিন',
  'enum.status.Monitor Tomorrow': 'আগামীকাল দেখুন',

  'enum.crop.Rice': 'ধান',
  'enum.crop.Wheat': 'গম',
  'enum.crop.Maize': 'ভুট্টা',

  'enum.stage.Initial': 'প্রাথমিক',
  'enum.stage.Development': 'বৃদ্ধি',
  'enum.stage.Mid Season': 'মধ্য মৌসুম',
  'enum.stage.Late Season': 'শেষ মৌসুম',

  'enum.soil.Sandy': 'বালুকাময়',
  'enum.soil.Loamy': 'দোঁআশ',
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
  'settings.notifications': 'বিজ্ঞপ্তি (ভবিষ্যৎ সংস্করণে)',
  'settings.cloudSync': 'ক্লাউড সিংক (ভবিষ্যৎ সংস্করণে)',

  'lang.en': 'English',
  'lang.hi': 'हिन्दी',
  'lang.bn': 'বাংলা',

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

  'settings.about': 'IrrigaSmart সম্পর্কে',
};

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = { en, hi, bn };
