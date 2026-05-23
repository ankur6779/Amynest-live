import type { SubjectPack, BasicSubjectId, StudyTopicDraft } from "../types";
import { enrichSubjectPacks } from "./enrich-topics";
import {
  IMG_ADDITION, IMG_SUBTRACTION, IMG_MULTIPLICATION, IMG_DIVISION,
  IMG_FRACTIONS, IMG_GEOMETRY_BASICS, IMG_CLOCK,
  IMG_PLANTS, IMG_STATES_OF_MATTER, IMG_ANIMALS_HABITAT,
  IMG_HUMAN_BODY, IMG_WEATHER, IMG_FOOD_GROUPS,
  IMG_NOUNS, IMG_VERBS, IMG_ADJECTIVES, IMG_PRONOUNS, IMG_SENTENCES,
} from "./images";

const BASIC_SUBJECTS_DRAFT: Array<Omit<SubjectPack<BasicSubjectId>, "topics"> & { topics: StudyTopicDraft[] }> = [
  // ── Math ────────────────────────────────────────────────────────────────────
  {
    id: "math",
    title: "Math",
    emoji: "➕",
    topics: [
      {
        id: "addition",
        title: "Addition",
        imageExample: IMG_ADDITION,
        notes:
          "Addition means putting numbers together to find the total.\nWhen you add, you combine two groups: 2 + 3 means 2 things and 3 more.\nThe '+' sign means add. The '=' sign shows the answer.\nExample: 2 + 3 = 5.",
        amyPrompt: "Explain addition simply for a class 1-5 child with one fun real-life example.",
        questions: [
          { q: "2 + 3 = ?",   options: ["4", "5", "6", "7"], answer: 1, hint: "Count two, then three more." },
          { q: "5 + 4 = ?",   options: ["8", "9", "10", "11"], answer: 1 },
          { q: "10 + 7 = ?",  options: ["15", "16", "17", "18"], answer: 2 },
          { q: "What sign means 'add'?", options: ["-", "+", "×", "÷"], answer: 1 },
          { q: "1 + 1 = ?",   options: ["1", "2", "3", "0"], answer: 1 },
        ],
      },
      {
        id: "subtraction",
        title: "Subtraction",
        imageExample: IMG_SUBTRACTION,
        notes:
          "Subtraction means taking some away from a group to find what is left.\nThe '−' sign means subtract (minus).\nExample: If you have 8 apples and eat 3, you have 8 − 3 = 5 left.\nThe answer in subtraction is called the difference.",
        amyPrompt: "Explain subtraction for a class 1-3 child using a simple take-away story.",
        questions: [
          { q: "8 − 3 = ?",  options: ["4", "5", "6", "11"], answer: 1 },
          { q: "10 − 4 = ?", options: ["5", "6", "7", "14"], answer: 1 },
          { q: "7 − 7 = ?",  options: ["0", "1", "7", "14"], answer: 0, hint: "Any number minus itself is 0." },
          { q: "What sign means 'minus'?", options: ["+", "−", "×", "÷"], answer: 1 },
        ],
      },
      {
        id: "multiplication",
        title: "Multiplication",
        imageExample: IMG_MULTIPLICATION,
        notes:
          "Multiplication is a quick way to add the same number many times.\n3 × 4 means: add 3 four times = 3 + 3 + 3 + 3 = 12.\nThe '×' sign means multiply.\nLearning times tables makes multiplication faster.",
        amyPrompt: "Explain multiplication as repeated addition for a class 2-4 child with one example.",
        questions: [
          { q: "3 × 4 = ?", options: ["7", "10", "12", "14"], answer: 2 },
          { q: "5 × 5 = ?", options: ["10", "20", "25", "30"], answer: 2 },
          { q: "2 × 6 = ?", options: ["10", "12", "14", "16"], answer: 1 },
          { q: "1 × 9 = ?", options: ["0", "1", "9", "10"], answer: 2 },
          { q: "0 × 100 = ?", options: ["0", "1", "100", "200"], answer: 0, hint: "Any number times 0 equals 0." },
        ],
      },
      {
        id: "division",
        title: "Division",
        imageExample: IMG_DIVISION,
        notes:
          "Division means sharing equally or splitting into equal groups.\n12 ÷ 3 means: share 12 things into 3 equal groups → 4 in each group.\nThe '÷' sign means divide.\nDivision is the opposite of multiplication.",
        amyPrompt: "Explain division as equal sharing for a class 2-4 child with a sweets-sharing example.",
        questions: [
          { q: "12 ÷ 3 = ?", options: ["3", "4", "5", "6"], answer: 1 },
          { q: "10 ÷ 2 = ?", options: ["4", "5", "6", "8"], answer: 1 },
          { q: "8 ÷ 1 = ?",  options: ["0", "1", "8", "9"], answer: 2, hint: "Dividing by 1 gives the same number." },
          { q: "Division is the opposite of?", options: ["Addition", "Subtraction", "Multiplication", "Fractions"], answer: 2 },
        ],
      },
      {
        id: "fractions",
        title: "Fractions",
        imageExample: IMG_FRACTIONS,
        notes:
          "A fraction shows part of a whole.\nIf a pizza is cut into 4 equal pieces and you eat 1, you ate 1/4 of it.\nThe top number (numerator) = how many parts you have.\nThe bottom number (denominator) = total equal parts the whole is divided into.",
        amyPrompt: "Explain fractions using a pizza or chocolate example for a class 3-5 child.",
        questions: [
          { q: "A cake cut into 8 pieces — you eat 1. What fraction?", options: ["1/4", "1/8", "1/2", "8/1"], answer: 1 },
          { q: "Which fraction is bigger: 1/2 or 1/4?", options: ["1/2", "1/4", "Same", "Cannot tell"], answer: 0 },
          { q: "Bottom number of a fraction is called?", options: ["Numerator", "Denominator", "Whole", "Sum"], answer: 1 },
          { q: "Half of an apple = ?", options: ["1/2", "2/2", "1/4", "1"], answer: 0 },
        ],
      },
      {
        id: "geometry-basics",
        title: "Basic Shapes",
        imageExample: IMG_GEOMETRY_BASICS,
        notes:
          "Shapes are everywhere around us.\nA circle has no corners — like a wheel.\nA square has 4 equal sides and 4 corners — like a dice face.\nA triangle has 3 sides and 3 corners.\nA rectangle has 4 sides — opposite sides are equal — like a book cover.",
        amyPrompt: "Describe the 4 basic 2D shapes with one everyday example each for a class 1-3 child.",
        questions: [
          { q: "How many sides does a triangle have?", options: ["2", "3", "4", "5"], answer: 1 },
          { q: "A square has ___ equal sides.", options: ["2", "3", "4", "6"], answer: 2 },
          { q: "A circle has ___ corners.", options: ["0", "1", "2", "4"], answer: 0 },
          { q: "What shape is a book cover?", options: ["Circle", "Triangle", "Rectangle", "Star"], answer: 2 },
        ],
      },
      {
        id: "time-calendar",
        title: "Time & Calendar",
        imageExample: IMG_CLOCK,
        notes:
          "A clock shows us what time it is.\nThe short hand shows the hour. The long hand shows the minutes.\nThere are 24 hours in a day, 7 days in a week, and 12 months in a year.\nMonths: January, February, March, April, May, June, July, August, September, October, November, December.",
        amyPrompt: "Explain how to read a clock and name the days of the week for a class 1-3 child.",
        questions: [
          { q: "How many days are in a week?",   options: ["5", "6", "7", "8"], answer: 2 },
          { q: "How many months in a year?",      options: ["10", "11", "12", "13"], answer: 2 },
          { q: "The short hand on a clock shows?", options: ["Minutes", "Hours", "Seconds", "Days"], answer: 1 },
          { q: "Which month comes after March?",  options: ["February", "April", "May", "June"], answer: 1 },
        ],
      },
    ],
  },

  // ── Science ──────────────────────────────────────────────────────────────────
  {
    id: "science",
    title: "Science",
    emoji: "🔬",
    topics: [
      {
        id: "plants",
        title: "Parts of a Plant",
        imageExample: IMG_PLANTS,
        notes:
          "Plants have several main parts:\nRoots — hold the plant in soil and drink up water.\nStem — carries water from roots to leaves.\nLeaves — make food for the plant using sunlight (photosynthesis).\nFlower — makes seeds so new plants can grow.",
        amyPrompt: "List the main parts of a plant and what each one does, for a class 1-3 child.",
        questions: [
          { q: "Which part of a plant makes food?", options: ["Roots", "Stem", "Leaves", "Flower"], answer: 2 },
          { q: "Which part holds the plant in the soil?", options: ["Roots", "Leaves", "Flower", "Fruit"], answer: 0 },
          { q: "What helps plants make food?", options: ["Moonlight", "Sunlight", "Wind", "Snow"], answer: 1 },
          { q: "New plants grow from?", options: ["Stem", "Leaves", "Seeds", "Roots"], answer: 2 },
        ],
      },
      {
        id: "animals",
        title: "Animals & Their Habitats",
        imageExample: IMG_ANIMALS_HABITAT,
        notes:
          "Animals live in different places called habitats.\nPet animals (dog, cat) live with us at home.\nWild animals (lion, elephant) live in forests or jungles.\nFarm animals (cow, hen) live on farms.\nWater animals (fish, dolphin) live in rivers, lakes or seas.",
        amyPrompt: "Explain four types of animals with two examples each, for a class 1-3 child.",
        questions: [
          { q: "Where does a lion live?",   options: ["Home", "Farm", "Forest", "Sea"], answer: 2 },
          { q: "Which is a pet animal?",    options: ["Tiger", "Dog", "Shark", "Elephant"], answer: 1 },
          { q: "Fish live in?",             options: ["Forest", "Desert", "Water", "Air"], answer: 2 },
          { q: "Which animal gives us milk?", options: ["Cat", "Dog", "Cow", "Fish"], answer: 2 },
        ],
      },
      {
        id: "states-of-matter",
        title: "States of Matter",
        imageExample: IMG_STATES_OF_MATTER,
        notes:
          "Everything around us is made of matter.\nMatter has three main states: solid, liquid, and gas.\nA solid (like a stone) keeps its own shape.\nA liquid (like water) takes the shape of its container.\nA gas (like air) spreads out and fills everywhere.",
        amyPrompt: "Explain solid, liquid and gas with one everyday example each, for a class 3-5 child.",
        questions: [
          { q: "Which is a liquid?",   options: ["Wood", "Water", "Stone", "Ice"], answer: 1 },
          { q: "Which is a gas?",      options: ["Milk", "Air", "Sugar", "Sand"], answer: 1 },
          { q: "Ice is a ___?",        options: ["Solid", "Liquid", "Gas", "Plasma"], answer: 0 },
          { q: "How many main states of matter are there?", options: ["1", "2", "3", "5"], answer: 2 },
        ],
      },
      {
        id: "human-body",
        title: "Our Body",
        imageExample: IMG_HUMAN_BODY,
        notes:
          "Our body has many important parts.\nHead — has brain, eyes, ears, nose and mouth.\nArms and hands — used for holding, writing and eating.\nLegs and feet — used for walking, running and jumping.\nWe must take care of our body by eating well, exercising and sleeping.",
        amyPrompt: "Name the main body parts and their uses for a class 1-3 child.",
        questions: [
          { q: "Which part do we use to see?",    options: ["Ears", "Nose", "Eyes", "Mouth"], answer: 2 },
          { q: "Which part do we use to hear?",   options: ["Eyes", "Ears", "Hands", "Feet"], answer: 1 },
          { q: "What helps us walk and run?",      options: ["Arms", "Eyes", "Legs", "Mouth"], answer: 2 },
          { q: "Which organ controls our body?",   options: ["Heart", "Lungs", "Brain", "Stomach"], answer: 2 },
        ],
      },
      {
        id: "weather-seasons",
        title: "Weather & Seasons",
        imageExample: IMG_WEATHER,
        notes:
          "Weather tells us what the sky and air are like each day — sunny, rainy, cloudy, windy or cold.\nSeasons are longer changes: Spring, Summer, Autumn (Fall), and Winter.\nIn many places, spring brings flowers, summer is warm, autumn has falling leaves, and winter is cold.\nWe change our clothes and activities based on the weather.",
        amyPrompt: "Explain the four seasons and common weather types for a class 2-4 child with examples.",
        questions: [
          { q: "Which season is usually the hottest?",     options: ["Winter", "Summer", "Autumn", "Spring"], answer: 1 },
          { q: "When do many places get the most rain?", options: ["Summer", "Winter", "Spring", "Varies by region"], answer: 3 },
          { q: "We wear a coat in which season?",  options: ["Summer", "Autumn", "Winter", "Spring"], answer: 2 },
          { q: "What shows today's weather?",      options: ["Calendar", "Clock", "Thermometer/Sky", "Ruler"], answer: 2 },
        ],
      },
      {
        id: "food-nutrition",
        title: "Food & Nutrition",
        imageExample: IMG_FOOD_GROUPS,
        notes:
          "We eat food to get energy and stay healthy.\nFood groups: vegetables (broccoli, carrot), fruits (apple, banana), grains (rice, bread), protein (egg, chicken, beans), dairy (milk, cheese).\nEating all food groups is called a balanced diet.\nJunk food (chips, sugary drinks) has very little nutrition and should be eaten less.",
        amyPrompt: "Explain the food groups and why a balanced diet is important for a class 3-5 child.",
        questions: [
          { q: "Which gives us the most energy?",    options: ["Grains", "Sweets", "Water", "Salt"], answer: 0 },
          { q: "Milk belongs to which food group?",  options: ["Fruits", "Grains", "Dairy", "Protein"], answer: 2 },
          { q: "Eating all food groups is called?",  options: ["Junk diet", "Balanced diet", "Sweet diet", "Liquid diet"], answer: 1 },
          { q: "Which is a healthy food?",           options: ["Chips", "Cold drink", "Apple", "Candy"], answer: 2 },
        ],
      },
    ],
  },

  // ── English ───────────────────────────────────────────────────────────────────
  {
    id: "english",
    title: "English",
    emoji: "📖",
    topics: [
      {
        id: "nouns",
        title: "Nouns",
        imageExample: IMG_NOUNS,
        notes:
          "A noun is a naming word.\nIt names a person (Emma), a place (school), an animal (dog) or a thing (book).\nCommon nouns name general things (cat, city).\nProper nouns name specific things and start with a capital letter (London, Emma).",
        amyPrompt: "Explain nouns with simple examples for a class 1-3 child.",
        questions: [
          { q: "Which word is a noun?",    options: ["Run", "Quickly", "Apple", "Happy"], answer: 2 },
          { q: "Which is a proper noun?",  options: ["girl", "boy", "Emma", "school"], answer: 2 },
          { q: "A noun names a ___?",      options: ["sound only", "person, place, animal or thing", "colour only", "feeling only"], answer: 1 },
          { q: "Pick the noun: 'The dog is barking.'", options: ["barking", "loudly", "is", "dog"], answer: 3 },
        ],
      },
      {
        id: "verbs",
        title: "Verbs",
        imageExample: IMG_VERBS,
        notes:
          "A verb is an action or doing word.\nWords like run, eat, jump, write and read are verbs.\nVerbs tell us what someone or something is doing.\nEvery sentence must have a verb.",
        amyPrompt: "Explain verbs with three simple action examples for a class 1-3 child.",
        questions: [
          { q: "Which word is a verb?",        options: ["Tree", "Jump", "Blue", "Soft"], answer: 1 },
          { q: "Pick the verb: 'She reads a book.'", options: ["She", "reads", "a", "book"], answer: 1 },
          { q: "Which one is NOT a verb?",     options: ["Eat", "Sleep", "Apple", "Run"], answer: 2 },
          { q: "A verb is a ___ word.",        options: ["naming", "doing", "describing", "joining"], answer: 1 },
        ],
      },
      {
        id: "adjectives",
        title: "Adjectives",
        imageExample: IMG_ADJECTIVES,
        notes:
          "An adjective is a describing word — it tells us more about a noun.\nIt can describe size (big, small), colour (red, blue), shape (round, flat), taste (sweet, sour) or feel (hot, cold).\nExample: 'The big elephant' — 'big' is the adjective describing the elephant.",
        amyPrompt: "Explain adjectives with 5 simple examples for a class 2-4 child.",
        questions: [
          { q: "Which word is an adjective in 'sweet mango'?", options: ["mango", "sweet", "the", "a"], answer: 1 },
          { q: "An adjective describes a ___?",   options: ["verb", "noun", "pronoun", "sentence"], answer: 1 },
          { q: "Pick the adjective: 'a tall tree'", options: ["a", "tall", "tree", "is"], answer: 1 },
          { q: "Which is an adjective?",           options: ["jump", "slowly", "cold", "run"], answer: 2 },
        ],
      },
      {
        id: "pronouns",
        title: "Pronouns",
        imageExample: IMG_PRONOUNS,
        notes:
          "A pronoun is a word that replaces a noun to avoid repetition.\nExamples: I, you, he, she, it, we, they.\n'Emma is happy. She is happy.' — 'She' replaces 'Emma'.\nUsing pronouns makes sentences shorter and less repetitive.",
        amyPrompt: "Explain pronouns with examples for a class 2-4 child.",
        questions: [
          { q: "Which is a pronoun?",             options: ["Dog", "Run", "She", "Happy"], answer: 2 },
          { q: "Pronoun for 'Tom and Jake'?",    options: ["He", "She", "They", "It"], answer: 2 },
          { q: "Pronoun for one boy?",             options: ["She", "He", "They", "We"], answer: 1 },
          { q: "Pronouns are used to replace ___?", options: ["Adjectives", "Nouns", "Verbs", "Adverbs"], answer: 1 },
        ],
      },
      {
        id: "sentences",
        title: "Making Sentences",
        imageExample: IMG_SENTENCES,
        notes:
          "A sentence is a group of words that makes complete sense.\nEvery sentence has a subject (who/what) and a verb (action).\nIt starts with a capital letter and ends with a full stop, question mark or exclamation mark.\nExample: 'Emma reads books.' — Emma is the subject, reads is the verb.",
        amyPrompt: "Explain what makes a good sentence with two examples for a class 2-4 child.",
        questions: [
          { q: "A sentence must begin with a ___?", options: ["full stop", "comma", "capital letter", "question mark"], answer: 2 },
          { q: "Which is a complete sentence?",     options: ["running fast", "The dog barks.", "big red", "under the table"], answer: 1 },
          { q: "The 'doing' part of a sentence is the ___?", options: ["Subject", "Verb", "Object", "Adjective"], answer: 1 },
          { q: "A sentence ends with?", options: ["comma", "capital letter", "full stop / ? / !", "nothing"], answer: 2 },
        ],
      },
    ],
  },

  // ── General Knowledge ────────────────────────────────────────────────────────
  {
    id: "gk",
    title: "General Knowledge",
    emoji: "🌍",
    topics: [
      {
        id: "india-basics",
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
      {
        id: "solar-system",
        title: "Solar System",
        notes:
          "The Sun is at the centre of our solar system.\n8 planets orbit the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.\nEarth is the only known planet with life.\nThe Moon is Earth's natural satellite.",
        amyPrompt: "Tell a class 2-5 child about the planets in a fun, easy way with a memory trick.",
        questions: [
          { q: "How many planets in our solar system?", options: ["7", "8", "9", "10"], answer: 1 },
          { q: "Which planet do we live on?",           options: ["Mars", "Earth", "Venus", "Jupiter"], answer: 1 },
          { q: "Planet closest to the Sun?",            options: ["Earth", "Venus", "Mercury", "Mars"], answer: 2 },
          { q: "What is at the centre of the solar system?", options: ["Earth", "Moon", "Sun", "Jupiter"], answer: 2 },
        ],
      },
      {
        id: "indian-festivals",
        title: "Festivals Around the World",
        notes:
          "Festivals are special days when people celebrate with family and friends.\nChristmas — celebrated on 25 December with lights and gifts.\nDiwali — festival of lights in autumn.\nEid — celebrated after Ramadan with feasts and charity.\nChinese New Year — spring festival with dragons and red decorations.\nThanksgiving — harvest celebration in the United States and Canada.",
        amyPrompt: "Name 5 world festivals and one fun fact about each for a class 2-4 child.",
        questions: [
          { q: "Diwali is the festival of?",          options: ["Colours", "Lights", "Water", "Snow"], answer: 1 },
          { q: "Christmas is celebrated on?",          options: ["25 Nov", "25 Dec", "25 Jan", "25 Feb"], answer: 1 },
          { q: "Holi is famous for playing with?",    options: ["Water", "Lights", "Colours", "Snow"], answer: 2 },
          { q: "Thanksgiving is linked to giving thanks for?", options: ["Birthdays", "Harvest", "Rain", "Sports"], answer: 1 },
        ],
      },
      {
        id: "transport",
        title: "Modes of Transport",
        notes:
          "Transport means ways of travelling from one place to another.\nLand transport: bus, car, train, bicycle, scooter.\nWater transport: boat, ship, ferry.\nAir transport: aeroplane, helicopter.\nFastest transport: aeroplane. Slowest on land: walking.",
        amyPrompt: "Explain the three modes of transport with two examples each, for a class 1-3 child.",
        questions: [
          { q: "Which is air transport?",     options: ["Bus", "Ship", "Aeroplane", "Train"], answer: 2 },
          { q: "Which is water transport?",   options: ["Car", "Boat", "Bicycle", "Train"], answer: 1 },
          { q: "Which is the fastest way to travel?", options: ["Walking", "Bicycle", "Train", "Aeroplane"], answer: 3 },
          { q: "A train runs on ___?",        options: ["Road", "Water", "Tracks", "Air"], answer: 2 },
        ],
      },
      {
        id: "community-helpers",
        title: "Community Helpers",
        notes:
          "Community helpers are people who help others in our society.\nDoctor — treats sick people.\nTeacher — helps us learn.\nPolice officer — keeps us safe.\nFarmer — grows food for everyone.\nFirefighter — puts out fires. Postman — delivers letters.",
        amyPrompt: "Describe 5 community helpers and what they do, in a way a class 1-3 child can understand.",
        questions: [
          { q: "Who treats sick people?",      options: ["Teacher", "Farmer", "Doctor", "Driver"], answer: 2 },
          { q: "Who grows food for us?",       options: ["Doctor", "Farmer", "Police", "Teacher"], answer: 1 },
          { q: "Who keeps us safe on the road and in the city?", options: ["Farmer", "Doctor", "Police officer", "Postman"], answer: 2 },
          { q: "A teacher works in a ___?",   options: ["Hospital", "Farm", "School", "Factory"], answer: 2 },
        ],
      },
    ],
  },
];

export const BASIC_SUBJECTS: SubjectPack<BasicSubjectId>[] = enrichSubjectPacks(BASIC_SUBJECTS_DRAFT);
