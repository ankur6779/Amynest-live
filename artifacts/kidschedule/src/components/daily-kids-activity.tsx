import { useState, useMemo, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import { HUB_ORIGAMI, type HubOrigami } from "@workspace/parent-hub-speak";

// ─── Drive embed helper ───────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
function toEmbedUrl(url: string): string {
  const folderMatch = url.match(/\/folders\/([^?&#]+)/);
  if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
  const fileMatch = url.match(/\/d\/([^/?&#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  return url;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalItem = {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  embedUrl: string;
  downloadUrl: string;
  kind: "worksheet" | "reel";
};
type Worksheet = {
  id: string;
  title: string;
  emoji: string;
  bg: string;
  accent: string;
  fileUrl: string;
  ageMin: number;
  ageMax: number;
  subject: string;
};
type Reel = {
  id: string;
  title: string;
  emoji: string;
  bg: string;
  accent: string;
  videoUrl: string;
  duration: string;
  ageMin: number;
  ageMax: number;
};
type FoldShape = "start" | "halfH" | "halfV" | "diagFold" | "diamond" | "kite" | "blintz" | "foldUp" | "foldDown" | "pullOpen" | "crease" | "done";
type OrigamiStep = {
  fold: FoldShape;
  instruction: string;
};
type Origami = HubOrigami;
type ActivityState = {
  worksheetIds: string[];
  reelIds: string[];
  origamiIds: string[];
  doneIds: string[];
  savedIds: string[];
  origamiProgress?: Record<string, number>;
};

// ─── Datasets ────────────────────────────────────────────────────────────────
const WORKSHEETS: Worksheet[] = [{
  id: "ws1",
  title: "ABC Tracing Practice",
  emoji: "✏️",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-blue-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 24,
  ageMax: 60,
  subject: "Literacy"
}, {
  id: "ws2",
  title: "1–10 Number Counting",
  emoji: "🔢",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-emerald-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 24,
  ageMax: 60,
  subject: "Math"
}, {
  id: "ws3",
  title: "Color the Farm Animals",
  emoji: "🐄",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-orange-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 24,
  ageMax: 72,
  subject: "Art"
}, {
  id: "ws4",
  title: "Match the Shapes",
  emoji: "🔵",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-violet-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 24,
  ageMax: 60,
  subject: "Math"
}, {
  id: "ws5",
  title: "Big & Small Sort",
  emoji: "🐘",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-amber-600))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 24,
  ageMax: 54,
  subject: "Logic"
}, {
  id: "ws6",
  title: "Write My Name Practice",
  emoji: "✨",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-pink-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 36,
  ageMax: 84,
  subject: "Literacy"
}, {
  id: "ws7",
  title: "Spot the Difference",
  emoji: "👀",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-teal-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 36,
  ageMax: 96,
  subject: "Logic"
}, {
  id: "ws8",
  title: "Connect the Dots – Stars",
  emoji: "🌟",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-yellow-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 36,
  ageMax: 84,
  subject: "Art"
}, {
  id: "ws9",
  title: "Alphabet Coloring A–Z",
  emoji: "🎨",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-rose-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 36,
  ageMax: 72,
  subject: "Literacy"
}, {
  id: "ws10",
  title: "Simple Addition Fun",
  emoji: "➕",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-indigo-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 48,
  ageMax: 96,
  subject: "Math"
}, {
  id: "ws11",
  title: "Hindi Varnamala Tracing",
  emoji: "हि",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-emerald-600))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 36,
  ageMax: 84,
  subject: "Hindi"
}, {
  id: "ws12",
  title: "My Body Parts Worksheet",
  emoji: "🧍",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-sky-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 24,
  ageMax: 72,
  subject: "Science"
}, {
  id: "ws13",
  title: "Fruits & Vegetables Match",
  emoji: "🍎",
  bg: "bg-muted dark:bg-card",
  accent: "#84CC16",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 24,
  ageMax: 72,
  subject: "GK"
}, {
  id: "ws14",
  title: "Weather Chart Worksheet",
  emoji: "🌤️",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-cyan-500))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 48,
  ageMax: 96,
  subject: "Science"
}, {
  id: "ws15",
  title: "Multiplication Table 2–5",
  emoji: "✖️",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-violet-600))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 72,
  ageMax: 96,
  subject: "Math"
}, {
  id: "ws16",
  title: "Story Sequencing Cards",
  emoji: "📖",
  bg: "bg-muted dark:bg-card",
  accent: "#D946EF",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 60,
  ageMax: 96,
  subject: "Literacy"
}, {
  id: "ws17",
  title: "Map of India Fill-in",
  emoji: "🗺️",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-orange-600))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 72,
  ageMax: 96,
  subject: "GK"
}, {
  id: "ws18",
  title: "Colour the Rangoli",
  emoji: "🪔",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-red-600))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 36,
  ageMax: 96,
  subject: "Art"
}, {
  id: "ws19",
  title: "Opposite Words Match",
  emoji: "🔄",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-blue-600))",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 48,
  ageMax: 84,
  subject: "Literacy"
}, {
  id: "ws20",
  title: "Clock Reading Practice",
  emoji: "⏰",
  bg: "bg-muted",
  accent: "#78716C",
  fileUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  ageMin: 60,
  ageMax: 96,
  subject: "Math"
}];
const REELS: Reel[] = [{
  id: "r1",
  title: "Easy Paper Butterfly Craft",
  emoji: "🦋",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-pink-500))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "4 min",
  ageMin: 24,
  ageMax: 96
}, {
  id: "r2",
  title: "Rainbow Umbrella Painting",
  emoji: "🌈",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-amber-500))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "6 min",
  ageMin: 24,
  ageMax: 84
}, {
  id: "r3",
  title: "Clay Fruits – Mango & Apple",
  emoji: "🥭",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-orange-500))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "8 min",
  ageMin: 36,
  ageMax: 96
}, {
  id: "r4",
  title: "DIY Paper Crown for Kids",
  emoji: "👑",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-amber-600))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "5 min",
  ageMin: 24,
  ageMax: 84
}, {
  id: "r5",
  title: "Vegetable Stamp Art",
  emoji: "🥦",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-emerald-500))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "7 min",
  ageMin: 24,
  ageMax: 72
}, {
  id: "r6",
  title: "How to Draw a Lion – Easy",
  emoji: "🦁",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-amber-700))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "6 min",
  ageMin: 36,
  ageMax: 96
}, {
  id: "r7",
  title: "Sock Puppet Show Craft",
  emoji: "🧦",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-violet-600))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "9 min",
  ageMin: 36,
  ageMax: 84
}, {
  id: "r8",
  title: "Nature Collage with Leaves",
  emoji: "🍃",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-teal-600))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "7 min",
  ageMin: 24,
  ageMax: 96
}, {
  id: "r9",
  title: "Marble Run Paper Craft",
  emoji: "⚙️",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-blue-500))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "10 min",
  ageMin: 60,
  ageMax: 96
}, {
  id: "r10",
  title: "Diwali Diya Decoration",
  emoji: "🪔",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-red-600))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "8 min",
  ageMin: 36,
  ageMax: 96
}, {
  id: "r11",
  title: "Paper Plate Fish Mobile",
  emoji: "🐠",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-sky-600))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "5 min",
  ageMin: 24,
  ageMax: 72
}, {
  id: "r12",
  title: "Finger Printing Art – Flowers",
  emoji: "🌸",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-rose-500))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "6 min",
  ageMin: 24,
  ageMax: 72
}, {
  id: "r13",
  title: "Create a Paper Zoo",
  emoji: "🦒",
  bg: "bg-muted dark:bg-card",
  accent: "#65A30D",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "12 min",
  ageMin: 48,
  ageMax: 96
}, {
  id: "r14",
  title: "Sand Art Greeting Cards",
  emoji: "🏖️",
  bg: "bg-muted dark:bg-card",
  accent: "#CA8A04",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "8 min",
  ageMin: 48,
  ageMax: 96
}, {
  id: "r15",
  title: "Recycled Robot Craft",
  emoji: "🤖",
  bg: "bg-muted dark:bg-card",
  accent: "#475569",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "11 min",
  ageMin: 60,
  ageMax: 96
}, {
  id: "r16",
  title: "Paper Bag Puppet Animals",
  emoji: "🐸",
  bg: "bg-muted dark:bg-card",
  accent: "hsl(var(--brand-emerald-600))",
  videoUrl: "https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",
  duration: "7 min",
  ageMin: 24,
  ageMax: 84
}];
const ORIGAMI = HUB_ORIGAMI;

type OrigamiCategory = "All" | "Animals" | "Nature" | "Vehicles" | "Fun Shapes" | "Favorites";

const ORIGAMI_CATEGORIES: OrigamiCategory[] = ["All", "Animals", "Nature", "Vehicles", "Fun Shapes", "Favorites"];

const ORIGAMI_CATEGORY_EMOJI: Record<OrigamiCategory, string> = {
  All: "✨",
  Animals: "🐰",
  Nature: "🌷",
  Vehicles: "⛵",
  "Fun Shapes": "⭐",
  Favorites: "❤️",
};

const ORIGAMI_BADGES: Record<Origami["difficulty"], { icon: string; label: string; className: string }> = {
  Easy: {
    icon: "🟢",
    label: "Beginner",
    className: "text-emerald-950 bg-emerald-100/80 border-emerald-200/80",
  },
  Medium: {
    icon: "🟡",
    label: "Explorer",
    className: "text-amber-950 bg-amber-100/80 border-amber-200/80",
  },
  Fun: {
    icon: "🔴",
    label: "Master",
    className: "text-rose-950 bg-rose-100/80 border-rose-200/80",
  },
};

const ORIGAMI_ACHIEVEMENTS: Record<string, string> = {
  og1: "⛵ Boat Builder",
  og4: "🦋 Butterfly Artist",
  og7: "🐰 Bunny Beginner",
  og10: "⛵ Sail Captain",
};

function getOrigamiXp(item: Origami) {
  if (item.difficulty === "Easy") return 10;
  if (item.difficulty === "Medium") return 20;
  return 30;
}

