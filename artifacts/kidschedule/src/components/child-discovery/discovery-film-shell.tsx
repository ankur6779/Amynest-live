/**
 * Child Discovery shell — inherits Welcome FE materials.
 * Does NOT edit Welcome CSS. Imports the frozen material system only.
 */
import type { ReactNode } from "react";
import type { DiscoveryBeat } from "@/lib/child-discovery/beats";
import "@/pages/first-experience-material.css";
import "./discovery-film.css";

type Memory = {
  shot: "arrival" | "relationship" | "growing" | "detail" | "transition" | "reflection";
  src: string;
  alt: string;
};

/** Map Discovery beats → existing FE rooms/shots (no new photography system). */
export function memoryForBeat(beat: DiscoveryBeat): Memory {
  switch (beat) {
    case "arrival":
      return {
        shot: "arrival",
        src: "/experience/r1/shot-01-arrival.png",
        alt: "Soft morning light — understanding begins",
      };
    case "place":
      return {
        shot: "transition",
        src: "/experience/r1/shot-04-transition.png",
        alt: "A quiet place to personalize from",
      };
    case "child-name":
      return {
        shot: "relationship",
        src: "/experience/r1/shot-02-relationship.png",
        alt: "Who we are understanding",
      };
    case "child-age":
    case "infant-feeding":
    case "infant-sleep":
      return {
        shot: "growing",
        src: "/experience/r1/shot-03-detail.png",
        alt: "Growing into today’s next step",
      };
    case "today-world":
    case "rhythm":
      return {
        shot: "transition",
        src: "/experience/r1/shot-04-transition.png",
        alt: "The shape of today",
      };
    case "focus":
    case "earned":
    case "saving":
    case "done":
    default:
      return {
        shot: "reflection",
        src: "/experience/r1/shot-05-reflection.png",
        alt: "Today’s next right thing, held gently",
      };
  }
}

export function roomForBeat(beat: DiscoveryBeat): string {
  switch (beat) {
    case "arrival":
      return "welcome";
    case "child-name":
      return "discovery-name";
    case "child-age":
    case "infant-feeding":
    case "infant-sleep":
      return "discovery-age";
    case "place":
    case "today-world":
    case "rhythm":
      return "discovery-today";
    case "focus":
      return "working";
    case "earned":
      return "reveal";
    case "saving":
    case "done":
      return "done";
    default:
      return "discovery-today";
  }
}

type Props = {
  beat: DiscoveryBeat;
  answered?: boolean;
  children: ReactNode;
};

/**
 * Production shell — same fe-shell / ambient / memory language as Welcome.
 * Photography remains the hero; interface stays quiet.
 */
export function DiscoveryFilmShell({ beat, answered = false, children }: Props) {
  const memory = memoryForBeat(beat);
  const room = roomForBeat(beat);
  const showHeroPhoto = beat === "arrival" || beat === "earned" || beat === "done";

  return (
    <div
      data-testid="child-discovery-film"
      data-fe-room={room}
      data-fe-shot={memory.shot}
      data-fe-answered={answered ? "true" : "false"}
      data-fe-presence={answered ? "acknowledge" : "settle"}
      className="fe-shell cd-shell min-h-[100dvh] flex flex-col relative overflow-hidden"
    >
      <div className="fe-ambient" aria-hidden="true">
        <img src={memory.src} alt="" decoding="async" fetchPriority="low" />
        <div className="fe-ambient-wash" />
      </div>
      <div className="fe-breath fe-breath-a" aria-hidden="true" />
      <div className="fe-breath fe-breath-b" aria-hidden="true" />
      <div className="fe-living-shade" aria-hidden="true" />

      <div className="fe-stage">
        <div className="fe-column">
          {showHeroPhoto ? (
            <div
              className="fe-memory-mount"
              data-testid="discovery-visual-memory"
              data-fe-shot={memory.shot}
            >
              <div className="fe-memory-spill" aria-hidden="true" />
              <div className="fe-memory">
                <img
                  src={memory.src}
                  alt={memory.alt}
                  draggable={false}
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="fe-memory-veil" aria-hidden="true" />
                <div className="fe-memory-glass" aria-hidden="true" />
                <div className="fe-memory-grain" aria-hidden="true" />
              </div>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
