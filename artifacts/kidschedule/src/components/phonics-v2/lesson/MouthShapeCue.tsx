import { cn } from "@/lib/utils";

/** Simple articulation cue — letter-shaped mouth hint (no video assets required). */
const MOUTH_HINT: Record<string, { tip: string; shape: string }> = {
  s: { tip: "Smile and push air out — like a snake hiss.", shape: "😊→💨" },
  a: { tip: "Mouth open wide — short /a/ as in apple.", shape: "😮" },
  t: { tip: "Tongue taps behind your teeth.", shape: "👅" },
  p: { tip: "Lips pop open with a puff of air.", shape: "💨" },
  i: { tip: "Smile a little — short /i/ as in igloo.", shape: "🙂" },
  n: { tip: "Tongue on the roof; sound through your nose.", shape: "👃" },
  m: { tip: "Lips together; hum through your nose.", shape: "👄" },
  d: { tip: "Tongue taps — voiced /d/.", shape: "👅" },
  g: { tip: "Back of tongue — /g/ in go.", shape: "🗣️" },
  o: { tip: "Round lips — short /o/ as in octopus.", shape: "⭕" },
  c: { tip: "Back of tongue — hard /k/.", shape: "🗣️" },
  k: { tip: "Back of tongue — hard /k/.", shape: "🗣️" },
  e: { tip: "Mouth slightly open — short /e/ as in egg.", shape: "😮" },
  u: { tip: "Relaxed mouth — short /u/ as in up.", shape: "😯" },
  r: { tip: "Tongue curls back a little.", shape: "👅" },
  h: { tip: "Gentle breath out — /h/.", shape: "💨" },
  b: { tip: "Lips pop with voice — /b/.", shape: "👄" },
  f: { tip: "Top teeth on lip — blow gently.", shape: "🦷" },
  l: { tip: "Tongue tip up — /l/.", shape: "👅" },
  qu: { tip: "Always with U — /kw/ as in queen.", shape: "👑" },
  sh: { tip: "Quiet finger lips — /sh/.", shape: "🤫" },
  ch: { tip: "Like a train — /ch/.", shape: "🚂" },
  th: { tip: "Tongue between teeth.", shape: "👅" },
};

type MouthShapeCueProps = {
  grapheme: string;
  className?: string;
};

export function MouthShapeCue({ grapheme, className }: MouthShapeCueProps) {
  const g = grapheme.trim().toLowerCase();
  const hint = MOUTH_HINT[g] ?? {
    tip: "Watch Amy’s mouth and copy the shape.",
    shape: "🗣️",
  };

  return (
    <div
      data-testid="mouth-shape-cue"
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 text-center space-y-3",
        className,
      )}
      role="img"
      aria-label={`Mouth shape for sound ${g}: ${hint.tip}`}
    >
      <div className="text-5xl select-none" aria-hidden>
        {hint.shape}
      </div>
      <p className="font-quicksand text-lg font-black text-foreground">
        /{g}/
      </p>
      <p className="text-sm text-muted-foreground leading-snug">{hint.tip}</p>
    </div>
  );
}
