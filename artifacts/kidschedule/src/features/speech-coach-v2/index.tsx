import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Mic, Sparkles } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListChildren } from "@workspace/api-client-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  isSpeechCoachV2Enabled,
  startSpeechCoachV2RemoteConfigPolling,
} from "./lib/remote-config";
import { SpeechCoachV2ParentDashboardPanel } from "./components/parent-dashboard";
import { useSpeechCoachV2DailyAllowance } from "./hooks/use-speech-coach-v2-daily-allowance";
import { isSpeechCoachLivingV1Enabled } from "@/lib/speech-coach/living-room";

export default function SpeechCoachV2HubPage() {
  const [, setLocation] = useLocation();
  const authFetch = useAuthFetch();
  const living = isSpeechCoachLivingV1Enabled();
  const { data: children = [] } = useListChildren();
  const child = children[0];
  const [v2Enabled, setV2Enabled] = useState(isSpeechCoachV2Enabled());
  const dailyAllowance = useSpeechCoachV2DailyAllowance(
    authFetch,
    child?.id,
    v2Enabled && Boolean(child?.id),
  );

  useEffect(() => {
    const stop = startSpeechCoachV2RemoteConfigPolling();
    const interval = setInterval(() => setV2Enabled(isSpeechCoachV2Enabled()), 30_000);
    return () => {
      stop();
      clearInterval(interval);
    };
  }, []);

  if (!v2Enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-sky-500" />
        <h1 className="mt-4 text-2xl font-bold">Speech Coach</h1>
        <p className="mt-2 text-muted-foreground">
          Coming soon — a brand-new voice practice experience powered by OpenAI Realtime.
        </p>
        <AppLink href="/speech-coach" className="mt-6 inline-block">
          <Button variant="outline">Use Speech Coach</Button>
        </AppLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
      <button
        type="button"
        onClick={() => setLocation("/parenting-hub", { replace: true })}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div
        className={
          living
            ? "rounded-3xl border border-border/60 bg-card/80 p-6 text-foreground shadow-sm"
            : "rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 text-white shadow-lg"
        }
      >
        <p
          className={
            living
              ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              : "text-xs font-semibold uppercase tracking-wider text-white/70"
          }
        >
          {living ? "Voice together" : "AmyNest AI™ Speech Coach"}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{living ? "Practice with Amy" : "Speech Coach"}</h1>
        <p className={living ? "mt-2 text-sm text-muted-foreground" : "mt-2 text-sm text-white/85"}>
          {living
            ? "Calm live practice for pronunciation, fluency, and confidence — Amy beside you."
            : "Live AI speech coaching for pronunciation, fluency, and confidence."}
        </p>
        {dailyAllowance && (
          <p className={living ? "mt-1 text-xs font-semibold text-muted-foreground" : "mt-1 text-xs font-semibold text-white/75"}>
            {dailyAllowance}
          </p>
        )}
        <AppLink href="/speech-coach-v2/session" source="speech-coach-v2-hub">
          <Button
            className={
              living
                ? "mt-5 w-full min-h-12 rounded-xl"
                : "mt-5 w-full rounded-xl bg-white text-indigo-700 hover:bg-white/90"
            }
            size="lg"
            data-testid="start-speech-coach-v2"
          >
            <Mic className="mr-2 h-5 w-5" />
            {living ? "Begin gently" : "Start speaking with Amy"}
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </AppLink>
      </div>

      <Tabs defaultValue="child" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="child">Practice</TabsTrigger>
          <TabsTrigger value="parent">{living ? "Progress" : "Parent Dashboard"}</TabsTrigger>
        </TabsList>
        <TabsContent value="child" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <ul className="space-y-2">
                {living ? (
                  <>
                    <li>• A guided practice with Amy</li>
                    <li>• Age-right help for ages 2–10</li>
                    <li>• Gentle progress you can notice</li>
                    <li>• {dailyAllowance ?? "Daily practice from your plan"}</li>
                  </>
                ) : (
                  <>
                    <li>• Guided session with 6 phases</li>
                    <li>• Age-adaptive lessons for ages 2–10</li>
                    <li>• Stars, points, and confidence badges</li>
                    <li>• {dailyAllowance ?? "Daily practice limit from your plan"}</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="parent" className="mt-4">
          {child ? (
            <SpeechCoachV2ParentDashboardPanel childId={child.id} />
          ) : (
            <p className="text-sm text-muted-foreground">Add a child to see progress.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
