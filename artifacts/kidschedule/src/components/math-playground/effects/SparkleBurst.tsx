import { motion } from "framer-motion";

interface SparkleBurstProps {
  x: number;
  y: number;
  active: boolean;
}

export function SparkleBurst({ x, y, active }: SparkleBurstProps) {
  if (!active) return null;
  return (
    <motion.span
      className="pointer-events-none absolute text-lg"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
      transition={{ duration: 0.45 }}
      aria-hidden
    >
      ✨
    </motion.span>
  );
}
