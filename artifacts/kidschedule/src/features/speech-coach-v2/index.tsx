import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Mic, Sparkles } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListChildren } from "@workspace/api-client-react";
import { runSafeNavAction, smartBack } from "@/lib/safe-navigation";
import {
  isSpeechCoachV2Enabled,
  startSpeechCoachV2RemoteConfigPolling,
} from "./lib/remote-config";
import { SpeechCoachV2ParentDashboardPanel } from "./components/parent-dashboard";

export default function SpeechCoachV2HubPage() {
  const [, setLocation] = useLocation();
  const { data: children = [] } = useListChildren();
  const child = children[0];
  const [v2Enabled, setV2Enabled] = useState(isSpeechCoachV2Enabled());

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
        <h1 className="mt-4 text-2xl font-bold">Speech Coach V2</h1>
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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        type="button"
        onClick={() => runSafeNavAction("speech-coach-v2-back", () => smartBack(setLocation, "/speech-coach-v2", "speech-coach-v2-back"))}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          AmyNest AI™ Speech Coach V2
        </p>
        <h1 className="mt-2 text-2xl font-bold">Talk with Amy</h1>
        <p className="mt-2 text-sm text-white/85">
          A structured 10-minute speech session for pronunciation, fluency, and confidence.
          Voice-first — no buttons between exercises.
        </p>
        <AppLink href="/speech-coach-v2/session" source="speech-coach-v2-hub">
          <Button
            className="mt-5 w-full rounded-xl bg-white text-indigo-700 hover:bg-white/90"
            size="lg"
            data-testid="start-speech-coach-v2"
          >
            <Mic className="mr-2 h-5 w-5" />
            Start speaking with Amy
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </AppLink>
      </div>

      <Tabs defaultValue="child" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="child">Practice</TabsTrigger>
          <TabsTrigger value="parent">Parent Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="child" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• 10-minute guided session with 6 phases</li>
                <li>• Age-adaptive lessons for ages 2–10</li>
                <li>• Stars, points, and confidence badges</li>
                <li>• 10 minutes per day — healthy practice limit</li>
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
