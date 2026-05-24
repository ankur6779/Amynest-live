import type { StudyTopicDraft } from "../types";

/** Country-specific GK topic drafts — merged into the basic GK pack at runtime. */
export const COUNTRY_BASICS_TOPIC: Record<string, StudyTopicDraft> = {
  IN: {
    id: "country-basics",
    title: "India — Our Country",
    notes:
      "India is a large and beautiful country in South Asia.\nCapital: New Delhi.\nNational flag: saffron, white, green with a blue Ashoka Chakra.\nNational animal: tiger. National bird: peacock. National flower: lotus.\nNational language (official): Hindi. National fruit: mango.",
    amyPrompt: "Share 4 fun facts about India for a class 2-4 Indian child.",
    questions: [
      { q: "Capital of India?", options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"], answer: 1 },
      { q: "National animal of India?", options: ["Lion", "Tiger", "Elephant", "Peacock"], answer: 1 },
      { q: "National fruit of India?", options: ["Apple", "Banana", "Mango", "Orange"], answer: 2 },
      { q: "How many colours on India's flag (excluding the Chakra)?", options: ["2", "3", "4", "5"], answer: 1 },
    ],
  },
  US: {
    id: "country-basics",
    title: "United States — Our Country",
    notes:
      "The United States is a large country in North America.\nCapital: Washington, D.C.\nNational flag: stars and stripes — 50 stars for 50 states.\nNational bird: bald eagle. National animal: bison.\nCurrency: dollar ($).",
    amyPrompt: "Share 4 fun facts about the United States for a class 2-4 American child.",
    questions: [
      { q: "Capital of the United States?", options: ["New York", "Washington, D.C.", "Los Angeles", "Chicago"], answer: 1 },
      { q: "National bird of the US?", options: ["Robin", "Bald eagle", "Parrot", "Owl"], answer: 1 },
      { q: "US currency is called?", options: ["Pounds", "Rupees", "Dollars", "Euros"], answer: 2 },
      { q: "How many stripes on the US flag?", options: ["7", "13", "50", "100"], answer: 1 },
    ],
  },
  UK: {
    id: "country-basics",
    title: "United Kingdom — Our Country",
    notes:
      "The United Kingdom is made up of England, Scotland, Wales, and Northern Ireland.\nCapital: London.\nCurrency: pound (£).\nNational symbols include the Union Jack flag and the lion.\nFamous landmarks: Big Ben, Buckingham Palace, and the Tower of London.",
    amyPrompt: "Share 4 fun facts about the UK for a class 2-4 British child.",
    questions: [
      { q: "Capital of the United Kingdom?", options: ["Paris", "London", "Dublin", "Edinburgh"], answer: 1 },
      { q: "UK currency is called?", options: ["Dollars", "Pounds", "Rupees", "Euros"], answer: 1 },
      { q: "The UK flag is called the ___?", options: ["Stars and Stripes", "Union Jack", "Tricolour", "Maple Leaf"], answer: 1 },
      { q: "Big Ben is in which city?", options: ["Paris", "London", "Manchester", "Glasgow"], answer: 1 },
    ],
  },
  AE: {
    id: "country-basics",
    title: "United Arab Emirates — Our Country",
    notes:
      "The UAE is a country in the Middle East on the Arabian Peninsula.\nCapital: Abu Dhabi. Largest city: Dubai.\nCurrency: dirham (د.إ).\nNational bird: falcon. Famous for dates, malls, and desert safaris.\nNational day: 2 December.",
    amyPrompt: "Share 4 fun facts about the UAE for a class 2-4 child.",
    questions: [
      { q: "Capital of the UAE?", options: ["Dubai", "Abu Dhabi", "Sharjah", "Riyadh"], answer: 1 },
      { q: "UAE currency is called?", options: ["Riyal", "Dirham", "Dollar", "Dinar"], answer: 1 },
      { q: "Which fruit is famous in the UAE?", options: ["Apple", "Dates", "Mango", "Grapes"], answer: 1 },
      { q: "National bird of the UAE?", options: ["Peacock", "Falcon", "Eagle", "Parrot"], answer: 1 },
    ],
  },
  DEFAULT: {
    id: "country-basics",
    title: "Countries & Capitals",
    notes:
      "A country is a large area with its own government.\nEvery country has a capital city where the government usually works.\nExamples: United States — Washington, D.C.; United Kingdom — London; France — Paris; Japan — Tokyo.\nCountries also have flags, anthems, and symbols like national animals or flowers.",
    amyPrompt: "Share 4 fun facts about countries and capitals for a class 2-4 child (global examples).",
    questions: [
      { q: "Capital of the United States?", options: ["New York", "Washington, D.C.", "Los Angeles", "Chicago"], answer: 1 },
      { q: "Capital of the United Kingdom?", options: ["Paris", "London", "Dublin", "Edinburgh"], answer: 1 },
      { q: "Capital of France?", options: ["Rome", "Berlin", "Paris", "Madrid"], answer: 2 },
      { q: "A capital city is where the ___ usually works.", options: ["farm", "government", "beach", "zoo"], answer: 1 },
    ],
  },
};

export const COUNTRY_FESTIVALS_TOPIC: Record<string, StudyTopicDraft> = {
  IN: {
    id: "local-festivals",
    title: "Festivals of India",
    notes:
      "Festivals bring families together in India.\nDiwali — festival of lights, celebrated with diyas and sweets.\nHoli — festival of colours, played with gulal and water.\nEid — celebrated after Ramadan with feasts and charity.\nPongal / Onam — harvest festivals in South India.\nIndependence Day — 15 August, flag hoisting and patriotic songs.",
    amyPrompt: "Name 5 Indian festivals and one fun fact about each for a class 2-4 child.",
    questions: [
      { q: "Diwali is the festival of?", options: ["Colours", "Lights", "Water", "Snow"], answer: 1 },
      { q: "Holi is famous for playing with?", options: ["Water only", "Lights", "Colours", "Snow"], answer: 2 },
      { q: "Independence Day in India is on?", options: ["15 August", "26 January", "2 October", "25 December"], answer: 0 },
      { q: "Pongal is a ___ festival.", options: ["Harvest", "Winter", "Exam", "Sports"], answer: 0 },
    ],
  },
  US: {
    id: "local-festivals",
    title: "American Holidays & Festivals",
    notes:
      "Americans celebrate many special days.\nThanksgiving — fourth Thursday of November, giving thanks for harvest and family.\nIndependence Day — 4 July, fireworks and parades.\nChristmas — 25 December, lights, trees, and gifts.\nHalloween — 31 October, costumes and trick-or-treat.\nMartin Luther King Jr. Day — honours the civil rights leader.",
    amyPrompt: "Name 5 American holidays and one fun fact about each for a class 2-4 child.",
    questions: [
      { q: "Thanksgiving is linked to giving thanks for?", options: ["Birthdays", "Harvest", "Rain", "Sports"], answer: 1 },
      { q: "Independence Day in the US is on?", options: ["4 July", "15 August", "25 December", "1 January"], answer: 0 },
      { q: "Christmas is celebrated on?", options: ["25 Nov", "25 Dec", "25 Jan", "31 Oct"], answer: 1 },
      { q: "Halloween is on?", options: ["31 October", "25 December", "4 July", "14 February"], answer: 0 },
    ],
  },
  AE: {
    id: "local-festivals",
    title: "Festivals of the UAE",
    notes:
      "The UAE celebrates both national and religious festivals.\nEid al-Fitr — end of Ramadan, feasts and family visits.\nEid al-Adha — festival of sacrifice and charity.\nNational Day — 2 December, flag displays and fireworks.\nUAE Flag Day — 3 November.\nDubai Shopping Festival — winter sales and entertainment.",
    amyPrompt: "Name 4 UAE festivals and one fun fact about each for a class 2-4 child.",
    questions: [
      { q: "UAE National Day is on?", options: ["2 December", "15 August", "4 July", "26 January"], answer: 0 },
      { q: "Eid is celebrated after?", options: ["Christmas", "Ramadan", "Diwali", "Holi"], answer: 1 },
      { q: "National Day celebrates the UAE's ___?", options: ["Independence/formation", "Harvest", "School start", "Rain"], answer: 0 },
      { q: "Families often visit each other during ___?", options: ["Eid", "Exams", "Homework", "Winter break only"], answer: 0 },
    ],
  },
  DEFAULT: {
    id: "local-festivals",
    title: "Festivals Around the World",
    notes:
      "Festivals are special days when people celebrate with family and friends.\nChristmas — celebrated on 25 December with lights and gifts.\nDiwali — festival of lights in autumn.\nEid — celebrated after Ramadan with feasts and charity.\nChinese New Year — spring festival with dragons and red decorations.\nThanksgiving — harvest celebration in the United States and Canada.",
    amyPrompt: "Name 5 world festivals and one fun fact about each for a class 2-4 child.",
    questions: [
      { q: "Diwali is the festival of?", options: ["Colours", "Lights", "Water", "Snow"], answer: 1 },
      { q: "Christmas is celebrated on?", options: ["25 Nov", "25 Dec", "25 Jan", "25 Feb"], answer: 1 },
      { q: "Holi is famous for playing with?", options: ["Water", "Lights", "Colours", "Snow"], answer: 2 },
      { q: "Thanksgiving is linked to giving thanks for?", options: ["Birthdays", "Harvest", "Rain", "Sports"], answer: 1 },
    ],
  },
};
