import { Sparkles, Star, Trophy } from "lucide-react";
import { SPEECH_COACH_V2_BADGES, type SpeechCoachV2BadgeId } from "@workspace/speech-coach-v2";

export function SpeechCoachV2CelebrationOverlay(props: {
  stars: number;
  points: number;
  badges: string[];
  streakDays: number;
  onDone: () => void;
}) {
  const { stars, points, badges, streakDays, onDone } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-950/95 via-purple-950/95 to-sky-950/95 p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 text-center text-white shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20">
          <Trophy className="h-8 w-8 text-amber-300" />
        </div>
        <h2 className="text-2xl font-bold">Amazing work today!</h2>
        <p className="mt-2 text-sm text-white/80">
          Amy is so proud of your speaking practice.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <Star className="mx-auto h-5 w-5 text-amber-300" />
            <p className="mt-2 text-2xl font-bold">{stars}</p>
            <p className="text-xs text-white/70">Stars</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <Sparkles className="mx-auto h-5 w-5 text-sky-300" />
            <p className="mt-2 text-2xl font-bold">{points}</p>
            <p className="text-xs text-white/70">Points</p>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold">New badges</p>
            <div className="flex flex-wrap justify-center gap-2">
              {badges.map((id) => {
                const badge = SPEECH_COACH_V2_BADGES[id as SpeechCoachV2BadgeId];
                if (!badge) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs"
                  >
                    <span>{badge.emoji}</span>
                    {badge.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {streakDays >= 2 && (
          <p className="mt-4 text-sm text-amber-200">
            {streakDays} day streak — keep going!
          </p>
        )}

        <button
          type="button"
          onClick={onDone}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
