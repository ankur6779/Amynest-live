import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export function PhoneMockup({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div 
      className={`relative w-[320px] h-[650px] bg-[#0D0820] rounded-[50px] border-[10px] border-[#2A1B54] shadow-2xl overflow-hidden flex flex-col ${className}`}
      style={{ boxShadow: '0 25px 50px -12px rgba(123, 63, 242, 0.5), inset 0 0 20px rgba(0,0,0,0.5)' }}
      initial={{ y: 50, rotateX: 10, rotateY: -10 }}
      animate={{ y: [0, -10, 0], rotateX: [10, 15, 10], rotateY: [-10, -5, -10] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Notch */}
      <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50">
        <div className="w-32 h-6 bg-[#2A1B54] rounded-b-2xl"></div>
      </div>
      
      {/* Screen Content */}
      <div className="flex-1 w-full h-full relative mt-6 bg-gradient-to-b from-[#1A1135] to-[#0D0820]">
        {children}
      </div>
    </motion.div>
  );
}
