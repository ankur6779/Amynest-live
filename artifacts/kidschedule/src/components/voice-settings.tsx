import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { getVoiceSettings, saveVoiceSettings, setVoiceEnabled, type VoiceLang, type VoiceGender } from "@/lib/voice";
import { useToast } from "@/hooks/use-toast";
interface VoiceSettingsPanelProps {
  onToggle?: (enabled: boolean) => void;
}
const ELEVENLABS_VOICES: Record<VoiceLang, Record<VoiceGender, string>> = {
  en: {
    female: "Ananya K (Indian English)",
    male: "Karthik (Indian English)"
  },
};
export function VoiceSettingsPanel({
  onToggle
}: VoiceSettingsPanelProps) {
  const {
    toast
  } = useToast();
  const {
    t
  } = useTranslation();
  const [settings, setSettings] = useState(() => getVoiceSettings());
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<typeof settings>) => {
    const next = {
      ...settings,
      ...patch
    };
    setSettings(next);
    saveVoiceSettings(patch);
    if (patch.enabled !== undefined) {
      onToggle?.(patch.enabled);
    }
  };
  const handleToggle = () => {
    const next = !settings.enabled;
    update({
      enabled: next
    });
    setVoiceEnabled(next);
    toast({
      title: next ? t("toasts.voice_settings.voice_on") : t("toasts.voice_settings.voice_off")
    });
    if (!next) setOpen(false);
  };
  const currentVoiceName = ELEVENLABS_VOICES[settings.lang]?.[settings.gender] ?? "ElevenLabs Indian";
  return <div className="relative flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={handleToggle} className={`rounded-full gap-2 ${settings.enabled ? "bg-muted dark:bg-card border-border text-primary dark:text-muted-foreground" : ""}`}>
        {settings.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {settings.enabled ? "Voice On" : "Voice"}
      </Button>

      {settings.enabled && <button title={t("components.voice_settings.voice_settings")} onClick={() => setOpen(o => !o)} className="p-1.5 rounded-full border border-border dark:border-border bg-muted dark:bg-card text-primary hover:bg-muted dark:bg-card transition-colors text-[11px] font-bold">
          🎙
        </button>}

      {open && settings.enabled && <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-9 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl w-72 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">{t("components.voice_settings.voice_settings_2")}</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">
                &times;
              </button>
            </div>

            {/* Language toggle */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t("components.voice_settings.language")}
              </p>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-xl text-xs font-bold border-2 bg-primary text-white border-primary">
                  🇬🇧 English
                </button>
              </div>
            </div>

            {/* Gender toggle */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t("components.voice_settings.voice_gender")}
              </p>
              <div className="flex gap-2">
                {(["female", "male"] as VoiceGender[]).map(g => <button key={g} onClick={() => update({
              gender: g
            })} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${settings.gender === g ? "bg-primary text-white border-primary" : "bg-white text-primary dark:text-muted-foreground border-border dark:border-border hover:border-border dark:bg-transparent"}`}>
                    {g === "female" ? "👩 Female" : "👨 Male"}
                  </button>)}
              </div>
            </div>

            {/* Active voice info */}
            <div className="rounded-xl bg-muted dark:bg-card border border-border dark:border-border px-3 py-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                {t("components.voice_settings.active_voice")}
              </p>
              <p className="text-xs font-bold text-primary dark:text-muted-foreground">{currentVoiceName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("components.voice_settings.powered_by_elevenlabs_ai")}</p>
            </div>

            <p className="text-[10px] text-muted-foreground text-center border-t border-border pt-2">
              {t("components.voice_settings.preferences_saved_automatically")}
            </p>
          </div>
        </>}
    </div>;
}