function getOrigamiShortName(item: Origami) {
  return item.title
    .replace(/^Learn to make a\s+/i, "")
    .replace(/^Create a\s+/i, "")
    .replace(/^Make a\s+/i, "")
    .replace(/^Fold a\s+/i, "")
    .replace(/^Simple\s+/i, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\bPaper\b/gi, "")
    .trim();
}

function playOrigamiSuccessSound() {
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
    gain.connect(ctx.destination);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + index * 0.08);
      osc.connect(gain);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + 0.48);
    });
  } catch {
    /* Audio feedback is a nice-to-have and can be blocked by browser policy. */
  }
}

function categorizeOrigami(item: Origami): Exclude<OrigamiCategory, "All" | "Favorites"> {
  const text = `${item.title} ${item.emoji}`.toLowerCase();
  if (/[🐰🐸🦢🦚]/u.test(item.emoji) || /\b(bunny|frog|crane|peacock)\b/.test(text)) return "Animals";
  if (/[🌷🦋]/u.test(item.emoji) || /\b(flower|tulip|butterfly)\b/.test(text)) return "Nature";
  if (/[⛵✈️]/u.test(item.emoji) || /\b(boat|sailboat|airplane|plane)\b/.test(text)) return "Vehicles";
  return "Fun Shapes";
}

function getOrigamiVisual(item: Origami) {
  const category = categorizeOrigami(item);
  if (/\bbunny\b/i.test(item.title)) {
    return {
      gradient: "from-rose-100 via-pink-100 to-amber-50",
      accent: "#f472b6",
      shape: "bunny" as const,
      motif: "rabbit ears",
      glow: "bg-pink-300/50",
    };
  }
  if (/\bbutterfly\b/i.test(item.title)) {
    return {
      gradient: "from-violet-100 via-sky-100 to-cyan-100",
      accent: "#8b5cf6",
      shape: "butterfly" as const,
      motif: "wing folds",
      glow: "bg-violet-300/50",
    };
  }
  if (category === "Vehicles") {
    return {
      gradient: "from-sky-100 via-cyan-100 to-blue-200",
      accent: "#0ea5e9",
      shape: /\bairplane|plane\b/i.test(item.title) ? "plane" as const : "boat" as const,
      motif: "ocean folds",
      glow: "bg-cyan-300/50",
    };
  }
  if (/\bcrane\b/i.test(item.title)) {
    return {
      gradient: "from-amber-100 via-orange-100 to-yellow-200",
      accent: "#f59e0b",
      shape: "crane" as const,
      motif: "wish paper",
      glow: "bg-amber-300/50",
    };
  }
  if (category === "Nature") {
    return {
      gradient: "from-emerald-100 via-lime-100 to-teal-100",
      accent: "#10b981",
      shape: "flower" as const,
      motif: "garden folds",
      glow: "bg-emerald-300/50",
    };
  }
  return {
    gradient: "from-fuchsia-100 via-indigo-100 to-slate-100",
    accent: item.accent,
    shape: "star" as const,
    motif: "magic folds",
    glow: "bg-indigo-300/50",
  };
}

