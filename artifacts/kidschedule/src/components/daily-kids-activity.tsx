import { useState, useMemo, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// ─── Drive embed helper ───────────────────────────────────────────────────────
function toEmbedUrl(url: string): string {
  const folderMatch = url.match(/\/folders\/([^?&#]+)/);
  if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
  const fileMatch = url.match(/\/d\/([^/?&#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  return url;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalItem = {
  id: string; title: string; emoji: string; desc: string;
  embedUrl: string; downloadUrl: string; kind: "worksheet" | "reel";
};
type Worksheet = {
  id: string; title: string; emoji: string; bg: string; accent: string;
  fileUrl: string; ageMin: number; ageMax: number; subject: string;
};
type Reel = {
  id: string; title: string; emoji: string; bg: string; accent: string;
  videoUrl: string; duration: string; ageMin: number; ageMax: number;
};
type FoldShape = "start"|"halfH"|"halfV"|"diagFold"|"diamond"|"kite"|"blintz"|"foldUp"|"foldDown"|"pullOpen"|"crease"|"done";
type OrigamiStep = { fold: FoldShape; instruction: string };
type Origami = {
  id: string; title: string; emoji: string; bg: string; accent: string;
  difficulty: "Easy" | "Medium" | "Fun"; steps: OrigamiStep[]; ageMin: number; ageMax: number;
  guideUrl: string;
};
type ActivityState = {
  worksheetIds: string[]; reelIds: string[]; origamiIds: string[];
  doneIds: string[]; savedIds: string[];
};

// ─── Datasets ────────────────────────────────────────────────────────────────
const WORKSHEETS: Worksheet[] = [
  { id:"ws1",  title:"ABC Tracing Practice",       emoji:"✏️", bg:"bg-blue-100 dark:bg-blue-500/20",    accent:"#3B82F6", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",       ageMin:24, ageMax:60,  subject:"Literacy" },
  { id:"ws2",  title:"1–10 Number Counting",       emoji:"🔢", bg:"bg-green-100 dark:bg-green-500/20",   accent:"#10B981", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",  ageMin:24, ageMax:60,  subject:"Math" },
  { id:"ws3",  title:"Color the Farm Animals",     emoji:"🐄", bg:"bg-orange-100 dark:bg-orange-500/20",  accent:"#F97316", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",   ageMin:24, ageMax:72,  subject:"Art" },
  { id:"ws4",  title:"Match the Shapes",           emoji:"🔵", bg:"bg-purple-100 dark:bg-purple-500/20",  accent:"#8B5CF6", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",    ageMin:24, ageMax:60,  subject:"Math" },
  { id:"ws5",  title:"Big & Small Sort",           emoji:"🐘", bg:"bg-amber-100 dark:bg-amber-500/20",   accent:"#D97706", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",  ageMin:24, ageMax:54,  subject:"Logic" },
  { id:"ws6",  title:"Write My Name Practice",     emoji:"✨", bg:"bg-pink-100 dark:bg-pink-500/20",    accent:"#EC4899", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",      ageMin:36, ageMax:84,  subject:"Literacy" },
  { id:"ws7",  title:"Spot the Difference",        emoji:"👀", bg:"bg-teal-100 dark:bg-teal-500/20",    accent:"#14B8A6", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",      ageMin:36, ageMax:96,  subject:"Logic" },
  { id:"ws8",  title:"Connect the Dots – Stars",   emoji:"🌟", bg:"bg-yellow-100 dark:bg-yellow-500/20",  accent:"#EAB308", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",      ageMin:36, ageMax:84,  subject:"Art" },
  { id:"ws9",  title:"Alphabet Coloring A–Z",      emoji:"🎨", bg:"bg-rose-100 dark:bg-rose-500/20",    accent:"#F43F5E", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",  ageMin:36, ageMax:72,  subject:"Literacy" },
  { id:"ws10", title:"Simple Addition Fun",        emoji:"➕", bg:"bg-indigo-100 dark:bg-indigo-500/20",  accent:"#6366F1", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",  ageMin:48, ageMax:96,  subject:"Math" },
  { id:"ws11", title:"Hindi Varnamala Tracing",    emoji:"हि",  bg:"bg-emerald-100 dark:bg-emerald-500/20", accent:"#059669", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",     ageMin:36, ageMax:84,  subject:"Hindi" },
  { id:"ws12", title:"My Body Parts Worksheet",    emoji:"🧍", bg:"bg-sky-100 dark:bg-sky-500/20",     accent:"#0EA5E9", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",      ageMin:24, ageMax:72,  subject:"Science" },
  { id:"ws13", title:"Fruits & Vegetables Match",  emoji:"🍎", bg:"bg-lime-100 dark:bg-lime-500/20",    accent:"#84CC16", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",    ageMin:24, ageMax:72,  subject:"GK" },
  { id:"ws14", title:"Weather Chart Worksheet",    emoji:"🌤️", bg:"bg-cyan-100 dark:bg-cyan-500/20",    accent:"#06B6D4", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",   ageMin:48, ageMax:96,  subject:"Science" },
  { id:"ws15", title:"Multiplication Table 2–5",   emoji:"✖️", bg:"bg-violet-100 dark:bg-violet-500/20",  accent:"#7C3AED", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",  ageMin:72, ageMax:96,  subject:"Math" },
  { id:"ws16", title:"Story Sequencing Cards",     emoji:"📖", bg:"bg-fuchsia-100 dark:bg-fuchsia-500/20", accent:"#D946EF", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",     ageMin:60, ageMax:96,  subject:"Literacy" },
  { id:"ws17", title:"Map of India Fill-in",       emoji:"🗺️", bg:"bg-orange-100 dark:bg-orange-500/20",  accent:"#EA580C", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",       ageMin:72, ageMax:96,  subject:"GK" },
  { id:"ws18", title:"Colour the Rangoli",         emoji:"🪔", bg:"bg-red-100 dark:bg-red-500/20",     accent:"#DC2626", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",   ageMin:36, ageMax:96,  subject:"Art" },
  { id:"ws19", title:"Opposite Words Match",       emoji:"🔄", bg:"bg-blue-100 dark:bg-blue-500/20",    accent:"#2563EB", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", ageMin:48, ageMax:84,  subject:"Literacy" },
  { id:"ws20", title:"Clock Reading Practice",     emoji:"⏰", bg:"bg-stone-100",   accent:"#78716C", fileUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing",     ageMin:60, ageMax:96,  subject:"Math" },
];

const REELS: Reel[] = [
  { id:"r1",  title:"Easy Paper Butterfly Craft",     emoji:"🦋", bg:"bg-pink-100 dark:bg-pink-500/20",    accent:"#EC4899", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"4 min", ageMin:24, ageMax:96 },
  { id:"r2",  title:"Rainbow Umbrella Painting",      emoji:"🌈", bg:"bg-yellow-100 dark:bg-yellow-500/20",  accent:"#F59E0B", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"6 min", ageMin:24, ageMax:84 },
  { id:"r3",  title:"Clay Fruits – Mango & Apple",    emoji:"🥭", bg:"bg-orange-100 dark:bg-orange-500/20",  accent:"#F97316", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"8 min", ageMin:36, ageMax:96 },
  { id:"r4",  title:"DIY Paper Crown for Kids",       emoji:"👑", bg:"bg-amber-100 dark:bg-amber-500/20",   accent:"#D97706", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"5 min", ageMin:24, ageMax:84 },
  { id:"r5",  title:"Vegetable Stamp Art",            emoji:"🥦", bg:"bg-green-100 dark:bg-green-500/20",   accent:"#10B981", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"7 min", ageMin:24, ageMax:72 },
  { id:"r6",  title:"How to Draw a Lion – Easy",      emoji:"🦁", bg:"bg-amber-100 dark:bg-amber-500/20",   accent:"#B45309", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"6 min", ageMin:36, ageMax:96 },
  { id:"r7",  title:"Sock Puppet Show Craft",         emoji:"🧦", bg:"bg-purple-100 dark:bg-purple-500/20",  accent:"#7C3AED", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"9 min", ageMin:36, ageMax:84 },
  { id:"r8",  title:"Nature Collage with Leaves",     emoji:"🍃", bg:"bg-teal-100 dark:bg-teal-500/20",    accent:"#0D9488", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"7 min", ageMin:24, ageMax:96 },
  { id:"r9",  title:"Marble Run Paper Craft",         emoji:"⚙️", bg:"bg-blue-100 dark:bg-blue-500/20",    accent:"#3B82F6", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"10 min", ageMin:60, ageMax:96 },
  { id:"r10", title:"Diwali Diya Decoration",         emoji:"🪔", bg:"bg-red-100 dark:bg-red-500/20",     accent:"#DC2626", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"8 min", ageMin:36, ageMax:96 },
  { id:"r11", title:"Paper Plate Fish Mobile",        emoji:"🐠", bg:"bg-sky-100 dark:bg-sky-500/20",     accent:"#0284C7", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"5 min", ageMin:24, ageMax:72 },
  { id:"r12", title:"Finger Printing Art – Flowers",  emoji:"🌸", bg:"bg-rose-100 dark:bg-rose-500/20",    accent:"#F43F5E", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"6 min", ageMin:24, ageMax:72 },
  { id:"r13", title:"Create a Paper Zoo",             emoji:"🦒", bg:"bg-lime-100 dark:bg-lime-500/20",    accent:"#65A30D", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"12 min", ageMin:48, ageMax:96 },
  { id:"r14", title:"Sand Art Greeting Cards",        emoji:"🏖️", bg:"bg-yellow-100 dark:bg-yellow-500/20",  accent:"#CA8A04", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"8 min", ageMin:48, ageMax:96 },
  { id:"r15", title:"Recycled Robot Craft",           emoji:"🤖", bg:"bg-slate-100 dark:bg-slate-500/20",   accent:"#475569", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"11 min", ageMin:60, ageMax:96 },
  { id:"r16", title:"Paper Bag Puppet Animals",       emoji:"🐸", bg:"bg-emerald-100 dark:bg-emerald-500/20", accent:"#059669", videoUrl:"https://drive.google.com/drive/folders/1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3?usp=sharing", duration:"7 min", ageMin:24, ageMax:84 },
];

const ORIGAMI: Origami[] = [
  { id:"og1", title:"Learn to make a Paper Boat", emoji:"⛵", bg:"bg-sky-100 dark:bg-sky-500/20", accent:"#0284C7", difficulty:"Easy", ageMin:24, ageMax:96,
    guideUrl:"https://origami.me/boat/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet of paper, coloured side up. Lay it flat on a table." },
      { fold:"halfH",    instruction:"Fold the paper in half from bottom to top. You get a rectangle." },
      { fold:"foldDown", instruction:"Fold the top-left corner down to the center bottom. Repeat for the top-right corner." },
      { fold:"foldUp",   instruction:"Fold the bottom strip up on the front. Flip over and fold the other strip up too." },
      { fold:"pullOpen", instruction:"Gently pull the two open sides apart from the middle and flatten down." },
      { fold:"done",     instruction:"Pull the two top points outward carefully — your boat ⛵ is ready to sail!" },
    ]},
  { id:"og2", title:"Fold a Flying Paper Airplane", emoji:"✈️", bg:"bg-blue-100 dark:bg-blue-500/20", accent:"#3B82F6", difficulty:"Easy", ageMin:36, ageMax:96,
    guideUrl:"https://origami.me/dart-airplane/",
    steps:[
      { fold:"start",    instruction:"Start with an A4 or rectangular sheet of paper." },
      { fold:"halfV",    instruction:"Fold in half lengthwise (hotdog style). Crease well, then unfold." },
      { fold:"foldDown", instruction:"Fold the top-left and top-right corners down to meet the center fold line." },
      { fold:"kite",     instruction:"Fold both sides again toward the center crease — making a sharp pointed nose." },
      { fold:"halfV",    instruction:"Fold the plane in half along the center crease so both wings face up." },
      { fold:"done",     instruction:"Fold each wing down flat. Hold from below and launch your airplane ✈️!" },
    ]},
  { id:"og3", title:"Make a Jumping Paper Frog", emoji:"🐸", bg:"bg-green-100 dark:bg-green-500/20", accent:"#16A34A", difficulty:"Medium", ageMin:48, ageMax:96,
    guideUrl:"https://origami.me/jumping-frog/",
    steps:[
      { fold:"start",    instruction:"Start with an index card or a square piece of green paper." },
      { fold:"halfH",    instruction:"Fold in half widthwise (hamburger fold). Crease and unfold." },
      { fold:"crease",   instruction:"Fold the top two corners down to the center to form a triangle at the top." },
      { fold:"blintz",   instruction:"Fold the two top triangle-sides back in to the center line — like a diamond." },
      { fold:"foldUp",   instruction:"Fold the bottom rectangle up to align with the bottom of the triangle." },
      { fold:"foldDown", instruction:"Fold the two bottom corners outward to form the back legs." },
      { fold:"kite",     instruction:"Fold the bottom strip up, then fold it back down halfway to create a spring." },
      { fold:"done",     instruction:"Flip over. Press the spring and release — watch it jump! 🐸" },
    ]},
  { id:"og4", title:"Create a Paper Butterfly", emoji:"🦋", bg:"bg-pink-100 dark:bg-pink-500/20", accent:"#DB2777", difficulty:"Easy", ageMin:24, ageMax:96,
    guideUrl:"https://origami.me/butterfly/",
    steps:[
      { fold:"start",    instruction:"Start with a colourful square sheet of paper." },
      { fold:"halfH",    instruction:"Fold the square in half (hamburger fold), then unfold. Fold in half the other way, then unfold." },
      { fold:"crease",   instruction:"Fold accordion-style: fold down, flip and fold down again making a zigzag." },
      { fold:"halfV",    instruction:"Fold the whole accordion in half at the middle." },
      { fold:"foldUp",   instruction:"Pinch tightly in the center — twist a bit of wire or a thin strip of paper around the pinch." },
      { fold:"done",     instruction:"Fan out both halves gently into wings. Your butterfly 🦋 is ready to flutter!" },
    ]},
  { id:"og5", title:"Fold a Paper Tulip Flower", emoji:"🌷", bg:"bg-rose-100 dark:bg-rose-500/20", accent:"#E11D48", difficulty:"Medium", ageMin:48, ageMax:96,
    guideUrl:"https://origami.me/tulip/",
    steps:[
      { fold:"start",    instruction:"Use a square sheet — red or pink on one side. Place coloured side down." },
      { fold:"diamond",  instruction:"Fold diagonally to make a triangle. Unfold. Fold diagonally the other way. Unfold." },
      { fold:"blintz",   instruction:"Collapse all four corners into the center to form a small diamond (blintz base)." },
      { fold:"kite",     instruction:"Fold the left and right diamond points inward to the center." },
      { fold:"foldDown", instruction:"Fold the top point down about one-third of the way." },
      { fold:"pullOpen", instruction:"Gently blow into the small hole at the bottom to puff up the tulip bud." },
      { fold:"done",     instruction:"Attach a green paper strip as the stem. Your tulip 🌷 is in full bloom!" },
    ]},
  { id:"og6", title:"Make a Paper Crane (Tsuru)", emoji:"🦢", bg:"bg-purple-100 dark:bg-purple-500/20", accent:"#9333EA", difficulty:"Fun", ageMin:72, ageMax:96,
    guideUrl:"https://origami.me/crane/",
    steps:[
      { fold:"start",    instruction:"Use a perfect square sheet. White side up. Crease both diagonals and unfold." },
      { fold:"halfH",    instruction:"Fold in half horizontally and vertically — unfold each time to get 4 crease lines." },
      { fold:"diamond",  instruction:"Collapse inward along creases to form a flat diamond (preliminary base)." },
      { fold:"kite",     instruction:"Kite fold: fold the left and right edges to the center. Repeat on back." },
      { fold:"foldDown", instruction:"Fold the top triangle down. Unfold the triangle and open the pocket (petal fold)." },
      { fold:"blintz",   instruction:"Repeat the petal fold on the back side." },
      { fold:"crease",   instruction:"Fold the narrow bottom flaps upward on both sides to form the neck and tail." },
      { fold:"foldUp",   instruction:"Pull the neck and tail outward gently to open the body." },
      { fold:"pullOpen", instruction:"Blow gently into the small hole at the bottom to puff up the body." },
      { fold:"done",     instruction:"Pull the wings apart slowly. Your crane 🦢 is complete — make 1000 for a wish!" },
    ]},
  { id:"og7", title:"Fold a Paper Bunny", emoji:"🐰", bg:"bg-amber-100 dark:bg-amber-500/20", accent:"#D97706", difficulty:"Easy", ageMin:24, ageMax:84,
    guideUrl:"https://origami.me/bunny/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet — white or any light colour works great." },
      { fold:"diagFold", instruction:"Fold in half diagonally to form a triangle (point at the top)." },
      { fold:"foldUp",   instruction:"Fold the bottom-left and bottom-right corners up to the top point — rabbit ears!" },
      { fold:"foldDown", instruction:"Fold the top-most layer's tip down a little to make the bunny nose." },
      { fold:"crease",   instruction:"Fold the two ear tips down slightly to shape floppy ears." },
      { fold:"done",     instruction:"Flip over and draw a face. Your bunny 🐰 is hopping with joy!" },
    ]},
  { id:"og8", title:"Simple Paper Star", emoji:"⭐", bg:"bg-yellow-100 dark:bg-yellow-500/20", accent:"#CA8A04", difficulty:"Easy", ageMin:24, ageMax:96,
    guideUrl:"https://www.instructables.com/Easy-Origami-Star/",
    steps:[
      { fold:"start",    instruction:"Cut a long thin strip of paper — about 1 cm wide and 25 cm long." },
      { fold:"kite",     instruction:"Fold one end over and across to form a pentagon (five-sided loop)." },
      { fold:"crease",   instruction:"Continue wrapping the strip around and around the pentagon, following its edges." },
      { fold:"foldDown", instruction:"When the strip is almost done, tuck the end neatly under the last flap." },
      { fold:"done",     instruction:"Pinch each of the five sides gently inward — watch your star ⭐ puff up!" },
    ]},
  { id:"og9", title:"Paper Heart for Mom", emoji:"❤️", bg:"bg-red-100 dark:bg-red-500/20", accent:"#DC2626", difficulty:"Easy", ageMin:36, ageMax:96,
    guideUrl:"https://origami.me/heart/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet — red or pink, coloured side up." },
      { fold:"halfH",    instruction:"Fold in half from top to bottom. Crease and keep folded." },
      { fold:"crease",   instruction:"Fold in half left to right. Crease and unfold — this marks the center." },
      { fold:"foldDown", instruction:"Fold the top-left and top-right corners down to the center crease." },
      { fold:"foldUp",   instruction:"Flip over. Fold all four corners toward the center of the model." },
      { fold:"done",     instruction:"Flip over again — a beautiful heart ❤️ for the most special person!" },
    ]},
  { id:"og10", title:"Fold a Sailboat Card", emoji:"⛵", bg:"bg-teal-100 dark:bg-teal-500/20", accent:"#0F766E", difficulty:"Medium", ageMin:48, ageMax:96,
    guideUrl:"https://origami.me/sailboat/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet — blue on one side. Colour side down." },
      { fold:"halfV",    instruction:"Fold in half from left to right. Crease and unfold." },
      { fold:"diagFold", instruction:"Fold the top-right corner down to the bottom center point." },
      { fold:"kite",     instruction:"Fold the bottom-left corner up to meet the upper edge — makes the sail." },
      { fold:"foldUp",   instruction:"Fold the bottom strip upward to form the hull of the boat." },
      { fold:"crease",   instruction:"Fold the small triangle at the left side behind for a clean edge." },
      { fold:"done",     instruction:"Stand it up — your sailboat ⛵ card is ready to send to someone special!" },
    ]},
  { id:"og11", title:"Make a Paper Peacock", emoji:"🦚", bg:"bg-emerald-100 dark:bg-emerald-500/20", accent:"#059669", difficulty:"Fun", ageMin:60, ageMax:96,
    guideUrl:"https://origami.me/peacock/",
    steps:[
      { fold:"start",    instruction:"Use a bright green or teal square sheet. Coloured side up." },
      { fold:"diagFold", instruction:"Fold in half diagonally and unfold. Fold in half the other way and unfold." },
      { fold:"blintz",   instruction:"Fold all four corners into the center to make a smaller square." },
      { fold:"blintz",   instruction:"Fold the four corners into the center again — second blintz fold." },
      { fold:"halfV",    instruction:"Fold the model in half (lengthwise) so it forms a rectangle." },
      { fold:"crease",   instruction:"Accordion-fold the top half back and forth to create the fan tail." },
      { fold:"kite",     instruction:"Pinch and fold one end to a narrow point — this becomes the neck and head." },
      { fold:"foldDown", instruction:"Bend the narrow tip gently to form the peacock's head and beak." },
      { fold:"pullOpen", instruction:"Fan out the accordion folds at the top to spread the tail feathers." },
      { fold:"done",     instruction:"Stand the peacock upright — your paper peacock 🦚 is magnificent!" },
    ]},
  { id:"og12", title:"Paper Pinwheel Spinner", emoji:"🌀", bg:"bg-indigo-100 dark:bg-indigo-500/20", accent:"#4F46E5", difficulty:"Easy", ageMin:24, ageMax:84,
    guideUrl:"https://www.instructables.com/How-to-Make-a-Pinwheel/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet — use two different colours for extra fun!" },
      { fold:"crease",   instruction:"Mark the center by folding diagonally both ways and then unfolding." },
      { fold:"diagFold", instruction:"Cut from each corner towards the center — stop 1 cm before the center dot." },
      { fold:"foldUp",   instruction:"Take every other cut point and fold it into the center (alternating corners)." },
      { fold:"done",     instruction:"Push a pin through the center into a pencil eraser — blow and spin! 🌀" },
    ]},
  { id:"og13", title:"Fold a Cute Paper Fox", emoji:"🦊", bg:"bg-orange-100 dark:bg-orange-500/20", accent:"#EA580C", difficulty:"Medium", ageMin:48, ageMax:96,
    guideUrl:"https://origami.me/fox/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet — orange on one side. Coloured side down." },
      { fold:"diagFold", instruction:"Fold in half diagonally to make a triangle. Point faces up." },
      { fold:"foldUp",   instruction:"Fold the bottom-left and bottom-right corners up to the top center." },
      { fold:"crease",   instruction:"Fold the left and right flap corners back outward — these are the fox ears." },
      { fold:"foldDown", instruction:"Fold the top point down about one-quarter — this is the fox's forehead." },
      { fold:"foldUp",   instruction:"Fold the bottom point up a little to shape the chin." },
      { fold:"halfH",    instruction:"Fold the model in half vertically so the face is on top." },
      { fold:"done",     instruction:"Draw eyes and a nose. Your fox 🦊 is ready to play in the forest!" },
    ]},
  { id:"og14", title:"Origami Elephant", emoji:"🐘", bg:"bg-slate-100 dark:bg-slate-500/20", accent:"#475569", difficulty:"Fun", ageMin:60, ageMax:96,
    guideUrl:"https://origami.me/elephant/",
    steps:[
      { fold:"start",    instruction:"Start with a large square sheet — grey works best for an elephant!" },
      { fold:"diagFold", instruction:"Fold in half diagonally both ways and unfold to get an X crease." },
      { fold:"blintz",   instruction:"Fold all four corners into the center point." },
      { fold:"halfV",    instruction:"Fold the model in half vertically — long and tall." },
      { fold:"kite",     instruction:"Fold the top layer's top and bottom corners toward the center crease." },
      { fold:"crease",   instruction:"Unfold and inside-reverse-fold those corners to tuck them inside." },
      { fold:"foldDown", instruction:"Fold the narrow front point down and curve it slightly — this is the trunk." },
      { fold:"foldUp",   instruction:"Fold the back top corner down at an angle — this forms the tail." },
      { fold:"done",     instruction:"Open up the body slightly. Your elephant 🐘 is ready to parade!" },
    ]},
  { id:"og15", title:"Paper Fortune Teller", emoji:"🔮", bg:"bg-violet-100 dark:bg-violet-500/20", accent:"#7C3AED", difficulty:"Easy", ageMin:36, ageMax:96,
    guideUrl:"https://origami.me/fortune-teller/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet. Write colours on top flaps and numbers on inner flaps!" },
      { fold:"blintz",   instruction:"Fold all four corners into the center to make a smaller square." },
      { fold:"blintz",   instruction:"Flip over. Fold all four new corners into the center again." },
      { fold:"halfH",    instruction:"Fold in half one way — crease and unfold. Fold in half the other way — unfold." },
      { fold:"pullOpen", instruction:"Push all four corners toward the center from underneath with your thumbs & forefingers." },
      { fold:"done",     instruction:"Pinch all four corners together. Open and close to use your fortune teller 🔮!" },
    ]},
  { id:"og16", title:"Mini Paper Basket", emoji:"🧺", bg:"bg-lime-100 dark:bg-lime-500/20", accent:"#65A30D", difficulty:"Medium", ageMin:48, ageMax:96,
    guideUrl:"https://www.instructables.com/Origami-Paper-Basket/",
    steps:[
      { fold:"start",    instruction:"Start with a square sheet. Use a sturdy paper like craft paper or cardstock." },
      { fold:"halfH",    instruction:"Fold in half from top to bottom. Crease firmly and unfold." },
      { fold:"halfV",    instruction:"Fold in half from left to right. Crease firmly and unfold." },
      { fold:"blintz",   instruction:"Fold all four corners into the center point to make a smaller square." },
      { fold:"foldUp",   instruction:"Fold the top and bottom edges to the center. Crease and unfold." },
      { fold:"pullOpen", instruction:"Open the left and right flaps fully. Lift the top and bottom sections upward." },
      { fold:"crease",   instruction:"Fold in the side flaps while pressing the corners into shape — box corners!" },
      { fold:"done",     instruction:"Press all edges firm. Fill your little basket 🧺 with candies or flowers!" },
    ]},
];

// ─── Seeded shuffle ───────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0x7fffffff; };
}

function pickN<T extends { id: string }>(arr: T[], n: number, seed: number): T[] {
  const rng = seededRandom(seed);
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

function dateSeed(childName: string): number {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
  let h = 0;
  for (const c of childName + dateStr) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function todayKey(childName: string) {
  const d = new Date();
  return `amynest_activity_${childName}_${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
}

// ─── Netflix-Style Drive Preview Modal ───────────────────────────────────────
function DrivePreviewModal({ item, onClose, isSaved, onSave }: {
  item: ModalItem; onClose(): void; isSaved: boolean; onSave(): void;
}) {
  const isVideo = item.kind === "reel";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">

      {/* ── Blurred dark backdrop ─────────────────────────────── */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* ── Modal panel ──────────────────────────────────────── */}
      <div
        className="relative z-10 w-full sm:max-w-lg flex flex-col bg-[#0f0f0f] rounded-t-[28px] sm:rounded-[28px] shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-350"
        style={{ maxHeight: "92vh" }}
      >

        {/* ── Close button (floating top-right) ─────────────── */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-white/20 transition-all font-bold text-sm"
        >✕</button>

        {/* ── Section label strip ───────────────────────────── */}
        <div className={`flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0 ${isVideo ? "text-rose-400" : "text-sky-400"}`}>
          <span className="text-base">{isVideo ? "🎥" : "📄"}</span>
          <span className="text-[11px] font-black uppercase tracking-widest">
            {isVideo ? "Watch & Learn" : "Worksheet Preview"}
          </span>
        </div>

        {/* ── Embedded iframe ───────────────────────────────── */}
        <div
          data-on-dark
          className="relative flex-shrink-0 bg-black overflow-hidden"
          style={{ height: "52vw", maxHeight: 320, minHeight: 220 }}
        >
          {/* Cinematic gradient overlay at bottom */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0f0f0f] to-transparent z-10 pointer-events-none" />
          <iframe
            src={item.embedUrl}
            title={item.title}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        </div>

        {/* ── Content info ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-1">
          {/* Title */}
          <h2 className="text-white font-black text-xl leading-snug mb-1.5 pr-8">{item.title}</h2>
          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed mb-4">{item.desc}</p>

          {/* ── Action buttons ────────────────────────────── */}
          <div className="flex flex-col gap-2.5 pb-5">

            {/* Primary: Play / Preview */}
            <a
              href={item.downloadUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95"
              style={{ background: isVideo ? "linear-gradient(135deg,#e11d48,#f97316)" : "linear-gradient(135deg,#2563eb,#7c3aed)" }}
            >
              <span className="text-white text-base">{isVideo ? "▶️" : "👁"}</span>
              <span className="text-white">{isVideo ? "Play Video" : "Open Full Preview"}</span>
            </a>

            {/* Secondary row: Download + Save */}
            <div className="flex gap-2.5">
              <a
                href={item.downloadUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/10"
              >
                <span className="text-white text-sm">⬇️</span>
                <span className="text-white font-bold text-sm">Download</span>
              </a>
              <button
                onClick={onSave}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95 border font-bold text-sm ${
                  isSaved
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                    : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                }`}
              >
                <span className="text-base">{isSaved ? "❤️" : "🤍"}</span>
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/10 text-gray-400 font-bold text-sm"
            >
              ❌ Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DailyKidsActivity({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  // Only render for ages 24–95 months (2–7.9 years)
  if (ageMonths < 24 || ageMonths >= 96) return null;

  const seed = useMemo(() => dateSeed(childName), [childName]);
  const key  = useMemo(() => todayKey(childName), [childName]);

  const filtered = useMemo(() => ({
    worksheets: WORKSHEETS.filter(w => ageMonths >= w.ageMin && ageMonths <= w.ageMax),
    reels:      REELS.filter(r => ageMonths >= r.ageMin && ageMonths <= r.ageMax),
    origami:    ORIGAMI.filter(o => ageMonths >= o.ageMin && ageMonths <= o.ageMax),
  }), [ageMonths]);

  const daily = useMemo(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const p = JSON.parse(saved) as ActivityState;
        const ws = filtered.worksheets.filter(w => p.worksheetIds.includes(w.id));
        const rs = filtered.reels.filter(r => p.reelIds.includes(r.id));
        const og = filtered.origami.filter(o => p.origamiIds.includes(o.id));
        if (ws.length >= 3 && rs.length >= 3 && og.length >= 3) return { ws, rs, og };
      } catch { /* fallthrough */ }
    }
    const ws = pickN(filtered.worksheets, 4, seed);
    const rs = pickN(filtered.reels, 4, seed + 1);
    const og = pickN(filtered.origami, 4, seed + 2);
    localStorage.setItem(key, JSON.stringify({
      worksheetIds: ws.map(w => w.id),
      reelIds: rs.map(r => r.id),
      origamiIds: og.map(o => o.id),
      doneIds: [], savedIds: [],
    }));
    return { ws, rs, og };
  }, [filtered, key, seed]);

  const [done,      setDone]      = useState<Set<string>>(() => {
    try { const p = JSON.parse(localStorage.getItem(key) || "{}"); return new Set(p.doneIds ?? []); } catch { return new Set(); }
  });
  const [saved,     setSaved]     = useState<Set<string>>(() => {
    try { const p = JSON.parse(localStorage.getItem(key) || "{}"); return new Set(p.savedIds ?? []); } catch { return new Set(); }
  });
  const [modalItem, setModalItem] = useState<ModalItem | null>(null);
  const [stepsItem, setStepsItem] = useState<Origami | null>(null);

  const persist = (d: Set<string>, s: Set<string>) => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "{}") as ActivityState;
      localStorage.setItem(key, JSON.stringify({ ...p, doneIds: [...d], savedIds: [...s] }));
    } catch { /* ignore */ }
  };

  const toggleDone = (id: string) => {
    setDone(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      persist(next, saved);
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

  const openModal = (item: ModalItem) => setModalItem(item);
  const closeModal = () => setModalItem(null);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* ── Origami Steps Modal ─────────────────────────────────── */}
      {stepsItem && <OrigamiStepsModal item={stepsItem} onClose={() => setStepsItem(null)} />}

      {/* ── Drive Preview Modal ─────────────────────────────────── */}
      {modalItem && (
        <DrivePreviewModal
          item={modalItem}
          onClose={closeModal}
          isSaved={saved.has(modalItem.id)}
          onSave={() => toggleSaved(modalItem.id)}
        />
      )}

      {/* ── Section Header ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 -translate-y-8 translate-x-8 blur-sm" />
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-0.5">Today's Special</p>
          <h2 className="text-xl font-black">🎨 Today's Kids Activity</h2>
          <p className="text-sm text-white/90 mt-0.5">Personalised for {childName} · Daily rotation</p>
        </div>
      </div>

      {/* ── Parent Guidance ────────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-400/30 px-4 py-3">
        <span className="text-2xl">❤️</span>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Spend 20–30 minutes doing this activity with your child
        </p>
      </div>

      {/* ── Origami ────────────────────────────────────────────── */}
      <SectionBlock emoji="🧩" title="Origami Activity" subtitle="Paper folding — zero mess, max fun!">
        <div className="grid grid-cols-2 gap-3">
          {daily.og.map(o => (
            <OrigamiCard key={o.id} item={o} done={done.has(o.id)} saved={saved.has(o.id)}
              onDone={() => toggleDone(o.id)} onSave={() => toggleSaved(o.id)}
              onViewSteps={() => setStepsItem(o)} />
          ))}
        </div>
      </SectionBlock>

    </div>
  );
}

// ─── Section Block ─────────────────────────────────────────────────────────────
function SectionBlock({ emoji, title, subtitle, children }: {
  emoji: string; title: string; subtitle: string; children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className="font-bold text-sm text-foreground leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ─── Worksheet Card ───────────────────────────────────────────────────────────
function WorksheetCard({ item, done, saved, onDone, onSave, onPreview }: {
  item: Worksheet; done: boolean; saved: boolean; onDone(): void; onSave(): void; onPreview(): void;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden flex flex-col transition-all ${done ? "opacity-70" : ""}`}>
      {/* Preview area — clickable to open modal */}
      <div role="button" tabIndex={0} onClick={onPreview} onKeyDown={(e) => e.key === "Enter" && onPreview()}
        className={`relative ${item.bg} flex flex-col items-center justify-center p-3 h-28 w-full group cursor-pointer`}>
        {done && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center rounded-t-xl">
            <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">✓</div>
          </div>
        )}
        {/* Preview hint on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-t-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-[10px] font-black text-white bg-black/50 rounded-full px-2 py-0.5">👁 Preview</span>
        </div>
        <span className="text-3xl mb-1">{item.emoji}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-foreground">{item.subject}</span>
        <button onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full transition-all ${saved ? "bg-rose-500 text-white" : "bg-white/60 text-muted-foreground hover:bg-white"}`}
          title={saved ? "Unsave" : "Save for later"}
        >
          <span className="text-xs">{saved ? "♥" : "♡"}</span>
        </button>
      </div>
      {/* Info + actions */}
      <div className="p-2 flex-1 flex flex-col justify-between bg-card">
        <p className="text-xs font-bold text-foreground leading-snug mb-2">{item.title}</p>
        <div className="flex gap-1.5">
          <button onClick={onPreview}
            className="flex-1 text-center text-[10px] font-bold py-1 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white transition-colors">
            👁 Preview
          </button>
          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-center text-[10px] font-bold py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            ⬇ Drive
          </a>
        </div>
        <button onClick={onDone}
          className={`w-full mt-1.5 text-[10px] font-bold py-1 rounded-lg transition-colors ${done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-green-100 dark:bg-green-500/20 hover:text-green-700 dark:text-green-200"}`}>
          {done ? "✓ Done" : "Mark Done"}
        </button>
      </div>
    </div>
  );
}

// ─── Reel Card ────────────────────────────────────────────────────────────────
function ReelCard({ item, done, saved, onDone, onSave, onPreview }: {
  item: Reel; done: boolean; saved: boolean; onDone(): void; onSave(): void; onPreview(): void;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden flex flex-col transition-all ${done ? "opacity-70" : ""}`}>
      {/* Thumbnail area — click to open modal */}
      <div role="button" tabIndex={0} onClick={onPreview} onKeyDown={(e) => e.key === "Enter" && onPreview()}
        className={`relative ${item.bg} flex flex-col items-center justify-center h-28 w-full group cursor-pointer`}>
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </div>
        <span className="text-3xl">{item.emoji}</span>
        <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-foreground">{item.duration}</span>
        {done && (
          <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold pointer-events-none">✓</div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full transition-all ${saved ? "bg-rose-500 text-white" : "bg-white/60 text-muted-foreground hover:bg-white"}`}>
          <span className="text-xs">{saved ? "♥" : "♡"}</span>
        </button>
      </div>
      {/* Info */}
      <div className="p-2 flex-1 flex flex-col justify-between bg-card">
        <p className="text-xs font-bold text-foreground leading-snug mb-2">{item.title}</p>
        <div className="flex gap-1.5 mb-1.5">
          <button onClick={onPreview}
            className="flex-1 text-[10px] font-bold py-1 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white transition-colors">
            ▶ Play
          </button>
          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-center text-[10px] font-bold py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            ↗ Drive
          </a>
        </div>
        <button onClick={onDone}
          className={`w-full text-[10px] font-bold py-1 rounded-lg transition-colors ${done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-green-100 dark:bg-green-500/20 hover:text-green-700 dark:text-green-200"}`}>
          {done ? "✓ Watched" : "Mark Done"}
        </button>
      </div>
    </div>
  );
}

// ─── Origami Card ─────────────────────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-200",
  Medium: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200",
  Fun:    "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-200",
};

// ─── Fold Diagram SVG Data ───────────────────────────────────────────────────
const FOLD_SVG: Record<FoldShape, { d: string; fill: string; crease?: string; arrowD?: string }> = {
  start:    { d:"M10,10 L90,10 L90,90 L10,90 Z",  fill:"#FEF9C3", crease:"M50,10 L50,90 M10,50 L90,50" },
  halfH:    { d:"M10,35 L90,35 L90,65 L10,65 Z",  fill:"#DBEAFE", crease:"M10,50 L90,50", arrowD:"M50,62 L50,38" },
  halfV:    { d:"M35,10 L65,10 L65,90 L35,90 Z",  fill:"#BFDBFE", crease:"M50,10 L50,90", arrowD:"M62,50 L38,50" },
  diagFold: { d:"M10,10 L90,90 L10,90 Z",          fill:"#E0E7FF", crease:"M10,10 L90,90" },
  diamond:  { d:"M50,10 L90,50 L50,90 L10,50 Z",  fill:"#FCE7F3", crease:"M10,50 L90,50 M50,10 L50,90" },
  kite:     { d:"M50,10 L85,58 L50,82 L15,58 Z",  fill:"#D1FAE5", crease:"M50,10 L50,82", arrowD:"M15,58 L50,10" },
  blintz:   { d:"M50,10 L90,50 L50,90 L10,50 Z",  fill:"#FEF3C7", crease:"M10,10 L90,90 M90,10 L10,90" },
  foldUp:   { d:"M10,40 L90,40 L90,90 L10,90 Z",  fill:"#DCFCE7", crease:"M10,40 L90,40", arrowD:"M50,66 L50,42" },
  foldDown: { d:"M10,10 L90,10 L90,60 L10,60 Z",  fill:"#FEE2E2", crease:"M10,60 L90,60", arrowD:"M50,34 L50,58" },
  pullOpen: { d:"M15,25 L85,25 L92,75 L8,75 Z",   fill:"#F0FDF4", crease:"M50,25 L50,75", arrowD:"M28,50 L8,50" },
  crease:   { d:"M10,10 L90,10 L90,90 L10,90 Z",  fill:"#F5F3FF", crease:"M10,50 L90,50 M50,10 L50,90" },
  done:     { d:"", fill:"" },
};

// ─── Fold Diagram Component ──────────────────────────────────────────────────
function FoldDiagram({ fold, emoji, size = 88 }: { fold: FoldShape; emoji: string; size?: number }) {
  if (fold === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-1" style={{ width: size, height: size }}>
        <span style={{ fontSize: size * 0.48 }}>{emoji}</span>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">Final!</span>
      </div>
    );
  }
  const cfg = FOLD_SVG[fold];
  const uid = fold + size;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-md">
      <defs>
        <filter id={`sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#00000030"/>
        </filter>
        <marker id={`arr-${uid}`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#F59E0B"/>
        </marker>
      </defs>
      {/* Paper shape */}
      <path d={cfg.d} fill={cfg.fill} stroke="#94A3B8" strokeWidth="1.5" filter={`url(#sh-${uid})`}/>
      {/* Crease lines */}
      {cfg.crease && <path d={cfg.crease} stroke="#818CF8" strokeWidth="1.5" strokeDasharray="4,2.5" fill="none"/>}
      {/* Direction arrow */}
      {cfg.arrowD && (
        <path d={cfg.arrowD} stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round"
          markerEnd={`url(#arr-${uid})`}/>
      )}
    </svg>
  );
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
  Easy:   "~5 min",
  Medium: "~10 min",
  Fun:    "~15 min",
};

// Per-fold: SVG arrow path (viewBox 0 0 100 100), CSS animation name, hint
const FOLD_META: Record<FoldShape, { arrowD: string; paperAnim: string; hint: string }> = {
  start:    { arrowD: "", paperAnim: "og-appear",   hint: "Flatten" },
  halfH:    { arrowD: "M50,24 L50,50 M43,43 L50,51 L57,43",                                      paperAnim: "og-fold-h",    hint: "Fold ↓" },
  halfV:    { arrowD: "M76,50 L50,50 M57,43 L49,50 L57,57",                                      paperAnim: "og-fold-v",    hint: "Fold →" },
  diagFold: { arrowD: "M22,22 L68,68 M60,62 L70,70 L62,60",                                      paperAnim: "og-fold-diag", hint: "Fold ↘" },
  diamond:  { arrowD: "M50,12 L50,45 M43,38 L50,46 L57,38 M50,88 L50,55 M43,62 L50,54 L57,62",  paperAnim: "og-rotate",    hint: "Rotate" },
  kite:     { arrowD: "M22,58 L50,14 M46,25 L50,14 L54,25",                                      paperAnim: "og-fold-kite", hint: "Fold ↑" },
  blintz:   { arrowD: "M16,16 L46,46 M78,16 L54,46 M16,78 L46,54 M78,78 L54,54",                paperAnim: "og-blintz",    hint: "Fold in" },
  foldUp:   { arrowD: "M50,80 L50,46 M43,53 L50,45 L57,53",                                      paperAnim: "og-fold-up",   hint: "Fold ↑" },
  foldDown: { arrowD: "M50,20 L50,54 M43,47 L50,55 L57,47",                                      paperAnim: "og-fold-dn",   hint: "Fold ↓" },
  pullOpen: { arrowD: "M34,50 L12,50 M18,43 L10,50 L18,57 M66,50 L88,50 M82,43 L90,50 M82,57",  paperAnim: "og-pull",      hint: "Open" },
  crease:   { arrowD: "M50,14 L50,86 M14,50 L86,50",                                             paperAnim: "og-crease",    hint: "Crease" },
  done:     { arrowD: "", paperAnim: "og-done", hint: "Done!" },
};

// ── Animated fold stage ──────────────────────────────────────────────────────
function AnimatedFoldStage({
  fold, emoji, accent, animKey, isPlaying,
}: { fold: FoldShape; emoji: string; accent: string; animKey: number; isPlaying: boolean }) {
  const meta = FOLD_META[fold];
  const ANIM_DUR = "900ms";

  return (
    <div style={{ position: "relative", width: 200, height: 200 }}>
      {/* Paper diagram — CSS fold animation */}
      <div
        key={`paper-${animKey}`}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: isPlaying ? `${meta.paperAnim} ${ANIM_DUR} cubic-bezier(0.22,1,0.36,1) both` : "none",
          transformOrigin: "center center",
        }}
      >
        <FoldDiagram fold={fold} emoji={emoji} size={164} />
      </div>

      {/* Direction arrow overlay — draws itself in */}
      {meta.arrowD && isPlaying && (
        <svg
          key={`arrow-${animKey}`}
          viewBox="0 0 100 100"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {/* Glow layer */}
          <path
            d={meta.arrowD}
            stroke={accent}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
            style={{
              strokeDasharray: 220,
              strokeDashoffset: 220,
              animation: "og-draw-arrow 700ms 200ms ease-out forwards",
            }}
          />
          {/* Main arrow */}
          <path
            d={meta.arrowD}
            stroke="#FBBF24"
            strokeWidth="2.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 220,
              strokeDashoffset: 220,
              animation: "og-draw-arrow 700ms 200ms ease-out forwards",
            }}
          />
          {/* Hint text badge */}
          <text
            x="50"
            y="96"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="800"
            fill="#FBBF24"
            fontFamily="system-ui,sans-serif"
            style={{
              opacity: 0,
              animation: "og-fade-in 300ms 700ms ease forwards",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {meta.hint}
          </text>
        </svg>
      )}

      {/* Crease pulse line (when not playing — static indicator) */}
      {!isPlaying && meta.arrowD && (
        <svg
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        >
          <path
            d={meta.arrowD}
            stroke="#FBBF2460"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
        </svg>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function OrigamiStepsModal({ item, onClose }: { item: Origami; onClose(): void }) {
  const [phase,     setPhase]     = useState<OrigamiPhase>("cover");
  const [step,      setStep]      = useState(0);
  const [animKey,   setAnimKey]   = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoPlay,  setAutoPlay]  = useState(false);
  const [voiceOn,   setVoiceOn]   = useState(false);
  const total = item.steps.length;

  const { speak, stop, speaking } = useAmyVoice();

  const goTo = useCallback((next: number) => {
    setStep(next);
    setAnimKey(k => k + 1);
    setIsPlaying(true);
  }, []);

  const goNext = useCallback(() => {
    setStep(prev => {
      const next = prev + 1;
      if (next >= total) { setPhase("done"); return prev; }
      setAnimKey(k => k + 1);
      setIsPlaying(true);
      return next;
    });
  }, [total]);

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
    setAnimKey(k => k + 1);
    setIsPlaying(true);
    setPhase("steps");
  };

  // Voice — read instruction on step enter
  useEffect(() => {
    if (!voiceOn || phase !== "steps") { stop(); return; }
    const instr = item.steps[step]?.instruction ?? "";
    if (instr) { void speak(instr); }
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, voiceOn, phase]);

  // Auto-play — advance after animation duration (~3 s)
  useEffect(() => {
    if (!autoPlay || !isPlaying || phase !== "steps") return;
    const t = setTimeout(() => { goNext(); }, 3200);
    return () => clearTimeout(t);
  }, [autoPlay, isPlaying, phase, animKey, goNext]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (phase === "steps") {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
        if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
        if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", handler); };
  }, [phase, onClose, goNext, goPrev]);

  const cur     = item.steps[step]!;
  const timeEst = DIFFICULTY_TIME[item.difficulty] ?? "~10 min";

  // ── shared shell ────────────────────────────────────────────────────────────
  const shell = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      role="dialog" aria-modal="true" aria-label={item.title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{ animation: "og-fade-in 180ms ease both" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-md flex flex-col overflow-hidden shadow-2xl"
        style={{
          maxHeight: "96dvh",
          borderRadius: "28px 28px 0 0",
          animation: "og-slide-up 320ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >

        {/* ── PHASE: cover ────────────────────────────────────────────── */}
        {phase === "cover" && (
          <div
            className="flex flex-col items-center text-center overflow-y-auto"
            style={{ background: "linear-gradient(160deg,#1e1b4b 0%,#0f0f1a 100%)" }}
          >
            <button onClick={onClose} aria-label="Close"
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all">✕</button>

            {/* Animated preview */}
            <div
              className="mt-10 mb-4 rounded-3xl flex items-center justify-center shadow-2xl border border-white/10"
              style={{ width: 148, height: 148, background: item.accent + "28",
                       animation: "og-appear 600ms cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              <span style={{ fontSize: 80 }}>{item.emoji}</span>
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
                {total} steps
              </span>
            </div>

            {/* Step preview dots */}
            <div className="flex gap-1.5 mb-4">
              {item.steps.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-white/30" />
              ))}
            </div>

            {/* Feature pills */}
            <div className="flex gap-2 mb-8 text-[11px] text-white/50 font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-white/8 border border-white/10">▶ Animated</span>
              <span className="px-2.5 py-1 rounded-full bg-white/8 border border-white/10">🔊 Voice</span>
              <span className="px-2.5 py-1 rounded-full bg-white/8 border border-white/10">⚡ Auto-play</span>
            </div>

            <button
              onClick={() => { setPhase("steps"); setIsPlaying(true); }}
              className="mx-6 mb-10 w-[calc(100%-3rem)] py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg,${item.accent},${item.accent}bb)` }}
            >
              Let's Start Folding! 🚀
            </button>
          </div>
        )}

        {/* ── PHASE: steps ────────────────────────────────────────────── */}
        {phase === "steps" && (
          <div className="flex flex-col" style={{ background: "#0f0f18" }}>
            {/* Close */}
            <button onClick={onClose} aria-label="Close"
              className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all">✕</button>

            {/* ── Top bar: title + step badge + progress ── */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate max-w-[55%]">
                  {item.title}
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Auto-play toggle */}
                  <button
                    onClick={() => setAutoPlay(a => !a)}
                    aria-label="Toggle auto-play"
                    className="text-[10px] font-black px-2 py-0.5 rounded-full border transition-all"
                    style={{
                      borderColor: autoPlay ? item.accent : "rgba(255,255,255,0.15)",
                      color: autoPlay ? item.accent : "rgba(255,255,255,0.35)",
                      background: autoPlay ? item.accent + "22" : "transparent",
                    }}
                  >
                    ⚡ AUTO
                  </button>
                  {/* Voice toggle */}
                  <button
                    onClick={() => setVoiceOn(v => !v)}
                    aria-label="Toggle voice"
                    className="text-[10px] font-black px-2 py-0.5 rounded-full border transition-all"
                    style={{
                      borderColor: voiceOn ? "#22c55e" : "rgba(255,255,255,0.15)",
                      color: voiceOn ? "#22c55e" : "rgba(255,255,255,0.35)",
                      background: voiceOn ? "#22c55e22" : "transparent",
                    }}
                  >
                    {speaking ? "🔊" : voiceOn ? "🔊" : "🔇"}
                  </button>
                  {/* Step badge */}
                  <span
                    className="text-xs font-black px-2.5 py-0.5 rounded-full text-white"
                    style={{ background: item.accent }}
                  >
                    {step + 1} / {total}
                  </span>
                </div>
              </div>

              {/* Segmented progress bar — clickable */}
              <div className="flex gap-1">
                {item.steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="h-1.5 rounded-full flex-1 transition-all duration-300"
                    style={{
                      background: i < step ? "#10b981" : i === step ? item.accent : "rgba(255,255,255,0.12)",
                    }}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* ── Animated fold stage ── */}
            <div
              className="flex flex-col items-center justify-center py-6 relative"
              style={{ background: "linear-gradient(180deg,#161628 0%,#0f0f18 100%)" }}
            >
              <AnimatedFoldStage
                key={animKey}
                fold={cur.fold}
                emoji={item.emoji}
                accent={item.accent}
                animKey={animKey}
                isPlaying={isPlaying}
              />

              {/* ── Playback controls: Replay | Play/Pause (below diagram) ── */}
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={goPrev}
                  disabled={step === 0}
                  aria-label="Previous step"
                  className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90 disabled:opacity-25"
                  style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
                >
                  ⬅
                </button>

                {/* Replay */}
                <button
                  onClick={replay}
                  aria-label="Replay animation"
                  className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                >
                  🔁
                </button>

                {/* Play / Pause */}
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="w-14 h-14 flex items-center justify-center rounded-full font-black text-xl text-white transition-all active:scale-90 shadow-lg"
                  style={{ background: `linear-gradient(135deg,${item.accent},${item.accent}cc)` }}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>

                {/* Replay = already done, next step uses goNext */}
                <button
                  onClick={replay}
                  aria-label="Replay step"
                  className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90 opacity-0 pointer-events-none"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                  aria-hidden="true"
                >
                  🔁
                </button>

                <button
                  onClick={goNext}
                  aria-label="Next step"
                  className="w-10 h-10 flex items-center justify-center rounded-full font-bold text-base transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
                >
                  ➡
                </button>
              </div>
            </div>

            {/* ── Instruction ── */}
            <div className="px-5 pt-3 pb-3 flex-shrink-0">
              <div
                key={`inst-${animKey}`}
                className="rounded-2xl p-4 mb-3 border border-white/10"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  animation: "og-slide-up 220ms 120ms ease both",
                }}
              >
                <p className="text-white text-base font-semibold leading-relaxed text-center">
                  {cur.instruction}
                </p>
              </div>

              {/* ── Big Prev / Next nav buttons ── */}
              <div className="flex gap-2.5 mb-3">
                <button
                  onClick={goPrev}
                  disabled={step === 0}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 border border-white/10 text-white disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  ← Previous
                </button>
                <button
                  onClick={goNext}
                  className="flex-[2] py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
                  style={{
                    background: step < total - 1
                      ? `linear-gradient(135deg,${item.accent},${item.accent}bb)`
                      : "linear-gradient(135deg,#10b981,#3b82f6)",
                  }}
                >
                  {step < total - 1 ? "Next Step →" : "🎉 Finish!"}
                </button>
              </div>

              <a
                href={item.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-white/10 mb-4 text-white/40 text-xs font-bold hover:text-white/60 transition-colors"
              >
                📥 Download Full Guide
              </a>
            </div>
          </div>
        )}

        {/* ── PHASE: done ──────────────────────────────────────────────── */}
        {phase === "done" && (
          <div
            className="flex flex-col items-center text-center overflow-y-auto pb-10"
            style={{ background: "linear-gradient(160deg,#052e16 0%,#0f0f18 100%)" }}
          >
            <button onClick={onClose} aria-label="Close"
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all">✕</button>

            <div className="mt-12 mb-4" style={{ animation: "og-pop-in 500ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
              <span style={{ fontSize: 96 }}>{item.emoji}</span>
            </div>

            <div className="text-4xl mb-2" style={{ animation: "og-pop-in 500ms 120ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
              🎉
            </div>

            <h2 className="text-white font-black text-2xl mb-2">You did it!</h2>
            <p className="text-white/60 text-sm px-8 mb-8 leading-relaxed">
              Amazing work! Your <strong className="text-white/80">{item.title}</strong> is complete!
            </p>

            <div className="flex flex-col gap-3 px-6 w-full">
              <button
                onClick={restart}
                className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-95"
                style={{ background: `linear-gradient(135deg,${item.accent},${item.accent}bb)` }}
              >
                🔁 Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white/70 hover:text-white transition-colors border border-white/10"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                ✓ Done
              </button>
            </div>
          </div>
        )}
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
    </div>
  );

  return createPortal(shell, document.body);
}

// ─── Origami Card (redesigned) ───────────────────────────────────────────────
function OrigamiCard({ item, done, saved, onDone, onSave, onViewSteps }: {
  item: Origami; done: boolean; saved: boolean;
  onDone(): void; onSave(): void; onViewSteps(): void;
}) {
  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col transition-all shadow-sm hover:shadow-md ${done ? "opacity-75" : ""}`}>

      {/* ── Large preview area ─────────────────────────── */}
      <div className={`relative ${item.bg} flex flex-col items-center justify-center pt-5 pb-3 px-2`}>
        {/* Done overlay */}
        {done && (
          <div className="absolute inset-0 bg-green-500/15 flex items-center justify-center z-10 rounded-t-2xl">
            <div className="bg-green-500 text-white rounded-full w-9 h-9 flex items-center justify-center text-base font-black shadow-lg">✓</div>
          </div>
        )}

        {/* Large emoji final output */}
        <div className="w-20 h-20 rounded-2xl bg-white/50 shadow-md flex items-center justify-center mb-2 border border-white/60">
          <span className="text-4xl">{item.emoji}</span>
        </div>

        {/* Steps + difficulty badges */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[item.difficulty]}`}>
            {item.difficulty}
          </span>
          <span className="text-[9px] font-bold bg-white/70 text-gray-700 px-2 py-0.5 rounded-full">
            {item.steps.length} Steps
          </span>
        </div>

        {/* Step dot indicators */}
        <div className="flex gap-0.5">
          {item.steps.slice(0, 10).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/60"/>
          ))}
          {item.steps.length > 10 && <span className="text-[7px] text-white/70 font-bold ml-0.5">+{item.steps.length - 10}</span>}
        </div>

        {/* Save heart */}
        <button onClick={onSave}
          className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full transition-all ${saved ? "bg-rose-500 text-white" : "bg-white/60 text-muted-foreground hover:bg-white"}`}>
          <span className="text-xs">{saved ? "♥" : "♡"}</span>
        </button>
      </div>

      {/* ── Card info + actions ────────────────────────── */}
      <div className="p-3 flex-1 flex flex-col justify-between bg-card">
        {/* Title */}
        <p className="text-xs font-bold text-foreground leading-snug mb-3">{item.title}</p>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5">
          {/* View Steps — primary */}
          <button onClick={onViewSteps}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-black text-white transition-all active:scale-95"
            style={{ background:`linear-gradient(135deg,${item.accent}cc,${item.accent})` }}>
            <span>▶</span> View Steps
          </button>

          {/* Download + Done row */}
          <div className="flex gap-1.5">
            <a href={item.guideUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-muted text-muted-foreground text-[10px] font-bold hover:bg-muted/80 transition-colors border border-border">
              ⬇ Guide
            </a>
            <button onClick={onDone}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-colors border ${done ? "bg-green-500 text-white border-green-500" : "bg-muted text-muted-foreground hover:bg-green-100 dark:bg-green-500/20 hover:text-green-700 dark:text-green-200 border-border"}`}>
              {done ? "✓ Done" : "Mark Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
