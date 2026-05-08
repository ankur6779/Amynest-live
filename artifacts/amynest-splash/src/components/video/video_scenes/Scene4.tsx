import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PhoneMockup } from '../PhoneMockup';

const meals = [
  { name: 'Oats Porridge', type: 'Breakfast' },
  { name: 'Dal Chawal', type: 'Lunch' },
  { name: 'Banana+Milk', type: 'Snack' },
  { name: 'Roti+Sabzi', type: 'Dinner' },
];

export function Scene4() {
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
      exit={{ opacity: 0, scale: 1.1 }}
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
          Nutrition
        </motion.h2>
        <motion.p 
          className="text-xl text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Age-appropriate meal plans and tracking.
        </motion.p>
      </div>

      <div className="absolute right-[15%]">
        <PhoneMockup>
          <div className="p-4 flex flex-col mt-4">
            <motion.div 
              className="flex justify-between items-center bg-[#1A1135] p-4 rounded-[20px] mb-6 border border-[#3D257A]"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm font-semibold">Daily Score</p>
              <p className="text-2xl font-bold text-[#FF4ECD]">78<span className="text-white/50 text-sm">/100</span></p>
            </motion.div>

            <div className="w-full grid grid-cols-2 gap-3">
              {meals.map((meal, i) => (
                <motion.div
                  key={i}
                  className="aspect-square bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-end relative overflow-hidden"
                  initial={{ opacity: 0, scale: 0.8, rotate: Math.random() * 10 - 5 }}
                  animate={phase >= 1 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.1 + 0.4, type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <p className="text-[10px] text-[#7B3FF2] font-bold relative z-10">{meal.type}</p>
                  <h3 className="text-sm font-semibold relative z-10 leading-tight">{meal.name}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </PhoneMockup>
      </div>
    </motion.div>
  );
}