// ─── Seeded shuffle ───────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = s * 1664525 + 1013904223 & 0xffffffff;
    return Math.abs(s) / 0x7fffffff;
  };
}
function pickN<T extends {
  id: string;
}>(arr: T[], n: number, seed: number): T[] {
  const rng = seededRandom(seed);
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}
function dateSeed(childName: string): number {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
  let h = 0;
  for (const c of childName + dateStr) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return Math.abs(h);
}
function todayKey(childName: string) {
  const d = new Date();
  return `amynest_activity_${childName}_${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
}

// ─── Netflix-Style Drive Preview Modal ───────────────────────────────────────
function DrivePreviewModal({
  item,
  onClose,
  isSaved,
  onSave
}: {
  item: ModalItem;
  onClose(): void;
  isSaved: boolean;
  onSave(): void;
}) {
  const {
    t
  } = useTranslation();
  const isVideo = item.kind === "reel";
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">

      {/* ── Blurred dark backdrop ─────────────────────────────── */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />

      {/* ── Modal panel ──────────────────────────────────────── */}
      <div className="relative z-10 w-full sm:max-w-lg flex flex-col bg-[#0f0f0f] rounded-t-[28px] sm:rounded-[28px] shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-350" style={{
      maxHeight: "92vh"
    }}>

        {/* ── Close button (floating top-right) ─────────────── */}
        <button onClick={onClose} aria-label={t("components.daily_kids_activity.close")} className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-white/20 transition-all font-bold text-sm">✕</button>

        {/* ── Section label strip ───────────────────────────── */}
        <div className={`flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0 ${isVideo ? "text-primary" : "text-primary"}`}>
          <span className="text-base">{isVideo ? "🎥" : "📄"}</span>
          <span className="text-[11px] font-black uppercase tracking-widest">
            {isVideo ? "Watch & Learn" : "Worksheet Preview"}
          </span>
        </div>

        {/* ── Embedded iframe ───────────────────────────────── */}
        <div data-on-dark className="relative flex-shrink-0 bg-black overflow-hidden" style={{
        height: "52vw",
        maxHeight: 320,
        minHeight: 220
      }}>
          {/* Cinematic gradient overlay at bottom */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0f0f0f] to-transparent z-10 pointer-events-none" />
          <iframe src={item.embedUrl} title={item.title} className="w-full h-full border-0" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
        </div>

        {/* ── Content info ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-1">
          {/* Title */}
          <h2 className="text-white font-black text-xl leading-snug mb-1.5 pr-8">{item.title}</h2>
          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">{item.desc}</p>

          {/* ── Action buttons ────────────────────────────── */}
          <div className="flex flex-col gap-2.5 pb-5">

            {/* Primary: Play / Preview */}
            <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95" style={{
            background: isVideo ? "linear-gradient(135deg,hsl(var(--brand-rose-600)),hsl(var(--brand-orange-500)))" : "linear-gradient(135deg,hsl(var(--brand-blue-600)),hsl(var(--brand-violet-600)))"
          }}>
              <span className="text-white text-base">{isVideo ? "▶️" : "👁"}</span>
              <span className="text-white">{isVideo ? "Play Video" : "Open Full Preview"}</span>
            </a>

            {/* Secondary row: Download + Save */}
            <div className="flex gap-2.5">
              <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/10">
                <span className="text-white text-sm">⬇️</span>
                <span className="text-white font-bold text-sm">{t("components.daily_kids_activity.download")}</span>
              </a>
              <button onClick={onSave} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95 border font-bold text-sm ${isSaved ? "bg-primary border-primary text-primary" : "bg-white/10 border-white/10 text-white hover:bg-white/20"}`}>
                <span className="text-base">{isSaved ? "❤️" : "🤍"}</span>
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>

            {/* Close button */}
            <button onClick={onClose} className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/10 text-muted-foreground font-bold text-sm">
              {t("components.daily_kids_activity.close_2")}
            </button>
          </div>
        </div>

      </div>
    </div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DailyKidsActivity({
  childName,
  ageMonths
}: {
  childName: string;
  ageMonths: number;
}) {
  const {
    t
  } = useTranslation();
  // Only render for ages 24–95 months (2–7.9 years)
  if (ageMonths < 24 || ageMonths >= 96) return null;
  const seed = useMemo(() => dateSeed(childName), [childName]);
  const key = useMemo(() => todayKey(childName), [childName]);
  const filtered = useMemo(() => ({
    worksheets: WORKSHEETS.filter(w => ageMonths >= w.ageMin && ageMonths <= w.ageMax),
    reels: REELS.filter(r => ageMonths >= r.ageMin && ageMonths <= r.ageMax),
    origami: ORIGAMI.filter(o => ageMonths >= o.ageMin && ageMonths <= o.ageMax)
  }), [ageMonths]);
  const daily = useMemo(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const p = JSON.parse(saved) as ActivityState;
        const ws = filtered.worksheets.filter(w => p.worksheetIds.includes(w.id));
        const rs = filtered.reels.filter(r => p.reelIds.includes(r.id));
        const og = filtered.origami.filter(o => p.origamiIds.includes(o.id));
        if (ws.length >= 3 && rs.length >= 3 && og.length >= 3) return {
          ws,
          rs,
          og
        };
      } catch {/* fallthrough */}
    }
    const ws = pickN(filtered.worksheets, 4, seed);
    const rs = pickN(filtered.reels, 4, seed + 1);
    const og = pickN(filtered.origami, 4, seed + 2);
    localStorage.setItem(key, JSON.stringify({
      worksheetIds: ws.map(w => w.id),
      reelIds: rs.map(r => r.id),
      origamiIds: og.map(o => o.id),
      doneIds: [],
      savedIds: []
    }));
    return {
      ws,
      rs,
      og
    };
  }, [filtered, key, seed]);
  const [done, setDone] = useState<Set<string>>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "{}");
      return new Set(p.doneIds ?? []);
    } catch {
      return new Set();
    }
  });
  const [saved, setSaved] = useState<Set<string>>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "{}");
      return new Set(p.savedIds ?? []);
    } catch {
      return new Set();
    }
  });
  const [origamiProgress, setOrigamiProgress] = useState<Record<string, number>>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "{}") as ActivityState;
      return p.origamiProgress ?? {};
    } catch {
      return {};
    }
  });
  const [origamiCategory, setOrigamiCategory] = useState<OrigamiCategory>("All");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [celebration, setCelebration] = useState<{ item: Origami; xp: number } | null>(null);
  const [modalItem, setModalItem] = useState<ModalItem | null>(null);
  const [stepsItem, setStepsItem] = useState<Origami | null>(null);
  const persist = (d: Set<string>, s: Set<string>, progress: Record<string, number> = origamiProgress) => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "{}") as ActivityState;
      localStorage.setItem(key, JSON.stringify({
        ...p,
        doneIds: [...d],
        savedIds: [...s],
        origamiProgress: progress
      }));
    } catch {/* ignore */}
  };
  const showOrigamiCelebration = useCallback((item: Origami) => {
    playOrigamiSuccessSound();
    setCelebration({ item, xp: getOrigamiXp(item) });
  }, []);
  const toggleDone = (id: string) => {
    setDone(prev => {
      const next = new Set(prev);
      const nextProgress = { ...origamiProgress };
      const activity = daily.og.find(o => o.id === id);
      if (next.has(id)) {
        next.delete(id);
        nextProgress[id] = 0;
      } else {
        next.add(id);
        nextProgress[id] = activity?.steps.length ?? nextProgress[id] ?? 0;
        if (activity) showOrigamiCelebration(activity);
      }
      setOrigamiProgress(nextProgress);
      persist(next, saved, nextProgress);
      return next;
    });
  };
  const completeOrigami = (id: string) => {
    setDone(prev => {
      const next = new Set(prev);
      const wasDone = next.has(id);
      next.add(id);
      const activity = daily.og.find(o => o.id === id);
      const nextProgress = {
        ...origamiProgress,
        [id]: activity?.steps.length ?? origamiProgress[id] ?? 0,
      };
      setOrigamiProgress(nextProgress);
      persist(next, saved, nextProgress);
      if (activity && !wasDone) showOrigamiCelebration(activity);
      return next;
    });
  };
  const toggleSaved = (id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      persist(done, next);
      return next;
    });
  };
  const updateOrigamiProgress = (id: string, completedFolds: number) => {
    setOrigamiProgress(prev => {
      const activity = daily.og.find(o => o.id === id);
      const clamped = Math.max(0, Math.min(completedFolds, activity?.steps.length ?? completedFolds));
      const next = {
        ...prev,
        [id]: Math.max(prev[id] ?? 0, clamped),
      };
      persist(done, saved, next);
      return next;
    });
  };
  const openModal = (item: ModalItem) => setModalItem(item);
  const closeModal = () => setModalItem(null);
  const filteredOrigami = useMemo(() => {
    if (origamiCategory === "All") return daily.og;
    if (origamiCategory === "Favorites") return daily.og.filter(o => saved.has(o.id));
    return daily.og.filter(o => categorizeOrigami(o) === origamiCategory);
  }, [daily.og, origamiCategory, saved]);
  const completedOrigamiCount = daily.og.filter(o => done.has(o.id)).length;
  const activeOrigamiCount = daily.og.length;
  const completedCollection = ORIGAMI.filter(o => done.has(o.id));
  const lockedCollection = ORIGAMI.filter(o => !done.has(o.id)).slice(0, Math.max(3, 6 - completedCollection.length));
  const challenge = daily.og.find(o => /butterfly/i.test(o.title)) ?? daily.og[seed % Math.max(daily.og.length, 1)];
  const challengeProgress = challenge ? Math.round((Math.min(origamiProgress[challenge.id] ?? 0, challenge.steps.length) / challenge.steps.length) * 100) : 0;
  const foldingStreak = Math.max(1, completedOrigamiCount || saved.size || 3);
  const totalXp = completedCollection.reduce((sum, item) => sum + getOrigamiXp(item), 0);

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(null), 4600);
    return () => window.clearTimeout(timer);
  }, [celebration]);
  return <div className="space-y-5 animate-in fade-in duration-500">

      {/* ── Origami Steps Modal ─────────────────────────────────── */}
      {stepsItem && <OrigamiStepsModal
          item={stepsItem}
          childName={childName}
          onClose={() => setStepsItem(null)}
          initialStep={Math.min(origamiProgress[stepsItem.id] ?? 0, Math.max(stepsItem.steps.length - 1, 0))}
          onProgress={updateOrigamiProgress}
          onComplete={completeOrigami}
        />}

      {/* ── Drive Preview Modal ─────────────────────────────────── */}
      {modalItem && <DrivePreviewModal item={modalItem} onClose={closeModal} isSaved={saved.has(modalItem.id)} onSave={() => toggleSaved(modalItem.id)} />}
      {celebration && <OrigamiCelebrationToast item={celebration.item} xp={celebration.xp} onClose={() => setCelebration(null)} />}

      {/* ── Section Header ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-primary via-primary to-primary p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 -translate-y-8 translate-x-8 blur-sm" />
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-0.5">{t("components.daily_kids_activity.today_s_special")}</p>
          <h2 className="text-xl font-black">{t("components.daily_kids_activity.today_s_kids_activity")}</h2>
          <p className="text-sm text-white/90 mt-0.5">{t("components.daily_kids_activity.personalised_for")} {childName} {t("components.daily_kids_activity.daily_rotation")}</p>
        </div>
      </div>

      {/* ── Parent Guidance ────────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-2xl bg-muted dark:bg-card border border-border dark:border-border px-4 py-3">
        <span className="text-2xl">❤️</span>
        <p className="text-sm font-semibold text-primary dark:text-muted-foreground">
          {t("components.daily_kids_activity.spend_20_30_minutes_doing_this_activity_with_your_child")}
        </p>
      </div>

      {/* ── Origami ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 px-3 py-4 shadow-2xl shadow-slate-950/30">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_86%_5%,rgba(236,72,153,0.16),transparent_24%),linear-gradient(145deg,#071226_0%,#0f172a_48%,#111827_100%)]" />
        <div className="pointer-events-none absolute -left-16 top-20 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-10 h-44 w-44 rounded-full bg-fuchsia-300/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "linear-gradient(135deg,transparent 0 42%,#fff 42% 43%,transparent 43% 100%),linear-gradient(45deg,transparent 0 47%,#fff 47% 48%,transparent 48% 100%)",
          backgroundSize: "74px 74px",
        }} />

        <div className="relative z-10">
          <div className="mb-4 rounded-[1.6rem] border border-white/10 bg-white/[0.07] p-4 text-white shadow-xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Premium Studio</p>
                <h2 className="text-2xl font-black leading-tight">🧩 Origami Studio</h2>
                <p className="mt-1 text-sm font-semibold text-white/62">Fold • Create • Imagine</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="rounded-2xl border border-orange-200/20 bg-orange-400/12 px-3 py-2 text-right backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase tracking-wider text-orange-100/65">Streak</p>
                  <p className="text-sm font-black text-white"><span className="inline-block animate-pulse motion-reduce:animate-none">🔥</span> {foldingStreak} Day</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollectionOpen(open => !open)}
                  className="min-h-11 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white/80 backdrop-blur-md transition-all hover:bg-white/15 hover:text-white active:scale-95"
                  aria-expanded={collectionOpen}
                >
                  📚 My Collection
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-2.5 py-2 text-center shadow-inner backdrop-blur-md">
                <p className="text-lg">⭐</p>
                <p className="text-sm font-black">{ORIGAMI.length}</p>
                <p className="text-[10px] font-bold text-white/55">Activities</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-2.5 py-2 text-center shadow-inner backdrop-blur-md">
                <p className="text-lg">🏆</p>
                <p className="text-sm font-black">{completedOrigamiCount}</p>
                <p className="text-[10px] font-bold text-white/55">Completed</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-2.5 py-2 text-center shadow-inner backdrop-blur-md">
                <p className="text-lg">🔥</p>
                <p className="text-sm font-black">{totalXp}</p>
                <p className="text-[10px] font-bold text-white/55">XP Earned</p>
              </div>
            </div>
          </div>

          {challenge && <OrigamiChallengeHero
            item={challenge}
            progress={challengeProgress}
            done={done.has(challenge.id)}
            onStart={() => setStepsItem(challenge)}
          />}

          {collectionOpen && <OrigamiCollectionBook completed={completedCollection} locked={lockedCollection} totalXp={totalXp} />}

          {completedOrigamiCount === 0 && <div className="mb-4 overflow-hidden rounded-[1.6rem] border border-cyan-200/15 bg-gradient-to-br from-cyan-400/14 via-white/[0.07] to-violet-400/14 p-4 text-white shadow-xl shadow-slate-950/20">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.35rem] bg-white/12 shadow-inner">
                <svg viewBox="0 0 90 90" className="h-16 w-16 drop-shadow-lg" aria-hidden="true">
                  <path d="M16 52 45 14l29 38-29 24z" fill="rgba(255,255,255,.92)" />
                  <path d="M45 14v62M16 52h58" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 5" />
                  <path d="M45 14 29 76h32z" fill="rgba(129,140,248,.42)" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black">Your Origami Journey Starts Here</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-white/58">Unlock badges, build a paper collection, and earn XP with every finished model.</p>
                {challenge && <button
                  type="button"
                  onClick={() => setStepsItem(challenge)}
                  className="mt-3 min-h-11 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-lg transition-all hover:scale-[1.02] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                  Create First Model
                </button>}
              </div>
            </div>
          </div>}

          <div className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {ORIGAMI_CATEGORIES.map(category => {
              const active = origamiCategory === category;
              return <button
                key={category}
                type="button"
                onClick={() => setOrigamiCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition-all active:scale-95 ${active ? "border-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 text-white shadow-lg shadow-blue-950/40" : "border-white/10 bg-white/[0.07] text-white/62 backdrop-blur-md hover:bg-white/12 hover:text-white"}`}
              >
                <span className="mr-1.5">{ORIGAMI_CATEGORY_EMOJI[category]}</span>{category}
              </button>;
            })}
          </div>

          {filteredOrigami.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredOrigami.map(o => <OrigamiCard
              key={o.id}
              item={o}
              done={done.has(o.id)}
              saved={saved.has(o.id)}
              progress={origamiProgress[o.id] ?? 0}
              onDone={() => toggleDone(o.id)}
              onSave={() => toggleSaved(o.id)}
              onViewSteps={() => setStepsItem(o)}
            />)}
          </div> : <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.05] px-5 py-8 text-center text-white/70">
            <p className="text-3xl mb-2">💌</p>
            <p className="text-sm font-black">No saved missions yet</p>
            <p className="mt-1 text-xs font-semibold text-white/45">Tap Save on an origami card to build a favorites shelf.</p>
          </div>}
        </div>
      </section>

    </div>;
}

// ─── Section Block ─────────────────────────────────────────────────────────────
function SectionBlock({
  emoji,
  title,
  subtitle,
  children
}: {
  emoji: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className="font-bold text-sm text-foreground leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>;
}

// ─── Worksheet Card ───────────────────────────────────────────────────────────
function WorksheetCard({
  item,
  done,
  saved,
  onDone,
  onSave,
  onPreview
}: {
  item: Worksheet;
  done: boolean;
  saved: boolean;
  onDone(): void;
  onSave(): void;
  onPreview(): void;
}) {
  const {
    t
  } = useTranslation();
  return <div className={`rounded-xl border overflow-hidden flex flex-col transition-all ${done ? "opacity-70" : ""}`}>
      {/* Preview area — clickable to open modal */}
      <div role="button" tabIndex={0} onClick={onPreview} onKeyDown={e => e.key === "Enter" && onPreview()} className={`relative ${item.bg} flex flex-col items-center justify-center p-3 h-28 w-full group cursor-pointer`}>
        {done && <div className="absolute inset-0 bg-primary flex items-center justify-center rounded-t-xl">
            <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">✓</div>
          </div>}
        {/* Preview hint on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-t-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-[10px] font-black text-white bg-black/50 rounded-full px-2 py-0.5">{t("components.daily_kids_activity.preview")}</span>
        </div>
        <span className="text-3xl mb-1">{item.emoji}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-foreground">{item.subject}</span>
        <button onClick={e => {
        e.stopPropagation();
        onSave();
      }} className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full transition-all ${saved ? "bg-primary text-white" : "bg-white/60 text-muted-foreground hover:bg-white"}`} title={saved ? "Unsave" : "Save for later"}>
          <span className="text-xs">{saved ? "♥" : "♡"}</span>
        </button>
      </div>
      {/* Info + actions */}
      <div className="p-2 flex-1 flex flex-col justify-between bg-card">
        <p className="text-xs font-bold text-foreground leading-snug mb-2">{item.title}</p>
        <div className="flex gap-1.5">
          <button onClick={onPreview} className="flex-1 text-center text-[10px] font-bold py-1 rounded-lg bg-muted dark:bg-card text-primary dark:text-muted-foreground hover:bg-primary hover:text-white transition-colors">
            {t("components.daily_kids_activity.preview_2")}
          </button>
          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[10px] font-bold py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            {t("components.daily_kids_activity.drive")}
          </a>
        </div>
        <button onClick={onDone} className={`w-full mt-1.5 text-[10px] font-bold py-1 rounded-lg transition-colors ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted dark:bg-card hover:text-primary dark:text-muted-foreground"}`}>
          {done ? "✓ Done" : "Mark Done"}
        </button>
      </div>
    </div>;
}

