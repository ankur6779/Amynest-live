import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AmyIcon } from "@/components/amy-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dailyUnlockSeed } from "@workspace/learning-progress-engine";
import { hubTodayIst } from "@/lib/hub-pdf-download";

const TIP_KEYS = [
  "tip_print_together",
  "tip_short_session",
  "tip_praise_effort",
  "tip_choose_sheet",
  "tip_keep_fun",
] as const;

interface WorksheetAmyTipsProps {
  childId?: number;
  className?: string;
}

export function WorksheetAmyTips({ childId, className }: WorksheetAmyTipsProps) {
  const { t } = useTranslation();

  const tips = useMemo(() => {
    const seed = dailyUnlockSeed(hubTodayIst(), `${childId ?? "guest"}_ws_tip`);
    const picked: string[] = [];
    for (let i = 0; picked.length < 2 && i < TIP_KEYS.length + 5; i++) {
      const text = t(`components.printable_worksheets.${TIP_KEYS[(seed + i) % TIP_KEYS.length]}`);
      if (!picked.includes(text)) picked.push(text);
    }
    return picked;
  }, [childId, t]);

  return (
    <Card className={className} data-testid="worksheet-amy-tips">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AmyIcon size={20} />
          {t("components.printable_worksheets.amy_tips_title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tips.map((tip) => (
          <div
            key={tip}
            className="rounded-lg border bg-muted/20 px-3 py-2.5"
          >
            <p className="text-xs text-primary/80 mb-1">
              {t("components.printable_worksheets.amy_tip_label")}
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">{tip}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
