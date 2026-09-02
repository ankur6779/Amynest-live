import { useTranslation } from "react-i18next";

export type ParentHubModuleUnavailableProps = {
  tileId?: string | null;
  title?: string;
  message?: string;
  onBack?: () => void;
};

/**
 * Never a blank screen / silent no-op when a Rooms module cannot render.
 */
export function ParentHubModuleUnavailable({
  tileId,
  title,
  message,
  onBack,
}: ParentHubModuleUnavailableProps) {
  const { t } = useTranslation();

  return (
    <div
      className="ph-module-unavailable"
      data-testid="parent-hub-module-unavailable"
      data-tile-id={tileId ?? undefined}
      role="status"
    >
      <p className="ph-module-unavailable-title">
        {title ??
          t("parent_hub.rooms.module_unavailable.title", {
            defaultValue: "This path isn't available right now.",
          })}
      </p>
      <p className="ph-module-unavailable-body">
        {message ??
          t("parent_hub.rooms.module_unavailable.body", {
            defaultValue: "We can still help from this room or from Home.",
          })}
      </p>
      {onBack ? (
        <button
          type="button"
          className="ph-module-unavailable-back"
          data-testid="parent-hub-module-unavailable-back"
          onClick={onBack}
        >
          {t("parent_hub.rooms.module_unavailable.back", {
            defaultValue: "Back to this room",
          })}
        </button>
      ) : null}
    </div>
  );
}
