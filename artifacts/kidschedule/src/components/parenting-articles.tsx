import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, Clock, Bookmark, BookmarkCheck, ThumbsUp, ChevronRight,
  BookOpen, Sparkles, Volume2, Loader2, Square,
} from "lucide-react";
import {
  ARTICLES,
  CATEGORY_COLORS,
  AGE_TAG_LABELS,
  getArticlesForAgeMonths,
  getSavedArticles,
  toggleSavedArticle,
  setLastReadArticle,
  getLastReadArticleId,
  getArticleHero,
  articleToSpeechSections,
  type Article,
  type ArticleCategory,
} from "@/lib/articles-data";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// ─── Article Hero Banner ───────────────────────────────────────────────────
// Gradient + watermark emoji header. Acts as the per-article "image" without
// any external hosting / image generation. The category accent color also
// powers the read-aloud highlight in the modal.
function ArticleHeroBanner({ article, large = false }: { article: Article; large?: boolean }) {
  const hero = getArticleHero(article.category);
  return (
    <div
      className={`relative w-full overflow-hidden ${large ? "h-32 sm:h-40" : "h-16"}`}
      style={{ background: `linear-gradient(135deg, ${hero.gradient[0]}, ${hero.gradient[1]})` }}
      aria-hidden="true"
    >
      <span
        className={`absolute select-none pointer-events-none opacity-25 ${
          large ? "-right-4 -top-6 text-[180px]" : "-right-3 -top-1 text-[80px]"
        }`}
        style={{ filter: `drop-shadow(0 6px 20px ${hero.accent})` }}
      >
        {hero.bgEmoji}
      </span>
      <span
        className={`absolute select-none ${
          large ? "left-6 top-6 text-6xl" : "left-3 top-2 text-3xl"
        }`}
      >
        {article.emoji}
      </span>
      {large && (
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/80 to-transparent" />
      )}
    </div>
  );
}

