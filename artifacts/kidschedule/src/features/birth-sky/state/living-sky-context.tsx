/**
 * Presentation-only Living Sky context — Amy gaze ↔ sky reactivity.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  resolveLivingSkyTheme,
  type LivingSkyInput,
  type LivingSkyTheme,
} from "../lib/living-sky-theme";

type LivingSkyContextValue = {
  theme: LivingSkyTheme;
  /** Amy looking up brightens nearby stars */
  amyGazeUp: boolean;
  /** Orb pulse softly lights constellations */
  orbGlow: boolean;
  setAmyGazeUp: (v: boolean) => void;
  setOrbGlow: (v: boolean) => void;
  pulseOrb: () => void;
};

const LivingSkyContext = createContext<LivingSkyContextValue | null>(null);

export function LivingSkyProvider({
  input,
  children,
}: {
  input: LivingSkyInput;
  children: ReactNode;
}) {
  const theme = useMemo(() => resolveLivingSkyTheme(input), [
    input.childName,
    input.sunSign,
    input.moonSign,
    input.birthTime,
    input.timePrecision,
    input.dayKey,
  ]);
  const [amyGazeUp, setAmyGazeUp] = useState(false);
  const [orbGlow, setOrbGlow] = useState(false);

  const pulseOrb = useCallback(() => {
    setOrbGlow(true);
    window.setTimeout(() => setOrbGlow(false), 900);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      amyGazeUp,
      orbGlow,
      setAmyGazeUp,
      setOrbGlow,
      pulseOrb,
    }),
    [theme, amyGazeUp, orbGlow, pulseOrb],
  );

  return (
    <LivingSkyContext.Provider value={value}>{children}</LivingSkyContext.Provider>
  );
}

export function useLivingSky(): LivingSkyContextValue | null {
  return useContext(LivingSkyContext);
}
