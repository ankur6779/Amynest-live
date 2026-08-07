/**
 * Today Home sanctuary shell — inherits Welcome FE materials (import only).
 * Does NOT edit Welcome CSS. Does NOT invent a third visual system.
 * Compact seating: ambient photography + existing breath/shade language.
 */
import type { ReactNode } from "react";
import "@/pages/first-experience-material.css";
import "./today-home-sanctuary.css";

const MEMORY_SRC = "/experience/r1/shot-05-reflection.png";

type Props = {
  children: ReactNode;
};

export function TodayHomeShell({ children }: Props) {
  return (
    <div
      className="fe-shell th-shell"
      data-fe-room="reveal"
      data-fe-shot="reflection"
      data-fe-presence="settle"
      data-testid="today-home-shell"
    >
      <div className="fe-ambient" aria-hidden="true">
        <img src={MEMORY_SRC} alt="" decoding="async" fetchPriority="low" />
        <div className="fe-ambient-wash" />
      </div>
      <div className="fe-breath fe-breath-a" aria-hidden="true" />
      <div className="fe-breath fe-breath-b" aria-hidden="true" />
      <div className="fe-living-shade" aria-hidden="true" />

      <div className="th-shell-content">
        <div
          className="fe-memory-mount th-memory-mount"
          data-testid="today-home-visual-memory"
          data-fe-shot="reflection"
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={MEMORY_SRC}
              alt="Today continues gently"
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
