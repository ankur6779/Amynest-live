import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Refrigerator,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  formatDetectedSpecialPlan,
  parseSpecialPlansPreview,
  SPECIAL_PLAN_CHIPS,
} from "@/lib/parse-special-plans";

type MoodValue = "happy" | "angry" | "lazy" | "normal";
type WeatherOutdoorChoice = "yes" | "no" | "limited";

export function InputSection({
  title,
  subtitle,
  highlight,
  children,
}: {
  title: string;
  subtitle?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`space-y-4 rounded-2xl p-4 sm:p-5 border-2 ${
        highlight
          ? "border-primary/40 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent shadow-sm"
          : "border-border/60 bg-muted/20"
      }`}
    >
      <div>
        <h2
          className={`text-base sm:text-lg font-bold flex items-center gap-2 ${
            highlight ? "text-primary" : "text-foreground"
          }`}
        >
          {highlight && <Star className="h-5 w-5 shrink-0 fill-primary text-primary" />}
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function GenerationGuidanceBanner() {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-muted-foreground bg-muted/40 border border-border/60 rounded-xl px-4 py-3 text-center leading-relaxed">
      {t("pages.routines.generate.guidance_adapt_inputs", {
        defaultValue:
          "This routine will adapt based on your inputs, weather, and your child's mood.",
      })}
    </p>
  );
}

export function AutoDetectionToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">
          {t("pages.routines.generate.use_auto_detection", {
            defaultValue: "Use AI auto-detection",
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("pages.routines.generate.use_auto_detection_hint", {
            defaultValue:
              "School days, weekends, and outdoor weather from your location when available.",
          })}
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} aria-label="Toggle auto-detection" />
    </div>
  );
}

export function AutoDetectedBadge({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="secondary"
      className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary border-primary/20"
    >
      {label ??
        t("pages.routines.generate.auto_detected_label", { defaultValue: "Auto-detected" })}
    </Badge>
  );
}

export function CompletenessBar({
  ready,
  missingOptional,
}: {
  ready: boolean;
  missingOptional: string[];
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        ready
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
          : "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100"
      }`}
    >
      <div className="flex items-start gap-2">
        {ready ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="min-w-0">
          <p className="font-bold">
            {ready
              ? t("pages.routines.generate.ready_to_generate", {
                  defaultValue: "Ready to generate ✅",
                })
              : t("pages.routines.generate.complete_essentials", {
                  defaultValue: "Complete the required fields above",
                })}
          </p>
          {missingOptional.length > 0 && (
            <p className="text-xs mt-1 opacity-90">
              {t("pages.routines.generate.missing_optional", {
                defaultValue: "Missing (optional): {{items}}",
                items: missingOptional.join(", "),
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RoutineStylePreview({
  weatherOutdoor,
  mood,
  hasSpecialPlans,
}: {
  weatherOutdoor: WeatherOutdoorChoice;
  mood: MoodValue;
  hasSpecialPlans: boolean;
}) {
  const { t } = useTranslation();
  const style = useMemo(() => {
    if (hasSpecialPlans) {
      return t("pages.routines.generate.style_event_centered", {
        defaultValue: "Event-centered routine",
      });
    }
    if (mood === "lazy" || mood === "angry") {
      return t("pages.routines.generate.style_gentle", { defaultValue: "Gentle, calming routine" });
    }
    if (mood === "happy") {
      return t("pages.routines.generate.style_energetic", {
        defaultValue: "Energetic, productive routine",
      });
    }
    if (weatherOutdoor === "no") {
      return t("pages.routines.generate.style_indoor", { defaultValue: "Indoor-focused routine" });
    }
    return t("pages.routines.generate.style_balanced", { defaultValue: "Balanced routine" });
  }, [hasSpecialPlans, mood, weatherOutdoor, t]);

  const basis = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      t("pages.routines.generate.basis_weather", { defaultValue: "weather" }),
    );
    parts.push(t("pages.routines.generate.basis_mood", { defaultValue: "mood" }));
    if (hasSpecialPlans) {
      parts.push(
        t("pages.routines.generate.basis_special_plans", { defaultValue: "special plans" }),
      );
    }
    return parts.join(" + ");
  }, [hasSpecialPlans, t]);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t("pages.routines.generate.todays_routine_style", {
          defaultValue: "Today's routine style",
        })}
      </p>
      <p className="text-sm font-bold text-primary flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" />
        {style}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("pages.routines.generate.based_on", {
          defaultValue: "Based on {{basis}}",
          basis,
        })}
      </p>
    </div>
  );
}

export function SpecialPlansField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const preview = useMemo(() => parseSpecialPlansPreview(value), [value]);

  const appendChip = (template: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      onChange(template);
      return;
    }
    if (trimmed.toLowerCase().includes(template.toLowerCase().slice(0, 8))) return;
    onChange(`${trimmed}, ${template}`);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-bold text-primary">
          {t("pages.routines.generate.special_plans_prominent_label", {
            defaultValue: "⭐ Do you have any fixed plans today?",
          })}
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          {t("pages.routines.generate.special_plans_subtitle", {
            defaultValue: "e.g., birthday, doctor visit, outing, class",
          })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SPECIAL_PLAN_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => appendChip(chip.template)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-primary/25 bg-card text-sm font-semibold hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      <Input
        placeholder={t(
          "pages.routines.generate.e_g_birthday_party_at_4pm_doctor_s_appointment_at_11am_outin",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl h-12 pl-4 border-primary/30 focus-visible:ring-primary"
      />

      {preview && (
        <p className="text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
          {formatDetectedSpecialPlan(preview)}
        </p>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        {t("pages.routines.generate.special_plans_impact", {
          defaultValue: "Amy will adjust the routine around your scheduled event.",
        })}
      </p>
    </div>
  );
}

export function FridgeItemsField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <Label className="text-base font-bold">
        {t("pages.routines.generate.what_s_in_your_fridge")}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {t("pages.routines.generate.optional_3")}
        </span>
      </Label>
      <div className="relative">
        <Refrigerator className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Textarea
          placeholder={t("pages.routines.generate.e_g_eggs_spinach_chicken_rice_tomatoes_milk_apples")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 resize-none rounded-2xl min-h-[80px]"
          rows={2}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t("pages.routines.generate.amy_ai_will_suggest_meals_and_tiffin_using_only_what_you_hav")}
      </p>
    </div>
  );
}
