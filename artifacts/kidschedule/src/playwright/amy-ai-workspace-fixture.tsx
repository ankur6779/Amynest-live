/**
 * Visual fixture for the Amy AI conversation workspace.
 * Open: /playwright-amy-ai-workspace.html?panel=empty|thread|history
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { AmyAiConversationWorkspace } from "@/components/ask-amy/amy-ai-conversation-workspace";
import {
  AuthContext,
  type AuthContextValue,
} from "@/lib/firebase-auth-context";
import {
  emptyConversation,
  saveSessionStore,
  appendMessage,
} from "@/lib/ask-amy/conversation-sessions";

const USER_ID = "playwright_amy_ai";

const stubAuth: AuthContextValue = {
  user: {
    id: USER_ID,
    uid: USER_ID,
    firstName: "Parent",
    lastName: null,
    fullName: "Parent",
    imageUrl: null,
    emailAddresses: [],
    primaryEmailAddress: null,
    primaryPhoneNumber: null,
    setProfileImage: async () => {},
  },
  isLoaded: true,
  authStatus: "authenticated",
  getToken: async () => "playwright-token",
  signOut: async () => {},
  addListener: () => () => {},
};

const params = new URLSearchParams(window.location.search);
const panel = params.get("panel") ?? "empty";

const snacks = appendMessage(
  appendMessage(emptyConversation("snacks"), {
    role: "user",
    content: "Healthy snacks for John",
  }),
  {
    role: "assistant",
    content: "Keep tonight simple — fruit, cheese, water.",
  },
);

const bedtime = appendMessage(
  appendMessage(emptyConversation("bedtime"), {
    role: "user",
    content: "Bedtime routine",
  }),
  {
    role: "assistant",
    content:
      "John can use a quieter last hour.\n\n1. **Start with a Wind Down**\n2. **Create a Specific Routine**\n3. **Set a Consistent Time**",
  },
);

saveSessionStore(USER_ID, { conversations: [bedtime, snacks] });

window.fetch = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("/api/ai/messages")) {
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url.includes("/api/ai/assistant-ai")) {
    return new Response(
      JSON.stringify({
        answer:
          "Try a calmer last hour.\n\n1. **Start with a Wind Down**\n2. **Create a Specific Routine**",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
};

function Fixture() {
  return (
    <Router hook={() => ["/assistant", () => {}]}>
      <div className="flex h-screen flex-col bg-[#08060c]" data-testid="amy-ai-fixture">
        <AmyAiConversationWorkspace
          primaryChild={{ id: 1, name: "John", age: 5, ageMonths: 0 }}
          primaryChildTotalMonths={60}
          isInfantAmyContext={false}
          limitReached={false}
          refreshSubscription={() => undefined}
          initialConversationId={panel === "empty" ? null : bedtime.id}
        />
      </div>
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthContext.Provider value={stubAuth}>
      <Fixture />
    </AuthContext.Provider>
  </StrictMode>,
);
