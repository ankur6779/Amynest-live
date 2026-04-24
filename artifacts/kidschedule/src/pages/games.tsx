import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Lock, Sparkles, Gamepad2, Trophy, X, Coins, Gift, Plus, Trash2, Check,
} from "lucide-react";
import {
  GAMES, CATEGORY_LABEL, CATEGORY_EMOJI, isUnlocked, unlockGame, recordPlay,
  gamesPlayedToday, dailyLimit, dailyLimitReached, amySuggestion, getSkillPercent,
  type GameDef, type GameCategory,
} from "@/lib/games";
import {
  getTotalPoints, addPoints, getRewards, saveRewards, redeemReward, getRedemptions,
  type Reward,
} from "@/lib/rewards";
import { PatternMatchGame } from "@/components/games/PatternMatch";
import { OddOneOutGame } from "@/components/games/OddOneOut";
import { CardFlipGame } from "@/components/games/CardFlip";
import { SequenceMemoryGame } from "@/components/games/SequenceMemory";
import { BehaviorChoiceGame } from "@/components/games/BehaviorChoice";
import { SpeedMathGame } from "@/components/games/SpeedMath";
import { NumberMatchGame } from "@/components/games/NumberMatch";
import { FindMistakeGame } from "@/components/games/FindMistake";
import { ColorMemoryGame } from "@/components/games/ColorMemory";
import { TargetTapGame } from "@/components/games/TargetTap";
import { MazeEscapeGame } from "@/components/games/MazeEscape";
import { ShapeMatchingGame } from "@/components/games/ShapeMatching";
import { ColorFillGame } from "@/components/games/ColorFill";
import { HiddenObjectsGame } from "@/components/games/HiddenObjects";
import { SpotTheDifferenceGame } from "@/components/games/SpotTheDifference";

type ActiveGame =
  | { kind: "play"; game: GameDef }
  | { kind: "result"; game: GameDef; score: number; total: number; pointsEarned: number; perfect: boolean }
  | null;

