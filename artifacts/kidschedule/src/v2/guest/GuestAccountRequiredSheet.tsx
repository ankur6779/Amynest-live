/**
 * Guest account gate sheet — no hard Sign-in redirect.
 * Wave E: Ask Amy · For Child soft intents · Escape dismiss · reduced-motion settle.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  useReducedMotion,
  v2HapticLight,
  V2_CTA,
  V2_EXIT,
  V2_ATMOSPHERE_SCRIM,
  V2_FADE_RISE_PX,
  V2_LAYOUT,
  V2_MEASURE,
  V2_NAV_DISMISS,
  V2_PRESS_PRIMARY,
  V2_SHEET,
  V2_HIERARCHY_WHISPER,
  V2_SHEET_LIGHT,
  V2_SPACE,
  V2_TRANSITION,
  V2_TYPE,
  installV2Light,
  v2LawRole,
} from "@/v2/craft";
import {
  buildAskAmySheetBody,
  buildAskAmySheetTitle,
} from "@/v2/ask-amy/entry-copy";
import {
  buildForChildSheetBody,
  buildForChildSheetTitle,
} from "@/v2/for-child/for-child-copy";
import { getGuestSession } from "./session";
import { setPostAuthReturnPath } from "./soft-save";
import {
  closeGuestAccountRequiredSheet,
  getGuestAccountSheetIntent,
  isGuestAccountRequiredSheetOpen,
  subscribeGuestAccountRequiredSheet,
} from "./guest-account-sheet-store";

/** Default (non–Ask Amy / For Child) sheet body — progress, not chatbot. */
export const GUEST_ACCOUNT_SHEET_COPY =
  "Create your account to protect today's progress with Amy.";

export function GuestAccountRequiredSheetHost() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(isGuestAccountRequiredSheetOpen);
  const [intent, setIntent] = useState(getGuestAccountSheetIntent);
  const reduced = useReducedMotion();
  const session = getGuestSession();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const askAmy = intent === "ask_amy";
  const forChild = intent === "for_child";
  const title = askAmy
    ? buildAskAmySheetTitle(session)
    : forChild
      ? buildForChildSheetTitle(session)
      : "Protect today's progress";
  const body = askAmy
    ? buildAskAmySheetBody(session)
    : forChild
      ? buildForChildSheetBody(session)
      : GUEST_ACCOUNT_SHEET_COPY;
  const primaryCta = askAmy
    ? "Save your place"
    : forChild
      ? "Save progress & continue"
      : "Save progress & continue";

  useEffect(() => {
    return subscribeGuestAccountRequiredSheet(() => {
      setOpen(isGuestAccountRequiredSheetOpen());
      setIntent(getGuestAccountSheetIntent());
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    installV2Light();
    const t = window.setTimeout(() => primaryRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGuestAccountRequiredSheet();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onNotNow() {
    closeGuestAccountRequiredSheet();
  }

  function onContinue() {
    const path = location.split("?")[0] || "/today";
    const returnPath = askAmy
      ? "/ask-amy"
      : forChild
        ? "/for-child"
        : path;
    setPostAuthReturnPath(returnPath);
    v2HapticLight(reduced);
    closeGuestAccountRequiredSheet();
    setLocation("/sign-up");
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="v2-guest-account-sheet"
          className={`fixed inset-0 ${V2_LAYOUT.sheetZ} flex items-end justify-center ${V2_ATMOSPHERE_SCRIM} ${V2_SPACE.p2} sm:items-center`}
          data-testid="v2-guest-account-sheet"
          data-sheet-intent={intent}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={onNotNow}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={reduced ? { duration: 0 } : V2_TRANSITION.sheet}
        >
          <motion.div
            className={`w-full ${V2_MEASURE.sheet} ${V2_SHEET} ${V2_SHEET_LIGHT} ${V2_SPACE.sheetPad}`}
            onClick={(event) => event.stopPropagation()}
            initial={reduced ? false : { opacity: 0, y: V2_FADE_RISE_PX }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: V2_FADE_RISE_PX }}
            transition={reduced ? { duration: 0 } : V2_TRANSITION.sheet}
          >
            <h2
              id={titleId}
              className={`${V2_TYPE.heroCompact} ${V2_MEASURE.hero}`}
              data-testid="v2-guest-account-sheet-title"
              {...v2LawRole("hero")}
            >
              {title}
            </h2>
            <p
              className={`${V2_SPACE.mt2} ${V2_TYPE.bodyMuted}`}
              data-testid="v2-guest-account-sheet-copy"
              {...v2LawRole("support")}
            >
              {body}
            </p>
            <div className={`${V2_SPACE.actionPause} flex flex-col ${V2_SPACE.ctaStack}`}>
              <Button
                ref={primaryRef}
                type="button"
                className={`${V2_CTA} ${V2_PRESS_PRIMARY}`}
                data-testid="v2-guest-account-sheet-continue"
                onClick={onContinue}
                {...v2LawRole("primary")}
              >
                {primaryCta}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`${V2_CTA} ${V2_NAV_DISMISS} ${V2_HIERARCHY_WHISPER}`}
                data-testid="v2-guest-account-sheet-not-now"
                onClick={onNotNow}
              >
                {V2_EXIT.notRightNow}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
