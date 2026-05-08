import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PhoneMockup } from '../PhoneMockup';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center p-8"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute left-[10%] top-1/2 -translate-y-1/2 max-w-[400px]">
        <motion.h2 
          className="text-6xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Ask Amy
        </motion.h2>
        <motion.p 
          className="text-xl text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Expert parenting advice, available 24/7.
        </motion.p>
      </div>

      <div className="absolute right-[15%]">
        <PhoneMockup>
          <div className="p-4 flex flex-col h-full">
            <div className="flex gap-2 mb-8 overflow-hidden">
              {['Parenting', 'Teach', 'Quiz'].map((chip, i) => (
                <motion.div
                  key={chip}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${i === 0 ? 'bg-[#7B3FF2] text-white' : 'bg-white/10 text-white/60'}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  {chip}
                </motion.div>
              ))}
            </div>

            <div className="flex-1 flex flex-col gap-4 mt-auto justify-end pb-8">
              <motion.div 
                className="self-end bg-white/10 p-3 rounded-2xl rounded-tr-sm max-w-[85%]"
                initial={{ opacity: 0, scale: 0.8, transformOrigin: 'top right' }}
                animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <p className="text-sm">How do I handle bedtime tantrums?</p>
              </motion.div>

              <motion.div 
                className="self-start bg-[#7B3FF2] p-3 rounded-2xl rounded-tl-sm max-w-[90%]"
                initial={{ opacity: 0, y: 20 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-sm leading-relaxed">
                  Create a calm wind-down routine 30 mins before bed. Dim lights, read a story, and offer choices like "Which pajamas do you want?" Let's build a routine together!
                </p>
              </motion.div>
            </div>
          </div>
        </PhoneMockup>
      </div>
    </motion.div>
  );
}