// ─── Reel Card ────────────────────────────────────────────────────────────────
function ReelCard({
  item,
  done,
  saved,
  onDone,
  onSave,
  onPreview
}: {
  item: Reel;
  done: boolean;
  saved: boolean;
  onDone(): void;
  onSave(): void;
  onPreview(): void;
}) {
  const {
    t
  } = useTranslation();
  return <div className={`rounded-xl border overflow-hidden flex flex-col transition-all ${done ? "opacity-70" : ""}`}>
      {/* Thumbnail area — click to open modal */}
      <div role="button" tabIndex={0} onClick={onPreview} onKeyDown={e => e.key === "Enter" && onPreview()} className={`relative ${item.bg} flex flex-col items-center justify-center h-28 w-full group cursor-pointer`}>
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </div>
        <span className="text-3xl">{item.emoji}</span>
        <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-foreground">{item.duration}</span>
        {done && <div className="absolute top-2 left-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold pointer-events-none">✓</div>}
        <button onClick={e => {
        e.stopPropagation();
        onSave();
      }} className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full transition-all ${saved ? "bg-primary text-white" : "bg-white/60 text-muted-foreground hover:bg-white"}`}>
          <span className="text-xs">{saved ? "♥" : "♡"}</span>
        </button>
      </div>
      {/* Info */}
      <div className="p-2 flex-1 flex flex-col justify-between bg-card">
        <p className="text-xs font-bold text-foreground leading-snug mb-2">{item.title}</p>
        <div className="flex gap-1.5 mb-1.5">
          <button onClick={onPreview} className="flex-1 text-[10px] font-bold py-1 rounded-lg bg-muted dark:bg-card text-primary dark:text-muted-foreground hover:bg-primary hover:text-white transition-colors">
            {t("components.daily_kids_activity.play")}
          </button>
          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[10px] font-bold py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            {t("components.daily_kids_activity.drive_2")}
          </a>
        </div>
        <button onClick={onDone} className={`w-full text-[10px] font-bold py-1 rounded-lg transition-colors ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted dark:bg-card hover:text-primary dark:text-muted-foreground"}`}>
          {done ? "✓ Watched" : "Mark Done"}
        </button>
      </div>
    </div>;
}

// ─── Origami Card ─────────────────────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-muted dark:bg-card text-primary dark:text-muted-foreground",
  Medium: "bg-muted dark:bg-card text-primary dark:text-muted-foreground",
  Fun: "bg-muted dark:bg-card text-primary dark:text-muted-foreground"
};

// ─── Fold Diagram SVG Data ───────────────────────────────────────────────────
const FOLD_SVG: Record<FoldShape, {
  d: string;
  fill: string;
  crease?: string;
  arrowD?: string;
}> = {
  start: {
    d: "M10,10 L90,10 L90,90 L10,90 Z",
    fill: "hsl(var(--brand-amber-100))",
    crease: "M50,10 L50,90 M10,50 L90,50"
  },
  halfH: {
    d: "M10,35 L90,35 L90,65 L10,65 Z",
    fill: "hsl(var(--brand-blue-100))",
    crease: "M10,50 L90,50",
    arrowD: "M50,62 L50,38"
  },
  halfV: {
    d: "M35,10 L65,10 L65,90 L35,90 Z",
    fill: "hsl(var(--brand-blue-100))",
    crease: "M50,10 L50,90",
    arrowD: "M62,50 L38,50"
  },
  diagFold: {
    d: "M10,10 L90,90 L10,90 Z",
    fill: "hsl(var(--brand-indigo-100))",
    crease: "M10,10 L90,90"
  },
  diamond: {
    d: "M50,10 L90,50 L50,90 L10,50 Z",
    fill: "hsl(var(--brand-pink-100))",
    crease: "M10,50 L90,50 M50,10 L50,90"
  },
  kite: {
    d: "M50,10 L85,58 L50,82 L15,58 Z",
    fill: "hsl(var(--brand-emerald-100))",
    crease: "M50,10 L50,82",
    arrowD: "M15,58 L50,10"
  },
  blintz: {
    d: "M50,10 L90,50 L50,90 L10,50 Z",
    fill: "hsl(var(--brand-amber-100))",
    crease: "M10,10 L90,90 M90,10 L10,90"
  },
  foldUp: {
    d: "M10,40 L90,40 L90,90 L10,90 Z",
    fill: "hsl(var(--brand-green-100))",
    crease: "M10,40 L90,40",
    arrowD: "M50,66 L50,42"
  },
  foldDown: {
    d: "M10,10 L90,10 L90,60 L10,60 Z",
    fill: "hsl(var(--brand-red-100))",
    crease: "M10,60 L90,60",
    arrowD: "M50,34 L50,58"
  },
  pullOpen: {
    d: "M15,25 L85,25 L92,75 L8,75 Z",
    fill: "hsl(var(--brand-green-100))",
    crease: "M50,25 L50,75",
    arrowD: "M28,50 L8,50"
  },
  crease: {
    d: "M10,10 L90,10 L90,90 L10,90 Z",
    fill: "hsl(var(--brand-violet-50))",
    crease: "M10,50 L90,50 M50,10 L50,90"
  },
  done: {
    d: "",
    fill: ""
  }
};

