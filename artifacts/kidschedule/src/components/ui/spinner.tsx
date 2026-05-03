import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
function Spinner({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  const {
    t
  } = useTranslation();
  return <Loader2Icon role="status" aria-label={t("components.ui.spinner.loading")} className={cn("size-4 animate-spin", className)} {...props} />;
}
export { Spinner };