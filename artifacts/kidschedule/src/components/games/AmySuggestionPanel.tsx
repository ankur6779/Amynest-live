import { Sparkles } from "lucide-react";
import type { GameDef } from "@/lib/games";
import { getSkillGaps } from "@/lib/games";
import { gameTheme } from "@/lib/game-theme";
import { GamePreviewTile } from "./GamePreviewTile";

interface AmySuggestionPanelProps {
  line: string;
  suggestedGame?: GameDef;
  canPlay: boolean;
  onPlay: () => void;
}

export function AmySuggestionPanel({
  line,
  suggestedGame,
  canPlay,
  onPlay,
}: AmySuggestionPanelProps) {
  const gaps = getSkillGaps(4);

  return (
    <div
      style={{
        background: gameTheme.cardBg,
        border: `1.5px solid ${gameTheme.cardBorder}`,
        backdropFilter: "blur(18px)",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {suggestedGame ? (
          <GamePreviewTile gameId={suggestedGame.id} emoji={suggestedGame.emoji} active />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              background: "rgba(122,92,255,0.12)",
              border: `1px solid ${gameTheme.glassBorder}`,
            }}
          >
            ✨
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Sparkles size={16} color="rgba(251,191,36,0.95)" />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "rgba(251,191,36,0.9)",
              }}
            >
              Amy&apos;s pick
            </span>
          </div>
          <div style={{ color: gameTheme.text, fontSize: 13.5, lineHeight: 1.45, fontWeight: 600 }}>
            {line}
          </div>
          {suggestedGame && (
            <div style={{ marginTop: 6, fontSize: 12, color: gameTheme.textMuted }}>
              {suggestedGame.emoji} {suggestedGame.title} · {suggestedGame.ageHint ?? "All ages"}
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: gameTheme.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Skill gaps to grow
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {gaps.map(({ cat, pct, label, emoji }) => (
            <div key={cat}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: gameTheme.text, marginBottom: 3 }}>
                <span>{emoji} {label}</span>
                <span style={{ fontWeight: 800, color: pct >= 75 ? gameTheme.success : pct >= 40 ? "rgba(251,191,36,0.95)" : gameTheme.textMuted }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: gameTheme.progressTrack, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: pct >= 75
                      ? "linear-gradient(90deg,hsl(var(--brand-green-500)),hsl(var(--brand-green-400)))"
                      : pct >= 40
                      ? gameTheme.playGradient
                      : gameTheme.violetGradient,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {suggestedGame && canPlay && (
        <button
          type="button"
          onClick={onPlay}
          style={{
            alignSelf: "flex-start",
            background: gameTheme.playGradient,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: gameTheme.playShadow,
          }}
        >
          {suggestedGame.emoji} Play now
        </button>
      )}
    </div>
  );
}