export default function GamesPage() {
  const [, setLocation] = useLocation();
  const [points, setPoints] = useState<number>(getTotalPoints());
  const [unlockedTick, setUnlockedTick] = useState(0);
  const [active, setActive] = useState<ActiveGame>(null);
  const [showRedeem, setShowRedeem] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync points whenever modals close
  useEffect(() => { setPoints(getTotalPoints()); }, [active, showRedeem, unlockedTick]);

  const playedToday = gamesPlayedToday();
  const limit = dailyLimit();
  const limitHit = dailyLimitReached();
  const suggestion = useMemo(() => amySuggestion(), [unlockedTick, active]);

  const devGrantPoints = () => {
    addPoints("DEV", "DEV: test grant", 1000);
    setPoints(getTotalPoints());
    setUnlockedTick((t) => t + 1);
  };

  const onUnlock = (g: GameDef) => {
    setError(null);
    const r = unlockGame(g.id);
    if (!r.ok) setError(r.reason ?? "Could not unlock.");
    setUnlockedTick((t) => t + 1);
  };

  const onPlay = (g: GameDef) => {
    if (limitHit) {
      setError(`Daily limit reached (${limit} games per day). Come back tomorrow!`);
      return;
    }
    setError(null);
    setActive({ kind: "play", game: g });
  };

  const finishGame = (g: GameDef, score: number, total: number) => {
    const ratio = total === 0 ? 0 : score / total;
    const perfect = ratio >= 0.95;
    const earned = perfect
      ? g.rewardMax
      : Math.max(g.rewardMin, Math.round(g.rewardMin + (g.rewardMax - g.rewardMin) * ratio));
    recordPlay(g.id, score, total, perfect, earned);
    setActive({ kind: "result", game: g, score, total, pointsEarned: earned, perfect });
  };

  // Group games by category for the grid
  const gamesByCategory = useMemo(() => {
    const order: GameCategory[] = ["brain", "memory", "math", "focus", "creativity", "behavior", "action", "puzzle"];
    const map = new Map<GameCategory, GameDef[]>();
    for (const g of GAMES) {
      if (!map.has(g.category)) map.set(g.category, []);
      map.get(g.category)!.push(g);
    }
    return order.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const);
  }, []);

  // Skills (re-read on every render via tick)
  const skillCats: GameCategory[] = ["brain", "memory", "math", "focus", "behavior", "action"];
  const skills = skillCats.map((c) => ({ cat: c, pct: getSkillPercent(c) }));

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
      color: "#fff",
      paddingBottom: 80,
    }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(180deg, rgba(15,12,41,0.95) 0%, rgba(15,12,41,0.7) 100%)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(139,92,246,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setLocation("/dashboard")}
            style={{ color: "#c4b5fd", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gamepad2 size={20} color="#c4b5fd" />
            <h1 style={{ fontFamily: "Quicksand, sans-serif", fontSize: 18, fontWeight: 800, margin: 0 }}>Gaming Reward</h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {import.meta.env.DEV && (
            <button
              onClick={devGrantPoints}
              title="DEV only — grant 1000 test points"
              style={{
                color: "#fff", background: "rgba(16,185,129,0.25)", border: "1px solid rgba(16,185,129,0.5)",
                padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <Plus size={11} /> 1000 pts <span style={{ opacity: 0.7, fontWeight: 400 }}>(DEV)</span>
            </button>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "linear-gradient(135deg, #f59e0b, #f97316)",
            padding: "6px 12px", borderRadius: 999, color: "#fff", fontWeight: 800, fontSize: 13,
            boxShadow: "0 4px 12px rgba(245,158,11,0.35)",
          }}>
            <Coins size={14} /> {points}
          </div>
          <button
            onClick={() => setShowRedeem(true)}
            style={{ color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(139,92,246,0.3)", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          ><Gift size={13} /> Redeem</button>
        </div>
      </div>

      {/* Daily limit + Amy suggestion */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 4px" }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: 14, padding: 12,
          display: "flex", alignItems: "center", gap: 10, fontSize: 13,
        }}>
          <Sparkles size={18} color="#fbbf24" />
          <div style={{ flex: 1, color: "#e6e1f5" }}>{suggestion.line}</div>
        </div>
        <div style={{
          marginTop: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: "#a99fd9",
        }}>
          <span>Played today: <strong style={{ color: limitHit ? "#fca5a5" : "#fff" }}>{playedToday} / {limit}</strong></span>
          <span>Earn 50 points to unlock a game.</span>
        </div>
      </div>

      {error && (
        <div style={{
          maxWidth: 720, margin: "10px auto 0", padding: "10px 14px",
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 12, color: "#fecaca", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", color: "#fecaca", cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}

      {/* Skill Progress strip */}
      <div style={{ maxWidth: 720, margin: "12px auto 0", padding: "0 16px" }}>
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(139,92,246,0.22)",
          borderRadius: 14, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: 0.6 }}>Skill Progress</span>
            <span style={{ fontSize: 11, color: "#7c6fb8" }}>Accuracy across all plays</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            {skills.map(({ cat, pct }) => (
              <div key={cat}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#e6e1f5", marginBottom: 4 }}>
                  <span>{CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat].split(" &")[0]}</span>
                  <span style={{ fontWeight: 800, color: pct >= 75 ? "#4ade80" : pct >= 40 ? "#fbbf24" : "#a99fd9" }}>{pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: pct >= 75 ? "linear-gradient(90deg,#22c55e,#4ade80)"
                      : pct >= 40 ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                      : "linear-gradient(90deg,#8b5cf6,#a78bfa)",
                    transition: "width 0.4s",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Games grouped by category */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 0" }}>
        {gamesByCategory.map(([cat, list]) => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10,
            }}>
              <span style={{ fontSize: 18 }}>{CATEGORY_EMOJI[cat]}</span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#e6e1f5", fontFamily: "Quicksand, sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {CATEGORY_LABEL[cat]}
              </h3>
              <span style={{ fontSize: 11, color: "#7c6fb8", marginLeft: "auto" }}>{list.length} game{list.length === 1 ? "" : "s"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {list.map((g) => {
                const unlocked = isUnlocked(g.id);
                const soon = g.status === "soon";
                return (
                  <div
                    key={g.id}
                    style={{
                      position: "relative",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(139,92,246,0.25)",
                      borderRadius: 16, padding: 14,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      opacity: soon ? 0.6 : 1,
                      filter: !unlocked && !soon ? "blur(0.4px)" : "none",
                    }}
                  >
                    {!unlocked && !soon && (
                      <div style={{
                        position: "absolute", top: 8, right: 8,
                        background: "rgba(0,0,0,0.4)", borderRadius: 999,
                        padding: 4,
                      }}><Lock size={11} color="#fbbf24" /></div>
                    )}
                    <div style={{
                      fontSize: 36, lineHeight: 1, width: 56, height: 56,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(139,92,246,0.15)", borderRadius: 14,
                      filter: !unlocked && !soon ? "grayscale(0.6)" : "none",
                    }}>{g.emoji}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, fontFamily: "Quicksand, sans-serif", textAlign: "center", lineHeight: 1.2 }}>
                      {g.title}
                    </div>
                    {g.ageHint && (
                      <div style={{ fontSize: 11, color: "#a99fd9" }}>{g.ageHint}</div>
                    )}

                    {soon ? (
                      <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "#fbbf24" }}>Coming soon</div>
                    ) : unlocked ? (
                      <button
                        onClick={() => onPlay(g)}
                        disabled={limitHit}
                        style={{
                          marginTop: 6, width: "100%",
                          background: limitHit ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #8b5cf6, #ec4899)",
                          color: "#fff", border: "none", borderRadius: 999,
                          padding: "7px 0", fontSize: 12.5, fontWeight: 700,
                          cursor: limitHit ? "default" : "pointer",
                          boxShadow: limitHit ? "none" : "0 4px 12px rgba(139,92,246,0.35)",
                          opacity: limitHit ? 0.5 : 1,
                        }}
                      >Play</button>
                    ) : (
                      <button
                        onClick={() => onUnlock(g)}
                        style={{
                          marginTop: 6, width: "100%",
                          background: "rgba(255,255,255,0.08)",
                          color: "#fff", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 999,
                          padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <Lock size={11} /> {g.unlockCost} pts
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Active game / result modal */}
      {active && (
        <GameModal
          state={active}
          onClose={() => setActive(null)}
          onFinish={(score, total) => active.kind === "play" && finishGame(active.game, score, total)}
        />
      )}
      {showRedeem && <RedeemModal onClose={() => setShowRedeem(false)} />}
    </div>
  );
}

// ─── Game modal ──────────────────────────────────────────────────────
function GameModal({
  state, onClose, onFinish,
}: { state: NonNullable<ActiveGame>; onClose: () => void; onFinish: (score: number, total: number) => void }) {
  const game = state.game;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(8,5,25,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: "linear-gradient(180deg, #1a1040 0%, #0f0c29 100%)",
          borderRadius: 24, padding: "16px 18px 22px",
          color: "#fff", boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
          maxHeight: "92vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 26 }}>{game.emoji}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: "Quicksand, sans-serif" }}>{game.title}</h3>
              <div style={{ fontSize: 11, color: "#a99fd9" }}>{game.blurb}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ color: "#c4b5fd", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {state.kind === "play" && (
          <div style={{ paddingTop: 6 }}>
            {game.id === "pattern-match" && <PatternMatchGame onFinish={onFinish} />}
            {game.id === "odd-one-out" && <OddOneOutGame onFinish={onFinish} />}
            {game.id === "card-flip" && <CardFlipGame onFinish={onFinish} />}
            {game.id === "sequence" && <SequenceMemoryGame onFinish={onFinish} />}
            {game.id === "color-memory" && <ColorMemoryGame onFinish={onFinish} />}
            {game.id === "speed-math" && <SpeedMathGame onFinish={onFinish} />}
            {game.id === "number-match" && <NumberMatchGame onFinish={onFinish} />}
            {game.id === "find-mistake" && <FindMistakeGame onFinish={onFinish} />}
            {game.id === "target-tap" && <TargetTapGame onFinish={onFinish} />}
            {game.id === "what-should-you-do" && <BehaviorChoiceGame onFinish={onFinish} />}
            {game.id === "maze-escape" && <MazeEscapeGame onFinish={onFinish} />}
            {game.id === "shape-match" && <ShapeMatchingGame onFinish={onFinish} />}
            {game.id === "color-fill" && <ColorFillGame onFinish={onFinish} />}
            {game.id === "hidden-objects" && <HiddenObjectsGame onFinish={onFinish} />}
            {game.id === "spot-difference" && <SpotTheDifferenceGame onFinish={onFinish} />}
          </div>
        )}

        {state.kind === "result" && (
          <div style={{ textAlign: "center", padding: "8px 4px 0" }}>
            <Trophy size={48} color={state.perfect ? "#fbbf24" : "#c4b5fd"} style={{ margin: "12px auto" }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 20, fontFamily: "Quicksand, sans-serif", fontWeight: 800 }}>
              {state.perfect ? "Perfect Score!" : "Nice work!"}
            </h3>
            <p style={{ color: "#c7c0e8", fontSize: 14, margin: "0 0 14px" }}>
              You scored <strong>{state.score} / {state.total}</strong>.
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "#fff", padding: "10px 18px", borderRadius: 999,
              fontSize: 15, fontWeight: 800,
              boxShadow: "0 4px 14px rgba(245,158,11,0.4)",
              marginBottom: 16,
            }}>
              <Coins size={16} /> +{state.pointsEarned} points
              {state.perfect && <span style={{ fontSize: 11, opacity: 0.85 }}>(perfect bonus)</span>}
            </div>
            <div>
              <button
                onClick={onClose}
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                  color: "#fff", border: "none", borderRadius: 999,
                  padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Redeem modal (parent-defined rewards) ───────────────────────────
function RedeemModal({ onClose }: { onClose: () => void }) {
  const [points, setPoints] = useState(getTotalPoints());
  const [rewards, setRewards] = useState<Reward[]>(getRewards());
  const [redemptions, setRedemptions] = useState(getRedemptions());
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCost, setNewCost] = useState<number>(50);
  const [newEmoji, setNewEmoji] = useState("🎁");
  const [msg, setMsg] = useState<string | null>(null);
  const [child, setChild] = useState("");

  const refresh = () => {
    setPoints(getTotalPoints());
    setRewards(getRewards());
    setRedemptions(getRedemptions());
  };

  const onRedeem = (r: Reward) => {
    setMsg(null);
    if (!child.trim()) { setMsg("Type the child's name first."); return; }
    const ok = redeemReward(r, child.trim());
    if (!ok) setMsg(`Not enough points for ${r.label} (need ${r.cost}).`);
    else setMsg(`✨ ${r.label} redeemed for ${child.trim()}!`);
    refresh();
  };

  const onAdd = () => {
    if (!newLabel.trim() || newCost <= 0) return;
    const r: Reward = {
      id: "custom-" + Date.now(),
      label: newLabel.trim(),
      emoji: newEmoji || "🎁",
      cost: Math.round(newCost),
    };
    saveRewards([...rewards, r]);
    setShowAdd(false);
    setNewLabel(""); setNewCost(50); setNewEmoji("🎁");
    refresh();
  };

  const onDelete = (id: string) => {
    saveRewards(rewards.filter((r) => r.id !== id));
    refresh();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70,
      background: "rgba(8,5,25,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560,
          background: "linear-gradient(180deg, #1a1040 0%, #0f0c29 100%)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: "16px 20px 28px",
          color: "#fff", maxHeight: "92vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={22} color="#fbbf24" />
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: "Quicksand, sans-serif", fontWeight: 800 }}>Reward Redemption</h3>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ color: "#c4b5fd", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 12px", marginBottom: 12,
        }}>
          <span style={{ fontSize: 13, color: "#c7c0e8" }}>Available points</span>
          <span style={{ fontSize: 18, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Coins size={16} color="#fbbf24" /> {points}
          </span>
        </div>

        <input
          value={child}
          onChange={(e) => setChild(e.target.value)}
          placeholder="Child's name (for record)"
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", color: "#fff",
            border: "1px solid rgba(139,92,246,0.3)", marginBottom: 12, fontSize: 13,
          }}
        />

        {msg && (
          <div style={{
            background: msg.startsWith("✨") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: "1px solid " + (msg.startsWith("✨") ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"),
            color: msg.startsWith("✨") ? "#86efac" : "#fca5a5",
            padding: "8px 12px", borderRadius: 10, fontSize: 13, marginBottom: 12,
          }}>{msg}</div>
        )}

        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {rewards.map((r) => {
            const can = points >= r.cost;
            return (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 12, padding: "10px 12px",
              }}>
                <div style={{ fontSize: 24 }}>{r.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.label}</div>
                  <div style={{ fontSize: 11.5, color: "#a99fd9" }}>{r.cost} points</div>
                </div>
                <button
                  onClick={() => onRedeem(r)}
                  disabled={!can}
                  style={{
                    background: can ? "linear-gradient(135deg, #f59e0b, #f97316)" : "rgba(255,255,255,0.06)",
                    color: "#fff", border: "none", borderRadius: 999,
                    padding: "6px 14px", fontSize: 12, fontWeight: 700,
                    cursor: can ? "pointer" : "default", opacity: can ? 1 : 0.5,
                  }}
                >Redeem</button>
                {r.id.startsWith("custom-") && (
                  <button onClick={() => onDelete(r.id)} aria-label="Delete reward"
                    style={{ background: "transparent", color: "#fca5a5", border: "none", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            style={{
              width: "100%", padding: "10px 0",
              background: "rgba(255,255,255,0.06)", color: "#c4b5fd",
              border: "1px dashed rgba(139,92,246,0.5)", borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            <Plus size={14} /> Add a parent-defined reward
          </button>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="🎁"
                style={{ width: 50, padding: "8px", textAlign: "center", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", color: "#fff", fontSize: 20 }} />
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Ice cream after dinner"
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", color: "#fff", fontSize: 13 }} />
              <input type="number" value={newCost} min={1}
                onChange={(e) => setNewCost(parseInt(e.target.value || "0", 10))}
                placeholder="50"
                style={{ width: 70, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", color: "#fff", fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "transparent", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)", padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={onAdd} style={{ flex: 1, background: "linear-gradient(135deg, #8b5cf6, #ec4899)", color: "#fff", border: "none", padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        )}

        {redemptions.length > 0 && (
          <details style={{ marginTop: 16, color: "#c7c0e8" }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#c4b5fd" }}>Recent redemptions ({redemptions.length})</summary>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {redemptions.slice(0, 8).map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#a99fd9", display: "flex", justifyContent: "space-between" }}>
                  <span>{r.rewardLabel} — {r.childName}</span>
                  <span>−{r.cost} pts</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
