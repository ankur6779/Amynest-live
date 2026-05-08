import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PhoneMockup } from '../PhoneMockup';

const schedule = [
  { time: '7:00 AM', title: 'Wake-up', now: false },
  { time: '7:30 AM', title: 'Breakfast', now: true },
  { time: '8:00 AM', title: 'School Prep', now: false },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center p-8"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, y: -50 }}
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
          Smart Routines
        </motion.h2>
        <motion.p 
          className="text-xl text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Visual schedules that grow with your child.
        </motion.p>
      </div>

      <div className="absolute left-[15%]">
        <PhoneMockup>
          <div className="p-4 flex flex-col mt-4 gap-4">
            {schedule.map((item, i) => (
              <motion.div
                key={i}
                className={`w-full p-4 rounded-[20px] flex items-center justify-between ${item.now ? 'bg-[#7B3FF2] border-2 border-[#FF4ECD]' : 'bg-white/5 border border-white/10'}`}
                initial={{ opacity: 0, x: -50 }}
                animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div>
                  <p className={`text-xs font-bold mb-1 ${item.now ? 'text-[#FF4ECD]' : 'text-[#7B3FF2]'}`}>{item.time}</p>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                </div>
                {item.now && (
                  <motion.div 
                    className="px-2 py-1 bg-[#FF4ECD] text-white text-[10px] font-bold rounded-full"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    NOW
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </PhoneMockup>
      </div>
    </motion.div>
  );
}
