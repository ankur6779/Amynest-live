import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HUB_BODY, HUB_CARD_TITLE, HUB_INFO_BANNER } from "@/lib/parent-hub-premium";

export function ParentHubInfoBanner({
  icon,
  title,
  message,
  className,
  testId,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div className={cn(HUB_INFO_BANNER, className)} data-testid={testId}>
      <div
        className="shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-xl shadow-[inset_0_1px_rgba(255,255,255,0.08)]"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={HUB_CARD_TITLE}>{title}</p>
        <p className={HUB_BODY}>{message}</p>
      </div>
    </div>
  );
}
