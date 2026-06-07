import { type MouseEventHandler, type ReactNode } from "react";
import { AppLink } from "@/components/app-link";
import { useAddChildGate } from "@/hooks/use-add-child-gate";

type AddChildLinkProps = {
  children: ReactNode;
  className?: string;
  replace?: boolean;
  push?: boolean;
  tabNav?: boolean;
  source?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onPointerDown?: MouseEventHandler<HTMLAnchorElement>;
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
  onFocus?: MouseEventHandler<HTMLAnchorElement>;
  "data-testid"?: string;
  "data-tour"?: string;
};

/** Navigates to /children/new, or opens the child-limit paywall for free users at the cap. */
export function AddChildLink({
  source,
  onClick,
  children,
  ...rest
}: AddChildLinkProps) {
  const { tryAddChild } = useAddChildGate();

  return (
    <AppLink
      href="/children/new"
      source={source}
      onClick={(event) => {
        if (!tryAddChild(source)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </AppLink>
  );
}
