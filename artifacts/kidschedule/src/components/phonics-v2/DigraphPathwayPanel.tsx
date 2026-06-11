import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AudioPlayButton } from "@/components/audio-play-button";
import {
  DIGRAPH_PATHWAY,
  getUnlockedDigraphs,
  isDigraphPathwayAvailable,
} from "@/lib/phonics-v3/content/digraph-pathway";
import {
  getDigraphAssessment,
  getDigraphLesson,
  getDigraphMission,
  getDigraphStories,
  type DigraphId,
} from "@/lib/phonics-v3/content/digraph-catalog";
import { VoicePhonicsRound } from "./VoicePhonicsRound";
import { DecodableStoryReader } from "./DecodableStoryReader";
import { Lock, Sparkles, BookOpen, Target, Mic } from "lucide-react";

type DigraphPathwayPanelProps = {
  avgMasteryScore: number;
  childId?: number;
  childName?: string;
  totalAgeMonths?: number;
  onWordPractice?: (word: string, digraph: DigraphId) => void;
  onAssessmentOutcome?: (word: string, passed: boolean, confidence: number) => void;
  onStoryComplete?: (storyId: string) => void;
};

export function DigraphPathwayPanel({
  avgMasteryScore,
  childId = 0,
  childName = "Reader",
  totalAgeMonths = 48,
  onWordPractice,
  onAssessmentOutcome,
  onStoryComplete,
}: DigraphPathwayPanelProps) {
  const [activeDigraph, setActiveDigraph] = useState<DigraphId | null>(null);
  const [assessWord, setAssessWord] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);

  if (!isDigraphPathwayAvailable(avgMasteryScore)) {
    return (
      <Card className="rounded-3xl border border-white/[0.08] bg-card/90 opacity-80">
        <CardContent className="p-5 flex items-center gap-3">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-quicksand text-base font-bold">Digraph Pathway</h3>
            <p className="text-[11px] text-muted-foreground">
              Unlocks when CVC mastery reaches 60%. Keep practicing blends!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlocked = getUnlockedDigraphs(avgMasteryScore);
  const stage = activeDigraph
    ? DIGRAPH_PATHWAY.find((d) => d.id === activeDigraph)
    : null;

  return (
    <Card
      id="phonics-v3-digraph-pathway"
      data-testid="phonics-v3-digraph-pathway"
      className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h3 className="font-quicksand text-base font-bold">Digraph Pathway</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            sh · ch · th · wh · ck · ng
          </Badge>
        </div>

        <div className="space-y-4">
          {DIGRAPH_PATHWAY.map((dig) => {
            const open = unlocked.some((u) => u.id === dig.id);
            const lesson = getDigraphLesson(dig.id);
            const mission = getDigraphMission(dig.id);
            const stories = getDigraphStories(dig.id);
            const assessment = getDigraphAssessment(dig.id);

            return (
              <div
                key={dig.id}
                className={`rounded-2xl border p-3 ${open ? "border-violet-500/30" : "border-border opacity-60"}`}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xl">{dig.emoji}</span>
                  <span className="font-bold text-sm">{dig.symbol}</span>
                  {!open && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <AudioPlayButton
                    mode="phonics"
                    text={dig.phoneme}
                    phonemeKey={lesson.phonemeAudioKey}
                    size="sm"
                    variant="ghost"
                  />
                  <Badge variant="secondary" className="text-[9px] ml-auto">
                    {stories.length} stories · {mission.tasks.length} tasks
                  </Badge>
                </div>

                <p className="text-[10px] text-muted-foreground mb-2">{lesson.intro}</p>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={activeDigraph === dig.id ? "default" : "outline"}
                    disabled={!open}
                    className="rounded-full text-[10px] h-7"
                    onClick={() => {
                      setActiveDigraph(dig.id);
                      setAssessWord(assessment.words[0] ?? dig.exampleWord);
                      setStoryId(stories[0]?.id ?? null);
                    }}
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Lesson
                  </Button>
                  {stories.slice(0, 3).map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant={storyId === s.id ? "default" : "secondary"}
                      disabled={!open}
                      className="rounded-full text-[10px] h-7"
                      onClick={() => {
                        setActiveDigraph(dig.id);
                        setStoryId(s.id);
                      }}
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      {s.title.slice(0, 14)}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {dig.words.slice(0, 6).map((w) => (
                    <Button
                      key={w.word}
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!open}
                      className="rounded-full text-[10px] h-7 gap-1"
                      onClick={() => {
                        onWordPractice?.(w.word, dig.id);
                        setAssessWord(w.word);
                        setActiveDigraph(dig.id);
                      }}
                    >
                      {w.emoji} {w.word}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {stage && unlocked.some((u) => u.id === stage.id) && (
          <div className="mt-4 rounded-2xl border border-violet-500/20 p-4 space-y-3">
            <p className="text-xs font-bold flex items-center gap-1">
              <Mic className="h-3.5 w-3.5" />
              {stage.symbol.toUpperCase()} voice assessment
            </p>
            {assessWord && childId > 0 && (
              <VoicePhonicsRound
                childId={childId}
                childName={childName}
                totalAgeMonths={totalAgeMonths}
                word={assessWord}
                onReviewOutcome={({ passed, confidence }) =>
                  onAssessmentOutcome?.(assessWord, passed, confidence)
                }
              />
            )}
            {storyId && (
              <DecodableStoryReader
                storyId={storyId}
                onComplete={() => onStoryComplete?.(storyId)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
