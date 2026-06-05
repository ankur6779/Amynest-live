import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/geo";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";

export type StoreTarget = "android" | "ios";

export function detectStoreTarget(): StoreTarget {
  if (typeof navigator === "undefined") return "android";
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) ? "ios" : "android";
}

function storeMeta(target: StoreTarget) {
  if (target === "ios") {
    return {
      href: APP_STORE_URL,
      label: "App Store",
      eyebrow: "Download on the",
      testId: "marketing-app-store",
    };
  }
  return {
    href: PLAY_STORE_URL,
    label: "Google Play",
    eyebrow: "Get it on",
    testId: "marketing-google-play",
  };
}

function StoreIcon({ target, className }: { target: StoreTarget; className: string }) {
  if (target === "ios") {
    return (
      <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3.18 23.76c.3.17.65.19.97.06l12.14-7.01-2.66-2.67-10.45 9.62z" fill="#EA4335" />
      <path d="M22.47 10.3L19.7 8.72l-3.03 2.96 3.03 3.04 2.79-1.61c.8-.46.8-1.75-.02-2.81z" fill="#FBBC04" />
      <path d="M3.18.24C2.88.4 2.69.72 2.69 1.12v21.76l10.7-10.7L3.18.24z" fill="#4285F4" />
      <path d="M16.29 8.28L3.18.24C2.86.07 2.51.09 2.18.26l10.99 10.82 3.12-2.8z" fill="#34A853" />
    </svg>
  );
}

export function StoreDownloadButton({
  target,
  location,
  page,
  size = "default",
}: {
  target: StoreTarget;
  location: string;
  page: string;
  size?: "default" | "large";
}) {
  const store = storeMeta(target);
  const pad = size === "large" ? "px-7 py-4" : "px-5 py-3";

  return (
    <a
      href={store.href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={store.testId}
      onClick={() => {
        trackMarketingEvent("install_intent", { store: target, location, page });
        trackMarketingEvent("store_button_click", { store: target, location, page });
      }}
      className={`inline-flex items-center gap-3 ${pad} rounded-2xl transition-all hover:scale-[1.02]`}
      style={{
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        textDecoration: "none",
      }}
    >
      <StoreIcon target={target} className={`${size === "large" ? "h-8 w-8" : "h-7 w-7"} shrink-0 text-white`} />
      <span className="text-left">
        <span className="block text-xs text-white/55">{store.eyebrow}</span>
        <span className="block text-base font-semibold text-white">{store.label}</span>
      </span>
    </a>
  );
}

export function StoreDownloadRow({
  location,
  page,
}: {
  location: string;
  page: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <StoreDownloadButton target="android" location={`${location}_android`} page={page} />
      <StoreDownloadButton target="ios" location={`${location}_ios`} page={page} />
    </div>
  );
}
