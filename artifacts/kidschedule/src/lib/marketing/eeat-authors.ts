export type EeatAuthor = {
  id: string;
  name: string;
  role: string;
  credentials: string;
  profileUrl: string;
  bio: string;
};

export type EeatReviewer = {
  id: string;
  name: string;
  credentials: string;
  affiliation: string;
};

export type EeatCitation = {
  title: string;
  url: string;
  publisher?: string;
};

export const EEAT_AUTHORS: EeatAuthor[] = [
  {
    id: "amynest-editorial",
    name: "AmyNest Editorial Team",
    role: "Parenting Content Editor",
    credentials: "Child development research synthesis",
    profileUrl: "https://www.amynest.in/guides",
    bio: "AmyNest editorial team translates pediatric and developmental research into practical guides for parents worldwide.",
  },
  {
    id: "dr-priya-sharma",
    name: "Dr. Priya Sharma",
    role: "Pediatric Advisor",
    credentials: "MD Pediatrics, 12+ years clinical practice",
    profileUrl: "https://www.amynest.in/guides",
    bio: "Reviews infant nutrition and sleep content for clinical accuracy.",
  },
];

export const EEAT_REVIEWERS: EeatReviewer[] = [
  {
    id: "pediatric-review",
    name: "Dr. Priya Sharma",
    credentials: "MD Pediatrics",
    affiliation: "AmyNest Medical Review Board",
  },
  {
    id: "speech-review",
    name: "Ananya Mehta",
    credentials: "MSc Speech-Language Pathology",
    affiliation: "AmyNest Speech Development Advisory",
  },
];

export function getEeatAuthor(id: string): EeatAuthor | undefined {
  return EEAT_AUTHORS.find((author) => author.id === id);
}

export function getEeatReviewer(id: string): EeatReviewer | undefined {
  return EEAT_REVIEWERS.find((reviewer) => reviewer.id === id);
}
