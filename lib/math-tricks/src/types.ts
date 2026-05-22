export type MathTrickAge = "4-6" | "6-8";

export type MathTrickVisual = "none" | "fingers" | "numberline";

export type MathTrickPracticeQ = {
  question: string;
  options: string[];
  answer: string;
  hint: string;
};

export type MathTrick = {
  id: string;
  age: MathTrickAge;
  title: string;
  trick: string;
  example: string;
  emoji: string;
  color: string;
  audioText: string;
  practiceQ: MathTrickPracticeQ;
};
