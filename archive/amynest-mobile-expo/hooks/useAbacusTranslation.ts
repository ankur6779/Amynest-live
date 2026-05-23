import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { abacusTranslate, type AbacusTranslateFn } from "@workspace/abacus/i18n";

/** Abacus UI labels — resolves `abacus.*` keys to `screens.abacus.*` in en.json. */
export function useAbacusTranslation() {
  const { t: rawT, i18n, ready } = useTranslation();
  const t = useCallback(
    (
      key: string,
      defaultOrOptions?: string | Record<string, unknown>,
      maybeOptions?: Record<string, unknown>,
    ) => abacusTranslate(rawT as AbacusTranslateFn, key, defaultOrOptions, maybeOptions),
    [rawT],
  );
  return useMemo(() => ({ t, i18n, ready }), [t, i18n, ready]);
}
