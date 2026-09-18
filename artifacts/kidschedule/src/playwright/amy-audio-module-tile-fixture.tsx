/** Living coach goals layout: Amy Audio as a first-class module tile. */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../i18n";
import "@/components/amy-coach/amy-coach-living-room.css";
import { AmyAudioLessonsCard, amyAudioLessonsPath } from "@/components/amy-coach/amy-audio-lessons-card";

function FakeCategoryTile({ emoji, title, meta }: { emoji: string; title: string; meta: string }) {
  return (
    <button
      type="button"
      className="ac-soft-tile relative flex min-h-[132px] flex-col gap-3 overflow-hidden rounded-[18px] p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-2xl"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          {emoji}
        </div>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>›</span>
      </div>
      <div>
        <p className="font-quicksand text-[15px] font-bold leading-tight text-white">{title}</p>
        <p className="mt-1 text-[11px]" style={{ color: "rgba(232,212,184,0.8)" }}>
          {meta}
        </p>
      </div>
    </button>
  );
}

function PreviewShell() {
  const [href, setHref] = useState("");
  return (
    <div className="amy-coach-living amy-coach-living-shell min-h-screen px-4 py-4">
      <p className="preview-label">Amy Audio — first-class module tile</p>
      <AmyAudioLessonsCard
        onClick={() => {
          const next = amyAudioLessonsPath();
          setHref(next);
          (window as Window & { __amyAudioTileHref?: string }).__amyAudioTileHref = next;
        }}
      />
      <section className="mt-6 space-y-2">
        <h3 className="ac-section-label px-1 font-quicksand text-xs font-bold uppercase tracking-wide">
          Family
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <FakeCategoryTile emoji="💝" title="Parenting Challenges" meta="4 goals →" />
          <FakeCategoryTile emoji="👨‍👩‍👧‍👦" title="Family Dynamics" meta="5 goals →" />
        </div>
      </section>
      {href ? (
        <p data-testid="amy-audio-tile-href" className="preview-label" style={{ marginTop: 16 }}>
          {href}
        </p>
      ) : null}
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PreviewShell />
    </StrictMode>,
  );
}
