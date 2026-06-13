import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PAGE_BACK_BTN,
  PAGE_STICKY_HEADER_BASE,
  PAGE_STICKY_HEADER_INNER,
} from "@/lib/page-sticky-header";

export function PageBackButton({
  onClick,
  "aria-label": ariaLabel,
  className,
  iconClassName,
}: {
  onClick: () => void;
  "aria-label": string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(PAGE_BACK_BTN, className)}
    >
      <ArrowLeft className={cn("h-4 w-4", iconClassName)} />
    </button>
  );
}

export function PageStickyHeader({
  onBack,
  backLabel = "Back",
  backButtonClassName,
  children,
  className,
  innerClassName,
  style,
}: {
  onBack?: () => void;
  backLabel?: string;
  backButtonClassName?: string;
  children?: ReactNode;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <header className={cn(PAGE_STICKY_HEADER_BASE, className)} style={style}>
      <div className={cn(PAGE_STICKY_HEADER_INNER, innerClassName)}>
        {onBack ? (
          <PageBackButton
            onClick={onBack}
            aria-label={backLabel}
            className={backButtonClassName}
          />
        ) : null}
        {children}
      </div>
    </header>
  );
}
