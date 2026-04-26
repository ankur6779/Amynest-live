import { useState, useMemo } from "react";
import { useGetHubContent, getGetHubContentQueryKey } from "@workspace/api-client-react";
import type {
  HubContent,
  HubStory,
  HubPhonics,
  HubAgeBand,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Play, Sparkles, AudioLines, ChevronRight } from "lucide-react";
import { StoryPlayer } from "@/components/story-player";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type { StoryDto } from "@/hooks/use-stories-data";
import { useToast } from "@/hooks/use-toast";
import { bandLabel, bandRangeLabel } from "@/lib/age-bands";
import type { AgeBand } from "@/lib/age-bands";

interface Props {
  childId: number;
  childName: string;
}

function hubStoryToDto(s: HubStory): StoryDto {
  return {
    id: s.id,
    driveFileId: s.driveFileId,
    title: s.title,
    category: s.category,
    thumbnailUrl: s.thumbnailUrl,
    durationSec: s.durationSec,
    streamUrl: s.streamUrl,
    positionSec: s.positionSec,
    playCount: s.playCount,
    completed: s.completed,
  };
}

export function HubProgressiveContent({ childId, childName }: Props) {
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const [activeStory, setActiveStory] = useState<StoryDto | null>(null);

  const { data, isLoading, error, refetch } = useGetHubContent(
    { childId },
    {
      query: {
        queryKey: getGetHubContentQueryKey({ childId }),
        // Refresh briskly so early-unlock flips show without manual refresh.
        staleTime: 15_000,
        refetchOnWindowFocus: true,
      },
    },
  );

  const showComingNext = (
    label: string,
    band?: HubAgeBand | null,
  ) => {
    const bandLine = band
      ? `Unlocks at age ${bandRangeLabel(band as AgeBand)} — or earlier when ${childName} finishes 75% of their current band.`
      : `Unlocks as ${childName} finishes their current band.`;
    toast({
      title: `🔒 Coming next — ${label}`,
      description: bandLine,
    });
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 text-sm text-muted-foreground animate-pulse">
          Loading library for {childName}…
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="rounded-2xl border-destructive/30">
        <CardContent className="p-6 text-sm text-destructive flex items-center justify-between">
          <span>Couldn't load progressive library.</span>
          <button
            className="text-xs underline"
            onClick={() => refetch()}
            data-testid="hub-progressive-retry"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const hub: HubContent = data;
  const pct = Math.round(hub.bandProgress.percentage ?? 0);
  const totalItems = hub.bandProgress.totalCount;
  const finishedItems = hub.bandProgress.finishedCount;

  return (
    <div className="space-y-4" data-testid="hub-progressive-content">
      {/* Band progress header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 dark:from-violet-500/10 to-fuchsia-50 dark:to-fuchsia-500/10 border border-violet-200/50 dark:border-violet-400/20 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Current band
            </span>
            <Badge variant="outline" className="rounded-full px-2 py-0 h-5 text-[10px] font-semibold">
              {bandLabel(hub.currentBand as AgeBand)}
            </Badge>
          </div>
          <span
            className="text-xs font-bold text-violet-700 dark:text-violet-300"
            data-testid="hub-band-progress-pct"
          >
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-violet-100 dark:bg-violet-900/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            data-testid="hub-band-progress-bar"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {finishedItems}/{totalItems} items complete · {hub.nextBandEarlyUnlocked ? "Next band early-unlocked! 🎉" : "Reach 75% to early-unlock the next band."}
        </p>
      </div>

      {/* Section 1 — Available now */}
      <Section
        kind="live"
        title={`Available now for ${childName}`}
        subtitle="Play any item — it counts toward unlocking the next band."
        stories={hub.section1.stories}
        phonics={hub.section1.phonics}
        onStoryTap={(s) => {
          if (s.previewOnly) {
            showComingNext(s.title, s.ageBand);
          } else {
            setActiveStory(hubStoryToDto(s));
          }
        }}
        onPhonicsTap={(p) => {
          if (p.previewOnly) {
            showComingNext(`${p.symbol} (${p.sound})`, p.band);
          } else {
            // Quick "practice" toast — full UX lives in the Phonics section.
            toast({
              title: `${p.emoji ?? "🔤"} ${p.symbol} — ${p.sound}`,
              description: p.example
                ? `Try saying it: "${p.example}"`
                : "Open the Phonics section for full practice.",
            });
          }
        }}
      />

      {/* Section 2 — Coming next */}
      <Section
        kind="preview"
        title={
          hub.section2.mode === "discovery"
            ? `Discover next for ${childName}`
            : `Coming next for ${childName}`
        }
        subtitle={
          hub.nextBand
            ? `Peek at ${bandLabel(hub.nextBand as AgeBand)} content — tap any locked item to see when it unlocks.`
            : "Bonus content — preview to plan ahead."
        }
        stories={hub.section2.stories}
        phonics={hub.section2.phonics}
        onStoryTap={(s) => {
          if (s.previewOnly) {
            showComingNext(s.title, s.ageBand);
          } else {
            setActiveStory(hubStoryToDto(s));
          }
        }}
        onPhonicsTap={(p) => {
          if (p.previewOnly) {
            showComingNext(`${p.symbol} (${p.sound})`, p.band);
          } else {
            toast({
              title: `${p.emoji ?? "🔤"} ${p.symbol} — ${p.sound}`,
              description: "Now unlocked! Open the Phonics section for full practice.",
            });
          }
        }}
      />

      <StoryPlayer
        story={activeStory}
        onClose={() => {
          setActiveStory(null);
          refetch();
        }}
        onProgress={(storyId, positionSec, options) => {
          // Best-effort progress write so completing a story still drives
          // the early-unlock evaluator. Uses `useAuthFetch` so the Firebase
          // ID token is attached as a Bearer header — the API requires it
          // (cookies are not accepted by `requireAuth`). We don't surface
          // errors here; the dedicated Story Hub covers the full UX.
          authFetch("/api/stories/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              childId,
              storyId,
              positionSec: Math.floor(positionSec),
              ...(options?.durationSec !== undefined
                ? { durationSec: Math.floor(options.durationSec) }
                : {}),
              ...(options?.completed !== undefined
                ? { completed: options.completed }
                : {}),
              ...(options?.startedSession !== undefined
                ? { startedSession: options.startedSession }
                : {}),
            }),
          })
            .then((r) => {
              if (options?.completed && r.ok) {
                // Re-fetch hub to surface unlock changes immediately
                // (the api-server's evaluateEarlyUnlockSafe runs on the
                // POST and may flip Section 2 items live).
                refetch();
              }
            })
            .catch(() => {});
        }}
      />
    </div>
  );
}

