import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { SHOWCASE_SCENES } from "./constants";
import {
  MobileShowcaseCard,
  ShowcaseFinalPanel,
  ShowcasePanel,
} from "./showcase-panel";
import "./horizontal-showcase.css";
import "../cinematic-landing/cinematic-landing.css";

gsap.registerPlugin(ScrollTrigger);

function useHorizontalScroll(pinRef: RefObject<HTMLDivElement | null>, trackRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!pin || !track) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (prefersReduced || isMobile) return;

    const ctx = gsap.context(() => {
      const getScrollDistance = () => Math.max(track.scrollWidth - window.innerWidth, 0);

      gsap.to(track, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          pin: true,
          scrub: 1,
          start: "top top",
          end: () => `+=${getScrollDistance()}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    }, pin);

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, [pinRef, trackRef]);
}

export function SeeAmyNestInActionSection() {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useHorizontalScroll(pinRef, trackRef);

  return (
    <section id="see-amynest-in-action" className="hs-section relative z-10" aria-label="See AmyNest in action">
      <div className="px-4 pb-10 pt-16 text-center md:pt-20">
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
          One AI companion for every stage of parenting.
        </motion.p>
      </div>

      {/* Desktop / tablet: vertical scroll drives horizontal movement */}
      <div ref={pinRef} className="hs-pin hidden md:block">
        <div className="hs-sticky">
          <div ref={trackRef} className="hs-track hs-track-desktop">
            {SHOWCASE_SCENES.map((scene) => (
              <ShowcasePanel key={scene.id} scene={scene} />
            ))}
            <ShowcaseFinalPanel />
          </div>
        </div>
      </div>

      {/* Mobile: native horizontal snap scroll */}
      <div className="hs-mobile-scroll md:hidden">
        {SHOWCASE_SCENES.map((scene) => (
          <MobileShowcaseCard key={scene.id} scene={scene} />
        ))}
        <div className="hs-mobile-panel hs-accent-purple flex min-h-[320px] flex-col items-center justify-center text-center">
          <p className="text-xl font-bold">Everything Your Family Needs.</p>
          <p className="mt-2 text-sm text-white/65">One app. Every age. Every milestone.</p>
          <a
            href="/sign-up"
            className="mt-6 rounded-full px-6 py-3 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #e022ff)" }}
          >
            Start Free
          </a>
        </div>
      </div>
    </section>
  );
}
