import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="w-40 h-40 mb-6 bg-[#7B3FF2] rounded-[40px] flex items-center justify-center shadow-[0_0_80px_rgba(123,63,242,0.5)]"
        initial={{ scale: 0.5, opacity: 0, rotate: 10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <img src={`${import.meta.env.BASE_URL}images/mascot.png`} alt="Mascot" className="w-32 h-32 object-contain" />
      </motion.div>

      <motion.h1 
        className="text-6xl font-black mb-4 tracking-tighter text-center leading-none"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        AmyNest
      </motion.h1>

      <motion.p 
        className="text-xl text-[#FF4ECD] font-medium mb-12"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Your AI Parenting Partner
      </motion.p>

      <motion.div
        className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full"
        initial={{ y: 30, opacity: 0 }}
        animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <p className="text-sm font-bold tracking-wider uppercase">Free Download · iOS & Android</p>
      </motion.div>

      <motion.div
        className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 0.5L6.12 3.38L9.24 3.62L7 5.54L7.76 8.56L5 6.9L2.24 8.56L3 5.54L0.76 3.62L3.88 3.38L5 0.5Z" fill="rgba(167,139,250,0.75)" />
        </svg>
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(167,139,250,0.70)' }}>
          Patent Pending Technology
        </span>
      </motion.div>
    </motion.div>
  );
}
