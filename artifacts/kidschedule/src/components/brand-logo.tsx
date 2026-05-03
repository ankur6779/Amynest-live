import { motion } from "framer-motion";
import { useTheme } from "@/contexts/theme-context";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const LETTERS = [
  { char: "A", color: "hsl(var(--brand-red-500))", glow: "#FF6B7A", shadow: "#CC0020" },
  { char: "m", color: "hsl(var(--brand-orange-500))", glow: "hsl(var(--brand-orange-400))", shadow: "#CC4400" },
  { char: "y", color: "hsl(var(--brand-yellow-500))", glow: "hsl(var(--brand-yellow-400))", shadow: "#CC9900" },
  { char: "N", color: "#2ECC71", glow: "#58D68D", shadow: "#1A9950" },
  { char: "e", color: "#3498DB", glow: "#5DADE2", shadow: "#1A6FA0" },
  { char: "s", color: "#9B59B6", glow: "#BB8FCE", shadow: "#6C3483" },
  { char: "t", color: "#E91E8C", glow: "#F06AB5", shadow: "#B5006A" },
];

const SPRINKLE_POSITIONS = [
  { x: 8,  y: 20, r: 30  },
  { x: 20, y: 75, r: 130 },
  { x: 45, y: 10, r: 60  },
  { x: 62, y: 80, r: 150 },
  { x: 78, y: 25, r: 45  },
  { x: 90, y: 65, r: 100 },
];
const SPRINKLE_COLORS = ["hsl(var(--brand-red-500))","hsl(var(--brand-yellow-500))","#2ECC71","#3498DB","#E91E8C","#9B59B6"];

export function BrandLogo({ size = "md", showTagline = false }: BrandLogoProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const fontSize  = size === "sm" ? "1.25rem"   : size === "lg" ? "2rem"      : "1.6rem";
  const aiFontSz  = size === "sm" ? "0.65rem"   : size === "lg" ? "1rem"      : "0.8rem";

  return (
    <div className="flex items-center gap-2.5 relative">
      {/* Text block */}
      <div className="flex flex-col leading-none relative">
        {/* Glow behind text */}
        {isDark && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 110% 80% at 50% 50%, rgba(155,89,182,0.25) 0%, transparent 70%)",
              filter: "blur(10px)",
              zIndex: 0,
            }}
          />
        )}

        {/* Sprinkles (tiny) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
          {SPRINKLE_POSITIONS.map((s, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${s.x}%`,
                top:  `${s.y}%`,
                width: 4, height: 2,
                backgroundColor: SPRINKLE_COLORS[i],
                rotate: s.r,
                boxShadow: `0 0 3px ${SPRINKLE_COLORS[i]}`,
              }}
              animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5 + i * 0.4, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Rainbow letters row */}
        <div className="relative flex items-baseline" style={{ zIndex: 2, gap: "0.01em" }}>
          {LETTERS.map((l, i) => (
            <motion.span
              key={i}
              style={{
                color: l.color,
                fontFamily: "'Nunito', 'Quicksand', system-ui, sans-serif",
                fontWeight: 900,
                fontSize,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                display: "inline-block",
                textShadow: isDark
                  ? `0 0 12px ${l.glow}, 1px 2px 0 ${l.shadow}, 2px 4px 8px rgba(0,0,0,0.5)`
                  : `1px 2px 0 ${l.shadow}, 2px 4px 8px rgba(0,0,0,0.15)`,
              }}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 280, damping: 18 }}
              whileHover={{
                scale: 1.3,
                filter: `drop-shadow(0 0 6px ${l.glow}cc)`,
                transition: { duration: 0.15 },
              }}
            >
              {l.char}
            </motion.span>
          ))}

          {/* AI pill */}
          <motion.span
            className="ml-1 inline-flex items-center px-1.5 rounded-full"
            style={{
              background: isDark
                ? "linear-gradient(135deg, #7C4DFF55, #00BCD455)"
                : "linear-gradient(135deg, #E8D5FF, #B3EBF2)",
              border: isDark ? "1px solid #9B59B688" : "1px solid #C8A8FF",
              boxShadow: isDark
                ? "0 0 10px #7C4DFF55, inset 0 1px 0 rgba(255,255,255,0.08)"
                : "0 1px 6px rgba(124,77,255,0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
              fontSize: aiFontSz,
              fontWeight: 800,
              letterSpacing: "0.04em",
              lineHeight: 1,
              paddingTop: "0.2em",
              paddingBottom: "0.2em",
              verticalAlign: "middle",
            }}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: LETTERS.length * 0.04 + 0.1, type: "spring", stiffness: 260 }}
          >
            <span style={{ color: "hsl(var(--brand-cyan-500))", fontWeight: 900 }}>A</span>
            <span style={{ color: "#7C4DFF", fontWeight: 900 }}>I</span>
          </motion.span>
        </div>

        {/* Tagline */}
        {showTagline && (
          <motion.span
            className="text-[9px] font-semibold tracking-widest uppercase mt-0.5 relative"
            style={{
              color: isDark ? "rgba(255,255,255,0.38)" : "rgba(80,40,120,0.45)",
              zIndex: 2,
              letterSpacing: "0.16em",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            Where Smart Parenting Starts
          </motion.span>
        )}
      </div>
    </div>
  );
}
