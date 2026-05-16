import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getApiUrl, resolveApiMediaUrl } from "@/lib/api";
interface Video {
  id: string;
  name: string;
  mimeType: string;
  streamUrl: string;
}
interface ApiResponse {
  videos: Video[];
  total: number;
  offset: number;
  nextOffset: number | null;
}
async function fetchBatch(offset: number): Promise<ApiResponse> {
  const res = await fetch(getApiUrl(`/api/reels/videos?offset=${offset}&batch=6`));
  if (!res.ok) {
    try {
      const body = await res.json();
      throw new Error(body.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(`HTTP ${res.status}`);
    }
  }
  return res.json();
}
function driveThumbnail(id: string) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w480`;
}
function displayName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
}

// ─── Spinner ───────────────────────────────────────────────────────────────

function AcSpinner({
  size = 32
}: {
  size?: number;
}) {
  return <div style={{
    width: size,
    height: size,
    borderRadius: "50%",
    border: `3px solid rgba(255,255,255,0.15)`,
    borderTopColor: "#fff",
    animation: "ac-spin 0.7s linear infinite"
  }} />;
}

// ─── Single reel card (inside the overlay) ─────────────────────────────────

function ReelCard({
  video,
  isActive,
  muted,
  onToggleMute
}: {
  video: Video;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const {
    t
  } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const title = displayName(video.name);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (isActive) {
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [isActive, muted]);
  return <div style={{
    position: "relative",
    width: "100%",
    height: "100%",
    background: "#000",
    scrollSnapAlign: "start",
    flexShrink: 0,
    overflow: "hidden"
  }}>
      {/* Loading spinner */}
      {!loaded && !hasError && <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2
    }}>
          <AcSpinner />
        </div>}

      {/* Error state */}
      {hasError && <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      zIndex: 2
    }}>
          <span style={{
        fontSize: 36,
        opacity: 0.4
      }}>⚠</span>
          <p style={{
        color: "#fff",
        opacity: 0.55,
        fontSize: 13,
        textAlign: "center",
        maxWidth: 200
      }}>
            {t("components.art_craft_reels.video_unavailable")}
          </p>
        </div>}

      <video ref={videoRef} src={resolveApiMediaUrl(video.streamUrl)} muted={muted} loop playsInline preload="metadata" onCanPlay={() => setLoaded(true)} onError={() => {
      setHasError(true);
      setLoaded(true);
    }} style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "contain",
      display: hasError ? "none" : "block"
    }} />

      {/* Bottom title + mute */}
      <div style={{
      position: "absolute",
      inset: 0,
      background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 45%, transparent 75%)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      padding: "16px 14px",
      pointerEvents: "none",
      zIndex: 10
    }}>
        <p style={{
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.4,
        textShadow: "0 1px 6px rgba(0,0,0,0.9)",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        flex: 1,
        paddingRight: 10,
        margin: 0
      }}>
          {title}
        </p>
        <button onClick={onToggleMute} style={{
        pointerEvents: "auto",
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "50%",
        width: 38,
        height: 38,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
        color: "#fff",
        flexShrink: 0
      }}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Swipe hint (subtle) */}
      <div style={{
      position: "absolute",
      top: 14,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: 10
    }}>
        <span style={{
        color: "rgba(255,255,255,0.4)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 0.5
      }}>
          {t("components.art_craft_reels.swipe_up_down")}
        </span>
      </div>
    </div>;
}

// ─── Fullscreen overlay player ──────────────────────────────────────────────

function ReelOverlay({
  videos,
  initialIndex,
  onClose,
  onLoadMore,
  loadingMore,
  hasMore
}: {
  videos: Video[];
  initialIndex: number;
  onClose: () => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
}) {
  const {
    t
  } = useTranslation();
  const feedRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const toggleMute = useCallback(() => setMuted(m => !m), []);

  // Scroll to initial index immediately on open
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTop = initialIndex * feed.clientHeight;
  }, [initialIndex]);

  // Intersection observer to track active video
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = parseInt((entry.target as HTMLElement).dataset["index"] ?? "0", 10);
          setActiveIndex(idx);
        }
      });
    }, {
      root: feed,
      threshold: 0.6
    });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const obs = observerRef.current;
    if (!obs) return;
    reelRefs.current.forEach(el => {
      if (el) obs.observe(el);
    });
    return () => {
      reelRefs.current.forEach(el => {
        if (el) obs.unobserve(el);
      });
    };
  }, [videos.length]);

  // Load more near end
  useEffect(() => {
    if (hasMore && activeIndex >= videos.length - 2) onLoadMore();
  }, [activeIndex, videos.length, hasMore, onLoadMore]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        const next = reelRefs.current[activeIndex + 1];
        next?.scrollIntoView({
          behavior: "smooth"
        });
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        const prev = reelRefs.current[activeIndex - 1];
        prev?.scrollIntoView({
          behavior: "smooth"
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, onClose]);
  return <div style={{
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "#000",
    display: "flex",
    flexDirection: "column"
  }}>
      {/* Feed */}
      <div ref={feedRef} style={{
      flex: 1,
      overflowY: "scroll",
      scrollSnapType: "y mandatory",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    }}>
        {videos.map((video, i) => <div key={video.id} data-index={i} ref={el => {
        reelRefs.current[i] = el;
      }} style={{
        height: "100vh",
        scrollSnapAlign: "start",
        flexShrink: 0
      }}>
            <ReelCard video={video} isActive={i === activeIndex} muted={muted} onToggleMute={toggleMute} />
          </div>)}

        {loadingMore && <div style={{
        height: "30vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12
      }}>
            <AcSpinner size={28} />
            <p style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 12,
          margin: 0
        }}>
              {t("components.art_craft_reels.loading_more_videos")}
            </p>
          </div>}

        {!hasMore && videos.length > 0 && <div style={{
        height: "40vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }}>
            <p style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
          margin: 0
        }}>
              {t("components.art_craft_reels.you_ve_seen_all")} {videos.length} {t("components.art_craft_reels.videos")}
            </p>
          </div>}
      </div>

      {/* Close button — top-left */}
      <button onClick={onClose} style={{
      position: "fixed",
      top: 14,
      left: 14,
      zIndex: 10000,
      width: 38,
      height: 38,
      borderRadius: "50%",
      background: "rgba(0,0,0,0.6)",
      border: "1px solid rgba(255,255,255,0.2)",
      color: "#fff",
      fontSize: 18,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(8px)"
    }} title={t("components.art_craft_reels.close_esc")}>
        ✕
      </button>

      {/* Counter — top-right */}
      <div style={{
      position: "fixed",
      top: 18,
      right: 14,
      zIndex: 10000,
      background: "rgba(0,0,0,0.5)",
      borderRadius: 20,
      padding: "5px 12px",
      backdropFilter: "blur(8px)"
    }}>
        <span style={{
        color: "#fff",
        fontSize: 12,
        fontWeight: 600
      }}>
          {activeIndex + 1} / {videos.length}
        </span>
      </div>
    </div>;
}

// ─── Thumbnail grid card ────────────────────────────────────────────────────

function ThumbnailCard({
  video,
  onPlay
}: {
  video: Video;
  onPlay: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const title = displayName(video.name);
  return <button onClick={onPlay} style={{
    all: "unset",
    cursor: "pointer",
    borderRadius: 12,
    overflow: "hidden",
    background: "#1a1a1a",
    aspectRatio: "16/9",
    position: "relative",
    display: "block",
    width: "100%",
    border: "1px solid rgba(255,255,255,0.08)",
    transition: "transform 0.15s, box-shadow 0.15s"
  }} onMouseEnter={e => {
    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)";
  }} onMouseLeave={e => {
    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
  }}>
      {/* Thumbnail */}
      {!imgFailed ? <img src={driveThumbnail(video.id)} alt={title} onError={() => setImgFailed(true)} style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }} /> : <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 32
    }}>🎬</div>}

      {/* Dark overlay */}
      <div style={{
      position: "absolute",
      inset: 0,
      background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 80%)"
    }} />

      {/* Play circle */}
      <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
        <div style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.6)",
        border: "1.5px solid rgba(255,255,255,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
          <span style={{
          color: "#fff",
          fontSize: 14,
          marginLeft: 2
        }}>▶</span>
        </div>
      </div>

      {/* Title */}
      <p style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      margin: 0,
      padding: "6px 8px",
      color: "#fff",
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1.3,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      textShadow: "0 1px 4px rgba(0,0,0,0.9)"
    }}>
        {title}
      </p>
    </button>;
}

// ─── Main exported component ────────────────────────────────────────────────

export function ArtCraftReels() {
  const {
    t
  } = useTranslation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);
  const loadMore = useCallback(async (currentOffset: number, isInitial = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isInitial) setLoading(true);else setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchBatch(currentOffset);
      setVideos(prev => {
        const seen = new Set(prev.map(v => v.id));
        return [...prev, ...data.videos.filter(v => !seen.has(v.id))];
      });
      setHasMore(data.nextOffset !== null);
      setOffset(data.nextOffset ?? currentOffset);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadMore(0, true);
  }, [loadMore]);
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingRef.current) loadMore(offset);
  }, [hasMore, offset, loadMore]);

  // Lock body scroll while overlay is open
  useEffect(() => {
    if (overlayIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [overlayIndex]);

  // Loading state
  if (loading) {
    return <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: "32px 0"
    }}>
        <AcSpinner />
        <p style={{
        color: "var(--muted-foreground, #888)",
        fontSize: 13,
        margin: 0
      }}>
          {t("components.art_craft_reels.loading_videos")}
        </p>
      </div>;
  }

  // Full error (no videos)
  if (error && videos.length === 0) {
    return <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: "32px 0",
      textAlign: "center"
    }}>
        <span style={{
        fontSize: 40
      }}>🎬</span>
        <p style={{
        color: "var(--muted-foreground, #888)",
        fontSize: 13,
        margin: 0
      }}>
          {t("components.art_craft_reels.couldn_t_load_videos")} {error}
        </p>
        <button onClick={() => {
        initializedRef.current = false;
        loadMore(0, true);
      }} style={{
        background: "var(--primary, hsl(var(--brand-violet-600)))",
        color: "#fff",
        border: "none",
        borderRadius: 24,
        padding: "8px 24px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }}>
          {t("components.art_craft_reels.try_again")}
        </button>
      </div>;
  }
  if (videos.length === 0) {
    return <p style={{
      color: "var(--muted-foreground, #888)",
      fontSize: 13,
      textAlign: "center",
      padding: "24px 0",
      margin: 0
    }}>
        {t("components.art_craft_reels.no_videos_available_right_now")}
      </p>;
  }
  return <>
      <style>{`
        @keyframes ac-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Overlay player — rendered via portal so position:fixed covers the full viewport
          even when a parent has overflow/transform creating a stacking context */}
      {overlayIndex !== null && createPortal(
        <ReelOverlay videos={videos} initialIndex={overlayIndex} onClose={() => setOverlayIndex(null)} onLoadMore={handleLoadMore} loadingMore={loadingMore} hasMore={hasMore} />,
        document.body
      )}

      {/* Grid header */}
      <p style={{
      color: "var(--muted-foreground, #888)",
      fontSize: 12,
      margin: "0 0 10px",
      textAlign: "center"
    }}>
        {t("components.art_craft_reels.tap_any_video_to_watch_swipe_up_down_to_browse_all")}
      </p>

      {/* Thumbnail grid */}
      <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      gap: 10
    }}>
        {videos.map((v, i) => <ThumbnailCard key={v.id} video={v} onPlay={() => setOverlayIndex(i)} />)}
      </div>

      {/* Load more / end */}
      <div style={{
      marginTop: 14,
      textAlign: "center"
    }}>
        {hasMore && <button onClick={handleLoadMore} disabled={loadingMore} style={{
        background: "rgba(123,63,242,0.15)",
        color: "var(--foreground, #fff)",
        border: "1px solid rgba(123,63,242,0.4)",
        borderRadius: 24,
        padding: "8px 24px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        opacity: loadingMore ? 0.6 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }}>
            {loadingMore ? <><AcSpinner size={14} /> {t("components.art_craft_reels.loading")}</> : "Load more videos"}
          </button>}
        {!hasMore && <p style={{
        color: "var(--muted-foreground, #888)",
        fontSize: 12,
        margin: 0
      }}>
            {t("components.art_craft_reels.you_ve_seen_all_2")} {videos.length} {t("components.art_craft_reels.videos_2")}
          </p>}
        {error && videos.length > 0 && <p style={{
        color: "var(--destructive, hsl(var(--brand-red-500)))",
        fontSize: 12,
        marginTop: 6
      }}>
            ⚠ {error}
          </p>}
      </div>
    </>;
}