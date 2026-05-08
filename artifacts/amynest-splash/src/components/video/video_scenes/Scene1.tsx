import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <motion.div 
          className="w-32 h-32 mb-8 bg-[#7B3FF2] rounded-full flex items-center justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <img src={`${import.meta.env.BASE_URL}images/mascot.png`} alt="Mascot" className="w-24 h-24 object-contain" />
        </motion.div>

        <motion.h1 
          className="text-5xl font-extrabold mb-4 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          AmyNest AI
        </motion.h1>

        <motion.p 
          className="text-xl text-[#FF4ECD] font-medium"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          Your AI Parenting Partner
        </motion.p>
      </div>
    </motion.div>
  );
}