// ─── Fold Diagram Component ──────────────────────────────────────────────────
function FoldDiagram({
  fold,
  emoji,
  size = 88
}: {
  fold: FoldShape;
  emoji: string;
  size?: number;
}) {
  const {
    t
  } = useTranslation();
  if (fold === "done") {
    return <div className="flex flex-col items-center justify-center gap-1" style={{
      width: size,
      height: size
    }}>
        <span style={{
        fontSize: size * 0.48
      }}>{emoji}</span>
        <span className="text-[10px] font-bold text-primary bg-muted dark:bg-card px-2 py-0.5 rounded-full">{t("components.daily_kids_activity.final")}</span>
      </div>;
  }
  const cfg = FOLD_SVG[fold];
  const uid = fold + size;
  return <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-md">
      <defs>
        <filter id={`sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#00000030" />
        </filter>
        <marker id={`arr-${uid}`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="hsl(var(--brand-amber-500))" />
        </marker>
      </defs>
      {/* Paper shape */}
      <path d={cfg.d} fill={cfg.fill} stroke="#94A3B8" strokeWidth="1.5" filter={`url(#sh-${uid})`} />
      {/* Crease lines */}
      {cfg.crease && <path d={cfg.crease} stroke="hsl(var(--brand-indigo-400))" strokeWidth="1.5" strokeDasharray="4,2.5" fill="none" />}
      {/* Direction arrow */}
      {cfg.arrowD && <path d={cfg.arrowD} stroke="hsl(var(--brand-amber-500))" strokeWidth="2.5" fill="none" strokeLinecap="round" markerEnd={`url(#arr-${uid})`} />}
    </svg>;
}

// ─── Origami Steps Modal ─────────────────────────────────────────────────────
//
// Rendered via createPortal so it escapes any CSS stacking-context created by
// parent containers (backdrop-blur, transform, will-change, etc.) which would
// prevent `position:fixed` from covering the whole viewport.
//
// Phases: "cover" → "steps" → "done"
// Animation: per-fold CSS keyframes + SVG arrow draw-in via stroke-dashoffset

type OrigamiPhase = "cover" | "steps" | "done";
const DIFFICULTY_TIME: Record<string, string> = {
  Easy: "~5 min",
  Medium: "~10 min",
  Fun: "~15 min"
};

// Per-fold: SVG arrow path (viewBox 0 0 100 100), CSS animation name, hint
const FOLD_META: Record<FoldShape, {
  arrowD: string;
  paperAnim: string;
  hint: string;
}> = {
  start: {
    arrowD: "",
    paperAnim: "og-appear",
    hint: "Flatten"
  },
  halfH: {
    arrowD: "M50,24 L50,50 M43,43 L50,51 L57,43",
    paperAnim: "og-fold-h",
    hint: "Fold ↓"
  },
  halfV: {
    arrowD: "M76,50 L50,50 M57,43 L49,50 L57,57",
    paperAnim: "og-fold-v",
    hint: "Fold →"
  },
  diagFold: {
    arrowD: "M22,22 L68,68 M60,62 L70,70 L62,60",
    paperAnim: "og-fold-diag",
    hint: "Fold ↘"
  },
  diamond: {
    arrowD: "M50,12 L50,45 M43,38 L50,46 L57,38 M50,88 L50,55 M43,62 L50,54 L57,62",
    paperAnim: "og-rotate",
    hint: "Rotate"
  },
  kite: {
    arrowD: "M22,58 L50,14 M46,25 L50,14 L54,25",
    paperAnim: "og-fold-kite",
    hint: "Fold ↑"
  },
  blintz: {
    arrowD: "M16,16 L46,46 M78,16 L54,46 M16,78 L46,54 M78,78 L54,54",
    paperAnim: "og-blintz",
    hint: "Fold in"
  },
  foldUp: {
    arrowD: "M50,80 L50,46 M43,53 L50,45 L57,53",
    paperAnim: "og-fold-up",
    hint: "Fold ↑"
  },
  foldDown: {
    arrowD: "M50,20 L50,54 M43,47 L50,55 L57,47",
    paperAnim: "og-fold-dn",
    hint: "Fold ↓"
  },
  pullOpen: {
    arrowD: "M34,50 L12,50 M18,43 L10,50 L18,57 M66,50 L88,50 M82,43 L90,50 M82,57",
    paperAnim: "og-pull",
    hint: "Open"
  },
  crease: {
    arrowD: "M50,14 L50,86 M14,50 L86,50",
    paperAnim: "og-crease",
    hint: "Crease"
  },
  done: {
    arrowD: "",
    paperAnim: "og-done",
    hint: "Done!"
  }
};

// ── Animated fold stage ──────────────────────────────────────────────────────
function AnimatedFoldStage({
  fold,
  emoji,
  accent,
  animKey,
  isPlaying
}: {
  fold: FoldShape;
  emoji: string;
  accent: string;
  animKey: number;
  isPlaying: boolean;
}) {
  const meta = FOLD_META[fold];
  const ANIM_DUR = "900ms";
  return <div style={{
    position: "relative",
    width: 200,
    height: 200
  }}>
      {/* Paper diagram — CSS fold animation */}
      <div key={`paper-${animKey}`} style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: isPlaying ? `${meta.paperAnim} ${ANIM_DUR} cubic-bezier(0.22,1,0.36,1) both` : "none",
      transformOrigin: "center center"
    }}>
        <FoldDiagram fold={fold} emoji={emoji} size={164} />
      </div>

      {/* Direction arrow overlay — draws itself in */}
      {meta.arrowD && isPlaying && <svg key={`arrow-${animKey}`} viewBox="0 0 100 100" style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      overflow: "visible"
    }}>
          {/* Glow layer */}
          <path d={meta.arrowD} stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" style={{
        strokeDasharray: 220,
        strokeDashoffset: 220,
        animation: "og-draw-arrow 700ms 200ms ease-out forwards"
      }} />
          {/* Main arrow */}
          <path d={meta.arrowD} stroke="hsl(var(--brand-amber-300))" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{
        strokeDasharray: 220,
        strokeDashoffset: 220,
        animation: "og-draw-arrow 700ms 200ms ease-out forwards"
      }} />
          {/* Hint text badge */}
          <text x="50" y="96" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="hsl(var(--brand-amber-300))" fontFamily="system-ui,sans-serif" style={{
        opacity: 0,
        animation: "og-fade-in 300ms 700ms ease forwards",
        letterSpacing: "0.08em",
        textTransform: "uppercase"
      }}>
            {meta.hint}
          </text>
        </svg>}

      {/* Crease pulse line (when not playing — static indicator) */}
      {!isPlaying && meta.arrowD && <svg viewBox="0 0 100 100" style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none"
    }}>
          <path d={meta.arrowD} stroke="#FBBF2460" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
        </svg>}
    </div>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function origamiCompletionsKey(childName: string) {
  return `amynest.origami.completions.${childName.replace(/\s+/g, "_").toLowerCase()}`;
}

function recordOrigamiCompletion(childName: string, origamiId: string): number {
  try {
    const key = origamiCompletionsKey(childName);
    const raw = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, number>;
    raw[origamiId] = (raw[origamiId] ?? 0) + 1;
    localStorage.setItem(key, JSON.stringify(raw));
    return Object.values(raw).reduce((a, b) => a + b, 0);
  } catch {
    return 1;
  }
}

