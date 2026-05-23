import { Link } from "wouter";
import { TryFreeBadge } from "@/components/try-free-badge";

export function HubLaunchCard({
  href,
  title,
  description,
  icon,
  accentClass,
  cardClass,
  tryFree,
  testId,
  sectionId,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  cardClass: string;
  tryFree?: boolean;
  testId: string;
  sectionId?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border border-white/20 p-4 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:border-white/40 ${cardClass}`}
      data-testid={testId}
      data-section-id={sectionId}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 ${accentClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-quicksand text-[15px] font-bold leading-tight text-foreground">
              {title}
            </p>
            {tryFree ? <TryFreeBadge /> : null}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{description}</p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-primary px-3 text-xs font-black text-primary-foreground transition-transform group-active:scale-95">
          Open
        </span>
      </div>
    </Link>
  );
}
