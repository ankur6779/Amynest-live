import { AppLink } from "@/components/app-link";
import { useTranslation } from "react-i18next";

export type ParentHubExitPanelProps = {
  /** Clear module; stay in room paths */
  onContinueInRoom: () => void;
  /** Return to photographic room doors */
  onAnotherRoom: () => void;
  homeHref?: string;
};

/**
 * Pack 4 Exit Law — after a destination, return to life.
 * No endless exploration loop.
 */
export function ParentHubExitPanel({
  onContinueInRoom,
  onAnotherRoom,
  homeHref = "/dashboard",
}: ParentHubExitPanelProps) {
  const { t } = useTranslation();

  return (
    <div
      className="ph-exit-panel"
      data-testid="parent-hub-exit-panel"
      data-pack="exit-law"
    >
      <p className="ph-exit-title">
        {t("parent_hub.flow.exit.title", {
          defaultValue: "Ready to continue?",
        })}
      </p>
      <div className="ph-exit-actions">
        <AppLink href={homeHref} source="parent-hub-exit-home">
          <button
            type="button"
            className="ph-exit-primary"
            data-testid="parent-hub-exit-home"
          >
            {t("parent_hub.flow.exit.home", {
              defaultValue: "Back to Home",
            })}
          </button>
        </AppLink>
        <button
          type="button"
          className="ph-exit-secondary"
          data-testid="parent-hub-exit-continue"
          onClick={onContinueInRoom}
        >
          {t("parent_hub.flow.exit.continue", {
            defaultValue: "Continue today",
          })}
        </button>
        <button
          type="button"
          className="ph-exit-tertiary"
          data-testid="parent-hub-exit-another-room"
          onClick={onAnotherRoom}
        >
          {t("parent_hub.flow.exit.another_room", {
            defaultValue: "Another room",
          })}
        </button>
      </div>
    </div>
  );
}
