import { type FocusEventHandler, type MouseEventHandler, type ReactNode } from "react";
import { useLocation } from "wouter";
import { prefetchRouteChunk } from "@/lib/route-chunk-preload";
import {
  appNavigate,
  resolveNavMethod,
  runSafeNavAction,
  safeHref,
  useAppNavigate,
  type AppNavigateOptions,
} from "@/lib/safe-navigation";
import { PRESS_FEEDBACK } from "@/lib/experience-system";
import { cn } from "@/lib/utils";
import { isTabRootRoute, markTabRootEntry } from "@/lib/navigation-stack";

type AppLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  replace?: boolean;
  push?: boolean;
  /** When true, tab-root → tab-root uses replace (bottom nav). */
  tabNav?: boolean;
  source?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onPointerDown?: MouseEventHandler<HTMLAnchorElement>;
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
  onFocus?: FocusEventHandler<HTMLAnchorElement>;
  "data-testid"?: string;
  "data-tour"?: string;
};

export function AppLink({
  href,
  children,
  className,
  replace: replaceProp,
  push,
  tabNav = false,
  source,
  onClick,
  onPointerDown,
  onMouseEnter,
  onFocus,
  ...rest
}: AppLinkProps) {
  const [location, navigate] = useLocation();
  const target = safeHref(href);
  const method = resolveNavMethod(location, target, {
    replace: replaceProp,
    push,
    source,
  });
  const useReplace =
    replaceProp === true ||
    method === "replace" ||
    (tabNav && isTabRootRoute(location) && isTabRootRoute(target));

  return (
    <a
      href={target}
      className={cn(PRESS_FEEDBACK, className)}
      onPointerDown={(event) => {
        prefetchRouteChunk(target);
        onPointerDown?.(event);
      }}
      onMouseEnter={(event) => {
        prefetchRouteChunk(target);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchRouteChunk(target);
        onFocus?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        runSafeNavAction(`${location}->${target}`, () => {
          if (tabNav && isTabRootRoute(target)) {
            markTabRootEntry(target);
          }
          appNavigate(navigate, location, target, {
            replace: useReplace,
            push,
            source: source ?? "app-link",
          });
        });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export { useAppNavigate };
