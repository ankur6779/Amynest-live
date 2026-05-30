import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export function OnboardingCountryModal({
  open,
  onOpenChange,
  title,
  hint,
  required,
  search,
  onSearchChange,
  topCountries,
  searchResults,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  hint?: string | null;
  required: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  topCountries: CountryOption[];
  searchResults: CountryOption[];
  onSelect: (code: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const list = search.trim().length > 0 ? searchResults : topCountries;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </DialogHeader>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("screens.onboarding.country_search_placeholder", {
            defaultValue: "Search countries…",
          })}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <div className="max-h-[50vh] overflow-y-auto space-y-1 pr-1">
          {list.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelect(c.code, c.name)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="text-2xl leading-none">{c.flag}</span>
              <span className="text-sm font-semibold text-foreground">{c.name}</span>
            </button>
          ))}
        </div>
        {!required ? (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            {t("components.ui.dialog.close")}
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function flagEmojiFromCode(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}
