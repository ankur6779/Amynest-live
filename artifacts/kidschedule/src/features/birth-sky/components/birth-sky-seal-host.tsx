/**
 * Horizon Seal continuity host (Pack 1 / Pack 3 / Pack 4 §2.2).
 *
 * Architecture:
 * - ONE never-unmounted seal DOM node (fixed layer).
 * - Pages render SealSlot placeholders that reserve layout space (no jump).
 * - Seal eases to the active slot; reduced-motion snaps without animation.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BirthSkyHorizonSeal } from "./birth-sky-module-shell";
import { cn } from "@/lib/utils";

export const SEAL_TRANSITION_ID = "birth-sky-horizon-seal" as const;

/** Slot sizes used across Formation / Reveal / Hero — keep in sync for reserved space. */
export const SEAL_SLOT_SIZES = {
  formation: 120,
  formationFailed: 88,
  reveal: 112,
  hero: 72,
  heroCompact: 44,
} as const;

type SealSlotRegistration = {
  id: string;
  el: HTMLElement;
  size: number;
};

type SealHostValue = {
  sealTransitionId: typeof SEAL_TRANSITION_ID;
  registerSlot: (slot: SealSlotRegistration) => void;
  unregisterSlot: (id: string) => void;
  reducedMotion: boolean;
};

const SealHostContext = createContext<SealHostValue | null>(null);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type SealBox = { left: number; top: number; size: number };

export function BirthSkySealProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const slotsRef = useRef(new Map<string, SealSlotRegistration>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [box, setBox] = useState<SealBox | null>(null);
  const [visible, setVisible] = useState(false);
  // First paint: no transition (avoids flying in from 0,0 on slow devices).
  const [allowMotion, setAllowMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const measure = useCallback(() => {
    const id = activeId;
    if (!id) {
      setVisible(false);
      return;
    }
    const slot = slotsRef.current.get(id);
    if (!slot) {
      setVisible(false);
      return;
    }
    const rect = slot.el.getBoundingClientRect();
    setBox({
      left: rect.left + (rect.width - slot.size) / 2,
      top: rect.top + (rect.height - slot.size) / 2,
      size: slot.size,
    });
    setVisible(true);
  }, [activeId]);

  const registerSlot = useCallback((slot: SealSlotRegistration) => {
    slotsRef.current.set(slot.id, slot);
    setActiveId(slot.id);
  }, []);

  const unregisterSlot = useCallback((id: string) => {
    slotsRef.current.delete(id);
    setActiveId((current) => {
      if (current !== id) return current;
      const remaining = Array.from(slotsRef.current.keys());
      return remaining[remaining.length - 1] ?? null;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, activeId]);

  useEffect(() => {
    if (!visible) return;
    const onScrollOrResize = () => measure();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [visible, measure]);

  useEffect(() => {
    if (!visible || !box) return;
    // Enable motion only after the seal has been placed once (no initial jump).
    const tid = window.setTimeout(() => setAllowMotion(true), 32);
    return () => window.clearTimeout(tid);
  }, [visible, box]);

  const value = useMemo<SealHostValue>(
    () => ({
      sealTransitionId: SEAL_TRANSITION_ID,
      registerSlot,
      unregisterSlot,
      reducedMotion,
    }),
    [registerSlot, unregisterSlot, reducedMotion],
  );

  const style: CSSProperties | undefined = box
    ? {
        position: "fixed",
        left: box.left,
        top: box.top,
        width: box.size,
        height: box.size,
        zIndex: 40,
        pointerEvents: "none",
        // Slow devices: short transform-only transition; reduced-motion: none.
        transition:
          !allowMotion || reducedMotion
            ? "none"
            : "left 320ms cubic-bezier(0.22, 1, 0.36, 1), top 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: allowMotion && !reducedMotion ? "left, top, width, height" : "auto",
      }
    : { display: "none" };

  return (
    <SealHostContext.Provider value={value}>
      {children}
      {/* Never-unmounted seal node — moved to active slot; layout reserved by SealSlot */}
      <div
        id={SEAL_TRANSITION_ID}
        data-seal-transition-id={SEAL_TRANSITION_ID}
        data-seal-visible={visible ? "true" : "false"}
        data-seal-reduced-motion={reducedMotion ? "true" : "false"}
        data-testid="birth-sky-persistent-seal"
        style={style}
        aria-hidden
      >
        {box ? (
          <BirthSkyHorizonSeal size={box.size} className="h-full w-full" />
        ) : (
          <BirthSkyHorizonSeal size={SEAL_SLOT_SIZES.hero} className="opacity-0" />
        )}
      </div>
    </SealHostContext.Provider>
  );
}

type ContinuousSealProps = {
  size?: number;
  className?: string;
  compact?: boolean;
  /** Stable slot id — defaults per size band */
  slotId?: string;
};

/**
 * Layout placeholder for the persistent seal.
 * Reserves exact pixel box so route changes do not jump content.
 * Production path requires BirthSkySealProvider (never-unmounted seal).
 */
export function BirthSkyContinuousSeal({
  size = 96,
  className,
  compact,
  slotId,
}: ContinuousSealProps) {
  const ctx = useContext(SealHostContext);
  const elRef = useRef<HTMLDivElement | null>(null);
  const resolvedSize = compact ? Math.min(size, SEAL_SLOT_SIZES.heroCompact) : size;
  const id = slotId ?? `seal-slot-${resolvedSize}`;

  useLayoutEffect(() => {
    if (!ctx) return;
    const el = elRef.current;
    if (!el) return;
    ctx.registerSlot({ id, el, size: resolvedSize });
    return () => ctx.unregisterSlot(id);
  }, [id, resolvedSize, ctx]);

  // Isolated/test fallback — inline seal (not the production continuity path).
  if (!ctx) {
    return (
      <div
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: resolvedSize, height: resolvedSize }}
        data-testid="birth-sky-seal-slot-fallback"
      >
        <BirthSkyHorizonSeal size={resolvedSize} />
      </div>
    );
  }

  return (
    <div
      ref={elRef}
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: resolvedSize, height: resolvedSize }}
      data-testid="birth-sky-seal-slot"
      data-seal-slot-id={id}
      data-seal-slot-size={resolvedSize}
      aria-hidden
    />
  );
}

/** @deprecated Alias — same as BirthSkyContinuousSeal */
export const BirthSkySealSlot = BirthSkyContinuousSeal;
