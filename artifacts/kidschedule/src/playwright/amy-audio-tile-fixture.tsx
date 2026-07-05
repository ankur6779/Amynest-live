/** Standalone fixture for Amy Audio Lessons tile screenshots (no auth). */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../i18n";
import { AmyAudioLessonsCard } from "@/components/amy-coach/amy-audio-lessons-card";

function PreviewShell() {
  return (
    <>
      <p className="preview-label">Amy Audio Lessons — coach goals tile</p>
      <AmyAudioLessonsCard onClick={() => undefined} />
    </>
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
