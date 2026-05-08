import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const LETTER_COLORS = [
  '#FF6B6B', // A - coral red
  '#FF9F43', // m - orange
  '#F9CA24', // y - yellow
  '#6AB04C', // N - green
  '#48DBFB', // e - cyan
  '#A29BFE', // s - lavender
  '#FD79A8', // t - pink
];

function ColorLogo() {
  return (
    <div className="flex items-end justify-center" style={{ fontFamily: 'var(--font-display)', lineHeight: 1 }}>
      {'AmyNest'.split('').map((char, i) => (
        <motion.span
          key={i}
          style={{
            color: LETTER_COLORS[i],
            display: 'inline-block',
            fontSize: 'clamp(2.2rem, 11vw, 4rem)',
            fontWeight: 900,
            letterSpacing: '-0.01em',
            textShadow: `0 0 20px ${LETTER_COLORS[i]}88, 0 0 40px ${LETTER_COLORS[i]}44`,
          }}
          initial={{ opacity: 0, y: 24, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
        >
          {char}
        </motion.span>
      ))}
      {/* Sparkle */}
      <motion.span
        style={{ color: '#48DBFB', fontSize: 'clamp(1rem, 5vw, 1.8rem)', marginBottom: '0.5em', marginLeft: '2px' }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: [1, 1.3, 1] }}
        transition={{ duration: 0.6, delay: 0.4, type: 'spring', stiffness: 400 }}
      >
        ✦
      </motion.span>
      {/* AI Badge */}
      <motion.span
        style={{
          background: 'linear-gradient(135deg, #4361EE, #3A0CA3)',
          color: '#fff',
          fontSize: 'clamp(0.9rem, 4.5vw, 1.6rem)',
          fontWeight: 800,
          padding: '0.12em 0.45em',
          borderRadius: '0.35em',
          marginLeft: '6px',
          marginBottom: '0.15em',
          letterSpacing: '0.02em',
          boxShadow: '0 0 18px rgba(67,97,238,0.7)',
        }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        AI
      </motion.span>
    </div>
  );
}

function NeonRing({ show }: { show: boolean }) {
  return (
    <motion.div
      className="absolute"
      style={{
        width: '68%',
        aspectRatio: '1/1',
        borderRadius: '50%',
        padding: '4px',
        background: 'conic-gradient(from 0deg, #9333EA, #EC4899, #06B6D4, #9333EA)',
        filter: 'drop-shadow(0 0 18px rgba(147,51,234,0.9)) drop-shadow(0 0 40px rgba(236,72,153,0.6))',
      }}
      initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
      animate={show ? { opacity: 1, scale: 1, rotate: 360 } : { opacity: 0, scale: 0.6 }}
      transition={show ? {
        opacity: { duration: 1, ease: 'easeOut' },
        scale: { duration: 1.2, type: 'spring', bounce: 0.25 },
        rotate: { duration: 18, repeat: Infinity, ease: 'linear' },
      } : { duration: 0.3 }}
    >
      <div className="w-full h-full rounded-full bg-[#08081e]" />
      {/* Breathing glow */}
      <motion.div
        className="absolute inset-[-8px] rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, rgba(147,51,234,0.4), rgba(236,72,153,0.4), rgba(6,182,212,0.4), rgba(147,51,234,0.4))',
          filter: 'blur(12px)',
        }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function BottomWaves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[28%] overflow-hidden pointer-events-none">
      {[
        { color: 'rgba(147,51,234,0.35)', delay: 0, yOffset: '60%' },
        { color: 'rgba(236,72,153,0.25)', delay: 0.6, yOffset: '70%' },
        { color: 'rgba(6,182,212,0.2)', delay: 1.2, yOffset: '80%' },
      ].map((wave, i) => (
        <motion.div
          key={i}
          className="absolute left-[-20%] right-[-20%]"
          style={{
            height: '120px',
            top: wave.yOffset,
            borderRadius: '50%',
            border: `1px solid ${wave.color}`,
            filter: 'blur(3px)',
          }}
          animate={{ scaleX: [1, 1.1, 0.95, 1], y: [0, -8, 4, 0], opacity: [0.6, 1, 0.7, 0.6] }}
          transition={{ duration: 4 + i, delay: wave.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '60%',
          background: 'linear-gradient(to top, rgba(60,0,120,0.4) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

function LoadingDots({ show }: { show: boolean }) {
  const dotColors = ['#9333EA', '#EC4899', '#A855F7', '#06B6D4'];
  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex gap-2.5 justify-center">
        {dotColors.map((color, i) => (
          <motion.div
            key={i}
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 10px ${color}`,
            }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(0.65rem, 3.2vw, 1rem)',
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.01em',
        textAlign: 'center',
      }}>
        Personalizing your parenting experience...
      </p>
    </motion.div>
  );
}

export function SplashScene() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 60),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center overflow-hidden"
      style={{ background: '#06061C' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: 'blur(16px)' }}
      transition={{ duration: 0.9 }}
    >
      {/* Nebula background */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 0.75, scale: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/nebula-bg.png`}
          className="w-full h-full object-cover"
          alt=""
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,6,28,0.3) 0%, rgba(6,6,28,0.0) 40%, rgba(6,6,28,0.6) 100%)' }} />
      </motion.div>

      {/* Ambient purple glow top-center */}
      <motion.div
        className="absolute top-[-5%] left-[10%] right-[10%]"
        style={{
          height: '35%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(120,40,220,0.3) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating star particles */}
      {phase >= 1 && [...Array(20)].map((_, i) => {
        const x = 5 + (i * 47 % 90);
        const y = 5 + (i * 31 % 85);
        const size = 1 + (i % 3) * 0.8;
        return (
          <motion.div
            key={`p-${i}`}
            className="absolute rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px` }}
            animate={{ opacity: [0, 0.7 + (i % 3) * 0.1, 0], scale: [0.5, 1.5, 0.5] }}
            transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: (i * 0.3) % 3, ease: 'easeInOut' }}
          />
        );
      })}

      {/* Main content — camera push-in */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center"
        animate={{ scale: [1, 1.045] }}
        transition={{ duration: 7, ease: 'linear' }}
      >
        {/* Mascot + Ring — top 52% of screen */}
        <div className="relative flex items-center justify-center" style={{ width: '100%', height: '52%', marginTop: '8%' }}>
          <NeonRing show={phase >= 1} />

          {/* Mascot image */}
          <motion.div
            className="relative z-10"
            style={{ width: '52%', aspectRatio: '1/1' }}
            initial={{ opacity: 0, y: 28, scale: 0.75 }}
            animate={phase >= 1 ? {
              opacity: 1,
              y: [0, -10, 0],
              scale: 1,
            } : { opacity: 0, y: 28, scale: 0.75 }}
            transition={phase >= 1 ? {
              opacity: { duration: 0.9 },
              scale: { type: 'spring', bounce: 0.3, duration: 1.2 },
              y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 },
            } : { duration: 0.3 }}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/mascot.png`}
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 22px rgba(147,51,234,0.6)) drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
              alt="Amy AI"
            />
          </motion.div>
        </div>

        {/* Logo + Tagline */}
        <div className="flex flex-col items-center gap-3 z-20 px-5" style={{ marginTop: '4%' }}>
          {/* Light sweep wrapper */}
          <div className="relative overflow-hidden rounded-lg">
            <ColorLogo />
            {/* Cinematic sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
                width: '60%',
              }}
              initial={{ left: '-80%' }}
              animate={phase >= 3 ? { left: '160%' } : { left: '-80%' }}
              transition={{ duration: 1.1, delay: 0.3, ease: 'easeInOut' }}
            />
          </div>

          {/* Tagline */}
          <motion.p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.55rem, 2.8vw, 0.9rem)',
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.22em',
              fontWeight: 500,
              textAlign: 'center',
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.9, delay: 0.4, ease: 'easeOut' }}
          >
            WHERE SMART PARENTING STARTS
          </motion.p>
        </div>

        {/* Loading section */}
        <div className="absolute bottom-[8%] w-full flex flex-col items-center">
          <LoadingDots show={phase >= 4} />
        </div>
      </motion.div>

      {/* Neon wave flows at bottom */}
      <BottomWaves />
    </motion.div>
  );
}
