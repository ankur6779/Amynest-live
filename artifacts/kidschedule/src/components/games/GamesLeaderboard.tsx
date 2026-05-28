import { Trophy } from "lucide-react";
import { getWeeklyLeaderboard } from "@/lib/games";
import { gameTheme } from "@/lib/game-theme";

export function GamesLeaderboard() {
  const rows = getWeeklyLeaderboard();

  return (
    <div
      style={{
        background: "hsl(var(--card))",
        border: `1px solid ${gameTheme.glassBorder}`,
        borderRadius: 16,
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Trophy size={16} color="hsl(var(--brand-amber-300))" />
        <span style={{ fontSize: 12, fontWeight: 800, color: gameTheme.accentSoft, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Weekly top scores
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 999,
            background: "linear-gradient(135deg,hsl(var(--brand-amber-500)),hsl(var(--brand-orange-500)))",
            color: "#fff",
          }}
        >
          PREMIUM
        </span>
      </div>

      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: gameTheme.textMuted, lineHeight: 1.45 }}>
          Play games this week to climb the board. Your best score per game counts.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((row, i) => (
            <div
              key={row.gameId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 12,
                background: i === 0 ? "rgba(245,158,11,0.1)" : "hsl(var(--muted) / 0.2)",
                border: i === 0 ? "1px solid rgba(245,158,11,0.25)" : `1px solid ${gameTheme.glassBorder}`,
              }}
            >
              <span style={{ width: 20, fontWeight: 800, color: gameTheme.textMuted, fontSize: 12 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 22 }}>{row.game.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: gameTheme.text }}>{row.game.title}</div>
                <div style={{ fontSize: 10.5, color: gameTheme.textMuted }}>
                  {row.plays} play{row.plays === 1 ? "" : "s"} this week
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "hsl(var(--brand-amber-300))" }}>
                  {row.bestRatio}%
                </div>
                <div style={{ fontSize: 10, color: gameTheme.textMuted }}>
                  {row.bestScore}/{row.bestTotal}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
