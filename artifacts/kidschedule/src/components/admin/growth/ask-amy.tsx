import { MessageSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { parseApiJson } from "@/lib/safe-json-response";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CopilotResponse } from "./gos-types";

const EXAMPLE_PROMPTS = [
  "Why did revenue fall yesterday?",
  "Compare India vs USA.",
  "Which feature drives subscriptions?",
  "Which campaign has highest LTV?",
  "Predict next month's MRR.",
  "Most likely churn users.",
];

export function AskAmyPanel() {
  const authFetch = useAuthFetch();
  const [question, setQuestion] = useState("");
  const [lastResponse, setLastResponse] = useState<CopilotResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await authFetch("/api/admin/growth/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const json = await parseApiJson<CopilotResponse & { ok?: boolean }>(res);
      return json;
    },
    onSuccess: (data) => setLastResponse(data),
  });

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    mutation.mutate(trimmed);
  };

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="font-semibold font-quicksand">Ask Amy Growth Intelligence</h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-auto">
          Architecture ready
        </span>
      </div>
      <form
        className="relative flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask questions about your business..."
          className="pl-9 bg-background/50 border-white/10 flex-1"
          aria-label="Ask Amy Growth Intelligence"
        />
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          Ask
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground mt-2">
        Copilot routes to GOS aggregates. LLM narration layer pending — responses use pattern-matched placeholders.
      </p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            className="text-[10px] rounded-full border border-white/10 px-2 py-0.5 text-muted-foreground hover:border-violet-500/30 hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
      {lastResponse && (
        <div className="mt-4 rounded-lg border border-white/10 bg-background/50 p-3 text-xs space-y-1">
          <p className="font-medium">{lastResponse.answer}</p>
          <p className="text-[10px] text-muted-foreground">
            Confidence {lastResponse.confidence}% · Sources: {lastResponse.sources.join(", ") || "—"}
          </p>
        </div>
      )}
    </div>
  );
}
