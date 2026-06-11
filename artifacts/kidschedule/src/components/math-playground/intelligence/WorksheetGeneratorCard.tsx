import { useTranslation } from "react-i18next";
import type { GeneratedWorksheet } from "@workspace/math-playground";
import type { PlaygroundIntelligenceApi } from "../hooks/usePlaygroundIntelligence";

interface WorksheetGeneratorCardProps {
  childName: string;
  intelligenceApi: PlaygroundIntelligenceApi;
  latestWorksheet?: GeneratedWorksheet;
}

const OBJECT_EMOJI: Record<string, string> = {
  apple: "🍎",
  star: "⭐",
  flower: "🌸",
  block: "🧱",
  toy: "🧸",
  cookie: "🍪",
};

export function WorksheetGeneratorCard({
  childName,
  intelligenceApi,
  latestWorksheet,
}: WorksheetGeneratorCardProps) {
  const { t } = useTranslation();

  const handleGenerate = () => {
    intelligenceApi.generateWorksheetNow();
  };

  const handleDownload = (ws: GeneratedWorksheet) => {
    intelligenceApi.downloadWorksheetPdf(ws, {
      title: t(`components.math_playground.${ws.titleKey}`),
      level: t(`components.math_playground.${ws.levelLabelKey}`),
      difficulty: t(`components.math_playground.${ws.difficultyLabelKey}`),
      childName,
      date: new Date(ws.generatedAt).toLocaleDateString(),
      progressSection: t("components.math_playground.ws_progress_section"),
      parentNotes: t("components.math_playground.ws_parent_notes"),
      problemLabel: (i) => t("components.math_playground.ws_problem_n", { n: i }),
      resolvePrompt: (p) =>
        t(`components.math_playground.${p.promptKey}`, p.promptParams as Record<string, string | number>),
      objectEmoji: (kind) => OBJECT_EMOJI[kind] ?? "●",
    });
  };

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <p className="text-[10px] font-bold text-amber-300/80 uppercase mb-2">
        {t("components.math_playground.worksheet_generator_title")}
      </p>
      <button
        type="button"
        data-testid="mp-worksheet-generate"
        onClick={handleGenerate}
        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg mr-2"
        style={{ background: "rgba(245,158,11,0.2)", color: "hsl(var(--brand-amber-300))" }}
      >
        {t("components.math_playground.worksheet_generate")}
      </button>
      {latestWorksheet && (
        <button
          type="button"
          data-testid="mp-worksheet-download"
          onClick={() => handleDownload(latestWorksheet)}
          className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
        >
          {t("components.math_playground.worksheet_download_pdf")}
        </button>
      )}
      {latestWorksheet && (
        <p className="text-[10px] text-white/45 mt-2">
          {t(`components.math_playground.${latestWorksheet.titleKey}`)} ·{" "}
          {t(`components.math_playground.${latestWorksheet.levelLabelKey}`)} ·{" "}
          {latestWorksheet.problemCount} {t("components.math_playground.ws_problems")}
        </p>
      )}
    </div>
  );
}
