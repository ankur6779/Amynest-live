/**
 * Nutrition Phase 2 — living opening surface.
 * Care FE photography + one recommend + quiet tab paths.
 * Presentation only.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import {
  NUTRITION_QUIET_PATHS,
  recommendNutritionAction,
} from "@/lib/nutrition/living-room";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

const CARE_MEMORY = ROOM_HEROES.care;

export function NutritionLivingOpening() {
  const { t } = useTranslation();
  const { activeChild, setActiveTab } = useNutritionContext();
  const recommend = useMemo(() => recommendNutritionAction(), []);
  const childName =
    activeChild.name?.trim() ||
    t("parent_hub.journey.your_child", { defaultValue: "your child" });

  return (
    <div className="nu-living-surface" data-testid="nutrition-living-surface">
      <header className="nu-today-hero" data-testid="nutrition-today-hero">
        <div
          className="fe-memory-mount nu-today-memory"
          data-testid="nutrition-visual-memory"
          data-fe-shot={CARE_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={CARE_MEMORY.src}
              alt={CARE_MEMORY.alt}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="nu-today-readability" aria-hidden="true" />
            <div className="nu-today-copy">
              <p className="nu-today-eyebrow">
                {t("nutrition.living.eyebrow", { defaultValue: "Today's Care" })}
              </p>
              <h1 className="nu-today-title">
                {t("nutrition.living.title", {
                  name: childName,
                  defaultValue: `What should we feed ${childName} today?`,
                })}
              </h1>
              <p className="nu-today-purpose">
                {t("nutrition.living.purpose", {
                  defaultValue: "One calm next meal — for this body.",
                })}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="nu-recommend-btn"
          data-testid="nutrition-recommend"
          onClick={() => setActiveTab(recommend.tab)}
        >
          <span className="nu-recommend-cue">{recommend.label}</span>
          <span className="nu-recommend-title">{recommend.title}</span>
          <span className="nu-recommend-purpose">{recommend.purpose}</span>
        </button>
      </header>

      <div className="nu-quiet-band">
        <p className="nu-quiet-label">
          {t("nutrition.living.quiet_paths", {
            defaultValue: "Quiet care paths",
          })}
        </p>
        <div className="nu-quiet-list" data-testid="nutrition-quiet-paths">
          {NUTRITION_QUIET_PATHS.map((path) => (
            <button
              key={path.tab}
              type="button"
              className="nu-quiet-path"
              data-testid={`nutrition-quiet-${path.tab}`}
              onClick={() => setActiveTab(path.tab)}
            >
              <span className="nu-quiet-path-title">{path.title}</span>
              <span className="nu-quiet-path-purpose">{path.purpose}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