function OrigamiStepsModal({
  item,
  childName,
  onClose,
  initialStep = 0,
  onProgress,
  onComplete
}: {
  item: Origami;
  childName: string;
  onClose(): void;
  initialStep?: number;
  onProgress?(origamiId: string, completedFolds: number): void;
  onComplete?(origamiId: string): void;
}) {
  const {
    t
  } = useTranslation();
  const [phase, setPhase] = useState<OrigamiPhase>("cover");
  const [step, setStep] = useState(initialStep);
  const [animKey, setAnimKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [completionTotal, setCompletionTotal] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const total = item.steps.length;
  const {
    speak,
    pause,
    speaking,
    primeSpeakGesture,
  } = useAmyVoice();
  const goTo = useCallback((next: number) => {
    setStep(next);
    onProgress?.(item.id, next);
    setAnimKey(k => k + 1);
    setIsPlaying(true);
  }, [item.id, onProgress]);
  const goNext = useCallback(() => {
    setStep(prev => {
      const next = prev + 1;
      if (next >= total) {
        setPhase("done");
        const totalDone = recordOrigamiCompletion(childName, item.id);
        setCompletionTotal(totalDone);
        onProgress?.(item.id, total);
        onComplete?.(item.id);
        return prev;
      }
      onProgress?.(item.id, next);
      setAnimKey(k => k + 1);
      setIsPlaying(true);
      return next;
    });
  }, [total, childName, item.id, onProgress, onComplete]);
  const goPrev = useCallback(() => {
    setStep(prev => {
      if (prev <= 0) return prev;
      setAnimKey(k => k + 1);
      setIsPlaying(true);
      return prev - 1;
    });
  }, []);
  const replay = useCallback(() => {
    setAnimKey(k => k + 1);
    setIsPlaying(true);
  }, []);
  const restart = () => {
    setStep(0);
    onProgress?.(item.id, 0);
    setAnimKey(k => k + 1);
    setIsPlaying(true);
    setPhase("steps");
  };

  const speakCurrentStep = useCallback(
    (opts?: { onFinished?: () => void }) => {
      if (!voiceOn || phase !== "steps") return;
      const instruction = item.steps[step]?.instruction?.trim();
      if (!instruction) return;
      const identity = createParentHubAudioIdentity({
        sectionId: PARENT_HUB_SECTIONS.KIDS_ACTIVITY,
        itemId: `${item.id}:step-${step}`,
        text: instruction,
      });
      void speak(identity.text, {
        parentHub: true,
        audioIdentity: identity,
        waitUntilEnd: true,
        onFinished: opts?.onFinished,
      });
    },
    [voiceOn, phase, step, item.steps, item.id, speak],
  );

  const primeCurrentStep = useCallback(() => {
    const instruction = item.steps[step]?.instruction?.trim();
    if (instruction) {
      primeSpeakGesture(instruction, { parentHub: true });
    }
  }, [item.steps, step, primeSpeakGesture]);

  useEffect(() => {
    if (!voiceOn || phase !== "steps") return;
    if (autoPlay && isPlaying) {
      speakCurrentStep({
        onFinished: () => {
          if (autoPlay && isPlaying) {
            window.setTimeout(() => goNext(), 500);
          }
        },
      });
    } else {
      speakCurrentStep();
    }
  }, [step, voiceOn, phase, autoPlay, isPlaying, speakCurrentStep, goNext]);

  const handleClose = useCallback(() => {
    pause();
    onClose();
  }, [pause, onClose]);

  // Auto-play without voice — advance after animation (~3 s)
  useEffect(() => {
    if (!autoPlay || !isPlaying || phase !== "steps" || voiceOn) return;
    const timer = window.setTimeout(() => goNext(), 3200);
    return () => window.clearTimeout(timer);
  }, [autoPlay, isPlaying, phase, animKey, goNext, voiceOn]);

  const shareCompletion = useCallback(async () => {
    const message = t("components.daily_kids_activity.share_message", {
      child: childName,
      title: item.title,
      emoji: item.emoji,
    });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: t("components.daily_kids_activity.share_title"),
          text: message,
        });
        setShared(true);
        return;
      }
    } catch {
      /* user cancelled share */
    }
    try {
      await navigator.clipboard.writeText(message);
      setShared(true);
    } catch {
      /* ignore */
    }
  }, [childName, item.title, item.emoji, t]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (phase === "steps") {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
        if (e.key === " ") {
          e.preventDefault();
          setIsPlaying(p => !p);
        }
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [phase, handleClose, goNext, goPrev]);
  const cur = item.steps[step]!;
  const timeEst = DIFFICULTY_TIME[item.difficulty] ?? "~10 min";

  // ── shared shell ────────────────────────────────────────────────────────────
  const shell = <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={item.title}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" style={{
      animation: "og-fade-in 180ms ease both"
    }} onClick={handleClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md flex flex-col overflow-hidden shadow-2xl" style={{
      maxHeight: "96dvh",
      borderRadius: "28px 28px 0 0",
      animation: "og-slide-up 320ms cubic-bezier(0.34,1.56,0.64,1) both"
    }}>

        {/* ── PHASE: cover ────────────────────────────────────────────── */}
        {phase === "cover" && <div className="flex flex-col items-center text-center overflow-y-auto" style={{
        background: "linear-gradient(160deg,hsl(var(--brand-indigo-950)) 0%,#0f0f1a 100%)"
      }}>
            <button onClick={handleClose} aria-label={t("components.daily_kids_activity.close_3")} className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all">✕</button>

            {/* Animated preview */}
            <div className="mt-10 mb-4 rounded-3xl flex items-center justify-center shadow-2xl border border-white/10" style={{
          width: 148,
          height: 148,
          background: item.accent + "28",
          animation: "og-appear 600ms cubic-bezier(0.34,1.56,0.64,1) both"
        }}>
              <span style={{
            fontSize: 80
          }}>{item.emoji}</span>
            </div>

            <h2 className="text-white font-black text-xl px-6 leading-snug mb-3">{item.title}</h2>

            <div className="flex items-center gap-2 flex-wrap justify-center mb-5 px-4">
              <span className={`text-xs font-black px-3 py-1 rounded-full ${DIFFICULTY_COLORS[item.difficulty]}`}>
                {item.difficulty}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white/80">
                🕐 {timeEst}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white/80">
                {total} {t("components.daily_kids_activity.steps")}
              </span>
            </div>

            {/* Step preview dots */}
            <div className="flex gap-1.5 mb-4">
              {item.steps.map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-white/30" />)}
            </div>

            {/* Feature pills */}
            <div className="flex gap-2 mb-8 text-[11px] text-white/50 font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-white/8 border border-white/10">{t("components.daily_kids_activity.animated")}</span>
              <span className="px-2.5 py-1 rounded-full bg-white/8 border border-white/10">{t("components.daily_kids_activity.voice")}</span>
              <span className="px-2.5 py-1 rounded-full bg-white/8 border border-white/10">{t("components.daily_kids_activity.auto_play")}</span>
            </div>

            <button onClick={() => {
          setPhase("steps");
          setIsPlaying(true);
          setVoiceOn(true);
        }} className="mx-6 mb-10 w-[calc(100%-3rem)] py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95" style={{
          background: `linear-gradient(135deg,${item.accent},${item.accent}bb)`
        }}>
              {t("components.daily_kids_activity.let_s_start_folding")}
            </button>
          </div>}

        {/* ── PHASE: steps ────────────────────────────────────────────── */}
        {phase === "steps" && <div className="flex flex-col" style={{
        background: "#0f0f18"
      }}>
            {/* Close */}
            <button onClick={handleClose} aria-label={t("components.daily_kids_activity.close_4")} className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all">✕</button>

            {/* ── Top bar: title + step badge + progress ── */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate max-w-[55%]">
                  {item.title}
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Auto-play toggle */}
                  <button onClick={() => setAutoPlay(a => !a)} aria-label={t("components.daily_kids_activity.toggle_auto_play")} className="text-[10px] font-black px-2 py-0.5 rounded-full border transition-all" style={{
                borderColor: autoPlay ? item.accent : "rgba(255,255,255,0.15)",
                color: autoPlay ? item.accent : "rgba(255,255,255,0.35)",
                background: autoPlay ? item.accent + "22" : "transparent"
              }}>
                    {t("components.daily_kids_activity.auto")}
                  </button>
                  {/* Voice toggle */}
                  <button onClick={() => {
                setVoiceOn(v => {
                  const next = !v;
                  if (!next) pause();
                  return next;
                });
              }} aria-label={t("components.daily_kids_activity.toggle_voice")} className="text-[10px] font-black px-2 py-0.5 rounded-full border transition-all" style={{
                borderColor: voiceOn ? "hsl(var(--brand-green-500))" : "rgba(255,255,255,0.15)",
                color: voiceOn ? "hsl(var(--brand-green-500))" : "rgba(255,255,255,0.35)",
                background: voiceOn ? "#22c55e22" : "transparent"
              }}>
                    {speaking ? "🔊" : voiceOn ? "🔊" : "🔇"}
                  </button>
                  {/* Step badge */}
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full text-white" style={{
                background: item.accent
              }}>
                    {step + 1} / {total}
                  </span>
                </div>
              </div>

              {/* Segmented progress bar — clickable */}
              <div className="flex gap-1">
                {item.steps.map((_, i) => <button key={i} onClick={() => goTo(i)} className="h-1.5 rounded-full flex-1 transition-all duration-300" style={{
              background: i < step ? "hsl(var(--brand-emerald-500))" : i === step ? item.accent : "rgba(255,255,255,0.12)"
            }} aria-label={`Go to step ${i + 1}`} />)}
              </div>
            </div>

            {/* ── Animated fold stage ── */}
            <div className="flex flex-col items-center justify-center py-6 relative" style={{
          background: "linear-gradient(180deg,#161628 0%,#0f0f18 100%)"
        }}>
              <AnimatedFoldStage key={animKey} fold={cur.fold} emoji={item.emoji} accent={item.accent} animKey={animKey} isPlaying={isPlaying} />

              {/* ── Playback controls: Replay | Play/Pause (below diagram) ── */}
              <div className="flex items-center gap-3 mt-5">
                <button onClick={goPrev} disabled={step === 0} aria-label={t("components.daily_kids_activity.previous_step")} className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90 disabled:opacity-25" style={{
              background: "rgba(255,255,255,0.08)",
              color: "white"
            }}>
                  ⬅
                </button>

                {/* Replay */}
                <button
                  onPointerDown={primeCurrentStep}
                  onClick={() => {
              replay();
              if (voiceOn) speakCurrentStep();
            }} aria-label={t("components.daily_kids_activity.replay_animation")} className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90" style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)"
            }}>
                  🔁
                </button>

                {/* Play / Pause */}
                <button onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? "Pause" : "Play"} className="w-14 h-14 flex items-center justify-center rounded-full font-black text-xl text-white transition-all active:scale-90 shadow-lg" style={{
              background: `linear-gradient(135deg,${item.accent},${item.accent}cc)`
            }}>
                  {isPlaying ? "⏸" : "▶"}
                </button>

                {/* Replay = already done, next step uses goNext */}
                <button onClick={replay} aria-label={t("components.daily_kids_activity.replay_step")} className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90 opacity-0 pointer-events-none" style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)"
            }} aria-hidden="true">
                  🔁
                </button>

                <button onClick={goNext} aria-label={t("components.daily_kids_activity.next_step")} className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90" style={{
              background: "rgba(255,255,255,0.08)",
              color: "white"
            }}>
                  ➡
                </button>
              </div>
            </div>

            {/* ── Instruction ── */}
            <div className="px-5 pt-3 pb-3 flex-shrink-0">
              <div key={`inst-${animKey}`} className="rounded-2xl p-4 mb-3 border border-white/10" style={{
            background: "rgba(255,255,255,0.05)",
            animation: "og-slide-up 220ms 120ms ease both"
          }}>
                <p className="text-white text-base font-semibold leading-relaxed text-center">
                  {cur.instruction}
                </p>
              </div>

              {/* ── Big Prev / Next nav buttons ── */}
              <div className="flex gap-2.5 mb-3">
                <button onClick={goPrev} disabled={step === 0} className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 border border-white/10 text-white disabled:opacity-30" style={{
              background: "rgba(255,255,255,0.08)"
            }}>
                  {t("components.daily_kids_activity.previous")}
                </button>
                <button onClick={goNext} className="flex-[2] py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95" style={{
              background: step < total - 1 ? `linear-gradient(135deg,${item.accent},${item.accent}bb)` : "linear-gradient(135deg,hsl(var(--brand-emerald-500)),hsl(var(--brand-blue-500)))"
            }}>
                  {step < total - 1 ? "Next Step →" : "🎉 Finish!"}
                </button>
              </div>

              <a href={item.guideUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-white/10 mb-4 text-white/40 text-xs font-bold hover:text-white/60 transition-colors">
                {t("components.daily_kids_activity.download_full_guide")}
              </a>
            </div>
          </div>}

        {/* ── PHASE: done ──────────────────────────────────────────────── */}
        {phase === "done" && <div className="flex flex-col items-center text-center overflow-y-auto pb-10" style={{
        background: "linear-gradient(160deg,hsl(var(--brand-green-900)) 0%,#0f0f18 100%)"
      }}>
            <button onClick={handleClose} aria-label={t("components.daily_kids_activity.close_5")} className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all">✕</button>

            <div className="mt-12 mb-4" style={{
          animation: "og-pop-in 500ms cubic-bezier(0.34,1.56,0.64,1) both"
        }}>
              <span style={{
            fontSize: 96
          }}>{item.emoji}</span>
            </div>

            <div className="text-4xl mb-2" style={{
          animation: "og-pop-in 500ms 120ms cubic-bezier(0.34,1.56,0.64,1) both"
        }}>
              🎉
            </div>

            <h2 className="text-white font-black text-2xl mb-2">{t("components.daily_kids_activity.you_did_it")}</h2>
            <p className="text-white/60 text-sm px-8 mb-2 leading-relaxed">
              {t("components.daily_kids_activity.amazing_work_your")} <strong className="text-white/80">{item.title}</strong> {t("components.daily_kids_activity.is_complete")}
            </p>
            {completionTotal != null && completionTotal > 0 && <p className="text-emerald-300/90 text-xs font-bold px-8 mb-6">
                {t("components.daily_kids_activity.completion_streak", {
                  name: childName,
                  count: completionTotal,
                })}
              </p>}

            <div className="flex flex-col gap-3 px-6 w-full">
              <button
                type="button"
                onClick={() => void shareCompletion()}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 border border-white/20"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                {shared
                  ? t("components.daily_kids_activity.shared")
                  : t("components.daily_kids_activity.share_win")}
              </button>
              <button onClick={restart} className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-95" style={{
            background: `linear-gradient(135deg,${item.accent},${item.accent}bb)`
          }}>
                {t("components.daily_kids_activity.try_again")}
              </button>
              <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-bold text-sm text-white/70 hover:text-white transition-colors border border-white/10" style={{
            background: "rgba(255,255,255,0.05)"
          }}>
                {t("components.daily_kids_activity.done")}
              </button>
            </div>
          </div>}
      </div>

      {/* ── All CSS keyframes (injected once per portal render) ── */}
      <style>{`
        @keyframes og-fade-in    { from { opacity:0 } to { opacity:1 } }
        @keyframes og-slide-up   { from { opacity:0; transform:translateY(50px) } to { opacity:1; transform:translateY(0) } }
        @keyframes og-pop-in     { from { opacity:0; transform:scale(0.3) } to { opacity:1; transform:scale(1) } }

        @keyframes og-appear     { from { opacity:0; transform:scale(0.5) } to { opacity:1; transform:scale(1) } }
        @keyframes og-fold-h     {
          0%   { transform:scaleY(1); transform-origin:center bottom }
          35%  { transform:scaleY(0.44); transform-origin:center bottom }
          65%  { transform:scaleY(0.52); transform-origin:center bottom }
          100% { transform:scaleY(1); transform-origin:center center }
        }
        @keyframes og-fold-v     {
          0%   { transform:scaleX(1); transform-origin:right center }
          35%  { transform:scaleX(0.56); transform-origin:right center }
          65%  { transform:scaleX(0.62); transform-origin:right center }
          100% { transform:scaleX(1); transform-origin:center center }
        }
        @keyframes og-fold-diag  {
          0%   { transform:rotate(0deg) scale(1) }
          30%  { transform:rotate(-10deg) scale(0.92) }
          70%  { transform:rotate(3deg) scale(1.02) }
          100% { transform:rotate(0deg) scale(1) }
        }
        @keyframes og-rotate     {
          0%   { transform:rotate(-50deg) scale(0.75) }
          60%  { transform:rotate(4deg) scale(1.04) }
          100% { transform:rotate(0deg) scale(1) }
        }
        @keyframes og-fold-kite  {
          0%   { transform:scaleX(1) scaleY(1) }
          35%  { transform:scaleX(0.82) scaleY(1.06) }
          70%  { transform:scaleX(1.03) scaleY(0.98) }
          100% { transform:scaleX(1) scaleY(1) }
        }
        @keyframes og-blintz     {
          0%   { transform:scale(1) }
          35%  { transform:scale(0.70) }
          65%  { transform:scale(0.78) }
          100% { transform:scale(1) }
        }
        @keyframes og-fold-up    {
          0%   { transform:translateY(16px) }
          55%  { transform:translateY(-5px) }
          100% { transform:translateY(0) }
        }
        @keyframes og-fold-dn    {
          0%   { transform:translateY(-16px) }
          55%  { transform:translateY(5px) }
          100% { transform:translateY(0) }
        }
        @keyframes og-pull       {
          0%   { transform:scaleX(0.65) }
          55%  { transform:scaleX(1.07) }
          100% { transform:scaleX(1) }
        }
        @keyframes og-crease     {
          0%   { opacity:1; filter:brightness(1) }
          25%  { opacity:0.5; filter:brightness(2) }
          50%  { opacity:1; filter:brightness(1.4) }
          75%  { opacity:0.7; filter:brightness(1.8) }
          100% { opacity:1; filter:brightness(1) }
        }
        @keyframes og-done       {
          0%   { transform:scale(0.2) rotate(-15deg) }
          55%  { transform:scale(1.12) rotate(4deg) }
          80%  { transform:scale(0.96) rotate(-1deg) }
          100% { transform:scale(1) rotate(0deg) }
        }
        @keyframes og-draw-arrow {
          from { stroke-dashoffset:220 }
          to   { stroke-dashoffset:0 }
        }
      `}</style>
    </div>;
  return createPortal(shell, document.body);
}

