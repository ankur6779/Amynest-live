import { useMemo, useState } from "react";

interface Scenario {
  emoji: string;
  question: string;
  options: { text: string; correct: boolean; why: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    emoji: "🧱",
    question: "Your friend accidentally breaks your tower of blocks. What is the kind thing to do?",
    options: [
      { text: "Push them away.", correct: false, why: "Hurting back makes it bigger." },
      { text: "Take a deep breath and tell them how I feel.", correct: true, why: "Words and a calm body work best." },
      { text: "Cry and don't say anything.", correct: false, why: "Telling helps the friend understand." },
    ],
  },
  {
    emoji: "🧁",
    question: "There is one cupcake left and your sister also wants it. What is the smart choice?",
    options: [
      { text: "Eat it fast before she sees.", correct: false, why: "Fair sharing keeps friendships strong." },
      { text: "Cut it in half and share.", correct: true, why: "Sharing builds trust with family." },
      { text: "Throw it away so no one gets it.", correct: false, why: "That wastes food and feelings." },
    ],
  },
  {
    emoji: "📱",
    question: "A new kid in class is sitting alone at break. What is the kind thing to do?",
    options: [
      { text: "Walk past — they'll find someone.", correct: false, why: "Being alone is scary on day one." },
      { text: "Smile and ask if they want to play.", correct: true, why: "One kind hello can change a whole day." },
      { text: "Make a joke about them with friends.", correct: false, why: "Jokes that hurt are not funny." },
    ],
  },
  {
    emoji: "📚",
    question: "You promised to help your brother with homework but a game is starting. What do you do?",
    options: [
      { text: "Play the game and forget.", correct: false, why: "Promises matter — they build trust." },
      { text: "Ask the game to wait, help first.", correct: true, why: "Keeping promises is a superpower." },
      { text: "Tell him to figure it out alone.", correct: false, why: "Letting people down breaks trust." },
    ],
  },
  {
    emoji: "🤬",
    question: "You feel really angry and want to shout. What is a calm thing to try first?",
    options: [
      { text: "Take 3 deep belly breaths.", correct: true, why: "Deep breaths slow the angry feeling." },
      { text: "Throw something hard.", correct: false, why: "Throwing can hurt people or break things." },
      { text: "Yell as loud as I can.", correct: false, why: "Yelling makes the angry feeling stay longer." },
    ],
  },
];

export function BehaviorChoiceGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const rounds = useMemo(() => [...SCENARIOS].sort(() => Math.random() - 0.5).slice(0, 5), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  if (idx >= rounds.length) { onFinish(score, rounds.length); return null; }
  const r = rounds[idx];

  const onPick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (r.options[i].correct) setScore((s) => s + 1);
    setTimeout(() => { setPicked(null); setIdx((n) => n + 1); }, 1300);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#a99fd9", fontSize: 12, marginBottom: 8 }}>Round {idx + 1} of {rounds.length}</div>
      <div style={{ fontSize: 44, marginBottom: 6 }}>{r.emoji}</div>
      <h3 style={{ margin: "0 0 18px", color: "#fff", fontSize: 15, fontFamily: "Quicksand, sans-serif", lineHeight: 1.4 }}>{r.question}</h3>
      <div style={{ display: "grid", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        {r.options.map((o, i) => {
          const isPicked = picked === i;
          const reveal = picked !== null;
          return (
            <button
              key={i}
              onClick={() => onPick(i)}
              disabled={reveal}
              style={{
                textAlign: "left", padding: "11px 14px", borderRadius: 12,
                background: reveal && o.correct ? "rgba(34,197,94,0.22)"
                          : reveal && isPicked ? "rgba(239,68,68,0.18)"
                                                : "rgba(255,255,255,0.08)",
                border: "1px solid" + (reveal && o.correct ? "rgba(34,197,94,0.6)"
                                       : reveal && isPicked ? "rgba(239,68,68,0.5)"
                                                            : "rgba(139,92,246,0.3)"),
                color: "#fff", fontSize: 13.5, lineHeight: 1.4,
                cursor: reveal ? "default" : "pointer",
              }}
            >
              {o.text}
              {reveal && (o.correct || isPicked) && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: "#c7c0e8" }}>{o.why}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
