import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  BedDouble,
  Activity,
  Flame,
  TrendingUp,
  Heart,
  FileDown,
  Users,
} from "lucide-react";
import { buildInfantHubSectionDeepLink, buildParentingHubDeepLink } from "@/lib/hub-activity-cross-link";
import { setInfantHubEntrySource, trackInfantHubShortcutTapped } from "@/lib/infant-hub-analytics";
import { Link } from "wouter";

const SHORTCUTS = [
  { id: "infant-cry", icon: MessageCircle, labelKey: "cry_insight", hash: "infant-cry", tint: "from-rose-400 to-pink-500" },
  { id: "infant-sleep", icon: BedDouble, labelKey: "sleep", hash: "infant-sleep", tint: "from-blue-400 to-indigo-500" },
  { id: "infant-milestones", icon: Activity, labelKey: "milestones", hash: "infant-milestones", tint: "from-violet-400 to-purple-500" },
  { id: "infant-feeding", icon: Flame, labelKey: "feeding", hash: "infant-feeding", tint: "from-orange-400 to-red-500" },
  { id: "infant-growth", icon: TrendingUp, labelKey: "growth", hash: "infant-growth", tint: "from-emerald-400 to-teal-500" },
  { id: "infant-wellbeing", icon: Heart, labelKey: "wellbeing", hash: "infant-wellbeing", tint: "from-pink-400 to-rose-500" },
  { id: "infant-doctor", icon: FileDown, labelKey: "doctor", hash: "infant-doctor", tint: "from-cyan-400 to-blue-500" },
  { id: "infant-coparent", icon: Users, labelKey: "coparent", hash: "infant-coparent", tint: "from-indigo-400 to-violet-500" },
] as const;

type InfantModeShortcutsProps = {
  childId: number;
  childName: string;
  ageMonths: number;
};

/** Replaces duplicate InfantMode content — deep links into Infant Hub sections. */
export function InfantModeShortcuts({ childId, childName, ageMonths }: InfantModeShortcutsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3" data-testid="infant-mode-shortcuts">
      <p className="text-sm text-muted-foreground">
        {t(
          "components.infant_shortcuts.lead",
          "Quick access to {{name}}'s care tools — all in Infant Hub.",
          { name: childName },
        )}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SHORTCUTS.map(({ id, icon: Icon, labelKey, hash, tint }) => (
          <Link
            key={id}
            href={buildInfantHubSectionDeepLink(hash)}
            onClick={() => {
              setInfantHubEntrySource("deep_link");
              trackInfantHubShortcutTapped(childId, ageMonths, hash);
            }}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:border-primary/30 p-3 flex flex-col gap-2 transition-all hover:shadow-[0_0_20px_-6px_rgba(168,85,247,0.4)]"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tint} flex items-center justify-center shadow-md`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-bold text-foreground leading-tight">
              {t(`components.infant_shortcuts.${labelKey}`, labelKey.replace("_", " "))}
            </span>
          </Link>
        ))}
      </div>
      <Link
        href={buildParentingHubDeepLink("infant-hub")}
        onClick={() => setInfantHubEntrySource("parenting_hub")}
        className="block text-center text-xs font-bold text-primary hover:underline"
      >
        {t("components.infant_shortcuts.open_hub", "Open full Infant Hub →")}
      </Link>
    </div>
  );
}
