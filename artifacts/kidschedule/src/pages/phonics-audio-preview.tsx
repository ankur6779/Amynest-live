// i18n-ignore-start — internal dev preview for phonics audio QA
import { useCallback, useMemo, useRef, useState } from "react";
import { Volume2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ELEVENLABS_SPEAK_TEXT,
  PHONICS_AUDIO_DEMO_VARIANTS,
  PHONICS_DEMO_PREVIEW_KEYS,
  getPhonicsDemoAudioUrl,
  type PhonicsDemoPreviewKey,
} from "@workspace/phonics-sounds";

const KEY_LABELS: Record<PhonicsDemoPreviewKey, string> = {
  b: "B — buh",
  a: "A — ah",
  c: "C — kuh",
  e: "E — eh",
  f: "F — fff",
  m: "M — mmm",
  sh: "SH — shh",
  t: "T — tuh",
};

export default function PhonicsAudioPreviewPage() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaying(null);
  }, []);

  const playUrl = useCallback(
    async (variantId: string, key: PhonicsDemoPreviewKey) => {
      const id = `${variantId}:${key}`;
      if (playing === id) {
        stopCurrent();
        return;
      }
      stopCurrent();
      setPlaying(id);

      const url = getPhonicsDemoAudioUrl(variantId, key);
      const audio = new Audio(url);
      audio.volume = 1;
      audioRef.current = audio;
      audio.onended = () => setPlaying(null);
      audio.onerror = () => setPlaying(null);
      try {
        await audio.play();
      } catch {
        setPlaying(null);
      }
    },
    [playing, stopCurrent],
  );

  const playBrowserVoice = useCallback(
    (key: PhonicsDemoPreviewKey) => {
      const id = `browser:${key}`;
      if (playing === id) {
        stopCurrent();
        return;
      }
      stopCurrent();
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const text = ELEVENLABS_SPEAK_TEXT[key] ?? key;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.volume = 1;
      setPlaying(id);
      utterance.onend = () => setPlaying(null);
      utterance.onerror = () => setPlaying(null);
      window.speechSynthesis.speak(utterance);
    },
    [playing, stopCurrent],
  );

  const playCvcDemo = useCallback(
    async (variantId: string) => {
      const id = `cvc:${variantId}`;
      if (playing === id) {
        stopCurrent();
        return;
      }
      stopCurrent();
      setPlaying(id);
      for (const key of ["c", "a", "t"] as const) {
        const audio = new Audio(getPhonicsDemoAudioUrl(variantId, key));
        audio.volume = 1;
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("cvc_play_failed"));
          void audio.play().catch(reject);
        });
        await new Promise((r) => setTimeout(r, 140));
      }
      setPlaying(null);
    },
    [playing, stopCurrent],
  );

  const variantSummary = useMemo(
    () => PHONICS_AUDIO_DEMO_VARIANTS.map((v) => ({ ...v, recommended: v.id === "bright" || v.id === "crisp" })),
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-slate-950 dark:to-slate-900 pb-16">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <Badge variant="secondary" className="rounded-full">
            Dev preview — phonics audio QA
          </Badge>
          <h1 className="font-quicksand text-2xl font-bold text-foreground">
            Phonics sound demo — sun ke final karo
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Har column ek alag mastering style hai. Same letter ke liye sab variants suno — jo
            sabse clear aur bachche-friendly lage, us variant ka naam humein bata dena.
            &quot;Current (live)&quot; wahi hai jo ab app mein hai (kabhi-kabhi dabi / muffled lag
            sakti hai phone speaker par).
          </p>
        </header>

        <Card className="border-amber-200/60 bg-amber-50/80 dark:bg-amber-950/20">
          <CardContent className="pt-4 text-sm text-amber-900 dark:text-amber-100">
            <strong>Tip:</strong> Phone speaker par volume 70%+ rakho. Slow-repeat button phonics
            page par alag hai — yahan full-speed clips hain.
          </CardContent>
        </Card>

        {variantSummary.map((variant) => (
          <Card
            key={variant.id}
            className={cn(
              "overflow-hidden transition-shadow",
              selectedVariant === variant.id && "ring-2 ring-violet-500 shadow-lg",
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {variant.label}
                    {variant.recommended && (
                      <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
                        Try first
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-violet-700 dark:text-violet-300 font-medium mt-0.5">
                    {variant.labelHi}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{variant.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedVariant === variant.id ? "default" : "outline"}
                  className="rounded-full text-xs shrink-0"
                  onClick={() => setSelectedVariant(variant.id)}
                >
                  {selectedVariant === variant.id ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Selected
                    </>
                  ) : (
                    "Mark as favourite"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PHONICS_DEMO_PREVIEW_KEYS.map((key) => {
                  const playId = `${variant.id}:${key}`;
                  const isPlaying = playing === playId;
                  return (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className={cn(
                        "rounded-full h-9 px-3 text-xs font-bold",
                        isPlaying && "ring-2 ring-violet-400 animate-pulse",
                      )}
                      onClick={() => void playUrl(variant.id, key)}
                    >
                      {isPlaying ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      {KEY_LABELS[key]}
                    </Button>
                  );
                })}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full text-xs"
                disabled={playing?.startsWith("cvc:") && playing !== `cvc:${variant.id}`}
                onClick={() => void playCvcDemo(variant.id)}
              >
                {playing === `cvc:${variant.id}` ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 mr-1" />
                )}
                C–A–T blend demo (3 sounds)
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Browser voice (fallback only)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Agar MP3 fail ho to yeh chalta hai — compare ke liye, production mein use mat karna.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {PHONICS_DEMO_PREVIEW_KEYS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full text-xs"
                onClick={() => playBrowserVoice(key)}
              >
                <Volume2 className="h-3.5 w-3.5 mr-1" />
                {key}
              </Button>
            ))}
          </CardContent>
        </Card>

        {selectedVariant && (
          <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">
            <CardContent className="pt-4 text-sm">
              Aapne <strong>{selectedVariant}</strong> select kiya. Final confirm karne ke liye
              message mein likh dena: &quot;phonics audio = {selectedVariant}&quot;
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
