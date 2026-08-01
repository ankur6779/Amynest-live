/**
 * Ask Amy entry shell (Sprint 2 · S2-T02).
 * Existing AssistantPage is treated as a black box — no AI/prompt/streaming changes.
 */

import { useState } from "react";
import { Link, Redirect } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAskAmyV2Enabled } from "@/v2/entry/v2-shell-flags";
/** Existing Ask Amy — black box; no AI / prompt / streaming changes. */
import AssistantBlackBox from "@/pages/assistant";

const SUGGESTED_PROMPTS = [
  "How can I help my child talk more?",
  "What should mornings look like?",
  "Is this sleep pattern normal?",
] as const;

export default function AskAmyPage() {
  if (!isAskAmyV2Enabled()) {
    return <Redirect to="/assistant" />;
  }

  return <AskAmyShell />;
}

function AskAmyShell() {
  const [showConversation, setShowConversation] = useState(false);

  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4"
      data-testid="v2-ask-amy-shell"
      aria-labelledby="ask-amy-heading"
    >
      <header className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          asChild
        >
          <Link href="/today" aria-label="Back to Today" data-testid="v2-ask-amy-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 id="ask-amy-heading" className="text-xl font-semibold tracking-tight">
            Ask Amy
          </h1>
          <p className="text-xs text-muted-foreground">Entry shell — existing chat unchanged</p>
        </div>
      </header>

      {!showConversation ? (
        <section className="space-y-4" aria-label="Ask Amy entry">
          <p className="text-sm text-muted-foreground">
            Suggested prompts (placeholders). Tapping opens the existing Ask Amy conversation.
          </p>
          <ul className="flex flex-col gap-2" role="list">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground"
                  data-testid="v2-ask-amy-prompt-placeholder"
                  onClick={() => setShowConversation(true)}
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="w-full rounded-xl"
            size="lg"
            data-testid="v2-ask-amy-start"
            onClick={() => setShowConversation(true)}
          >
            Start conversation
          </Button>
        </section>
      ) : (
        <section
          className="min-h-[50vh] rounded-2xl border border-border bg-card"
          aria-label="Conversation container"
          data-testid="v2-ask-amy-conversation"
        >
          <div className="border-b border-border px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConversation(false)}
            >
              Back to entry
            </Button>
          </div>
          <AssistantBlackBox />
        </section>
      )}
    </main>
  );
}