// ─── Origami Card (premium studio) ───────────────────────────────────────────
function OrigamiChallengeHero({
  item,
  progress,
  done,
  onStart,
}: {
  item: Origami;
  progress: number;
  done: boolean;
  onStart(): void;
}) {
  const visual = getOrigamiVisual(item);
  const xp = getOrigamiXp(item);
  const ring = Math.max(0, Math.min(progress, 100));
  return <div className="group/challenge relative mb-4 overflow-hidden rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-white/[0.14] via-white/[0.08] to-white/[0.04] p-4 text-white shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
      <div className={`absolute -right-10 -top-12 h-36 w-36 rounded-full ${visual.glow} blur-3xl`} />
      <div className="absolute inset-0 opacity-[0.12]" style={{
        backgroundImage: "linear-gradient(120deg,transparent 0 35%,rgba(255,255,255,.9) 45%,transparent 58% 100%)",
        transform: "translateX(-65%)",
        transition: "transform 900ms cubic-bezier(.2,.8,.2,1)",
      }} />
      <div className="relative z-10 flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.6rem] bg-white/10 shadow-[0_18px_42px_rgba(0,0,0,0.24)] transition-transform duration-300 group-hover/challenge:-translate-y-1 group-hover/challenge:rotate-1 motion-reduce:transition-none motion-reduce:group-hover/challenge:translate-y-0 motion-reduce:group-hover/challenge:rotate-0">
          <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full -rotate-90" aria-label={`${ring}% challenge progress`}>
            <circle cx="48" cy="48" r="39" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="8" />
            <circle
              cx="48"
              cy="48"
              r="39"
              fill="none"
              stroke="url(#origami-challenge-ring)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 39}`}
              strokeDashoffset={`${2 * Math.PI * 39 * (1 - ring / 100)}`}
              className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
            />
            <defs>
              <linearGradient id="origami-challenge-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="52%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#f0abfc" />
              </linearGradient>
            </defs>
          </svg>
          <OrigamiMiniModel item={item} visual={visual} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/75">🧩 Challenge of the Day</p>
          <h3 className="mt-1 text-xl font-black leading-tight">Create a {getOrigamiShortName(item)} Today</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-amber-200/30 bg-amber-300/16 px-3 py-1.5 text-xs font-black text-amber-100">+{xp + 15} XP</span>
            <span className="rounded-full border border-orange-200/25 bg-orange-400/14 px-3 py-1.5 text-xs font-black text-orange-100">+1 Streak</span>
            {done && <span className="rounded-full border border-emerald-200/25 bg-emerald-400/14 px-3 py-1.5 text-xs font-black text-emerald-100">Unlocked</span>}
          </div>
          <button
            type="button"
            onClick={onStart}
            className="relative mt-4 min-h-11 overflow-hidden rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition-all hover:scale-[1.02] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent transition-transform duration-700 group-hover/challenge:translate-x-full motion-reduce:hidden" />
            <span className="relative">{done ? "Practice Challenge" : "Start Challenge"}</span>
          </button>
        </div>
      </div>
    </div>;
}

