import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PhoneMockup } from '../PhoneMockup';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center p-8"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute right-[10%] top-1/2 -translate-y-1/2 max-w-[400px] text-right">
        <motion.h2 
          className="text-6xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Deep Insights
        </motion.h2>
        <motion.p 
          className="text-xl text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Data-driven approach to child development.
        </motion.p>
      </div>

      <div className="absolute left-[15%]">
        <PhoneMockup>
          <div className="p-4 flex flex-col gap-4 mt-4">
            <motion.div 
              className="bg-[#1A1135] border border-[#3D257A] rounded-[20px] p-5 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring' }}
            >
              <p className="text-xs text-white/60 mb-1">Consistency Streak</p>
              <p className="text-3xl font-bold text-[#FF4ECD]">🔥 12 Days</p>
            </motion.div>

            <motion.div 
              className="bg-[#1A1135] border border-[#3D257A] rounded-[20px] p-5"
              initial={{ opacity: 0, x: -50 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            >
              <div className="flex justify-between mb-2">
                <p className="text-xs font-semibold">Routine Completion</p>
                <p className="text-xs text-[#7B3FF2] font-bold">87%</p>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#7B3FF2]"
                  initial={{ width: '0%' }}
                  animate={phase >= 2 ? { width: '87%' } : { width: '0%' }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                />
              </div>
            </motion.div>

            <motion.div 
              className="bg-[#1A1135] border border-[#3D257A] rounded-[20px] p-5 text-center"
              initial={{ opacity: 0, y: 50 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            >
              <p className="text-xs text-white/60 mb-1">Behavior Tracking</p>
              <p className="text-xl font-bold text-[#10B981]">+3 Positive</p>
            </motion.div>
          </div>
        </PhoneMockup>
      </div>
    </motion.div>
  );
}
