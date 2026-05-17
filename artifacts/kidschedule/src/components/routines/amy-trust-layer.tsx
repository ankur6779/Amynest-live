import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const INPUT_KEYS = [
  { key: "pages.routines.index.amy_uses_mood", defaultValue: "mood" },
  { key: "pages.routines.index.amy_uses_weather", defaultValue: "weather" },
  { key: "pages.routines.index.amy_uses_school", defaultValue: "school schedule" },
  { key: "pages.routines.index.amy_uses_past", defaultValue: "past routines" },
] as const;

export function AmyTrustLayer() {
  const { t } = useTranslation();

  return (
    <Card className="rounded-2xl border border-primary/15 bg-primary/5 shadow-none">
      <CardContent className="p-4">
        <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          {t("pages.routines.index.amy_will_use", { defaultValue: "Amy will use:" })}
        </p>
        <ul className="flex flex-wrap gap-2">
          {INPUT_KEYS.map((item) => (
            <li
              key={item.key}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-card border border-border text-foreground"
            >
              {t(item.key, { defaultValue: item.defaultValue })}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
