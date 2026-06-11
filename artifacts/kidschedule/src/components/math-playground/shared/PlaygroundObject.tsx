import { motion } from "framer-motion";
import type { ObjectKind } from "@workspace/math-playground";

const GLYPHS: Record<ObjectKind, string> = {
  apple: "🍎",
  flower: "🌸",
  star: "⭐",
  cookie: "🍪",
  toy: "🧸",
  block: "🟦",
};

const COLORS: Partial<Record<ObjectKind, string>> = {
  block: "hsl(var(--brand-sky-400))",
};

interface PlaygroundObjectProps {
  kind: ObjectKind;
  size?: number;
  collected?: boolean;
  onTap?: () => void;
  interactive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function PlaygroundObject({
  kind,
  size = 36,
  collected,
  onTap,
  interactive,
  style,
  className,
}: PlaygroundObjectProps) {
  const glyph = GLYPHS[kind];
  const isBlock = kind === "block";

  const sharedStyle: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: isBlock ? size * 0.55 : size * 0.92,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: isBlock
      ? `linear-gradient(150deg, ${COLORS.block}, hsl(var(--brand-indigo-500)))`
      : "transparent",
    borderRadius: isBlock ? Math.max(6, size * 0.22) : "50%",
    boxShadow: isBlock ? "0 2px 8px rgba(0,0,0,0.25)" : undefined,
    cursor: interactive && !collected ? "pointer" : "default",
    touchAction: "manipulation",
    ...style,
  };

  const motionProps = {
    className,
    animate: collected
      ? { scale: 0.6, opacity: 0.35, filter: "grayscale(0.6)" }
      : { scale: 1, opacity: 1, filter: "grayscale(0)" },
    transition: { type: "spring" as const, stiffness: 480, damping: 18 },
    style: sharedStyle,
  };

  if (!interactive) {
    return (
      <motion.div {...motionProps} aria-hidden>
        {!isBlock ? glyph : null}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      data-testid={!collected ? "mp-tap-target" : undefined}
      disabled={collected}
      onClick={onTap}
      whileTap={!collected ? { scale: 0.82 } : undefined}
      {...motionProps}
    >
      {!isBlock ? glyph : null}
    </motion.button>
  );
}

export function objectGlyph(kind: ObjectKind): string {
  return GLYPHS[kind];
}

export function objectLabelKey(kind: ObjectKind): string {
  return `object_${kind}`;
}
