import type { SupportedLocale } from "../locales.js";
import type { NotificationCategory } from "@workspace/db";

type MessageCatalog = {
  categoryTitles: Partial<Record<NotificationCategory, string>>;
  snackTitle: string;
  parentingTitle: string;
  storyTitle: string;
  learningTitle: string;
  nutritionBody: (item: string, name: string) => string;
  rtl: boolean;
};

const CATALOG: Record<SupportedLocale, MessageCatalog> = {
  "en-US": {
    categoryTitles: {},
    snackTitle: "Snack time idea 🍎",
    parentingTitle: "Parenting tip of the day 🌱",
    storyTitle: "Story time tonight 📚",
    learningTitle: "Learning activity idea 🧠",
    nutritionBody: (item, name) => `Try ${item} for ${name} — a fresh, kid-friendly pick.`,
    rtl: false,
  },
  "en-GB": {
    categoryTitles: {},
    snackTitle: "Snack time idea 🍎",
    parentingTitle: "Parenting tip of the day 🌱",
    storyTitle: "Bedtime story tonight 📚",
    learningTitle: "Learning activity idea 🧠",
    nutritionBody: (item, name) => `How about ${item} for ${name}? A lovely balanced option.`,
    rtl: false,
  },
  es: {
    categoryTitles: {},
    snackTitle: "Idea para la merienda 🍎",
    parentingTitle: "Consejo parental del día 🌱",
    storyTitle: "Hora del cuento esta noche 📚",
    learningTitle: "Actividad de aprendizaje 🧠",
    nutritionBody: (item, name) => `Prueba ${item} con ${name} — una opción sana y deliciosa.`,
    rtl: false,
  },
  pt: {
    categoryTitles: {},
    snackTitle: "Ideia de lanche 🍎",
    parentingTitle: "Dica parental do dia 🌱",
    storyTitle: "Hora da história 📚",
    learningTitle: "Atividade de aprendizado 🧠",
    nutritionBody: (item, name) => `Que tal ${item} para ${name}? Opção prática e nutritiva.`,
    rtl: false,
  },
  fr: {
    categoryTitles: {},
    snackTitle: "Idée goûter 🍎",
    parentingTitle: "Conseil parental du jour 🌱",
    storyTitle: "Histoire du soir 📚",
    learningTitle: "Activité d'apprentissage 🧠",
    nutritionBody: (item, name) => `Essayez ${item} pour ${name} — une option équilibrée.`,
    rtl: false,
  },
  de: {
    categoryTitles: {},
    snackTitle: "Snack-Idee 🍎",
    parentingTitle: "Eltern-Tipp des Tages 🌱",
    storyTitle: "Gute-Nacht-Geschichte 📚",
    learningTitle: "Lernaktivität 🧠",
    nutritionBody: (item, name) => `Probieren Sie ${item} für ${name} — gesund und unkompliziert.`,
    rtl: false,
  },
  ar: {
    categoryTitles: {},
    snackTitle: "فكرة وجبة خفيفة 🍎",
    parentingTitle: "نصيحة يومية للأبوة 🌱",
    storyTitle: "وقت القصة الليلة 📚",
    learningTitle: "نشاط تعليمي 🧠",
    nutritionBody: (item, name) => `جرب ${item} مع ${name} — خيار صحي ولذيذ.`,
    rtl: true,
  },
  hi: {
    categoryTitles: {},
    snackTitle: "स्नैक का आइडिया 🍎",
    parentingTitle: "आज का पैरेंटिंग टिप 🌱",
    storyTitle: "आज रात कहानी का समय 📚",
    learningTitle: "सीखने की गतिविधि 🧠",
    nutritionBody: (item, name) => `${name} के लिए ${item} आज़माएँ — हेल्दी और आसान।`,
    rtl: false,
  },
  ja: {
    categoryTitles: {},
    snackTitle: "おやつのアイデア 🍎",
    parentingTitle: "今日の育児ヒント 🌱",
    storyTitle: "今夜の読み聞かせ 📚",
    learningTitle: "学びのアクティビティ 🧠",
    nutritionBody: (item, name) => `${name}に${item}はいかが？栄養バランスも◎`,
    rtl: false,
  },
  ko: {
    categoryTitles: {},
    snackTitle: "간식 아이디어 🍎",
    parentingTitle: "오늘의 육아 팁 🌱",
    storyTitle: "오늘 밤 동화 시간 📚",
    learningTitle: "학습 활동 아이디어 🧠",
    nutritionBody: (item, name) => `${name}에게 ${item} 어때요? 건강하고 간편해요.`,
    rtl: false,
  },
  id: {
    categoryTitles: {},
    snackTitle: "Ide camilan 🍎",
    parentingTitle: "Tips parenting hari ini 🌱",
    storyTitle: "Waktu cerita malam ini 📚",
    learningTitle: "Aktivitas belajar 🧠",
    nutritionBody: (item, name) => `Coba ${item} untuk ${name} — sehat dan praktis.`,
    rtl: false,
  },
};

export function getMessageCatalog(locale: SupportedLocale): MessageCatalog {
  return CATALOG[locale] ?? CATALOG["en-US"];
}

/** Native-sounding localization — not literal translation of English templates. */
export function localizeNotificationCopy(input: {
  locale: SupportedLocale;
  category: NotificationCategory;
  title: string;
  body: string;
  childName: string;
  foodLabel?: string;
}): { title: string; body: string; rtl: boolean } {
  const cat = getMessageCatalog(input.locale);

  let title = input.title;
  let body = input.body;

  if (input.category === "nutrition" && input.foodLabel) {
    body = cat.nutritionBody(input.foodLabel, input.childName);
  } else if (input.category === "parenting_tips") {
    title = cat.parentingTitle;
  } else if (input.category === "story_time") {
    title = cat.storyTitle;
  } else if (input.category === "learning_activity") {
    title = cat.learningTitle;
  } else if (input.category === "nutrition") {
    title = cat.snackTitle;
  }

  return { title, body, rtl: cat.rtl };
}
