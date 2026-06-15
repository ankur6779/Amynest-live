import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PatentPendingPill } from "@/components/marketing/patent-pending-pill";
import { AUTOPLAY_MS, PHONE_SHOWCASE_SLIDES } from "./constants";
import "./horizontal-showcase.css";

function usePreloadScreenshots() {
  useEffect(() => {
    PHONE_SHOWCASE_SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.screenshot;
    });
  }, []);
}

function SyncedContent({ index }: { index: number }) {
  const slide = PHONE_SHOWCASE_SLIDES[index];

  return (
    <div className="ps-content-inner">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="ps-eyebrow">{slide.eyebrow}</p>
          <h3 className="ps-headline font-quicksand">{slide.headline}</h3>
          <p className="ps-description">{slide.description}</p>
          <ul className="ps-bullets">
            {slide.bullets.map((bullet, i) => (
              <motion.li
                key={bullet}
                className="ps-bullet"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.4 }}
              >
                <span className="ps-bullet-check">✓</span>
                {bullet}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PhoneScreen({ index }: { index: number }) {
  const slide = PHONE_SHOWCASE_SLIDES[index];

  return (
    <div className="ps-screen">
      <AnimatePresence mode="wait">
        <motion.img
          key={slide.id}
          src={slide.screenshot}
          alt={slide.headline}
          className="ps-screen-img"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          initial={{ opacity: 0, y: 48, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -48, scale: 1.03 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        />
      </AnimatePresence>
    </div>
  );
}

function ShowcaseControls({
  index,
  paused,
  onPrev,
  onNext,
  onDot,
}: {
  index: number;
  paused: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
}) {
  return (
    <div className="ps-controls">
      <button type="button" className="ps-nav-btn" onClick={onPrev} aria-label="Previous screen">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="ps-dots" role="tablist" aria-label="Product demo slides">
        {PHONE_SHOWCASE_SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to ${slide.headline}`}
            className={`ps-dot ${i === index ? "active" : ""}`}
            onClick={() => onDot(i)}
          />
        ))}
      </div>
      <button type="button" className="ps-nav-btn" onClick={onNext} aria-label="Next screen">
        <ChevronRight className="h-5 w-5" />
      </button>
      {paused ? (
        <span className="sr-only">Autoplay paused</span>
      ) : null}
    </div>
  );
}

export function SeeAmyNestInActionSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  usePreloadScreenshots();

  const slide = PHONE_SHOWCASE_SLIDES[index];
  const total = PHONE_SHOWCASE_SLIDES.length;

  const goTo = useCallback((next: number) => {
    setIndex(((next % total) + total) % total);
  }, [total]);

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, total]);

  return (
    <section
      id="see-amynest-in-action"
      className="ps-section relative z-10"
      aria-label="See AmyNest in action"
      aria-roledescription="carousel"
    >
      <div
        className="ps-glow"
        style={{
          width: 500,
          height: 500,
          top: "10%",
          right: "5%",
          background: slide.glow,
        }}
        aria-hidden
      />

      <div className="px-4 pb-6 pt-16 text-center md:pt-20">
        <motion.p
          className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-purple-300/80"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Product tour
        </motion.p>
        <motion.h2
          className="font-quicksand text-3xl font-black sm:text-4xl md:text-5xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
        >
          See AmyNest In Action
        </motion.h2>
        <motion.p
          className="mx-auto mt-4 max-w-2xl text-base text-white/65 sm:text-lg"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Everything your family needs, powered by Amy AI.
        </motion.p>
        <motion.div
          className="mt-4 flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          <PatentPendingPill className="text-[11px] normal-case tracking-normal px-3 py-1.5" />
        </motion.div>
      </div>

      <div className="ps-layout">
        <div className="ps-content">
          <SyncedContent index={index} />
        </div>

        <div
          className="ps-phone-wrap"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            className="ps-phone-glow"
            style={{ background: slide.glow }}
            aria-hidden
          />
          <motion.div
            className="ps-iphone"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="ps-iphone-notch" />
            <PhoneScreen index={index} />
          </motion.div>
          <ShowcaseControls
            index={index}
            paused={paused}
            onPrev={goPrev}
            onNext={goNext}
            onDot={goTo}
          />
        </div>
      </div>
    </section>
  );
}