function OrigamiMiniModel({
  item,
  visual,
}: {
  item: Origami;
  visual: ReturnType<typeof getOrigamiVisual>;
}) {
  return <svg viewBox="0 0 90 90" className="relative z-10 h-16 w-16 drop-shadow-xl" aria-hidden="true">
      <defs>
        <linearGradient id={`mini-paper-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor={visual.accent} />
        </linearGradient>
      </defs>
      <path d="M15 50 45 14l30 36-30 26z" fill={`url(#mini-paper-${item.id})`} opacity=".95" />
      <path d="M45 14v62M15 50h60" stroke="rgba(15,23,42,.28)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 5" />
      <path d="M45 14 30 76h30z" fill="rgba(255,255,255,.42)" />
    </svg>;
}

function OrigamiCollectionBook({
  completed,
  locked,
  totalXp,
}: {
  completed: Origami[];
  locked: Origami[];
  totalXp: number;
}) {
  return <div className="mb-4 overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.07] p-4 text-white shadow-xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black">📚 My Collection</p>
          <p className="mt-0.5 text-xs font-semibold text-white/48">{completed.length} unlocked • {totalXp} XP</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/70">Collector Book</span>
      </div>
      {completed.length > 0 ? <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {completed.map(item => <div key={item.id} className="rounded-2xl border border-amber-200/25 bg-amber-300/12 p-3 shadow-inner">
          <p className="text-lg">{item.emoji}</p>
          <p className="mt-1 truncate text-xs font-black">{getOrigamiShortName(item)}</p>
          <p className="text-[10px] font-bold text-amber-100/65">+{getOrigamiXp(item)} XP</p>
        </div>)}
      </div> : <div className="mb-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4 text-center">
        <p className="text-sm font-black">No models collected yet</p>
        <p className="mt-1 text-xs font-semibold text-white/45">Finish a challenge to stamp your first page.</p>
      </div>}
      <div className="grid grid-cols-3 gap-2">
        {locked.map(item => <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-center shadow-inner">
          <p className="text-xl">❓</p>
          <p className="mt-1 text-[10px] font-black text-white/42">Mystery Model</p>
        </div>)}
      </div>
    </div>;
}

function OrigamiCelebrationToast({
  item,
  xp,
  onClose,
}: {
  item: Origami;
  xp: number;
  onClose(): void;
}) {
  const achievement = ORIGAMI_ACHIEVEMENTS[item.id] ?? "🏆 Origami Master";
  return <div className="pointer-events-none fixed inset-x-3 bottom-5 z-[10000] flex justify-center" aria-live="polite">
      <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[1.6rem] border border-amber-200/35 bg-slate-950/95 p-4 text-white shadow-2xl shadow-slate-950/45 backdrop-blur-xl" style={{ animation: "origami-toast-in 420ms cubic-bezier(.2,.9,.2,1) both" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,.22),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,.16),transparent_30%)]" />
        {Array.from({ length: 18 }).map((_, i) => <span
          key={i}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            left: `${8 + (i * 13) % 86}%`,
            top: `${-8 - (i % 5) * 7}px`,
            background: ["#facc15", "#22d3ee", "#f472b6", "#34d399"][i % 4],
            animation: `origami-confetti ${900 + (i % 5) * 120}ms ${i * 28}ms ease-out both`,
          }}
        />)}
        <button type="button" onClick={onClose} aria-label="Dismiss celebration" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/70 transition-colors hover:bg-white/15 hover:text-white">
          ✕
        </button>
        <div className="relative z-10 flex items-center gap-3 pr-10">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-300/18 text-3xl shadow-[0_0_28px_rgba(251,191,36,.24)] animate-pulse motion-reduce:animate-none">
            🏅
          </div>
          <div>
            <p className="text-lg font-black">Amazing Folding!</p>
            <p className="mt-0.5 text-xs font-bold text-amber-100">{achievement} unlocked</p>
            <p className="mt-1 text-xs font-semibold text-white/58">{getOrigamiShortName(item)} completed • +{xp} XP</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes origami-toast-in {
          from { opacity: 0; transform: translateY(24px) scale(.96) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes origami-confetti {
          0% { opacity: 0; transform: translate3d(0,0,0) rotate(0deg) }
          12% { opacity: 1 }
          100% { opacity: 0; transform: translate3d(18px,118px,0) rotate(260deg) }
        }
        @media (prefers-reduced-motion: reduce) {
          .origami-reduced-motion, .origami-reduced-motion * { animation: none !important; transition: none !important; }
          @keyframes origami-toast-in { from { opacity: 1; transform: none } to { opacity: 1; transform: none } }
          @keyframes origami-confetti { from { opacity: 0 } to { opacity: 0 } }
        }
      `}</style>
    </div>;
}

function OrigamiHeroArtwork({
  item,
  visual,
}: {
  item: Origami;
  visual: ReturnType<typeof getOrigamiVisual>;
}) {
  const paperShadow = "drop-shadow(0 16px 20px rgba(15,23,42,0.24))";
  return <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className={`absolute -left-10 -top-10 h-28 w-28 rounded-full ${visual.glow} blur-3xl`} />
      <div className="absolute right-4 top-6 h-16 w-16 rounded-full bg-white/30 blur-2xl" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "linear-gradient(135deg,rgba(255,255,255,.42) 0 1px,transparent 1px),linear-gradient(45deg,rgba(255,255,255,.28) 0 1px,transparent 1px)",
        backgroundSize: "28px 28px",
      }} />
      <svg viewBox="0 0 220 160" className="relative z-10 h-36 w-full max-w-[230px] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100" role="img" aria-label={`${item.title} paper artwork`}>
        <defs>
          <linearGradient id={`paper-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="48%" stopColor={visual.accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={visual.accent} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={`crease-${item.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <ellipse cx="110" cy="133" rx="58" ry="12" fill="#0f172a" opacity="0.14" />
        {visual.shape === "boat" && <>
          <path d="M58 92h104l-18 30H76z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.72)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M106 38v54H68z" fill="#fff" opacity="0.9" stroke="rgba(15,23,42,.16)" strokeWidth="2" />
          <path d="M112 34v58h44z" fill={`url(#paper-${item.id})`} stroke="rgba(15,23,42,.16)" strokeWidth="2" />
          <path d="M112 34v89" stroke="rgba(15,23,42,.22)" strokeWidth="3" strokeLinecap="round" />
        </>}
        {visual.shape === "plane" && <>
          <path d="M36 78 184 34 132 126 106 89z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.72)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M106 89 184 34 120 102z" fill={`url(#crease-${item.id})`} opacity="0.75" />
          <path d="M106 89 88 124l32-22" fill="#fff" opacity="0.82" />
        </>}
        {visual.shape === "butterfly" && <>
          <path d="M106 77C82 38 42 38 38 72c-4 34 36 40 68 15z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M114 77c24-39 64-39 68-5 4 34-36 40-68 15z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M110 64v55" stroke="#312e81" strokeOpacity=".52" strokeWidth="8" strokeLinecap="round" />
          <path d="M70 72h80M88 94h44" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" />
        </>}
        {visual.shape === "bunny" && <>
          <path d="M82 78 72 28c22 7 31 27 34 55z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M126 78 148 28c-24 5-37 27-42 55z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M62 82h96l-18 45H80z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <circle cx="94" cy="100" r="4" fill="#334155" /><circle cx="124" cy="100" r="4" fill="#334155" />
          <path d="M106 111q5 5 10 0" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>}
        {visual.shape === "crane" && <>
          <path d="M42 88 106 52l44 38-50 34z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M106 52 136 24l14 66z" fill="#fff" opacity=".86" stroke="rgba(15,23,42,.14)" strokeWidth="2" />
          <path d="M150 90 184 72l-34 36z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.65)" strokeWidth="2" />
          <path d="M100 124 88 142M116 116l10 26" stroke="rgba(15,23,42,.32)" strokeWidth="3" strokeLinecap="round" />
        </>}
        {visual.shape === "flower" && <>
          <path d="M110 42 148 84 110 126 72 84z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M110 42v84M72 84h76" stroke="rgba(15,23,42,.18)" strokeWidth="2" strokeDasharray="5 5" />
          <path d="M110 126c-8 12-15 18-28 22" stroke="#16a34a" strokeWidth="7" strokeLinecap="round" fill="none" />
        </>}
        {visual.shape === "star" && <>
          <path d="M110 28 128 68l44 5-33 29 10 43-39-23-38 23 9-43-33-29 44-5z" fill={`url(#paper-${item.id})`} stroke="rgba(255,255,255,.75)" strokeWidth="2" style={{ filter: paperShadow }} />
          <path d="M110 28v94M58 73l81 29M172 73l-100 72" stroke="rgba(15,23,42,.16)" strokeWidth="2" />
        </>}
      </svg>
      <div className="absolute bottom-3 left-4 rounded-full border border-white/50 bg-white/35 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur-md">
        {visual.motif}
      </div>
    </div>;
}

function OrigamiCard({
  item,
  done,
  saved,
  progress,
  onDone,
  onSave,
  onViewSteps
}: {
  item: Origami;
  done: boolean;
  saved: boolean;
  progress: number;
  onDone(): void;
  onSave(): void;
  onViewSteps(): void;
}) {
  const visual = getOrigamiVisual(item);
  const difficulty = ORIGAMI_BADGES[item.difficulty];
  const completedFolds = done ? item.steps.length : Math.min(progress, item.steps.length);
  const percent = Math.round((completedFolds / item.steps.length) * 100);
  const status = done ? "✅ Completed" : completedFolds > 0 ? "⏳ Continue" : "▶ Start";
  const primaryLabel = done ? "Practice Again" : completedFolds > 0 ? "Continue Folding" : "Start Folding";
  const achievement = ORIGAMI_ACHIEVEMENTS[item.id] ?? "🏆 Origami Master";
  const xp = getOrigamiXp(item);

  return <article className={`group relative flex min-h-[520px] flex-col overflow-hidden rounded-[1.75rem] border bg-slate-950/95 shadow-[0_18px_0_rgba(15,23,42,0.5),0_30px_60px_rgba(2,6,23,0.38)] transition-all duration-300 will-change-transform hover:-translate-y-2 hover:rotate-[0.35deg] hover:scale-[1.02] hover:shadow-[0_24px_0_rgba(15,23,42,0.42),0_42px_80px_rgba(2,6,23,0.48)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0 motion-reduce:hover:scale-100 ${done ? "border-amber-300/70 ring-2 ring-amber-300/25" : "border-white/10"}`}>
      {done && <div className="pointer-events-none absolute inset-0 z-20 rounded-[1.75rem] shadow-[0_0_38px_rgba(251,191,36,0.28)]" />}
      <div className="pointer-events-none absolute inset-x-5 -bottom-2 h-5 rounded-b-[1.75rem] bg-slate-900/80 blur-sm" />
      <div className="pointer-events-none absolute inset-0 z-10 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-1000 group-hover:translate-x-[120%] motion-reduce:hidden" />

      <div className={`relative h-[235px] shrink-0 overflow-hidden bg-gradient-to-br ${visual.gradient}`}>
        <OrigamiHeroArtwork item={item} visual={visual} />
        <div className="absolute left-4 top-4 rounded-full border border-white/55 bg-white/30 px-3 py-1.5 text-[11px] font-black text-slate-800 shadow-lg backdrop-blur-xl">
          <span className="mr-1">📄</span>{item.steps.length} Folds
        </div>
        <div className="absolute left-4 top-[58px] rounded-full border border-amber-200/70 bg-amber-200/75 px-3 py-1.5 text-[11px] font-black text-amber-950 shadow-lg backdrop-blur-xl">
          ⚡ +{xp} XP
        </div>
        <div className={`absolute bottom-4 right-4 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-lg backdrop-blur-xl ${difficulty.className}`}>
          <span className="mr-1">{difficulty.icon}</span>{difficulty.label}
        </div>
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
          className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all duration-300 active:scale-90 motion-reduce:transition-none ${saved ? "border-rose-200/70 bg-rose-500 text-white rotate-6 scale-105 motion-reduce:rotate-0" : "border-white/55 bg-white/30 text-slate-600 hover:bg-white/55"}`}
        >
          <span className="text-lg transition-transform duration-300 group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:scale-100">{saved ? "❤️" : "♡"}</span>
        </button>
        {done && <div className="absolute left-4 bottom-4 rounded-full border border-amber-200/80 bg-amber-300/90 px-3 py-1.5 text-[11px] font-black text-amber-950 shadow-lg shadow-amber-900/20">
          🎊 Complete
        </div>}
      </div>

      <div className="relative flex flex-1 flex-col p-4 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.08),transparent_34%)]" />
        <div className="relative z-10 flex flex-1 flex-col">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">{status}</p>
              <h3 className="text-xl font-black leading-tight tracking-[-0.02em]">{item.title}</h3>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl shadow-inner">
              {item.emoji}
            </div>
          </div>

          {done && <div className="mb-3 rounded-2xl border border-amber-200/30 bg-amber-300/12 px-3 py-2 text-xs font-black text-amber-100">
            {achievement}
          </div>}

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-inner">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-white/68">{completedFolds} of {item.steps.length} folds completed</span>
              <span className="text-white">{percent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 shadow-[0_0_18px_rgba(34,211,238,0.45)] transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <button
              type="button"
              onClick={onViewSteps}
              className="relative min-h-11 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/35 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 group-hover:animate-pulse motion-reduce:transition-none motion-reduce:group-hover:animate-none"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden" />
              <span className="relative">▶ {primaryLabel}</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <a href={item.guideUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 text-xs font-black text-white/72 transition-colors hover:bg-white/12 hover:text-white motion-reduce:transition-none">
                📖 Step Guide
              </a>
              <button
                type="button"
                onClick={onDone}
                className={`min-h-11 rounded-2xl border px-3 py-3 text-xs font-black transition-all active:scale-95 motion-reduce:transition-none ${done ? "border-amber-300/40 bg-amber-300/18 text-amber-100" : "border-white/10 bg-white/[0.07] text-white/72 hover:bg-white/12 hover:text-white"}`}
              >
                {done ? "✅ Completed" : "✅ Mark Done"}
              </button>
            </div>
            <button
              type="button"
              onClick={onSave}
              className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-black text-white/50 transition-colors hover:bg-white/10 hover:text-white motion-reduce:transition-none"
            >
              {saved ? "❤️ Saved Mission" : "❤️ Save"}
            </button>
          </div>
        </div>
      </div>
    </article>;
}
