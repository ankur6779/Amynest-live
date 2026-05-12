import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, MessageSquarePlus, Star,
  Monitor, Smartphone, Image, X, RefreshCw, Filter, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackItem {
  id: string;
  userId: string;
  categories: string[];
  message: string;
  rating: number | null;
  screenshotUrl: string | null;
  autoTags: string[];
  platform: string | null;
  appVersion: string | null;
  deviceType: string | null;
  country: string | null;
  createdAt: string;
}

interface AdminFeedbackResponse {
  items: FeedbackItem[];
  total: number;
  avgRating: number | null;
  withScreenshot: number;
  limit: number;
  offset: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  feature_request:       { emoji: "💡", label: "Feature Request" },
  bug_report:            { emoji: "🐞", label: "Bug" },
  ui_feedback:           { emoji: "🎨", label: "UI / Design" },
  ai_feedback:           { emoji: "🤖", label: "Amy AI" },
  content_suggestion:    { emoji: "📚", label: "Content" },
  nutrition_feedback:    { emoji: "🍱", label: "Nutrition" },
  notification_feedback: { emoji: "🔔", label: "Notifications" },
  general_experience:    { emoji: "❤️", label: "General" },
  improvement_idea:      { emoji: "🚀", label: "Improvement" },
};

const RATING_META: Record<number, { emoji: string; label: string; color: string }> = {
  // audit-ok: semantic rating colors (red=poor, amber=okay, green=good)
  1: { emoji: "😞", label: "Poor",    color: "text-red-400" },
  2: { emoji: "😐", label: "Okay",    color: "text-amber-400" }, // audit-ok: semantic rating color
  3: { emoji: "😊", label: "Good",    color: "text-emerald-400" }, // audit-ok: semantic rating color
  4: { emoji: "🤩", label: "Amazing", color: "text-primary" },
};

const TAG_COLORS: Record<string, string> = {
  bug:             "bg-red-500/15 text-red-400 border-red-500/25", // audit-ok: semantic bug tag
  feature_request: "bg-primary/15 text-primary border-primary/25",
  urgent:          "bg-orange-500/15 text-orange-400 border-orange-500/25", // audit-ok: semantic urgent tag
  ui_issue:        "bg-violet-500/15 text-violet-400 border-violet-500/25", // audit-ok: semantic ui tag
  ai_issue:        "bg-sky-500/15 text-sky-400 border-sky-500/25", // audit-ok: semantic ai tag
};

const PAGE_SIZE = 20;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 flex-1 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{label}</p>
      <p className="text-2xl font-bold text-foreground font-quicksand mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  const meta = RATING_META[rating];
  return (
    <span className={cn("flex items-center gap-1 text-sm font-semibold", meta?.color)}>
      {meta?.emoji} {meta?.label}
    </span>
  );
}

function CategoryBadge({ id }: { id: string }) {
  const m = CATEGORY_META[id];
  if (!m) return <Badge variant="outline" className="text-[10px]">{id}</Badge>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 border border-primary/20 text-primary">
      {m.emoji} {m.label}
    </span>
  );
}

function AutoTag({ tag }: { tag: string }) {
  const cls = TAG_COLORS[tag] ?? "bg-white/10 text-muted-foreground border-white/15";
  return (
    <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide", cls)}>
      {tag.replace(/_/g, " ")}
    </span>
  );
}

function ScreenshotModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
        {/* i18n-ok: admin-only UI, not user-facing localised content */}
        <img src={url} alt="User screenshot" className="w-full rounded-2xl shadow-2xl" />
      </div>
    </div>
  );
}

