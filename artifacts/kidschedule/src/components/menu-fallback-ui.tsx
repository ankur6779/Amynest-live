import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type Props = {
  onReload?: () => void;
};

/** Inline fallback when the mobile nav sheet crashes — keeps the rest of the app usable. */
export function MenuFallbackUi({ onReload }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-end gap-2 p-2" role="alert">
      <p className="text-xs text-muted-foreground text-right max-w-[140px]">
        {t("components.layout.menu_failed", {
          defaultValue: "Menu failed. Reloading…",
        })}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          try {
            onReload?.();
          } catch {
            /* ignore */
          }
          window.location.reload();
        }}
      >
        {t("components.layout.menu_reload", { defaultValue: "Reload" })}
      </Button>
    </div>
  );
}
