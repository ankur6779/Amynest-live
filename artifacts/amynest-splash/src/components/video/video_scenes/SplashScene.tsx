import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function SplashScene() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),   // Bg particles & ring start
      setTimeout(() => setPhase(2), 1000),  // Mascot enters
      setTimeout(() => setPhase(3), 2000),  // Logo reveals
      setTimeout(() => setPhase(4), 3000),  // Tagline & loading
      setTimeout(() => setPhase(5), 5500),  // Outro start
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
      transition={{ duration: 1 }}
    >
      {/* Cinematic Camera Push (applies to everything) */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center w-full h-full"
        animate={{ scale: [1, 1.05] }}
        transition={{ duration: 6, ease: "linear" }}
      >
        {/* Background Image */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 3, ease: 'easeOut' }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/nebula-bg.png`}
            className="w-full h-full object-cover"
            alt="Nebula"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050510]/40 via-transparent to-[#050510]" />
        </motion.div>

        {/* Ambient Glows & Particles */}
        {phase >= 1 && (
          <>
            {/* Subtle energy wave at bottom */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-purple-900/30 to-transparent blur-2xl"
              animate={{ opacity: [0.3, 0.6, 0.3], y: [10, -10, 10] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Floating cosmic dust (simulated with CSS/framer-motion) */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={`dust-${i}`}
                className="absolute w-1 h-1 rounded-full bg-white blur-[1px]"
                initial={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  y: [`${Math.random() * 100}vh`, `${Math.random() * 100 - 20}vh`],
                  opacity: [0, Math.random() * 0.8, 0],
                  scale: [0, Math.random() * 2 + 1, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'linear',
                }}
              />
            ))}
          </>
        )}

        {/* Mascot & Ring Container */}
        <div className="relative flex items-center justify-center h-[40%] w-full mt-[-10%]">
          {/* Neon Ring */}
          <motion.div
            className="absolute w-[60vw] h-[60vw] rounded-full border-[2px] border-transparent"
            style={{
              background: 'linear-gradient(#050510, #050510) padding-box, linear-gradient(45deg, #8B5CF6, #EC4899, #06B6D4) border-box',
            }}
            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
            animate={
              phase >= 1
                ? { opacity: 1, scale: 1, rotate: 360 }
                : { opacity: 0, scale: 0.8, rotate: -90 }
            }
            transition={
              phase >= 1
                ? {
                    opacity: { duration: 1.5, ease: 'easeOut' },
                    scale: { duration: 1.5, type: 'spring', bounce: 0.2 },
                    rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                  }
                : { duration: 0 }
            }
          >
            {/* Ring glow pulse */}
            <motion.div
              className="absolute inset-[-10px] rounded-full"
              style={{
                background: 'linear-gradient(45deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3), rgba(6,182,212,0.3))',
                filter: 'blur(15px)',
              }}
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Mascot */}
          <motion.div
            className="relative z-10 w-[55vw] h-[55vw]"
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={
              phase >= 2
                ? { opacity: 1, y: [0, -10, 0], scale: 1 }
                : { opacity: 0, y: 30, scale: 0.8 }
            }
            transition={
              phase >= 2
                ? {
                    opacity: { duration: 1 },
                    scale: { type: 'spring', bounce: 0.3, duration: 1.5 },
                    y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 },
                  }
                : { duration: 0 }
            }
          >
            <img
              src={`${import.meta.env.BASE_URL}images/mascot.png`}
              className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
              alt="Amy AI Mascot"
            />
          </motion.div>
        </div>

        {/* Text & Branding */}
        <div className="flex flex-col items-center justify-center mt-8 z-20 w-full px-6 text-center">
          {/* Logo Name */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={
              phase >= 3
                ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                : { opacity: 0, y: 20, filter: 'blur(10px)' }
            }
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 pb-1" style={{ fontFamily: 'var(--font-display)' }}>
              AmyNest AI
            </h1>
            {/* Cinematic light sweep */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg]"
              style={{ width: '50%' }}
              initial={{ left: '-100%' }}
              animate={phase >= 3 ? { left: '200%' } : { left: '-100%' }}
              transition={{ duration: 1.5, delay: 2.2, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="text-[3.5vw] font-medium tracking-[0.2em] text-white/80 mt-3"
            style={{ fontFamily: 'var(--font-body)' }}
            initial={{ opacity: 0, y: 15 }}
            animate={
              phase >= 4
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 15 }
            }
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          >
            WHERE SMART PARENTING STARTS
          </motion.p>
        </div>

        {/* Loading Indicator */}
        <motion.div
          className="absolute bottom-[10%] flex flex-col items-center justify-center w-full"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <div className="flex gap-2 mb-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`dot-${i}`}
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <p className="text-[3vw] text-white/50 font-mono tracking-wide">
            Personalizing your parenting experience...
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
