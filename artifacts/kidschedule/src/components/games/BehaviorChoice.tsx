import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import { feedbackCorrect, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_SESSION_ROUNDS } from "@/lib/game-session-progression";

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
  {
    emoji: "🚌",
    question: "Someone cuts in line at the bus stop. What is the kind thing to do?",
    options: [
      { text: "Shove them out of the way.", correct: false, why: "Pushing can hurt someone." },
      { text: "Use a calm voice and ask them to wait their turn.", correct: true, why: "Calm words keep everyone safe." },
      { text: "Give up and go home.", correct: false, why: "You can still wait fairly." },
    ],
  },
  {
    emoji: "🎨",
    question: "Your friend draws on your picture by accident. What should you do?",
    options: [
      { text: "Rip up their drawing too.", correct: false, why: "Payback makes both people upset." },
      { text: "Tell them how you feel and fix it together.", correct: true, why: "Talking and fixing builds friendship." },
      { text: "Never speak to them again.", correct: false, why: "Mistakes happen — friends can repair them." },
    ],
  },
  {
    emoji: "🛏️",
    question: "Bedtime is soon but you want to keep playing. What is the smart choice?",
    options: [
      { text: "Hide and keep playing.", correct: false, why: "Sleep helps your brain grow." },
      { text: "Finish calmly and start the bedtime routine.", correct: true, why: "Routines help bodies rest and recharge." },
      { text: "Cry until bedtime is cancelled.", correct: false, why: "A calm wind-down works better." },
    ],
  },
];

export function BehaviorChoiceGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const rounds = useMemo(
    () => [...SCENARIOS].sort(() => Math.random() - 0.5).slice(0, GAME_SESSION_ROUNDS),
    [],
  );
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (idx >= rounds.length && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(score, rounds.length);
    }
  }, [idx, score, rounds.length, onFinish]);

  if (idx >= rounds.length) return null;

  const r = rounds[idx];
  const feedback =
    picked !== null ? (r.options[picked].correct ? "correct" : "wrong") : null;

  const onPick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (r.options[i].correct) {
      setScore((s) => s + 1);
      void feedbackCorrect();
    } else {
      void feedbackWrong();
    }
    setTimeout(() => {
      setPicked(null);
      setIdx((n) => n + 1);
    }, 1300);
  };

  return (
    <GameShell
      round={idx + 1}
      totalRounds={rounds.length}
      score={score}
      feedback={feedback}
      feedbackText={feedback === "correct" ? "Great choice!" : feedback === "wrong" ? "Think about it…" : undefined}
    >
      <div style={{ fontSize: 44, marginBottom: 6 }}>{r.emoji}</div>
      <h3
        style={{
          margin: "0 0 18px",
          color: gameTheme.text,
          fontSize: 15,
          fontFamily: gameTheme.fontDisplay,
          lineHeight: 1.4,
        }}
      >
        {r.question}
      </h3>
      <div style={{ display: "grid", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        {r.options.map((o, i) => {
          const isPicked = picked === i;
          const reveal = picked !== null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              disabled={reveal}
              style={{
                textAlign: "left",
                padding: "11px 14px",
                borderRadius: 12,
                background:
                  reveal && o.correct
                    ? gameTheme.successBg
                    : reveal && isPicked
                      ? gameTheme.errorBg
                      : "rgba(255,255,255,0.08)",
                border:
                  "1px solid" +
                  (reveal && o.correct
                    ? "rgba(34,197,94,0.6)"
                    : reveal && isPicked
                      ? "rgba(239,68,68,0.5)"
                      : gameTheme.glassBorder),
                color: gameTheme.text,
                fontSize: 13.5,
                lineHeight: 1.4,
                cursor: reveal ? "default" : "pointer",
              }}
            >
              {o.text}
              {reveal && (o.correct || isPicked) && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: gameTheme.textSoft }}>{o.why}</div>
              )}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
