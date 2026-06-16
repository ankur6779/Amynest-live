import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDecodableStory } from "@/lib/phonics-v2/content/decodable-stories";
import { getStoryById } from "@/lib/phonics-v3/content/story-catalog";

function resolveStory(storyId: string) {
  const v3 = getStoryById(storyId);
  if (v3) return v3;
  return getDecodableStory(storyId);
}
import { AudioPlayButton } from "@/components/audio-play-button";
import { prefetchStoryLines } from "@/lib/phonics-v2/audio-prefetch";
import { BookOpen, Users, Mic } from "lucide-react";

type ReadMode = "amy" | "together" | "child";

type DecodableStoryReaderProps = {
  storyId: string;
  onComplete?: () => void;
};

export function DecodableStoryReader({ storyId, onComplete }: DecodableStoryReaderProps) {
  const story = resolveStory(storyId);
  const [lineIdx, setLineIdx] = useState(0);
  const [mode, setMode] = useState<ReadMode>("together");
  const [highlightWord, setHighlightWord] = useState<string | null>(null);

  const advance = useCallback(() => {
    if (!story) return;
    if (lineIdx < story.lines.length - 1) {
      setLineIdx((i) => i + 1);
      setHighlightWord(null);
    } else {
      onComplete?.();
    }
  }, [story, lineIdx, onComplete]);

  if (!story) {
    return <p className="text-sm text-muted-foreground">Story not found.</p>;
  }

  const line = story.lines[lineIdx]!;

  useEffect(() => {
    prefetchStoryLines(story.lines.map((l) => l.text));
  }, [story.id]);

  return (
    <div
      id="phonics-v2-stories"
      data-testid="decodable-story-reader"
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{story.emoji}</span>
        <div>
          <h4 className="font-quicksand font-bold">{story.title}</h4>
          <p className="text-[10px] text-muted-foreground">
            Line {lineIdx + 1} of {story.lines.length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["amy", "Amy Read", BookOpen],
            ["together", "Read Together", Users],
            ["child", "Child Read", Mic],
          ] as const
        ).map(([id, label, Icon]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={mode === id ? "default" : "outline"}
            className="rounded-full text-[10px] font-bold h-7"
            onClick={() => setMode(id)}
          >
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4 min-h-[4rem]">
        <p className="font-quicksand text-lg leading-relaxed">
          {line.text.split(/(\s+)/).map((part, i) => {
            const clean = part.replace(/[^a-zA-Z]/g, "");
            const isHl =
              clean &&
              line.highlightWords.some(
                (w) => w.toLowerCase() === clean.toLowerCase(),
              );
            const active = highlightWord?.toLowerCase() === clean.toLowerCase();
            return (
              <span
                key={`${lineIdx}-${i}`}
                className={cn(
                  isHl && "font-bold",
                  active && "bg-primary/20 rounded px-0.5",
                  isHl && "cursor-pointer",
                )}
                onClick={() => isHl && setHighlightWord(clean)}
              >
                {part}
              </span>
            );
          })}
        </p>
      </div>

      {(mode === "amy" || mode === "together") && (
        <AudioPlayButton
          text={line.text}
          mode="phonics"
          phonicsContentType="sentence"
          prefetchNextText={story.lines[lineIdx + 1]?.text}
          size="md"
          variant="violet"
          ariaLabel="Amy read this line"
          onFinished={() => {
            if (mode === "amy") advance();
          }}
        />
      )}

      <div className="flex gap-2">
        <Button type="button" size="sm" className="rounded-full flex-1" onClick={advance}>
          {lineIdx < story.lines.length - 1 ? "Next line" : "Finish story"}
        </Button>
      </div>

      {story.comprehensionQuestion && lineIdx === story.lines.length - 1 && (
        <p className="text-xs text-muted-foreground italic">
          Ask: {story.comprehensionQuestion}
        </p>
      )}
    </div>
  );
}
