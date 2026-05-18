/**
 * SpotlightTour — Premium interactive guided walkthrough.
 *
 * Shows automatically after first login (once onboardingComplete is set in
 * localStorage and amynest-tour-v1 is NOT "done"). Uses the CSS box-shadow
 * trick to punch a transparent hole in a dark overlay, targeting elements
 * with data-tour="..." attributes on the nav + Amy FAB.
 *
 * Storage key: amynest-tour-v1 = "done"
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isAndroidLiteClient } from "@/lib/device-lite";

const TOUR_KEY = "amynest-tour-v1";

interface TourStep {
  selector: string;
  titleKey: string;
  bodyKey: string;
  badge?: string;
  padX: number;
  padY: number;
  radius: number;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="dashboard"]',
    titleKey: "tour.step1_title",
    bodyKey:  "tour.step1_body",
    padX: 10, padY: 10, radius: 14,
  },
  {
    selector: '[data-tour="routines"]',
    titleKey: "tour.step2_title",
    bodyKey:  "tour.step2_body",
    badge:    "✨ Patent Pending",
    padX: 10, padY: 10, radius: 14,
  },
  {
    selector: '[data-tour="amy-coach"]',
    titleKey: "tour.step3_title",
    bodyKey:  "tour.step3_body",
    padX: 12, padY: 12, radius: 999,
  },
  {
    selector: '[data-tour="parenting-hub"]',
    titleKey: "tour.step4_title",
    bodyKey:  "tour.step4_body",
    padX: 10, padY: 10, radius: 14,
  },
  {
    selector: '[data-tour="amy-fab"]',
    titleKey: "tour.step5_title",
    bodyKey:  "tour.step5_body",
    padX: 12, padY: 12, radius: 999,
  },
];

interface SpotRect { x: number; y: number; w: number; h: number; r: number }

function findVisible(selector: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(selector);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function SpotlightTour() {
  const { t } = useTranslation();
  const [show, setShow]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx]         = useState(0);
  const [spot, setSpot]       = useState<SpotRect | null>(null);

  useEffect(() => {
    if (isAndroidLiteClient()) return;
    const tourDone    = localStorage.getItem(TOUR_KEY) === "done";
    const onboardDone = localStorage.getItem("onboardingComplete") === "true";
    if (tourDone || !onboardDone) return;
    const tid = setTimeout(() => setShow(true), 1400);
    return () => clearTimeout(tid);
  }, []);

  const measure = useCallback((i: number) => {
    const step = STEPS[i];
    if (!step) return;
    const el = findVisible(step.selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => {
      const br = el.getBoundingClientRect();
      setSpot({
        x: br.left  - step.padX,
        y: br.top   - step.padY,
        w: br.width  + step.padX * 2,
        h: br.height + step.padY * 2,
        r: step.radius,
      });
    }, 300);
  }, []);

  useEffect(() => {
    if (!show) return;
    measure(0);
    const tid = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(tid);
  }, [show, measure]);

  useEffect(() => {
    if (show && idx > 0) measure(idx);
  }, [idx, show, measure]);

  useEffect(() => {
    if (!show) return;
    const onResize = () => measure(idx);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [idx, show, measure]);

  const done = useCallback(() => {
    setMounted(false);
    setTimeout(() => {
      setShow(false);
      localStorage.setItem(TOUR_KEY, "done");
    }, 350);
  }, []);

  const next = useCallback(() => {
    if (idx < STEPS.length - 1) setIdx(i => i + 1);
    else done();
  }, [idx, done]);

  if (!show || !spot) return null;

  const step = STEPS[idx];
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;

  const spotCX   = spot.x + spot.w / 2;
  const tooltipW = Math.min(310, vw - 32);
  let   ttLeft   = spotCX - tooltipW / 2;
  ttLeft = Math.max(16, Math.min(vw - tooltipW - 16, ttLeft));

  const belowCenter = spot.y + spot.h / 2 < vh * 0.58;
  const TOOLTIP_H   = 230;
  let   ttTop = belowCenter ? spot.y + spot.h + 18 : spot.y - TOOLTIP_H - 18;
  ttTop = Math.max(12, Math.min(vh - TOOLTIP_H - 12, ttTop));

  const ease = "cubic-bezier(0.4,0,0.2,1)";
  const dur  = "0.36s";
  const holeTransition = `left ${dur} ${ease}, top ${dur} ${ease}, width ${dur} ${ease}, height ${dur} ${ease}, border-radius ${dur} ${ease}`;

  return (
    <>
      <style>{`
        @keyframes spt-ring-pulse {
          0%,100% { box-shadow: 0 0 0 0px rgba(168,85,247,0),
                                0 0 22px 4px rgba(168,85,247,0.55); }
          50%     { box-shadow: 0 0 0 7px rgba(168,85,247,0.14),
                                0 0 36px 10px rgba(168,85,247,0.85); }
        }
        @keyframes spt-tooltip-in {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        .spt-next-btn:hover  { transform: translateY(-1px); filter: brightness(1.08); }
        .spt-next-btn:active { transform: translateY(0);    filter: brightness(0.95); }
        .spt-skip-btn:hover  { color: rgba(255,255,255,0.7); }
      `}</style>

      {/* ── Full-screen overlay container ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("tour.aria_label")}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          overflow: "hidden",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.4s ease",
          pointerEvents: mounted ? "auto" : "none",
        }}
      >
        {/* Hole — box-shadow creates dark veil around the transparent spotlight */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: spot.x,
            top: spot.y,
            width: spot.w,
            height: spot.h,
            borderRadius: spot.r,
            boxShadow: "0 0 0 9999px rgba(5,3,25,0.87)",
            transition: holeTransition,
            pointerEvents: "none",
          }}
        />

        {/* Glow ring */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: spot.x - 5,
            top: spot.y - 5,
            width: spot.w + 10,
            height: spot.h + 10,
            borderRadius: spot.r + 5,
            border: "2px solid rgba(168,85,247,0.85)",
            animation: "spt-ring-pulse 2s ease-in-out infinite",
            transition: holeTransition,
            pointerEvents: "none",
          }}
        />

        {/* Tooltip card */}
        <div
          key={idx}
          style={{
            position: "absolute",
            left: ttLeft,
            top: ttTop,
            width: tooltipW,
            background: "rgba(9,6,32,0.97)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(168,85,247,0.38)",
            borderRadius: 22,
            padding: "22px 22px 18px",
            boxShadow: [
              "0 32px 80px rgba(0,0,0,0.72)",
              "0 0 0 1px rgba(168,85,247,0.10)",
              "0 0 40px rgba(99,102,241,0.08)",
            ].join(", "),
            animation: "spt-tooltip-in 0.28s ease both",
          }}
        >
          {/* Step badge */}
          {step.badge && (
            <span style={{
              display: "inline-block",
              marginBottom: 10,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: 99,
              background: "linear-gradient(135deg,#6366f1,#a855f7)", // audit-ok: brand primary-to-purple badge gradient
              color: "#fff",
            }}>
              {step.badge}
            </span>
          )}

          {/* Title + counter */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "#fff", lineHeight: 1.35, flex: 1, marginRight: 12 }}>
              {t(step.titleKey)}
            </p>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>
              {idx + 1} / {STEPS.length}
            </span>
          </div>

          {/* Body */}
          <p style={{ margin: 0, marginBottom: 18, fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.66)" }}>
            {t(step.bodyKey)}
          </p>

          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 6,
                  width: i === idx ? 22 : 6,
                  borderRadius: 3,
                  background: i === idx
                    ? "linear-gradient(90deg,#6366f1,#a855f7)" // audit-ok: brand progress-dot active gradient
                    : "rgba(255,255,255,0.16)",
                  transition: "width 0.32s ease, background 0.32s ease",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="spt-next-btn"
              onClick={next}
              style={{
                flex: 1,
                background: "linear-gradient(135deg,#6366f1,#a855f7)", // audit-ok: brand next-button gradient
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                borderRadius: 13,
                padding: "12px 0",
                cursor: "pointer",
                boxShadow: "0 4px 18px rgba(99,102,241,0.45)",
                transition: "transform 0.15s, filter 0.15s",
              }}
            >
              {idx < STEPS.length - 1 ? t("tour.next") : t("tour.done")}
            </button>

            {idx < STEPS.length - 1 && (
              <button
                className="spt-skip-btn"
                onClick={done}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.38)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s",
                }}
              >
                {t("tour.skip")}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
