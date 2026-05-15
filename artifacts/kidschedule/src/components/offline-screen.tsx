/**
 * OfflineScreen — premium AmyNest branded offline experience for the web app.
 *
 * Detected via browser `online`/`offline` events + navigator.onLine polling.
 * Auto-reconnects when the browser reports `online` — no manual action needed.
 * Uses CSS keyframes (injected once via a <style> tag) for lightweight GPU-
 * accelerated animations: float, glow-pulse, ring-spin.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { getApiUrl } from "@/lib/api";

// ─── CSS keyframes injected once into the document head ───────────────────────

const STYLE_ID = "amynest-offline-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes amy-float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    }
    @keyframes amy-glow-pulse {
      0%, 100% { opacity: 0.25; transform: scale(1); }
      50%       { opacity: 0.55; transform: scale(1.08); }
    }
    @keyframes amy-ring-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes amy-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes amy-btn-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(123,63,242,0.5), 0 0 40px rgba(224,64,205,0.25); }
      50%       { box-shadow: 0 0 28px rgba(123,63,242,0.75), 0 0 52px rgba(224,64,205,0.4); }
    }
    .amy-float     { animation: amy-float 3.4s ease-in-out infinite; }
    .amy-glow      { animation: amy-glow-pulse 2.6s ease-in-out infinite; }
    .amy-ring-spin { animation: amy-ring-spin 5.5s linear infinite; }
    .amy-fade-in   { animation: amy-fade-in 0.7s ease-out both; }
    .amy-btn-glow  { animation: amy-btn-glow 2.4s ease-in-out infinite; }
    .amy-btn-press:active { transform: scale(0.96); }
  `;
  document.head.appendChild(el);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online",  up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return isOnline;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onRetry?: () => void;
}

export function OfflineScreen({ onRetry }: Props) {
  const retrying = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  const tryReconnect = useCallback(() => {
    if (retrying.current) return;
    retrying.current = true;

    fetch(getApiUrl("/api/healthz"), { method: "HEAD", cache: "no-store" })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        retrying.current = false;
      });
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(tryReconnect, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tryReconnect]);

  const handleRetry = () => {
    retrying.current = false;
    tryReconnect();
    onRetry?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0C0A1E 0%, #0F0C29 50%, #1A0840 100%)", // audit-ok: dark navy offline background gradient — no semantic token
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
        padding: "24px",
      }}
    >
      <div className="amy-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 380 }}>

        {/* ── Icon area ── */}
        <div style={{ position: "relative", marginBottom: 36 }}>

          {/* Ambient glow */}
          <div
            className="amy-glow"
            style={{
              position: "absolute",
              inset: -36,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(123,63,242,0.6) 0%, rgba(224,64,205,0.2) 60%, transparent 80%)", // audit-ok: brand purple/pink glow bloom
              pointerEvents: "none",
            }}
          />

          {/* Spinning neon ring */}
          <div
            className="amy-ring-spin"
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: "50%",
              border: "3px solid transparent",
              backgroundImage: "conic-gradient(from 0deg, #7B3FF2, #EC4899, #7B3FF2, transparent)", // audit-ok: brand purple/pink neon ring gradient
              backgroundOrigin: "border-box",
              WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "destination-out",
              maskComposite: "exclude",
            }}
          />

          {/* Floating Amy icon */}
          <div className="amy-float">
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #2A1255, #180D38)", // audit-ok: dark purple icon circle — offline dark palette
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 3px rgba(123,63,242,0.4), 0 8px 32px rgba(0,0,0,0.6)",
                overflow: "hidden",
              }}
            >
              <img
                src="/amynest-logo-new.png"
                alt="Amy AI" // i18n-ok: image alt text for Amy character logo — proper noun, not translatable
                style={{ width: 72, height: 72, objectFit: "contain" }}
                draggable={false}
              />
            </div>
          </div>
        </div>

        {/* ── Headline ── */}
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "clamp(22px, 5vw, 26px)",
            fontWeight: 700,
            textAlign: "center",
            color: "#F0ECFF", // audit-ok: off-white headline on dark offline background
            letterSpacing: "0.01em",
          }}
        >
          You're Offline Right Now
        </h1>

        {/* ── Body ── */}
        <p
          style={{
            margin: "0 0 36px",
            fontSize: 14,
            lineHeight: 1.7,
            textAlign: "center",
            color: "#9A8FCB", // audit-ok: muted lavender body text on dark offline background
          }}
        >
          Please check your internet connection and try again. Your parenting tools, routines, and AI guidance will be ready once you're back online.
        </p>

        {/* ── Reconnect button ── */}
        <button
          onClick={handleRetry}
          className="amy-btn-glow amy-btn-press"
          style={{
            border: "none",
            cursor: "pointer",
            padding: "14px 44px",
            borderRadius: 32,
            fontSize: 16,
            fontWeight: 700,
            color: "#FFFFFF",
            background: "linear-gradient(90deg, #7B3FF2, #E040CD)", // audit-ok: brand purple-to-pink reconnect button gradient
            transition: "transform 0.15s ease, opacity 0.15s ease",
            letterSpacing: "0.02em",
          }}
        >
          Reconnect
        </button>

        {/* ── Footer ── */}
        <p
          style={{
            marginTop: 20,
            fontSize: 12,
            color: "#5E5490", // audit-ok: dimmed lavender footer text on dark offline background
            textAlign: "center",
          }}
        >
          AMY AI will reconnect automatically ✨
        </p>
      </div>
    </div>
  );
}
