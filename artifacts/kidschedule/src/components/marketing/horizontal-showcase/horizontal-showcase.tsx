import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AUTOPLAY_MS, PHONE_SHOWCASE_SLIDES } from "./constants";
import {
  showcaseScreenshotSources,
  useShowcasePerformance,
} from "./showcase-performance";
import "./horizontal-showcase.css";

function usePreloadScreenshots(lite: boolean) {
  useEffect(() => {
    PHONE_SHOWCASE_SLIDES.forEach((slide) => {
      const { src, fallback } = showcaseScreenshotSources(slide.screenshot, lite);
      const img = new Image();
      img.src = src;
      const fb = new Image();
      fb.src = fallback;
    });
  }, [lite]);
}

function SyncedContent({
  index,
  animate,
}: {
  index: number;
  animate: boolean;
}) {
  const slide = PHONE_SHOWCASE_SLIDES[index];

  if (!animate) {
    return (
      <div className="ps-content-inner">
        <p className="ps-eyebrow">{slide.eyebrow}</p>
        <h3 className="ps-headline font-quicksand">{slide.headline}</h3>
        <p className="ps-description">{slide.description}</p>
        <ul className="ps-bullets">
          {slide.bullets.map((bullet) => (
            <li key={bullet} className="ps-bullet">
              <span className="ps-bullet-check">✓</span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="ps-content-inner">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <p className="ps-eyebrow">{slide.eyebrow}</p>
          <h3 className="ps-headline font-quicksand">{slide.headline}</h3>
          <p className="ps-description">{slide.description}</p>
          <ul className="ps-bullets">
            {slide.bullets.map((bullet) => (
              <li key={bullet} className="ps-bullet">
                <span className="ps-bullet-check">✓</span>
                {bullet}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PhoneScreen({
  index,
  lite,
  animate,
}: {
  index: number;
  lite: boolean;
  animate: boolean;
}) {
  const slide = PHONE_SHOWCASE_SLIDES[index];
  const sources = showcaseScreenshotSources(slide.screenshot, lite);

  const picture = (
    <picture>
      <source type="image/webp" srcSet={sources.srcSet} sizes={sources.sizes} />
      <img
        src={sources.fallback}
        alt={slide.headline}
        className="ps-screen-img"
        loading={index === 0 ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={index === 0 ? "high" : "auto"}
        width={450}
        height={975}
      />
    </picture>
  );

  if (!animate) {
    return <div className="ps-screen">{picture}</div>;
  }

  return (
    <div className="ps-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          className="ps-screen-frame"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {picture}
        </motion.div>
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
      {paused ? <span className="sr-only">Autoplay paused</span> : null}
    </div>
  );
}

export function SeeAmyNestInActionSection() {
  const { lite, reducedMotion } = useShowcasePerformance();
  const animate = !lite && !reducedMotion;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  usePreloadScreenshots(lite);

  const slide = PHONE_SHOWCASE_SLIDES[index];
  const total = PHONE_SHOWCASE_SLIDES.length;

  const goTo = useCallback((next: number) => {
    setIndex(((next % total) + total) % total);
  }, [total]);

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || reducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, reducedMotion, total]);

  return (
    <section
      id="see-amynest-in-action"
      className={`ps-section relative z-10${lite ? " ps-lite" : ""}${reducedMotion ? " ps-reduced-motion" : ""}`}
      aria-label="See AmyNest in action"
      aria-roledescription="carousel"
    >
      <div
        className="ps-glow"
        style={{ background: slide.glow }}
        aria-hidden
      />

      <div className="px-4 pb-6 pt-16 text-center md:pt-20">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-purple-300/80">
          Product tour
        </p>
        <h2 className="font-quicksand text-3xl font-black sm:text-4xl md:text-5xl">
          See AmyNest In Action
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/65 sm:text-lg">
          Everything your family needs, powered by Amy AI.
        </p>
      </div>

      <div className="ps-layout">
        <div className="ps-content">
          <SyncedContent index={index} animate={animate} />
        </div>

        <div
          className="ps-phone-wrap"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="ps-iphone">
            <div className="ps-iphone-notch" />
            <PhoneScreen index={index} lite={lite} animate={animate} />
          </div>
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