function FeedbackCard({ item, onViewScreenshot }: { item: FeedbackItem; onViewScreenshot: (url: string) => void }) {
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 space-y-3 hover:border-white/15 transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {item.categories.map(c => <CategoryBadge key={c} id={c} />)}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold text-muted-foreground">{dateStr}</p>
          <p className="text-[10px] text-muted-foreground/60">{timeStr}</p>
        </div>
      </div>

      {/* Message */}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
        {item.message}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/6">
        <div className="flex items-center gap-3 flex-wrap">
          <RatingStars rating={item.rating} />
          {item.autoTags.map(tag => <AutoTag key={tag} tag={tag} />)}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Screenshot */}
          {item.screenshotUrl && (
            <button
              onClick={() => onViewScreenshot(item.screenshotUrl!)}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 border border-primary/30 hover:border-primary/50 rounded-lg px-2 py-0.5 transition-colors"
            >
              <Image className="h-3 w-3" />
              Screenshot
            </button>
          )}
          {/* Platform */}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {item.deviceType === "mobile"
              ? <Smartphone className="h-3 w-3" />
              : <Monitor className="h-3 w-3" />}
            {item.platform ?? "web"}
          </span>
          {/* Version */}
          {item.appVersion && (
            <span className="text-[10px] text-muted-foreground/50">v{item.appVersion}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const authFetch = useAuthFetch();
  const [offset, setOffset] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  function buildUrl() {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    if (filterCategory) p.set("category", filterCategory);
    if (filterRating)   p.set("rating", String(filterRating));
    if (filterTag)      p.set("tag", filterTag);
    return `/api/admin/feedback?${p.toString()}`;
  }

  const { data, isLoading, isError, error, refetch } = useQuery<AdminFeedbackResponse>({
    queryKey: ["admin-feedback", offset, filterCategory, filterRating, filterTag],
    queryFn: async () => {
      const res = await authFetch(buildUrl());
      if (res.status === 403) throw new Error("not_admin");
      if (!res.ok) throw new Error("server_error");
      return res.json() as Promise<AdminFeedbackResponse>;
    },
    retry: false,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function resetFilters() {
    setFilterCategory(null);
    setFilterRating(null);
    setFilterTag(null);
    setOffset(0);
  }

  const hasFilter = filterCategory !== null || filterRating !== null || filterTag !== null;

  // ── Not-admin gate ─────────────────────────────────────────────────────────
  if (isError && (error as Error)?.message === "not_admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          {/* i18n-ok: admin-only error page, never shown to regular users */}
          <h2 className="text-lg font-bold text-foreground font-quicksand">Admin Access Required</h2>
          {/* i18n-ok: admin-only technical instruction */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {/* i18n-ok: admin-only technical instruction */}
            Your user ID needs to be added to the <code className="bg-white/10 px-1 rounded text-xs">ADMIN_USER_IDS</code> environment variable to access this page.
          </p>
          <Link href="/dashboard">
            {/* i18n-ok: admin-only nav link */}
            <button className="text-sm text-primary hover:underline">← Back to Dashboard</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Screenshot modal */}
      {screenshot && <ScreenshotModal url={screenshot} onClose={() => setScreenshot(null)} />}

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-500/6 blur-3xl" /> {/* audit-ok: ambient glow */}
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-8 pb-24">

        {/* Back */}
        <div className="mb-6">
          <Link href="/dashboard">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.35)]"> {/* audit-ok: brand gradient */}
              <MessageSquarePlus className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              {/* i18n-ok: admin-only header, not user-facing localised content */}
              <h1 className="text-xl font-bold font-quicksand text-foreground">Feedback Inbox</h1>
              {/* i18n-ok: admin-only sub-label */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Admin View · AmyNest</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 rounded-xl px-3 py-1.5 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        {data && (
          <div className="flex gap-3 mb-6 flex-wrap">
            <StatCard
              label="Total Feedback"
              value={data.total}
              sub={hasFilter ? "matching filters" : "all time"}
            />
            <StatCard
              label="Avg Rating"
              value={data.avgRating ? `${data.avgRating} / 4` : "—"}
              sub="from rated submissions"
            />
            <StatCard
              label="With Screenshot"
              value={data.withScreenshot}
              sub={`${data.total ? Math.round(data.withScreenshot / data.total * 100) : 0}% of total`}
            />
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary/60">
              <Filter className="h-3 w-3" />
              Filters
            </span>
            {hasFilter && (
              <button
                onClick={resetFilters}
                className="text-[10px] text-muted-foreground hover:text-primary underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CATEGORY_META).map(([id, m]) => (
              <button
                key={id}
                onClick={() => { setFilterCategory(f => f === id ? null : id); setOffset(0); }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                  filterCategory === id
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/25"
                )}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          {/* Rating */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(r => {
              const m = RATING_META[r];
              return (
                <button
                  key={r}
                  onClick={() => { setFilterRating(f => f === r ? null : r); setOffset(0); }}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                    filterRating === r
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/25"
                  )}
                >
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>

          {/* Auto-tags */}
          <div className="flex flex-wrap gap-1.5">
            {["bug", "feature_request", "urgent", "ui_issue", "ai_issue"].map(tag => (
              <button
                key={tag}
                onClick={() => { setFilterTag(f => f === tag ? null : tag); setOffset(0); }}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide transition-all",
                  filterTag === tag
                    ? TAG_COLORS[tag] ?? "bg-primary/20 border-primary text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/25"
                )}
              >
                {tag.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 h-28 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/25 px-4 py-6 text-center text-sm text-red-400"> {/* audit-ok: error state */}
            Could not load feedback. Please refresh.
          </div>
        ) : data?.items.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/8 py-16 text-center">
            <p className="text-3xl mb-2">📭</p>
            {/* i18n-ok: admin-only empty state */}
            <p className="text-sm font-semibold text-foreground">No feedback yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilter ? "Try clearing your filters." : "Submissions will appear here once users send feedback."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.items.map(item => (
              <FeedbackCard key={item.id} item={item} onViewScreenshot={setScreenshot} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {(data?.total ?? 0) > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/8">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} · {data?.total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:border-white/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setOffset(o => o + PAGE_SIZE)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:border-white/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
