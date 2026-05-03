import type { AgeGroup } from "./age-groups";

export type TipCategory = "tip" | "health" | "activity" | "guidance";
export type TipLang = "en" | "hi";

export type TipEntry = {
  id: string;
  en: string;
  hi: string;
};

export const CATEGORY_META: Record<
  TipCategory,
  { emoji: string; label: { en: string; hi: string }; gradient: string; ring: string }
> = {
  tip:      { emoji: "💡", label: { en: "Today's Tip",     hi: "आज की सलाह"     }, gradient: "",  ring: "ring-primary"  },
  health:   { emoji: "🩺", label: { en: "Health Tip",       hi: "स्वास्थ्य सुझाव" }, gradient: "",  ring: "ring-primary" },
  activity: { emoji: "🎯", label: { en: "Activity",         hi: "गतिविधि"        }, gradient: "",      ring: "ring-primary"     },
  guidance: { emoji: "💗", label: { en: "Parent Guidance",  hi: "पेरेंट गाइडेंस"  }, gradient: "",     ring: "ring-primary"    },
};

export const PARENTING_TIPS: Record<AgeGroup, Record<TipCategory, TipEntry[]>> = {
  // ─── INFANT (0–1) ────────────────────────────────────────────
  infant: {
    tip: [
      { id: "i-t-1", en: "Keep baby's sleep routine consistent — same time, same lullaby every night.", hi: "बच्चे की नींद का समय रोज़ एक जैसा रखें — रोज़ वही लोरी सुनाएँ।" },
      { id: "i-t-2", en: "Use a soft voice when talking before sleep — your tone calms baby's brain.",  hi: "सोने से पहले धीमी आवाज़ में बात करें — आपकी आवाज़ बच्चे को शांत करती है।" },
      { id: "i-t-3", en: "Respond to every cry within 1 minute — it builds deep trust.",               hi: "हर रोने पर 1 मिनट में जवाब दें — इससे गहरा भरोसा बनता है।" },
      { id: "i-t-4", en: "Skin-to-skin contact for 15 minutes daily boosts bonding hormones.",          hi: "रोज़ 15 मिनट त्वचा से त्वचा का स्पर्श बॉन्डिंग बढ़ाता है।" },
      { id: "i-t-5", en: "Talk to your baby constantly — narrate what you're doing.",                   hi: "बच्चे से लगातार बातें करें — आप जो कर रहे हैं वो बताएँ।" },
      { id: "i-t-6", en: "Dim lights 30 minutes before bedtime to signal sleep time.",                  hi: "सोने से 30 मिनट पहले रोशनी कम करें — यह नींद का संकेत है।" },
      { id: "i-t-7", en: "Avoid screens completely under 18 months — eyes still developing.",           hi: "18 महीने तक स्क्रीन बिल्कुल न दिखाएँ — आँखें विकसित हो रही हैं।" },
      { id: "i-t-8", en: "Sing the same lullaby every night — repetition gives security.",              hi: "हर रात वही लोरी गाएँ — दोहराव सुरक्षा देता है।" },
    ],
    health: [
      { id: "i-h-1", en: "Burp baby for 5 minutes after every feed to prevent gas.",                    hi: "हर फीड के बाद 5 मिनट डकार दिलाएँ — गैस नहीं बनेगी।" },
      { id: "i-h-2", en: "Check vaccination calendar this month — never skip a due date.",              hi: "इस महीने का टीकाकरण कैलेंडर देखें — कोई तारीख़ न छूटे।" },
      { id: "i-h-3", en: "Sterilize bottles in boiling water for 5 minutes daily.",                     hi: "बोतलें रोज़ 5 मिनट उबलते पानी में स्टरलाइज़ करें।" },
      { id: "i-h-4", en: "Tummy time 3 times a day strengthens neck and back muscles.",                 hi: "दिन में 3 बार पेट के बल लिटाएँ — गर्दन और कमर मज़बूत होगी।" },
      { id: "i-h-5", en: "Watch for normal poop color — yellow or mustard is healthy.",                  hi: "नॉर्मल पॉटी का रंग देखें — पीला या सरसों जैसा सही है।" },
      { id: "i-h-6", en: "Massage baby with warm oil 20 minutes before bath — boosts circulation.",     hi: "नहलाने से 20 मिनट पहले गर्म तेल से मालिश करें — रक्त संचार बढ़ता है।" },
      { id: "i-h-7", en: "Keep room temperature 24–26°C — neither too hot nor too cold.",               hi: "कमरे का तापमान 24–26°C रखें — न ज़्यादा गर्म न ठंडा।" },
    ],
    activity: [
      { id: "i-a-1", en: "Show a colorful toy and slowly move it side to side — eye tracking.",         hi: "रंगीन खिलौना दिखाकर धीरे से दाएँ-बाएँ घुमाएँ — आँखों की ट्रैकिंग।" },
      { id: "i-a-2", en: "Play peek-a-boo for 5 minutes — teaches object permanence.",                  hi: "5 मिनट लुका-छिपी खेलें — चीज़ें मौजूद रहना सीखेगा।" },
      { id: "i-a-3", en: "Read a board book aloud — even if baby just looks at pictures.",              hi: "बोर्ड बुक ज़ोर से पढ़ें — भले ही बच्चा सिर्फ़ तस्वीरें देखे।" },
      { id: "i-a-4", en: "Place a small mirror in front — babies love seeing faces.",                   hi: "सामने छोटा शीशा रखें — बच्चों को चेहरे देखना बहुत पसंद है।" },
      { id: "i-a-5", en: "Make different facial expressions — baby will try to copy you.",              hi: "अलग-अलग चेहरे के भाव बनाएँ — बच्चा आपकी नक़ल करेगा।" },
      { id: "i-a-6", en: "Gently shake a rattle on each side — helps locate sound.",                    hi: "दोनों तरफ़ धीरे से झुनझुना बजाएँ — आवाज़ ढूँढना सीखेगा।" },
      { id: "i-a-7", en: "Hold baby upright and dance slowly to soft music — vestibular fun.",          hi: "बच्चे को सीधा पकड़ कर धीमी धुन पर नाचें — संतुलन सीखेगा।" },
    ],
    guidance: [
      { id: "i-g-1", en: "Never compare your baby's milestones — every child grows at their own pace.", hi: "बच्चे की प्रगति की तुलना न करें — हर बच्चा अपनी रफ़्तार से बढ़ता है।" },
      { id: "i-g-2", en: "Trust your gut — if something feels off, talk to the doctor.",                hi: "अपने मन की सुनें — कुछ ग़लत लगे तो डॉक्टर से बात करें।" },
      { id: "i-g-3", en: "Sleep when baby sleeps — your rest matters as much as theirs.",               hi: "जब बच्चा सोए तब आप भी सोएँ — आपका आराम भी उतना ही ज़रूरी है।" },
      { id: "i-g-4", en: "Ask for help — accepting support is not weakness, it's wisdom.",              hi: "मदद माँगें — सहायता लेना कमज़ोरी नहीं, समझदारी है।" },
      { id: "i-g-5", en: "It's okay to feel overwhelmed — you're doing harder work than you realize.",   hi: "थका हुआ महसूस होना सामान्य है — आप अपने सोच से कहीं ज़्यादा कर रहे हैं।" },
      { id: "i-g-6", en: "Celebrate small wins — every diaper change and feed counts as parenting.",    hi: "छोटी जीत का जश्न मनाएँ — हर डायपर और फीड पेरेंटिंग है।" },
    ],
  },

  // ─── TODDLER (1–3) ───────────────────────────────────────────
  toddler: {
    tip: [
      { id: "t-t-1", en: "Offer choices, not commands — 'red shirt or blue?' instead of 'wear this'.",  hi: "हुक्म नहीं, विकल्प दें — 'लाल या नीली शर्ट?' न कि 'यह पहनो'।" },
      { id: "t-t-2", en: "Get down to their eye level when talking — it builds connection fast.",       hi: "बात करते वक़्त उनकी आँखों के स्तर पर बैठें — जुड़ाव तेज़ी से बनता है।" },
      { id: "t-t-3", en: "Tantrums mean big feelings — stay calm, hold space, don't argue.",            hi: "नख़रे बड़ी भावनाएँ हैं — शांत रहें, साथ दें, बहस न करें।" },
      { id: "t-t-4", en: "Use 'when-then' instead of 'no' — 'when toys are away, then storytime'.",     hi: "'न' की जगह 'जब-तब' कहें — 'जब खिलौने रखे, तब कहानी होगी'।" },
      { id: "t-t-5", en: "Praise effort not result — 'you tried so hard!' not just 'good job'.",        hi: "कोशिश की तारीफ़ करें — 'तुमने बहुत मेहनत की!' न कि सिर्फ़ 'शाबाश'।" },
      { id: "t-t-6", en: "Read the same book 100 times — repetition builds vocabulary deeply.",         hi: "एक ही किताब 100 बार पढ़ें — दोहराव से शब्दभंडार गहरा बनता है।" },
      { id: "t-t-7", en: "Give a 5-minute warning before transitions — toddlers need time to switch.",  hi: "बदलाव से 5 मिनट पहले बताएँ — बच्चों को तैयार होने का समय चाहिए।" },
      { id: "t-t-8", en: "Limit screen to 30 minutes a day — choose slow, quiet shows.",                hi: "स्क्रीन रोज़ 30 मिनट तक सीमित करें — धीमे और शांत शो चुनें।" },
    ],
    health: [
      { id: "t-h-1", en: "Brush teeth twice daily — make it a fun song they look forward to.",          hi: "दिन में दो बार दाँत ब्रश करें — एक मज़ेदार गाने के साथ करें।" },
      { id: "t-h-2", en: "Offer water in a sippy cup every hour — toddlers forget to drink.",           hi: "हर घंटे सिप्पी कप में पानी दें — बच्चे पीना भूल जाते हैं।" },
      { id: "t-h-3", en: "Include 1 fruit and 1 veggie at every meal — even if just a tiny piece.",     hi: "हर भोजन में 1 फल और 1 सब्ज़ी रखें — चाहे एक छोटा टुकड़ा ही हो।" },
      { id: "t-h-4", en: "30 minutes of outdoor play daily — sunlight helps Vitamin D and mood.",       hi: "रोज़ 30 मिनट बाहर खेलें — धूप विटामिन डी और मूड दोनों बढ़ाती है।" },
      { id: "t-h-5", en: "Put toddler to bed by 8 PM — sleep before 9 grows brain best.",                hi: "8 बजे तक सुलाएँ — 9 से पहले की नींद दिमाग़ को सबसे ज़्यादा बढ़ाती है।" },
      { id: "t-h-6", en: "Avoid sugar drinks completely — water and milk are enough.",                  hi: "मीठे पेय बिल्कुल न दें — पानी और दूध काफ़ी हैं।" },
      { id: "t-h-7", en: "Wash hands before every meal with a 20-second song.",                         hi: "हर भोजन से पहले 20 सेकंड के गाने से हाथ धोएँ।" },
    ],
    activity: [
      { id: "t-a-1", en: "Sort toys by color in 3 baskets — teaches color and order together.",         hi: "खिलौने 3 टोकरियों में रंग के अनुसार छाँटें — रंग और क्रम दोनों सीखेगा।" },
      { id: "t-a-2", en: "Give a wooden spoon and a pot — the best drum set ever.",                     hi: "लकड़ी का चम्मच और बर्तन दें — यही सबसे अच्छा ड्रम सेट है।" },
      { id: "t-a-3", en: "Stack cups or blocks then knock them down — physics lesson!",                 hi: "कप या ब्लॉक्स ऊपर रखें फिर गिराएँ — यह छोटी फ़िज़िक्स है!" },
      { id: "t-a-4", en: "Sing 'Head Shoulders Knees Toes' — teaches body parts and rhythm.",           hi: "'सिर कंधा घुटना पैर' गाएँ — अंग और लय दोनों सिखाता है।" },
      { id: "t-a-5", en: "Hide a toy under a cup and switch — cup game builds memory.",                 hi: "खिलौना कप के नीचे छिपाकर बदलें — याददाश्त बढ़ती है।" },
      { id: "t-a-6", en: "Fill a tray with rice and let them dig with hands — sensory play.",            hi: "ट्रे में चावल भरकर हाथ से खेलने दें — संवेदी अनुभव।" },
      { id: "t-a-7", en: "Pretend to cook together with empty pots — imagination starts here.",         hi: "खाली बर्तनों से नक़ली खाना पकाएँ — कल्पना यहीं शुरू होती है।" },
    ],
    guidance: [
      { id: "t-g-1", en: "Saying 'no' 100 times a day is normal — they're testing the world.",          hi: "दिन में 100 बार 'न' कहना सामान्य है — वे दुनिया को परख रहे हैं।" },
      { id: "t-g-2", en: "When you lose your temper, apologize — it teaches them how to repair.",      hi: "जब आप गुस्सा करें, माफ़ी माँगें — इससे रिश्ते सुधारना सीखते हैं।" },
      { id: "t-g-3", en: "Don't punish for accidents — spilled milk is just spilled milk.",            hi: "ग़लती से हुई चीज़ पर सज़ा न दें — गिरा दूध बस गिरा दूध है।" },
      { id: "t-g-4", en: "One 'special 10 minutes' a day — undivided attention transforms behavior.",   hi: "रोज़ '10 ख़ास मिनट' दें — पूरा ध्यान व्यवहार बदल देता है।" },
      { id: "t-g-5", en: "Toddlers can't share until 4 — don't force it, model it instead.",            hi: "बच्चे 4 साल तक साझा नहीं कर पाते — ज़बरदस्ती न करें, ख़ुद उदाहरण बनें।" },
      { id: "t-g-6", en: "Validate feelings — 'you're sad we left the park' before redirecting.",      hi: "भावनाओं को मानें — 'तुम पार्क छोड़कर दुखी हो' पहले कहें।" },
    ],
  },

  // ─── PRESCHOOL (3–5) ─────────────────────────────────────────
  preschool: {
    tip: [
      { id: "p-t-1", en: "Ask 'what do you think?' before answering — builds critical thinking.",       hi: "जवाब देने से पहले पूछें 'तुम्हें क्या लगता है?' — सोच मज़बूत होगी।" },
      { id: "p-t-2", en: "Read 20 minutes daily — strongest predictor of school success.",              hi: "रोज़ 20 मिनट पढ़ें — स्कूल में सफलता का सबसे बड़ा संकेत है।" },
      { id: "p-t-3", en: "Let them pour their own water and dress themselves — independence grows fast.", hi: "खुद पानी डालने और कपड़े पहनने दें — आत्मनिर्भरता तेज़ी से बढ़ती है।" },
      { id: "p-t-4", en: "Use 'I' statements when upset — 'I feel tired' not 'you make me tired'.",     hi: "परेशान होने पर 'मैं' से बोलें — 'मैं थक गया' न कि 'तुम मुझे थका रहे हो'।" },
      { id: "p-t-5", en: "Ask open questions about their day — 'best part?' instead of 'how was it?'.",  hi: "दिन के बारे में खुले सवाल पूछें — 'सबसे अच्छा क्या रहा?' बेहतर है।" },
      { id: "p-t-6", en: "Make mistakes openly — show them how to laugh and try again.",                hi: "अपनी ग़लतियाँ खुलकर दिखाएँ — हँसना और फिर से कोशिश करना सिखाएँ।" },
      { id: "p-t-7", en: "Keep TV out of bedroom — better sleep means better learning.",                hi: "बेडरूम में टीवी न रखें — बेहतर नींद बेहतर सीखना है।" },
      { id: "p-t-8", en: "Family dinner without screens 4x a week — boosts vocabulary by 1000 words.",   hi: "हफ़्ते में 4 बार बिना स्क्रीन परिवार के साथ खाना — 1000 शब्द बढ़ते हैं।" },
    ],
    health: [
      { id: "p-h-1", en: "60 minutes of active play daily — running, jumping, climbing.",                hi: "रोज़ 60 मिनट सक्रिय खेल — दौड़ना, कूदना, चढ़ना।" },
      { id: "p-h-2", en: "Sleep 10–13 hours total including nap — non-negotiable for brain growth.",     hi: "दिन की झपकी मिलाकर 10–13 घंटे नींद — दिमाग़ी विकास के लिए ज़रूरी है।" },
      { id: "p-h-3", en: "Brush teeth with parent supervision until age 7 — they miss spots.",          hi: "7 साल तक माता-पिता की निगरानी में ब्रश कराएँ — कई जगह छूट जाती हैं।" },
      { id: "p-h-4", en: "Pack 5 colors on the plate — variety prevents picky eating.",                  hi: "थाली में 5 रंग हों — विविधता खाने की चूज़ीनेस कम करती है।" },
      { id: "p-h-5", en: "Annual eye check from age 3 — many vision issues are silent.",                 hi: "3 साल से सालाना आँख की जाँच कराएँ — कई समस्याएँ छुपी होती हैं।" },
      { id: "p-h-6", en: "Use the bathroom right before bed — fewer accidents at night.",                hi: "सोने से ठीक पहले बाथरूम भेजें — रात में दुर्घटनाएँ कम होंगी।" },
      { id: "p-h-7", en: "Limit juice to 120ml a day — water and milk should be the default.",           hi: "जूस रोज़ सिर्फ़ 120ml — पानी और दूध मुख्य पेय हों।" },
    ],
    activity: [
      { id: "p-a-1", en: "Make a treasure hunt with 5 picture clues — practices reading and logic.",     hi: "5 तस्वीरों वाला ख़ज़ाने का खेल बनाएँ — पढ़ाई और सोच दोनों सीखेगा।" },
      { id: "p-a-2", en: "Play 'I Spy' with colors and shapes — builds vocabulary on the go.",          hi: "रंग और आकार से 'मैं देखता हूँ' खेलें — चलते-फिरते शब्द बढ़ेंगे।" },
      { id: "p-a-3", en: "Sort coins by size, value, year — math hidden in fun.",                       hi: "सिक्के आकार, मूल्य, साल से छाँटें — मज़े में गणित।" },
      { id: "p-a-4", en: "Bake together — measuring cups teach fractions naturally.",                  hi: "साथ बेक करें — मापने के कप से अंश सिखाते हैं।" },
      { id: "p-a-5", en: "Build a fort with blankets and chairs — engineering and creativity!",         hi: "चादर और कुर्सियों से किला बनाएँ — इंजीनियरिंग और रचनात्मकता!" },
      { id: "p-a-6", en: "Play freeze dance — when music stops, freeze. Self-control practice.",        hi: "फ़्रीज़ डांस खेलें — संगीत रुके तो रुक जाएँ। आत्म-नियंत्रण।" },
      { id: "p-a-7", en: "Draw their day in 4 boxes like a comic — storytelling skill.",                hi: "उनका दिन 4 डिब्बों में कॉमिक की तरह बनाएँ — कहानी कौशल।" },
    ],
    guidance: [
      { id: "p-g-1", en: "Time-in not time-out — sit together until big feelings pass.",                 hi: "टाइम-आउट नहीं, साथ बैठें — जब तक भावना शांत न हो।" },
      { id: "p-g-2", en: "Whisper instead of shouting when they're loud — they'll lean in to listen.",   hi: "जब वे ज़ोर से बोलें, धीरे फुसफुसाएँ — वे सुनने आगे झुकेंगे।" },
      { id: "p-g-3", en: "Let them be bored sometimes — boredom births creativity.",                    hi: "कभी-कभी ऊबने दें — ऊब से रचनात्मकता जन्म लेती है।" },
      { id: "p-g-4", en: "Apologize when wrong — kids who see this become emotionally healthy adults.",   hi: "ग़लती पर माफ़ी माँगें — ऐसे बच्चे भावनात्मक रूप से स्वस्थ बड़े होते हैं।" },
      { id: "p-g-5", en: "Avoid 'good girl/boy' labels — say what they did, not what they are.",         hi: "'अच्छा बच्चा' लेबल न दें — काम की तारीफ़ करें, पहचान की नहीं।" },
      { id: "p-g-6", en: "Connection before correction — hug first, teach second.",                     hi: "सुधार से पहले जुड़ाव — पहले गले लगाएँ, फिर सिखाएँ।" },
    ],
  },

  // ─── EARLY SCHOOL (5–10) ─────────────────────────────────────
  early_school: {
    tip: [
      { id: "e-t-1", en: "Set a homework-first rule before TV — habit beats willpower every day.",       hi: "टीवी से पहले होमवर्क का नियम बनाएँ — आदत हर दिन इच्छाशक्ति से बेहतर है।" },
      { id: "e-t-2", en: "Ask 'what was hard today?' — opens deeper conversations than 'how was school?'.", hi: "पूछें 'आज क्या मुश्किल था?' — 'स्कूल कैसा रहा' से गहरी बात होगी।" },
      { id: "e-t-3", en: "Give chores with money — earned allowance teaches value early.",               hi: "घर के काम के बदले पैसे दें — कमाई से मूल्य जल्दी सीखते हैं।" },
      { id: "e-t-4", en: "Praise the strategy, not the talent — 'smart way to solve it!'.",              hi: "तरीक़े की तारीफ़ करें, हुनर की नहीं — 'सही तरीक़ा निकाला!'।" },
      { id: "e-t-5", en: "Plan one screen-free family night a week — board games and laughter.",         hi: "हफ़्ते में एक रात बिना स्क्रीन — बोर्ड गेम और हँसी।" },
      { id: "e-t-6", en: "Let them pack their own school bag — responsibility starts here.",            hi: "अपना स्कूल बैग ख़ुद पैक करने दें — ज़िम्मेदारी यहीं से शुरू है।" },
      { id: "e-t-7", en: "Teach them to lose well — practice in family games every weekend.",            hi: "हारना सीखाएँ — हर सप्ताह परिवार के साथ खेल खेलें।" },
      { id: "e-t-8", en: "Read aloud together even now — listening grows imagination.",                  hi: "अब भी साथ बैठकर पढ़ें — सुनने से कल्पना बढ़ती है।" },
    ],
    health: [
      { id: "e-h-1", en: "9–11 hours of sleep — screens off 1 hour before bed.",                         hi: "9–11 घंटे नींद — सोने से 1 घंटा पहले स्क्रीन बंद।" },
      { id: "e-h-2", en: "60 minutes of physical play or sport every day — non-negotiable.",            hi: "रोज़ 60 मिनट खेल या व्यायाम — कोई समझौता नहीं।" },
      { id: "e-h-3", en: "Pack a protein at every meal — eggs, dal, paneer, chicken.",                   hi: "हर भोजन में प्रोटीन — अंडा, दाल, पनीर, चिकन।" },
      { id: "e-h-4", en: "Keep dental check-up every 6 months — prevents big bills later.",              hi: "हर 6 महीने में दाँत की जाँच — आगे के बड़े ख़र्च बचाते हैं।" },
      { id: "e-h-5", en: "Teach hygiene — handwash, daily bath, clean nails routine.",                  hi: "साफ़-सफ़ाई सिखाएँ — हाथ धोना, रोज़ नहाना, नाख़ून साफ़।" },
      { id: "e-h-6", en: "Watch posture during homework — break every 30 min.",                          hi: "होमवर्क के दौरान बैठने का तरीक़ा देखें — हर 30 मिनट में ब्रेक।" },
      { id: "e-h-7", en: "Eye care — 20-20-20 rule: every 20 min, look 20 feet away for 20 sec.",        hi: "आँखों की देखभाल — हर 20 मिनट में 20 फ़ीट दूर 20 सेकंड देखें।" },
    ],
    activity: [
      { id: "e-a-1", en: "Make a 'why' jar — they ask 1 curious question daily, you research together.", hi: "'क्यों' जार बनाएँ — रोज़ एक सवाल पूछें और साथ खोजें।" },
      { id: "e-a-2", en: "Cook one simple recipe a week together — math, chemistry, life skill.",         hi: "हफ़्ते में एक रेसिपी साथ बनाएँ — गणित, रसायन, जीवन कौशल।" },
      { id: "e-a-3", en: "Start a small plant project — observe and journal growth.",                    hi: "छोटा पौधा लगाएँ — विकास देखें और लिखें।" },
      { id: "e-a-4", en: "Family chess or carrom night — strategy thinking grows fast.",                 hi: "परिवार के साथ शतरंज या कैरम — रणनीति सोच तेज़ी से बढ़ती है।" },
      { id: "e-a-5", en: "Build a paper airplane challenge — test which design flies furthest.",         hi: "काग़ज़ का हवाई जहाज़ बनाने की प्रतियोगिता — सबसे दूर कौन सा उड़ा?" },
      { id: "e-a-6", en: "Write and act a 5-minute play — confidence and language together.",            hi: "5 मिनट का नाटक लिखकर खेलें — आत्मविश्वास और भाषा साथ।" },
      { id: "e-a-7", en: "Map a treasure hunt around the house — geography starts at home.",             hi: "घर में ख़ज़ाने का नक्शा बनाएँ — भूगोल यहीं से शुरू है।" },
    ],
    guidance: [
      { id: "e-g-1", en: "Listen without solving — sometimes they just need to be heard.",               hi: "बिना हल बताए सुनें — कभी-कभी सिर्फ़ सुना जाना चाहिए।" },
      { id: "e-g-2", en: "Avoid comparing with siblings or classmates — it kills self-worth slowly.",    hi: "भाई-बहनों या दोस्तों से तुलना न करें — आत्मसम्मान धीरे-धीरे ख़त्म होता है।" },
      { id: "e-g-3", en: "Allow safe failure — protected kids become fragile adults.",                  hi: "सुरक्षित असफलता होने दें — अति-संरक्षित बच्चे नाज़ुक बड़े होते हैं।" },
      { id: "e-g-4", en: "Set screen-time rules together — they follow what they help create.",         hi: "स्क्रीन समय के नियम साथ बनाएँ — जो वे बनाते हैं वो मानते हैं।" },
      { id: "e-g-5", en: "Praise effort and kindness more than marks — character lasts longer.",        hi: "अंकों से ज़्यादा कोशिश और दया की तारीफ़ करें — चरित्र लंबा चलता है।" },
      { id: "e-g-6", en: "Eat dinner together — kids who do are healthier and happier.",                 hi: "रात का खाना साथ खाएँ — ऐसे बच्चे ज़्यादा स्वस्थ और ख़ुश होते हैं।" },
    ],
  },

  // ─── PRE-TEEN (10–15) ────────────────────────────────────────
  pre_teen: {
    tip: [
      { id: "x-t-1", en: "Drive time = talk time — kids open up most when not facing you.",              hi: "गाड़ी में बातचीत — आमने-सामने न होने पर बच्चे ज़्यादा खुलते हैं।" },
      { id: "x-t-2", en: "Knock before entering their room — respect builds trust.",                     hi: "उनके कमरे में जाने से पहले दस्तक दें — सम्मान भरोसा बनाता है।" },
      { id: "x-t-3", en: "Talk about real topics — money, safety, relationships, mental health.",        hi: "असली विषयों पर बात करें — पैसा, सुरक्षा, रिश्ते, मानसिक स्वास्थ्य।" },
      { id: "x-t-4", en: "Don't lecture — ask questions and let them think out loud.",                   hi: "उपदेश न दें — सवाल पूछें और सोचने दें।" },
      { id: "x-t-5", en: "Watch a show or play a game they love — entering their world matters.",       hi: "उनका पसंदीदा शो देखें या गेम खेलें — उनकी दुनिया में आना ज़रूरी है।" },
      { id: "x-t-6", en: "Set phone curfew — phones out of bedroom by 9 PM.",                            hi: "फ़ोन का समय तय करें — रात 9 बजे तक बेडरूम से बाहर।" },
      { id: "x-t-7", en: "Teach how to disagree respectfully — model it in your own conversations.",     hi: "विनम्रता से असहमत होना सिखाएँ — अपनी बातचीत में दिखाएँ।" },
      { id: "x-t-8", en: "Encourage one passion deeply — depth beats spreading thin.",                   hi: "एक रुचि गहराई से बढ़ाएँ — गहराई फैलाव से बेहतर है।" },
    ],
    health: [
      { id: "x-h-1", en: "8–10 hours sleep — growth and brain wiring happen at night.",                  hi: "8–10 घंटे नींद — वृद्धि और दिमाग़ की वायरिंग रात में होती है।" },
      { id: "x-h-2", en: "Daily protein + iron — especially important during growth spurts.",            hi: "रोज़ प्रोटीन और लोहा — तेज़ बढ़ते समय में बहुत ज़रूरी।" },
      { id: "x-h-3", en: "Open conversation about puberty — better from you than the internet.",         hi: "किशोरावस्था पर खुलकर बात करें — इंटरनेट से अच्छा आपसे सीखें।" },
      { id: "x-h-4", en: "Encourage 1 sport — physical activity protects mental health.",                hi: "एक खेल को बढ़ावा दें — शारीरिक सक्रियता मानसिक स्वास्थ्य बचाती है।" },
      { id: "x-h-5", en: "Limit junk food at home — they eat what's available.",                         hi: "घर में जंक फ़ूड कम रखें — जो मिलेगा वो खाएँगे।" },
      { id: "x-h-6", en: "Teach period or shaving care openly — it's just biology, no shame.",          hi: "पीरियड या शेविंग की देखभाल खुलकर सिखाएँ — यह सिर्फ़ शरीर है, शर्म नहीं।" },
      { id: "x-h-7", en: "Annual full body check-up — catch issues before they grow.",                   hi: "सालाना पूरी जाँच — समस्याओं को बढ़ने से पहले पकड़ें।" },
    ],
    activity: [
      { id: "x-a-1", en: "Plan a weekend trip together — they decide budget, route, food.",              hi: "साथ वीकेंड ट्रिप प्लान करें — बजट, रास्ता, खाना वे चुनें।" },
      { id: "x-a-2", en: "Cook a full meal together — recipe, shop, prep, serve.",                       hi: "साथ पूरा खाना बनाएँ — रेसिपी, ख़रीद, तैयारी, परोसना।" },
      { id: "x-a-3", en: "Watch a documentary together and discuss — sparks real ideas.",               hi: "साथ डॉक्यूमेंट्री देखें और चर्चा करें — असली विचार जगते हैं।" },
      { id: "x-a-4", en: "Start a small saving goal — let them earn and track.",                        hi: "छोटा बचत लक्ष्य रखें — कमाने और ट्रैक करने दें।" },
      { id: "x-a-5", en: "Teach a life skill — change a tyre, sew a button, set up a router.",          hi: "एक जीवन कौशल सिखाएँ — टायर बदलना, बटन सिलना, राउटर लगाना।" },
      { id: "x-a-6", en: "Volunteer together once a month — empathy grows by doing.",                   hi: "महीने में एक बार साथ सेवा करें — करने से सहानुभूति बढ़ती है।" },
      { id: "x-a-7", en: "Read the same book and discuss — book club of two.",                           hi: "एक ही किताब पढ़ें और चर्चा करें — दो लोगों का बुक क्लब।" },
    ],
    guidance: [
      { id: "x-g-1", en: "Their mood swings are not personal — hormones are doing their job.",           hi: "उनके मूड बदलाव आपके ख़िलाफ़ नहीं हैं — हार्मोन काम कर रहे हैं।" },
      { id: "x-g-2", en: "Pick your battles — clothes and hair are not worth war.",                      hi: "लड़ाइयाँ चुनें — कपड़े और बाल जंग के लायक़ नहीं हैं।" },
      { id: "x-g-3", en: "Privacy is a need, not a luxury — give it generously.",                        hi: "गोपनीयता ज़रूरत है, सुविधा नहीं — खुलकर दें।" },
      { id: "x-g-4", en: "Stay curious not furious — ask 'help me understand' before reacting.",         hi: "गुस्से से पहले जिज्ञासा रखें — 'मुझे समझने में मदद करो' पूछें।" },
      { id: "x-g-5", en: "Friends matter more than you now — that's healthy, not betrayal.",             hi: "दोस्त अब आपसे ज़्यादा मायने रखते हैं — यह सही है, धोखा नहीं।" },
      { id: "x-g-6", en: "Stay accessible — be the safe place they return to without judgement.",        hi: "उपलब्ध रहें — बिना न्याय के लौटने का सुरक्षित ठिकाना बनें।" },
    ],
  },
};
