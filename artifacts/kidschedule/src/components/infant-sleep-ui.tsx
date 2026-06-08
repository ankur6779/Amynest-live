/**
 * Shared premium visual chrome for the infant sleep library
 * (White Noise, Lullabies, Poems, Stories).
 */
import type { ReactNode } from "react";
import { BookOpen, Music, Plus, Sparkles, Wind } from "lucide-react";

export type SleepModuleTab = "noise" | "lullabies" | "poems" | "stories";

const TAB_CONFIG: {
  id: SleepModuleTab;
  label: string;
  icon: ReactNode;
  activeClass: string;
}[] = [
  {
    id: "noise",
    label: "Noise",
    icon: <Wind className="h-3.5 w-3.5" />,
    activeClass: "sleep-tab-btn--noise",
  },
  {
    id: "lullabies",
    label: "Lullabies",
    icon: <Music className="h-3.5 w-3.5" />,
    activeClass: "sleep-tab-btn--lullabies",
  },
  {
    id: "poems",
    label: "Poems",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    activeClass: "sleep-tab-btn--poems",
  },
  {
    id: "stories",
    label: "Stories",
    icon: <BookOpen className="h-3.5 w-3.5" />,
    activeClass: "sleep-tab-btn--stories",
  },
];

const LULLABY_GRADIENTS = [
  "from-indigo-600 via-violet-700 to-purple-950",
  "from-violet-700 via-purple-800 to-indigo-950",
  "from-fuchsia-700 via-purple-800 to-indigo-900",
  "from-blue-700 via-indigo-800 to-violet-950",
] as const;

const STORY_GRADIENTS = [
  "from-slate-800 via-indigo-950 to-blue-950",
  "from-indigo-950 via-blue-950 to-slate-900",
  "from-blue-900 via-slate-900 to-indigo-950",
  "from-violet-950 via-indigo-950 to-slate-900",
] as const;

function pickFromPalette(palette: readonly string[], id: string): string {
  let idx = 0;
  for (let i = 0; i < id.length; i++) idx = (idx + id.charCodeAt(i) * (i + 3)) % palette.length;
  return palette[idx]!;
}

export function sleepMediaGradient(
  category: "lullaby" | "story" | "poem",
  id: string,
  custom?: string,
): string {
  const trimmed = (custom ?? "").trim();
  if (trimmed) return trimmed;
  if (category === "lullaby") return pickFromPalette(LULLABY_GRADIENTS, id);
  if (category === "story") return pickFromPalette(STORY_GRADIENTS, id);
  return pickFromPalette(LULLABY_GRADIENTS, id);
}

export function SleepModuleShell({ children }: { children: ReactNode }) {
  return (
    <div className="sleep-module-shell space-y-3" data-testid="sleep-module-shell">
      {children}
    </div>
  );
}

export function SleepTabBar({
  tab,
  onTabChange,
}: {
  tab: SleepModuleTab;
  onTabChange: (tab: SleepModuleTab) => void;
}) {
  return (
    <div className="sleep-tab-bar grid grid-cols-4 gap-1 p-1" role="tablist" aria-label="Sleep library">
      {TAB_CONFIG.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => onTabChange(t.id)}
          className={[
            "sleep-tab-btn flex items-center justify-center gap-1 rounded-xl py-2.5 text-[11px] font-bold transition-all duration-200",
            tab === t.id ? t.activeClass : "sleep-tab-btn--idle",
          ].join(" ")}
        >
          {t.icon}
          <span className="truncate">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function SleepAgeTabs<T extends string>({
  groups,
  value,
  onChange,
  testIdPrefix,
}: {
  groups: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Age groups"
      className="sleep-age-tab-bar grid grid-cols-3 gap-1.5 p-1"
    >
      {groups.map((g) => (
        <button
          key={g.id}
          role="tab"
          aria-selected={value === g.id}
          data-testid={`${testIdPrefix}-${g.id}`}
          onClick={() => onChange(g.id)}
          className={[
            "sleep-age-tab px-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200",
            value === g.id ? "sleep-age-tab--active" : "sleep-age-tab--idle",
          ].join(" ")}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

export function SleepSectionHeader({
  icon,
  title,
  blurb,
  accent = "default",
}: {
  icon: ReactNode;
  title: string;
  blurb: string;
  accent?: "default" | "lullaby" | "poem" | "story";
}) {
  return (
    <div className={`sleep-section-header sleep-section-header--${accent}`}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="sleep-section-header-icon">{icon}</div>
        <p className="text-sm font-bold tracking-tight text-foreground">{title}</p>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed pl-[2.625rem]">{blurb}</p>
    </div>
  );
}

export function SleepLoadMoreButton({
  onClick,
  label,
  testId,
}: {
  onClick: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="sleep-load-more w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
