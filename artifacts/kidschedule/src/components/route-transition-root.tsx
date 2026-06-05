import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Stable wrapper for view-transition cross-fades between wouter routes. */
export function RouteTransitionRoot({ children }: Props) {
  return <div className="route-transition-root min-h-0 min-w-0 flex-1">{children}</div>;
}