// ─── Per-section listen button ─────────────────────────────────────────────
function SectionListenBtn({
  state,
  onClick,
  label,
}: {
  state: "idle" | "loading" | "playing";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid="section-listen-btn"
      className={`shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full transition-all ${
        state === "idle"
          ? "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground opacity-70 hover:opacity-100"
          : "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
      }`}
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "playing" ? (
        <Square className="h-3 w-3 fill-current" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Article View Modal ────────────────────────────────────────────────────
function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const [saved, setSaved] = useState(() => getSavedArticles().includes(article.id));
  const [helpful, setHelpful] = useState(false);
  const colors = CATEGORY_COLORS[article.category];
  const hero = getArticleHero(article.category);

  // Voice playback. Speech is broken into sections so we can both:
  //   - play one section (per-section listen button), or
  //   - auto-advance the whole article (top "Listen to article" button).
  // index 0 = title + summary; indices 1..n map to article.content[i-1].
  const speechSections = useMemo(() => articleToSpeechSections(article), [article]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const handleFinished = useCallback(() => {
    if (!autoAdvance) {
      setActiveIdx(null);
      return;
    }
    setActiveIdx((i) => {
      if (i === null || i + 1 >= speechSections.length) {
        setAutoAdvance(false);
        return null;
      }
      return i + 1;
    });
  }, [autoAdvance, speechSections.length]);

  const { speak, stop, speaking, loading, error } = useAmyVoice({ onFinished: handleFinished });

  // Re-speak whenever the active section index changes. Effect-driven so
  // both per-section taps AND onFinished-triggered advances funnel through
  // the same place — we never double-play.
  useEffect(() => {
    if (activeIdx === null) return;
    void speak(speechSections[activeIdx]);
    // We deliberately depend on activeIdx only — the speak identity changes
    // when network internals change but we don't want to retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // Stop playback when the modal closes.
  useEffect(() => () => stop(), [stop]);

  const stopPlayback = useCallback(() => {
    setAutoAdvance(false);
    setActiveIdx(null);
    stop();
  }, [stop]);

  const playFromStart = () => {
    setAutoAdvance(true);
    setActiveIdx(0);
  };

  const playSection = (idx: number) => {
    setAutoAdvance(false);
    setActiveIdx(idx);
  };

  const isFullPlayingMode = activeIdx !== null && autoAdvance;
  const fullState: "idle" | "loading" | "playing" =
    isFullPlayingMode && loading ? "loading" : isFullPlayingMode && speaking ? "playing" : "idle";

  const sectionState = (idx: number): "idle" | "loading" | "playing" => {
    if (activeIdx !== idx) return "idle";
    if (loading) return "loading";
    if (speaking) return "playing";
    return "idle";
  };

  const handleSave = () => {
    const updated = toggleSavedArticle(article.id);
    setSaved(updated.includes(article.id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/95 border-b backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{article.emoji}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} shrink-0`}>
            {article.category}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className={`rounded-full ${saved ? "text-violet-600" : "text-muted-foreground"}`}
            aria-label={saved ? "Unsave article" : "Save article"}
          >
            {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="Close article">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Hero banner — full bleed */}
      <ArticleHeroBanner article={article} large />

      {/* Article content */}
      <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6 pb-24 -mt-4">
        {/* Title block */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{article.readTime} min read</span>
            <span className="mx-1">·</span>
            {article.ageTags
              .map((tag) => (
                <span key={tag} className="font-medium">
                  {AGE_TAG_LABELS[tag]}
                </span>
              ))
              .reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]), [])}
          </div>
          <h1 className="font-quicksand text-2xl font-bold text-foreground leading-tight">
            {article.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">{article.summary}</p>

          {/* Listen to article — top-level full-read CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              onClick={fullState === "idle" ? playFromStart : stopPlayback}
              data-testid="listen-article-btn"
              className="rounded-full gap-2 shadow-sm"
              style={
                fullState === "idle"
                  ? { background: `linear-gradient(135deg, ${hero.gradient[0]}, ${hero.gradient[1]})`, color: "#fff" }
                  : undefined
              }
              variant={fullState === "idle" ? undefined : "secondary"}
            >
              {fullState === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : fullState === "playing" ? (
                <>
                  <Square className="h-4 w-4 fill-current" />
                  Stop reading
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  Listen to article
                </>
              )}
            </Button>
            {isFullPlayingMode && activeIdx !== null && (
              <span className="text-xs text-muted-foreground">
                Reading {activeIdx + 1} of {speechSections.length}
              </span>
            )}
            {error && (
              <span className="text-xs text-destructive">Couldn't play audio. Try again.</span>
            )}
          </div>
        </div>

        {/* Content sections — each gets its own listen button + reading highlight */}
        <div className="space-y-5">
          {article.content.map((section, i) => {
            const speechIdx = i + 1; // 0 is the title+summary intro
            const state = sectionState(speechIdx);
            const isActive = activeIdx === speechIdx;
            const wrapperClass = `relative rounded-xl transition-all ${
              isActive ? "ring-2 ring-primary/40 bg-primary/5 -mx-2 px-2 py-2" : ""
            }`;

            const listenBtn = (
              <SectionListenBtn
                state={state}
                onClick={() => (state === "idle" ? playSection(speechIdx) : stopPlayback())}
                label={`Listen to ${section.type} section`}
              />
            );

            if (section.type === "intro") {
              return (
                <div key={i} className={wrapperClass}>
                  <div className="bg-muted/40 rounded-2xl p-4 border-l-4 border-primary/40 flex items-start gap-3">
                    <p className="text-foreground leading-relaxed text-base flex-1">{section.text}</p>
                    {listenBtn}
                  </div>
                </div>
              );
            }
            if (section.type === "heading") {
              return (
                <div key={i} className={wrapperClass}>
                  <div className="flex items-center gap-2 pt-2">
                    <h2 className="font-quicksand text-lg font-bold text-foreground flex-1">
                      {section.text}
                    </h2>
                    {listenBtn}
                  </div>
                </div>
              );
            }
            if (section.type === "paragraph") {
              return (
                <div key={i} className={wrapperClass}>
                  <div className="flex items-start gap-3">
                    <p className="text-foreground/80 leading-relaxed flex-1">{section.text}</p>
                    {listenBtn}
                  </div>
                </div>
              );
            }
            if (section.type === "bullets" && section.items) {
              return (
                <div key={i} className={wrapperClass}>
                  <div className="flex items-start gap-3">
                    <ul className="space-y-2.5 pl-1 flex-1">
                      {section.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-foreground/80">
                          <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary block" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                    {listenBtn}
                  </div>
                </div>
              );
            }
            if (section.type === "tip") {
              return (
                <div key={i} className={wrapperClass}>
                  <div className="bg-gradient-to-r from-violet-50 dark:from-violet-500/15 to-pink-50 dark:to-pink-500/15 border border-violet-200 dark:border-violet-400/30 rounded-2xl p-4 flex gap-3 items-start">
                    <div className="shrink-0 text-lg">✨</div>
                    <p className="text-violet-800 dark:text-violet-200 text-sm leading-relaxed font-medium flex-1">
                      {section.text}
                    </p>
                    {listenBtn}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-border/50 space-y-3">
          <p className="text-sm font-semibold text-foreground">Was this article helpful?</p>
          <div className="flex gap-2">
            <Button
              variant={helpful ? "default" : "outline"}
              size="sm"
              className="rounded-full gap-2"
              onClick={() => setHelpful(true)}
            >
              <ThumbsUp className="h-4 w-4" />
              {helpful ? "Thanks!" : "Helpful"}
            </Button>
            <Button
              variant={saved ? "default" : "outline"}
              size="sm"
              className="rounded-full gap-2"
              onClick={handleSave}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Amy AI articles are curated from evidence-based child development research. Always consult your paediatrician for medical concerns.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Article Card ─────────────────────────────────────────────────
function ArticleCard({ article, onClick, saved }: { article: Article; onClick: () => void; saved: boolean }) {
  const colors = CATEGORY_COLORS[article.category];
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
      data-testid={`article-card-${article.id}`}
    >
      <ArticleHeroBanner article={article} />
      <div className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
            {article.category}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {article.ageTags.slice(0, 2).map((t) => AGE_TAG_LABELS[t]).join(", ")}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readTime}m
          </span>
        </div>
        <p className="font-quicksand font-bold text-sm text-foreground leading-snug line-clamp-2">
          {article.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {article.summary}
        </p>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-primary font-semibold flex items-center gap-1">
            Read article <ChevronRight className="h-3 w-3" />
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Volume2 className="h-3 w-3" /> Read aloud
            </span>
            {saved && (
              <span className="text-violet-500">
                <BookmarkCheck className="h-3.5 w-3.5" />
              </span>
            )}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Category Filter Chips ────────────────────────────────────────────────
const CATEGORIES: ArticleCategory[] = [
  "Sleep",
  "Behavior",
  "Nutrition",
  "Development",
  "Emotional",
  "Screen Time",
  "Bonding",
];

// ─── Main Component ────────────────────────────────────────────────────────
export function ParentingArticles({ childAgeMonths }: { childAgeMonths: number }) {
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedArticles());
  const [activeCategory, setActiveCategory] = useState<ArticleCategory | null>(null);
  const [showAll, setShowAll] = useState(false);
  const continueId = getLastReadArticleId();

  const ageArticles = getArticlesForAgeMonths(childAgeMonths);
  const continueArticle = continueId ? ARTICLES.find((a) => a.id === continueId) : null;

  const filtered = activeCategory
    ? ageArticles.filter((a) => a.category === activeCategory)
    : ageArticles;

  const visibleArticles = showAll ? filtered : filtered.slice(0, 4);

  const openArticle = (article: Article) => {
    setLastReadArticle(article.id);
    setActiveArticle(article);
  };

  const closeArticle = () => {
    setActiveArticle(null);
    setSavedIds(getSavedArticles());
  };

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-quicksand font-bold text-base text-foreground">Parenting Articles</h2>
            <p className="text-xs text-muted-foreground">Research-based, age-matched · Tap to read or listen</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs rounded-full">
          <Sparkles className="h-3 w-3 mr-1 text-primary" />
          {filtered.length} articles
        </Badge>
      </div>

      {/* Continue reading strip */}
      {continueArticle && !activeArticle && (
        <button
          onClick={() => openArticle(continueArticle)}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-50 dark:from-violet-500/15 to-indigo-50 dark:to-indigo-500/15 border border-violet-200 dark:border-violet-400/30 rounded-2xl px-4 py-3 hover:border-violet-400 transition-all text-left"
        >
          <span className="text-2xl shrink-0">{continueArticle.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">Continue Reading</p>
            <p className="text-sm font-bold text-foreground truncate">{continueArticle.title}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-violet-500 shrink-0" />
        </button>
      )}

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <button
          onClick={() => {
            setActiveCategory(null);
            setShowAll(false);
          }}
          className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
            !activeCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const c = CATEGORY_COLORS[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat === activeCategory ? null : cat);
                setShowAll(false);
              }}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                isActive ? `${c.bg} ${c.text} ${c.border} shadow-sm` : "bg-card border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Article cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No articles in this category for this age group yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              saved={savedIds.includes(article.id)}
              onClick={() => openArticle(article)}
            />
          ))}
          {filtered.length > 4 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full text-center text-sm font-semibold text-primary py-2 hover:underline"
            >
              {showAll ? "Show less" : `Explore ${filtered.length - 4} more articles`}
            </button>
          )}
        </div>
      )}

      {/* In-app article modal */}
      {activeArticle && <ArticleModal article={activeArticle} onClose={closeArticle} />}
    </section>
  );
}
