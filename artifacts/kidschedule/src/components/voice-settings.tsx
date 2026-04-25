import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import {
  getVoiceSettings,
  saveVoiceSettings,
  setVoiceEnabled,
  type VoiceLang,
  type VoiceGender,
} from "@/lib/voice";
import { useToast } from "@/hooks/use-toast";

interface VoiceSettingsPanelProps {
  onToggle?: (enabled: boolean) => void;
}

const ELEVENLABS_VOICES: Record<VoiceLang, Record<VoiceGender, string>> = {
  en: { female: "Ananya K (Indian English)", male: "Karthik (Indian English)" },
  hi: { female: "Anjura (Hindi)", male: "Rahul S (Hindi)" },
};

export function VoiceSettingsPanel({ onToggle }: VoiceSettingsPanelProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(() => getVoiceSettings());
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<typeof settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveVoiceSettings(patch);
    if (patch.enabled !== undefined) {
      onToggle?.(patch.enabled);
    }
  };

  const handleToggle = () => {
    const next = !settings.enabled;
    update({ enabled: next });
    setVoiceEnabled(next);
    toast({ title: next ? "🔊 Voice reminders on!" : "🔇 Voice reminders off" });
    if (!next) setOpen(false);
  };

  const currentVoiceName = ELEVENLABS_VOICES[settings.lang]?.[settings.gender] ?? "ElevenLabs Indian";

  return (
    <div className="relative flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className={`rounded-full gap-2 ${settings.enabled ? "bg-violet-50 dark:bg-violet-500/15 border-violet-300 text-violet-700 dark:text-violet-200" : ""}`}
      >
        {settings.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {settings.enabled ? "Voice On" : "Voice"}
      </Button>

      {settings.enabled && (
        <button
          title="Voice settings"
          onClick={() => setOpen((o) => !o)}
          className="p-1.5 rounded-full border border-violet-200 dark:border-violet-400/30 bg-violet-50 dark:bg-violet-500/15 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/20 transition-colors text-[11px] font-bold"
        >
          🎙
        </button>
      )}

      {open && settings.enabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-9 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl w-72 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">🎙 Voice Settings</p>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Language toggle */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Language
              </p>
              <div className="flex gap-2">
                {(["en", "hi"] as VoiceLang[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => update({ lang })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      settings.lang === lang
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-violet-700 dark:text-violet-200 border-violet-200 dark:border-violet-400/30 hover:border-violet-400 dark:bg-transparent"
                    }`}
                  >
                    {lang === "en" ? "🇬🇧 English" : "🇮🇳 Hindi"}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender toggle */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Voice Gender
              </p>
              <div className="flex gap-2">
                {(["female", "male"] as VoiceGender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => update({ gender: g })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      settings.gender === g
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-400/30 hover:border-emerald-400 dark:bg-transparent"
                    }`}
                  >
                    {g === "female" ? "👩 Female" : "👨 Male"}
                  </button>
                ))}
              </div>
            </div>

            {/* Active voice info */}
            <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/30 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Active Voice
              </p>
              <p className="text-xs font-bold text-violet-800 dark:text-violet-200">{currentVoiceName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Powered by ElevenLabs AI</p>
            </div>

            <p className="text-[10px] text-muted-foreground text-center border-t border-border pt-2">
              Preferences saved automatically 💾
            </p>
          </div>
        </>
      )}
    </div>
  );
}