// ─── Internal: Section renderer ──────────────────────────────────────────────
function Section({
  kind,
  title,
  subtitle,
  stories,
  phonics,
  onStoryTap,
  onPhonicsTap,
}: {
  kind: "live" | "preview";
  title: string;
  subtitle: string;
  stories: HubStory[];
  phonics: HubPhonics[];
  onStoryTap: (s: HubStory) => void;
  onPhonicsTap: (p: HubPhonics) => void;
}) {
  const isPreview = kind === "preview";
  const hasContent = stories.length > 0 || phonics.length > 0;
  const dataTestid =
    kind === "live" ? "hub-section1" : "hub-section2";

  return (
    <div data-testid={dataTestid} data-section-kind={kind} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-quicksand font-bold text-base text-foreground flex items-center gap-2">
            {isPreview && <Lock className="h-3.5 w-3.5 text-amber-600" />}
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {isPreview && (
          <Badge
            variant="outline"
            className="rounded-full px-2 py-0 h-5 text-[10px] font-semibold border-amber-300/60 dark:border-amber-400/30 text-amber-800 dark:text-amber-200"
          >
            Coming next
          </Badge>
        )}
      </div>

      {!hasContent && (
        <p
          className="text-xs italic text-muted-foreground"
          data-testid={`${dataTestid}-empty`}
        >
          Nothing here yet — check back as new content lands.
        </p>
      )}

      {/* Stories */}
      {stories.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            <Play className="h-3 w-3" />
            Stories
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stories.map((s) => (
              <StoryTile
                key={s.id}
                story={s}
                preview={s.previewOnly}
                onTap={() => onStoryTap(s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phonics */}
      {phonics.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            <AudioLines className="h-3 w-3" />
            Phonics
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {phonics.map((p) => (
              <PhonicsTile
                key={p.id}
                phonics={p}
                preview={p.previewOnly}
                onTap={() => onPhonicsTap(p)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoryTile({
  story,
  preview,
  onTap,
}: {
  story: HubStory;
  preview: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      data-testid={preview ? "hub-story-preview" : "hub-story-live"}
      data-story-id={story.id}
      data-preview-only={preview ? "true" : "false"}
      className={[
        "relative text-left rounded-xl overflow-hidden border transition-all",
        "bg-card hover:border-primary/50",
        preview
          ? "opacity-60 saturate-50 hover:opacity-90 hover:saturate-75 border-amber-200/50 dark:border-amber-400/20"
          : "border-border",
      ].join(" ")}
    >
      <div className="aspect-video bg-muted relative">
        {story.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🎬
          </div>
        )}
        {preview && (
          <div className="absolute top-1.5 right-1.5 bg-amber-500/90 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" />
            Locked
          </div>
        )}
        {story.completed && !preview && (
          <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
            ✓ Done
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
          {story.title}
        </p>
        {preview && (
          <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 flex items-center gap-1">
            <ChevronRight className="h-2.5 w-2.5" />
            Tap to see when it unlocks
          </p>
        )}
      </div>
    </button>
  );
}

function PhonicsTile({
  phonics,
  preview,
  onTap,
}: {
  phonics: HubPhonics;
  preview: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      data-testid={preview ? "hub-phonics-preview" : "hub-phonics-live"}
      data-phonics-id={phonics.id}
      data-preview-only={preview ? "true" : "false"}
      className={[
        "relative aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 p-2 transition-all",
        "bg-card hover:border-primary/50",
        preview
          ? "opacity-60 saturate-50 hover:opacity-90 border-amber-200/50 dark:border-amber-400/20"
          : "border-border",
      ].join(" ")}
    >
      {preview && (
        <Lock className="absolute top-1 right-1 h-2.5 w-2.5 text-amber-600" />
      )}
      <span className="text-2xl leading-none">{phonics.emoji ?? "🔤"}</span>
      <span className="text-sm font-bold text-foreground leading-tight">
        {phonics.symbol}
      </span>
      <span className="text-[9px] text-muted-foreground leading-tight">
        {phonics.sound}
      </span>
    </button>
  );
}
