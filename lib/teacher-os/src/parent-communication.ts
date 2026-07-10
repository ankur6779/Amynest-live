import { CLASS_LABELS, SUBJECT_LABELS } from "@workspace/worksheet-studio";
import type { ParentMessageLanguage, ParentMessageSet } from "./types.js";
import type { WorksheetClass, WorksheetSubject } from "@workspace/worksheet-studio";

export interface ParentMessageInput {
  topic: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  language: ParentMessageLanguage;
}

export function generateParentMessages(input: ParentMessageInput): ParentMessageSet {
  const cls = CLASS_LABELS[input.classLevel];
  const subj = SUBJECT_LABELS[input.subject];
  const { topic, language } = input;

  const homeworkEn = `Dear Parents,\nToday ${cls} children learned about ${topic} in ${subj}. Please help your child complete the homework sheet and discuss what they learned.\n— LPS Teacher`;
  const homeworkHi = `प्रिय अभिभावक,\nआज ${cls} कक्षा में बच्चों ने ${topic} विषय पर काम किया। कृपया होमवर्क शीट पूरी करने में सहायता करें।\n— LPS शिक्षक`;

  const whatsappEn = `📚 ${cls} Update: Today we covered *${topic}*. Homework sheet sent. Please spend 10 minutes reviewing with your child. Thank you!`;
  const whatsappHi = `📚 ${cls} अपडेट: आज *${topic}* पढ़ाया गया। होमवर्क भेजा गया है। 10 मिनट रिवीज़न करें। धन्यवाद!`;

  const weeklyEn = `Weekly ${subj} update: This week we focused on ${topic} with worksheets, activities, and oral practice. Children are progressing well.`;
  const weeklyHi = `साप्ताहिक ${subj} अपडेट: इस सप्ताह ${topic} पर कार्य हुआ। बच्चे अच्छी प्रगति कर रहे हैं।`;

  const homeEn = `Home activity: Ask your child to draw or name 3 things related to ${topic}. Praise their effort!`;
  const homeHi = `घर की गतिविधि: बच्चे से ${topic} से जुड़ी 3 चीज़ें बताने या बनाने को कहें।`;

  if (language === "english") {
    return { homework: homeworkEn, whatsapp: whatsappEn, weeklyUpdate: weeklyEn, homeActivity: homeEn, language };
  }
  if (language === "hindi") {
    return { homework: homeworkHi, whatsapp: whatsappHi, weeklyUpdate: weeklyHi, homeActivity: homeHi, language };
  }
  return {
    homework: `${homeworkEn}\n\n${homeworkHi}`,
    whatsapp: `${whatsappEn}\n\n${whatsappHi}`,
    weeklyUpdate: `${weeklyEn}\n\n${weeklyHi}`,
    homeActivity: `${homeEn}\n\n${homeHi}`,
    language,
  };
}
