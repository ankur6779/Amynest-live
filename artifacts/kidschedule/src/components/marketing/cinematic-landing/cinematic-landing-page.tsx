import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "wouter";
import { BrandLogo } from "@/components/brand-logo";
import {
  AskAmySection,
  AudioLessonsSection,
  DashboardSection,
  FamilyGoalsSection,
  FinalCtaSection,
  GamingHubSection,
  HealthSection,
  HeroSection,
  LearningZoneSection,
  MeetAmySection,
  ParentingHubSection,
  StatsSection,
  TestimonialsSection,
} from "./sections";
import "./cinematic-landing.css";

gsap.registerPlugin(ScrollTrigger);

function CinematicNav() {
  return (
    <header className="cl-nav-blur fixed inset-x-0 top-0 z-50 px-5 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size="sm" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <a href="#dashboard" className="transition hover:text-white">
            Features
          </a>
          <Link href="/pricing" className="transition hover:text-white">
            Pricing
          </Link>
          <Link href="/sign-up" className="cl-cta-primary rounded-full px-5 py-2 text-sm font-semibold text-white">
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function CinematicFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <BrandLogo size="md" />
          <p className="text-center text-sm text-white/50 sm:text-right">
            AI-powered parenting for families with children aged 0–16.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/60 sm:justify-start">
          <a href="#dashboard" className="hover:text-white">
            Features
          </a>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-white">
            About
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/support" className="hover:text-white">
            Support
          </Link>
          <Link href="/support" className="hover:text-white">
            Contact
          </Link>
        </div>
        <div className="mt-8 space-y-1 text-center text-xs text-white/35 sm:text-left">
          <p>AmyNest AI is a product of AmyWorld.</p>
          <p>Developed and operated by AmyWorld.</p>
          <p>© {new Date().getFullYear()} AmyNest AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function useCinematicScrollAnimations(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const parallaxPhone = root.querySelector("[data-parallax-phone]");
      if (parallaxPhone) {
        gsap.to(parallaxPhone, {
          y: -80,
          ease: "none",
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      }

      const scenePhone = root.querySelector("[data-scene-phone]");
      if (scenePhone) {
        gsap.fromTo(
          scenePhone,
          { y: 120, scale: 0.9 },
          {
            y: 0,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: "#meet-amy",
              start: "top 70%",
              end: "center center",
              scrub: 1,
            },
          },
        );
      }

      root.querySelectorAll("[data-slide-right]").forEach((el) => {
        gsap.fromTo(
          el,
          { x: 120, opacity: 0.4 },
          {
            x: 0,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 75%",
              end: "center center",
              scrub: 1,
            },
          },
        );
      });

      const horizontalReveal = root.querySelector("[data-horizontal-reveal]");
      if (horizontalReveal) {
        gsap.fromTo(
          horizontalReveal.children,
          { x: -60, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            stagger: 0.08,
            ease: "power2.out",
            scrollTrigger: {
              trigger: horizontalReveal,
              start: "top 70%",
              end: "bottom 40%",
              scrub: 1,
            },
          },
        );
      }

      const glowBurst = root.querySelector("[data-glow-burst]");
      if (glowBurst) {
        gsap.fromTo(
          glowBurst,
          { scale: 0.95, opacity: 0.6 },
          {
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: glowBurst,
              start: "top 80%",
              end: "center center",
              scrub: 1,
            },
          },
        );
      }
    }, root);

    return () => ctx.revert();
  }, [rootRef]);
}

export function CinematicLandingPage() {
  const rootRef = useRef<HTMLElement>(null);

  useCinematicScrollAnimations(rootRef);

  const scrollToMeetAmy = () => {
    document.getElementById("meet-amy")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="cinematic-landing min-h-screen">
      <div className="cl-grain" aria-hidden />
      <CinematicNav />
      <main ref={rootRef}>
        <HeroSection onWatchDemo={scrollToMeetAmy} />
        <MeetAmySection />
        <DashboardSection />
        <ParentingHubSection />
        <GamingHubSection />
        <LearningZoneSection />
        <AudioLessonsSection />
        <HealthSection />
        <FamilyGoalsSection />
        <AskAmySection />
        <StatsSection />
        <TestimonialsSection />
        <FinalCtaSection />
      </main>
      <CinematicFooter />
    </div>
  );
}
