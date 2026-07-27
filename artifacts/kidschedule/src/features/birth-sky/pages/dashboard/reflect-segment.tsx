/**
 * Reflection segment (Pack 5) — prompts + journal. No AI / chat / rewrite.
 */

import { useEffect, useId, useRef, useState } from "react";
import type { ReflectionSegmentVM } from "../../application/view-models/reflection-vm";
import { milestoneToastCopy } from "../../application/view-models/reflection-vm";
import type { ReflectionMilestoneId } from "../../domain/models/reflection";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { useReflectionSession } from "../../state/reflection-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "../../lib/focus-trap";

type Props = {
  vm: ReflectionSegmentVM;
  childName: string;
  reducedMotion: boolean;
  onSave: (input: { promptId: string; body: string }) => {
    milestoneId: ReflectionMilestoneId | null;
    milestoneEmitted: boolean;
  };
  onOpenTimelineItem: (itemId: string, reflectionId: string) => void;
  onAskAmy: () => void;
};

export function BirthSkyReflectSegment({
  vm,
  childName,
  reducedMotion,
  onSave,
  onOpenTimelineItem,
  onAskAmy,
}: Props) {
  const {
    draft,
    setDraft,
    clearDraft,
    openComposerRequest,
    consumeOpenComposerRequest,
    setActivePromptId,
  } = useReflectionSession();
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const viewed = useRef(false);
  const promptViewed = useRef<string | null>(null);
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useFocusTrap(composerRef, composerOpen, () => setComposerOpen(false));
  useFocusTrap(detailRef, Boolean(detailId), () => setDetailId(null));

  useEffect(() => {
    if (vm.status === "loading" || viewed.current) return;
    viewed.current = true;
    trackBirthSkyEvent("birth_sky.reflection_segment_viewed", {});
  }, [vm.status]);

  useEffect(() => {
    if (promptViewed.current === vm.prompt.id) return;
    promptViewed.current = vm.prompt.id;
    trackBirthSkyEvent("birth_sky.reflection_prompt_viewed", {
      prompt_id: vm.prompt.id,
    });
  }, [vm.prompt.id]);

  useEffect(() => {
    if (!openComposerRequest) return;
    setComposerOpen(true);
    consumeOpenComposerRequest();
  }, [openComposerRequest, consumeOpenComposerRequest]);

  useEffect(() => {
    if (!composerOpen) return;
    if (draft?.promptId === vm.prompt.id) {
      setBody(draft.body);
    } else {
      setBody("");
    }
    trackBirthSkyEvent("birth_sky.journal_entry_started", {
      prompt_id: vm.prompt.id,
    });
    const t = window.setTimeout(() => textareaRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [composerOpen, draft, vm.prompt.id]);

  useEffect(() => {
    if (!composerOpen) return;
    setDraft({
      promptId: vm.prompt.id,
      body,
      updatedAt: new Date().toISOString(),
    });
  }, [body, composerOpen, setDraft, vm.prompt.id]);

  useEffect(() => {
    if (!toast) return;
    const ms = reducedMotion ? 900 : 1200;
    const t = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(t);
  }, [toast, reducedMotion]);

  if (vm.status === "loading") {
    return (
      <div data-testid="birth-sky-reflect-loading" role="status" aria-live="polite">
        <p className="text-sm text-[hsl(40_20%_96%/0.72)]">Opening today’s reflections…</p>
      </div>
    );
  }

  const detail = detailId
    ? vm.entries.find((e) => e.reflectionId === detailId) ?? null
    : null;

  return (
    <div data-testid="birth-sky-reflect-segment" className="space-y-4">
      <section
        aria-labelledby="birth-sky-reflect-prompt-label"
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4"
      >
        <h3
          id="birth-sky-reflect-prompt-label"
          className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]"
        >
          Reflection prompt
        </h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-[hsl(40_20%_96%)]">
          {vm.prompt.text}
        </p>
        <Button
          type="button"
          className="mt-4 min-h-11 w-full rounded-xl"
          onClick={() => setComposerOpen(true)}
          data-testid="birth-sky-reflect-write"
        >
          Write a quiet note
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="amy-astro-btn-secondary mt-2 min-h-11 w-full rounded-xl"
          onClick={onAskAmy}
          data-testid="birth-sky-ask-amy"
        >
          Ask Amy
        </Button>
      </section>

      {vm.status === "empty" ? (
        <div
          data-testid="birth-sky-reflect-empty"
          className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-sm text-[hsl(40_20%_96%/0.72)]"
        >
          No notes yet. Reflections stay parent-only — never predictions, never AI rewrites.
        </div>
      ) : (
        <section aria-labelledby="birth-sky-reflect-list-label" className="space-y-2">
          <h3
            id="birth-sky-reflect-list-label"
            className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]"
          >
            Your notes
          </h3>
          {vm.entries.map((entry) => (
            <button
              key={entry.reflectionId}
              type="button"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
              onClick={() => setDetailId(entry.reflectionId)}
              data-testid={`birth-sky-reflect-entry-${entry.reflectionId}`}
            >
              <p className="text-xs text-[hsl(40_20%_96%/0.5)]">{entry.createdAtLabel}</p>
              <p className="mt-1 line-clamp-2 text-sm text-[hsl(40_20%_96%/0.85)]">{entry.body}</p>
            </button>
          ))}
        </section>
      )}

      {vm.timelinePeek.length > 0 ? (
        <section aria-labelledby="birth-sky-timeline-peek-label" className="space-y-2">
          <h3
            id="birth-sky-timeline-peek-label"
            className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]"
          >
            Timeline
          </h3>
          {vm.timelinePeek.map((item) => (
            <button
              key={item.itemId}
              type="button"
              className="w-full rounded-lg border border-white/8 bg-transparent px-3 py-2 text-left text-sm"
              onClick={() => {
                trackBirthSkyEvent("birth_sky.timeline_link_opened", {
                  item_type: "reflection",
                });
                onOpenTimelineItem(item.itemId, item.reflectionId);
                setDetailId(item.reflectionId);
              }}
              data-testid={`birth-sky-timeline-item-${item.itemId}`}
            >
              <span className="text-xs text-[hsl(40_20%_96%/0.5)]">{item.occurredAtLabel}</span>
              <p className="text-[hsl(40_20%_96%/0.8)]">{item.preview}</p>
            </button>
          ))}
        </section>
      ) : null}

      {composerOpen ? (
        <div
          ref={composerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          data-testid="birth-sky-reflect-composer"
        >
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border border-white/12 bg-[hsl(220_28%_12%)] p-5",
              !reducedMotion && "animate-in fade-in duration-200",
            )}
          >
            <h3 id={titleId} className="text-lg font-semibold">
              Quiet note
            </h3>
            <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">{vm.prompt.text}</p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
              Your words
              <textarea
                ref={textareaRef}
                className="mt-2 min-h-32 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-[hsl(40_20%_96%)]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={4000}
                data-testid="birth-sky-reflect-textarea"
              />
            </label>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                className="min-h-11 rounded-xl"
                disabled={body.trim().length === 0}
                onClick={() => {
                  const result = onSave({ promptId: vm.prompt.id, body });
                  clearDraft();
                  setActivePromptId(null);
                  setComposerOpen(false);
                  setBody("");
                  trackBirthSkyEvent("birth_sky.journal_entry_saved", {
                    prompt_id: vm.prompt.id,
                    milestone: result.milestoneEmitted
                      ? (result.milestoneId ?? undefined)
                      : undefined,
                  });
                  if (result.milestoneEmitted && result.milestoneId) {
                    setToast(milestoneToastCopy(result.milestoneId, childName));
                  }
                }}
                data-testid="birth-sky-reflect-save"
              >
                Save note
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 rounded-xl"
                onClick={() => setComposerOpen(false)}
                data-testid="birth-sky-reflect-composer-close"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div
          ref={detailRef}
          role="dialog"
          aria-modal="true"
          aria-label="Saved reflection"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          data-testid="birth-sky-reflect-detail"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[hsl(220_28%_12%)] p-5">
            <p className="text-xs text-[hsl(40_20%_96%/0.5)]">{detail.createdAtLabel}</p>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{detail.body}</p>
            <p className="mt-3 text-xs text-[hsl(40_20%_96%/0.45)]">
              Linked sky snapshot {detail.snapshotVersion}
            </p>
            <Button
              type="button"
              className="mt-5 min-h-11 w-full rounded-xl"
              onClick={() => setDetailId(null)}
              data-testid="birth-sky-reflect-detail-close"
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/15 bg-[hsl(220_28%_14%)] px-4 py-2 text-sm text-[hsl(40_20%_96%)] shadow-lg",
            !reducedMotion && "animate-in fade-in duration-300",
          )}
          data-testid="birth-sky-reflect-milestone-toast"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
