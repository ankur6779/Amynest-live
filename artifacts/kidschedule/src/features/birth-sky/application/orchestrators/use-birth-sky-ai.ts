/**
 * ConversationOrchestrator (Pack 6 state machine + Pack 2 entitlement).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFetchFn } from "../../infrastructure/api/birth-sky-api";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type {
  AiEntitlementMirror,
  BirthSkyConversation,
  BirthSkyMessage,
  ConversationEntryPoint,
  ConversationMachineState,
} from "../../domain/models/conversation";
import { assembleBirthSkyStreamContext } from "../ai/assemble-context";
import { applyChunk, createChunkBuffer } from "../ai/chunk-buffer";
import { DEFAULT_ASK_AMY_QUESTION } from "../../constants/ai-context";
import {
  ackBirthSkyDelivery,
  cancelBirthSkyJob,
  createBirthSkyConversation,
  fetchBirthSkyAiEntitlement,
  getBirthSkyConversation,
  listBirthSkyConversations,
  streamBirthSkyMessage,
} from "../../infrastructure/api/birth-sky-ai-api";
import {
  clearPendingAiIntent,
  isPendingAiIntentValid,
  loadPendingAiIntent,
  stashPendingAiIntent,
} from "../../infrastructure/repositories/pending-ai-intent-store";
import { trackBirthSkyEvent } from "../../lib/analytics";
import {
  applyPolishedBodies,
  savePolishedMessage,
} from "../../lib/polished-message-store";

type Options = {
  authFetch: AuthFetchFn;
  profile: BirthProfile;
  snapshot: SkySnapshot;
  childName: string;
  isPremiumClient: boolean;
  openPaywall: () => void;
  reflectionMeta?: {
    reflectionIds?: string[];
    reflectionPromptIds?: string[];
    reflectionCount?: number;
  };
};

export function useBirthSkyAi(options: Options) {
  const {
    authFetch,
    profile,
    snapshot,
    childName,
    isPremiumClient,
    openPaywall,
    reflectionMeta,
  } = options;

  const [open, setOpen] = useState(false);
  const [machine, setMachine] = useState<ConversationMachineState>("idle");
  const [entitlement, setEntitlement] = useState<AiEntitlementMirror | null>(null);
  const [conversations, setConversations] = useState<BirthSkyConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BirthSkyMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [composer, setComposer] = useState(DEFAULT_ASK_AMY_QUESTION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entryPoint, setEntryPoint] = useState<ConversationEntryPoint>("reflect");
  const [traditionCardId, setTraditionCardId] = useState<string | undefined>();
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  const jobIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef(DEFAULT_ASK_AMY_QUESTION);
  const bufferRef = useRef(createChunkBuffer());
  const planRef = useRef<{
    rhythm: import("../../lib/conversation-intelligence").ResponseRhythm;
    pattern: import("../../lib/conversation-intelligence").ResponsePattern;
  } | null>(null);
  const localMessagesRef = useRef<BirthSkyMessage[]>([]);

  const chartGrounding = useCallback(
    () => ({
      childName,
      sunSign: snapshot.astronomy.sunSign,
      moonSign: snapshot.astronomy.moonSign,
      risingSign: snapshot.astronomy.risingSign,
      moonPhaseLabel: snapshot.astronomy.moonPhaseLabel,
      daySky: snapshot.mode === "day_sky",
      birthDate: profile.birthDate,
    }),
    [childName, profile.birthDate, snapshot],
  );

  const refreshEntitlement = useCallback(async () => {
    const gate = await fetchBirthSkyAiEntitlement(authFetch, profile.profileId);
    setEntitlement(gate);
    return gate;
  }, [authFetch, profile.profileId]);

  const refreshList = useCallback(async () => {
    const list = await listBirthSkyConversations(authFetch, profile.profileId);
    setConversations(list);
    return list;
  }, [authFetch, profile.profileId]);

  useEffect(() => {
    const onOff = () => setOffline(true);
    const onOn = () => setOffline(false);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    return () => {
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
    };
  }, []);

  // Module entry: refresh entitlement (Pack 2 Addendum A §2).
  useEffect(() => {
    void refreshEntitlement().catch(() => undefined);
  }, [refreshEntitlement]);

  // Resume after premium within TTL.
  useEffect(() => {
    if (!isPremiumClient) return;
    const pending = loadPendingAiIntent();
    if (!isPendingAiIntentValid(pending) || !pending) return;
    if (pending.profileId !== profile.profileId) return;
    void (async () => {
      await refreshEntitlement();
      setEntryPoint("resume");
      setOpen(true);
      setMachine("creating");
      trackBirthSkyEvent("birth_sky.conversation_resumed", {
        mode: snapshot.mode,
      });
      clearPendingAiIntent("resumed");
      trackBirthSkyEvent("birth_sky.pending_ai_intent_cleared", { cause: "resumed" });
      setMachine("idle");
      // Auto-send last stashed flow uses default question (no prompt text stored).
      lastQuestionRef.current = DEFAULT_ASK_AMY_QUESTION;
      setComposer(DEFAULT_ASK_AMY_QUESTION);
    })();
  }, [isPremiumClient, profile.profileId, refreshEntitlement, snapshot.mode]);

  const hydrate = useCallback(
    async (
      conversationId: string,
      opts?: { expectMessageId?: string },
    ) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let data = await getBirthSkyConversation(authFetch, conversationId);
      // Read-after-write: retry briefly if the just-streamed message is missing.
      if (opts?.expectMessageId) {
        for (let attempt = 0; attempt < 6; attempt++) {
          if (data.messages.some((m) => m.messageId === opts.expectMessageId)) {
            break;
          }
          await sleep(120 * (attempt + 1));
          data = await getBirthSkyConversation(authFetch, conversationId);
        }
      }
      setActiveId(data.conversation.conversationId);
      const server = data.messages.map((m) => ({
        ...m,
        role: m.role as BirthSkyMessage["role"],
      }));
      const locals = localMessagesRef.current.filter(
        (m) =>
          m.conversationId === conversationId &&
          !server.some((s) => s.messageId === m.messageId),
      );
      // Re-apply client polish after server hydrate — never show raw server body
      // when a polished version exists (fixes polish-wipe P0).
      setMessages(
        applyPolishedBodies(profile.profileId, [...server, ...locals]),
      );
    },
    [authFetch, profile.profileId],
  );

  const closeAiFlow = useCallback(
    (explicitDismiss: boolean) => {
      abortRef.current?.abort();
      if (jobIdRef.current) {
        void cancelBirthSkyJob(authFetch, jobIdRef.current).catch(() => undefined);
      }
      setOpen(false);
      setMachine("idle");
      setStreamingText("");
      setErrorMessage(null);
      if (explicitDismiss) {
        clearPendingAiIntent("dismissed");
        trackBirthSkyEvent("birth_sky.pending_ai_intent_cleared", { cause: "dismissed" });
      }
    },
    [authFetch],
  );

  const runStream = useCallback(
    async (conversationId: string, question: string, ep: ConversationEntryPoint) => {
      if (offline) {
        setErrorMessage("You’re offline. Connect to ask Amy.");
        setMachine("failed");
        return;
      }

      setMachine("creating");
      setErrorMessage(null);
      setStreamingText("");
      bufferRef.current = createChunkBuffer();
      trackBirthSkyEvent("birth_sky.conversation_started", {
        mode: snapshot.mode,
        entry_point: ep,
      });

      const context = assembleBirthSkyStreamContext({
        profile,
        snapshot,
        childFirstName: childName,
        userQuestion: question,
        entryPoint: ep,
        traditionCardId,
        reflectionIds: reflectionMeta?.reflectionIds,
        reflectionPromptIds: reflectionMeta?.reflectionPromptIds,
        reflectionCount: reflectionMeta?.reflectionCount,
      });

      // Optimistic user message (server also persists; remapped on hydrate).
      const tempUser: BirthSkyMessage = {
        messageId: `temp_user_${Date.now()}`,
        conversationId,
        role: "user",
        body: question,
        sequence: messages.length + 1,
        status: "complete",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUser]);

      const abort = new AbortController();
      abortRef.current = abort;
      let deliveryId: string | null = null;
      let jobId: string | null = null;

      try {
        const result = await streamBirthSkyMessage(
          authFetch,
          conversationId,
          context,
          {
            onJob: (data) => {
              jobId = data.jobId;
              deliveryId = data.deliveryId;
              jobIdRef.current = data.jobId;
              setMachine("streaming");
              trackBirthSkyEvent("birth_sky.conversation_stream_started", {
                mode: snapshot.mode,
              });
            },
            onChunk: (data) => {
              bufferRef.current = applyChunk(
                bufferRef.current,
                data.chunkSequence,
                data.delta,
              );
              setStreamingText(bufferRef.current.text);
            },
            onDone: (data) => {
              void (async () => {
                const assistant: BirthSkyMessage = {
                  messageId: data.messageId,
                  conversationId,
                  role: "assistant",
                  body: data.finalText ?? bufferRef.current.text,
                  sequence: messages.length + 2,
                  jobId: data.jobId,
                  deliveryId: data.deliveryId,
                  modelVersion: data.modelVersion,
                  contextSchemaVersion: data.contextSchemaVersion,
                  snapshotVersion: data.snapshotVersion,
                  engineVersion: data.engineVersion,
                  status: "complete",
                  createdAt: new Date().toISOString(),
                };
                try {
                  const intel = await import("../../lib/conversation-intelligence");
                  const plan = planRef.current ?? {
                    rhythm: "answer_direct" as const,
                    pattern: "narrative" as const,
                  };
                  const polished = intel.runQualityPass({
                    profileId: profile.profileId,
                    body: assistant.body,
                    question,
                    chart: chartGrounding(),
                    rhythm: plan.rhythm,
                    pattern: plan.pattern,
                  });
                  assistant.body = polished.body;
                  // Persist polish before hydrate so server reload cannot wipe it.
                  savePolishedMessage(
                    profile.profileId,
                    assistant.messageId,
                    assistant.body,
                  );
                  const planets = [
                    snapshot.astronomy.sunSign ? "Sun" : null,
                    snapshot.astronomy.moonSign ? "Moon" : null,
                    snapshot.astronomy.risingSign && snapshot.mode !== "day_sky"
                      ? "Rising"
                      : null,
                  ].filter(Boolean) as string[];
                  intel.rememberConversationTurn({
                    profileId: profile.profileId,
                    question,
                    reply: assistant.body,
                    rhythm: plan.rhythm,
                    pattern: plan.pattern,
                    planets,
                  });
                } catch {
                  /* ignore */
                }
                const userLocal: BirthSkyMessage = {
                  ...tempUser,
                  messageId: `user_${data.messageId}`,
                };
                // Keep streamed turns in localMessagesRef so a stale hydrate GET
                // cannot drop the just-rendered assistant (hydration P0).
                localMessagesRef.current = [
                  ...localMessagesRef.current.filter(
                    (m) =>
                      m.messageId !== assistant.messageId &&
                      m.messageId !== userLocal.messageId &&
                      !m.messageId.startsWith("temp_"),
                  ),
                  userLocal,
                  assistant,
                ];
                setMessages((prev) => {
                  const withoutTemp = prev.filter((m) => !m.messageId.startsWith("temp_"));
                  return applyPolishedBodies(profile.profileId, [
                    ...withoutTemp,
                    userLocal,
                    assistant,
                  ]);
                });
                setStreamingText("");
                setMachine("completed");
                trackBirthSkyEvent("birth_sky.conversation_stream_completed", {
                  mode: snapshot.mode,
                });
                trackBirthSkyEvent("birth_sky.message_rendered", { role: "assistant" });

                if (data.consumeEligible) {
                  const ack = await ackBirthSkyDelivery(authFetch, data.deliveryId, {
                    profileId: profile.profileId,
                    conversationId,
                    jobId: data.jobId,
                  });
                  setEntitlement((e) =>
                    e
                      ? {
                          ...e,
                          aiInsightsUsedCount: ack.aiInsightsUsedCount,
                          canRequestAiInsight: ack.isPremium || ack.aiInsightsUsedCount < 1,
                          freeInsightRemaining: ack.isPremium
                            ? null
                            : Math.max(0, 1 - ack.aiInsightsUsedCount),
                          isPremium: ack.isPremium,
                        }
                      : e,
                  );
                  if (ack.consumedFreeInsight && !ack.alreadyAcked) {
                    trackBirthSkyEvent("birth_sky.first_ai_insight_used", {
                      mode: snapshot.mode,
                    });
                  }
                }
                await hydrate(conversationId, { expectMessageId: data.messageId });
                await refreshList();
                setMachine("idle");
              })();
            },
            onModerated: (data) => {
              setStreamingText("");
              setMachine("moderated");
              trackBirthSkyEvent("birth_sky.moderation_blocked", {});
              trackBirthSkyEvent("birth_sky.safety_fallback_shown", {});
              if (data.body) {
                const assistant: BirthSkyMessage = {
                  messageId: data.messageId,
                  conversationId,
                  role: "assistant",
                  body: data.body,
                  sequence: messages.length + 2,
                  jobId: data.jobId,
                  deliveryId: data.deliveryId,
                  status: "moderated",
                  createdAt: new Date().toISOString(),
                };
                // Moderated fallbacks are already safety text — store as displayed body.
                savePolishedMessage(profile.profileId, assistant.messageId, assistant.body);
                const userLocal: BirthSkyMessage = {
                  ...tempUser,
                  messageId: `user_${data.messageId}`,
                };
                localMessagesRef.current = [
                  ...localMessagesRef.current.filter(
                    (m) =>
                      m.messageId !== assistant.messageId &&
                      m.messageId !== userLocal.messageId &&
                      !m.messageId.startsWith("temp_"),
                  ),
                  userLocal,
                  assistant,
                ];
                setMessages((prev) => {
                  const withoutTemp = prev.filter((m) => !m.messageId.startsWith("temp_"));
                  return applyPolishedBodies(profile.profileId, [
                    ...withoutTemp,
                    userLocal,
                    assistant,
                  ]);
                });
              }
              void hydrate(conversationId, {
                expectMessageId: data.messageId,
              }).then(() => {
                setMachine("idle");
              });
            },
            onError: (data) => {
              if (data.error === "cancelled" || data.status === "cancelled") {
                setMachine("cancelled");
                trackBirthSkyEvent("birth_sky.conversation_cancelled", {});
                setMachine("idle");
                return;
              }
              setMachine("failed");
              setErrorMessage("Amy couldn’t finish that reply. Retry won’t use your free insight.");
              trackBirthSkyEvent("birth_sky.conversation_stream_failed", {
                error_code: data.error,
              });
            },
          },
          abort.signal,
        );

        if (result.paywalled) {
          setMachine("resume_pending");
          stashPendingAiIntent({
            profileId: profile.profileId,
            conversationId,
            entryPoint: ep,
            snapshotVersion: snapshot.snapshotVersion,
            traditionCardId,
          });
          trackBirthSkyEvent("birth_sky.premium_paywall_viewed", {
            reason: "ai_insight_limit",
          });
          openPaywall();
          return;
        }
      } catch {
        if (abort.signal.aborted) {
          setMachine("cancelled");
          trackBirthSkyEvent("birth_sky.conversation_cancelled", {});
          setMachine("idle");
          return;
        }
        setMachine("failed");
        setErrorMessage("Network error. Your free insight was not used.");
        trackBirthSkyEvent("birth_sky.conversation_stream_failed", {
          error_code: "network",
        });
      } finally {
        jobIdRef.current = jobId;
        void deliveryId;
      }
    },
    [
      authFetch,
      chartGrounding,
      childName,
      messages.length,
      offline,
      openPaywall,
      profile,
      reflectionMeta,
      refreshList,
      hydrate,
      snapshot,
      traditionCardId,
    ],
  );

  const openAskAmy = useCallback(
    async (ep: ConversationEntryPoint = "reflect", opts?: { traditionCardId?: string }) => {
      setEntryPoint(ep);
      setTraditionCardId(opts?.traditionCardId);
      setOpen(true);
      setErrorMessage(null);
      try {
        const gate = await refreshEntitlement();
        await refreshList();
        if (!gate.canRequestAiInsight && !gate.isPremium) {
          setMachine("resume_pending");
          stashPendingAiIntent({
            profileId: profile.profileId,
            conversationId: null,
            entryPoint: ep,
            snapshotVersion: snapshot.snapshotVersion,
            traditionCardId: opts?.traditionCardId,
          });
          trackBirthSkyEvent("birth_sky.premium_paywall_viewed", {
            reason: "ai_insight_limit",
          });
          openPaywall();
          return;
        }
        setMachine("idle");
      } catch {
        setErrorMessage("Could not open Ask Amy. Try again.");
        setMachine("failed");
      }
    },
    [openPaywall, profile.profileId, refreshEntitlement, refreshList, snapshot.snapshotVersion],
  );

  const send = useCallback(async () => {
    const question = composer.trim();
    if (!question) return;
    lastQuestionRef.current = question;

    const intel = await import("../../lib/conversation-intelligence");
    let planned = intel.planConversationTurn({
      profileId: profile.profileId,
      question,
      chart: chartGrounding(),
    });

    // Local follow-ups are client-only turns (no entitlement spend).
    if (planned.kind === "local_guide") {
      planRef.current = { rhythm: planned.rhythm, pattern: planned.pattern };
      const conversationId = activeId ?? `local_${profile.profileId}`;
      const ts = Date.now();
      const userMsg: BirthSkyMessage = {
        messageId: `user_local_${ts}`,
        conversationId,
        role: "user",
        body: question,
        sequence: messages.length + 1,
        status: "complete",
        createdAt: new Date().toISOString(),
      };
      const polishedLocal = intel.runQualityPass({
        profileId: profile.profileId,
        body: planned.body,
        question,
        chart: chartGrounding(),
        rhythm: planned.rhythm,
        pattern: planned.pattern,
      });
      const amyMsg: BirthSkyMessage = {
        messageId: `local_amy_${ts}`,
        conversationId,
        role: "assistant",
        body: polishedLocal.body,
        sequence: messages.length + 2,
        status: "complete",
        createdAt: new Date().toISOString(),
      };
      savePolishedMessage(profile.profileId, amyMsg.messageId, amyMsg.body);
      localMessagesRef.current = [...localMessagesRef.current, userMsg, amyMsg];
      setMessages((prev) => [...prev, userMsg, amyMsg]);
      setComposer("");
      setMachine("completed");
      intel.rememberConversationTurn({
        profileId: profile.profileId,
        question,
        reply: polishedLocal.body,
        rhythm: planned.rhythm,
        pattern: planned.pattern,
      });
      setMachine("idle");
      return;
    }

    planRef.current = { rhythm: planned.rhythm, pattern: planned.pattern };

    let conversationId = activeId;
    if (!conversationId) {
      setMachine("creating");
      const created = await createBirthSkyConversation(
        authFetch,
        profile.profileId,
        entryPoint,
      );
      conversationId = created.conversationId;
      setActiveId(conversationId);
      // Re-bind any pre-conversation local turns to the real id.
      localMessagesRef.current = localMessagesRef.current.map((m) =>
        m.conversationId.startsWith("local_")
          ? { ...m, conversationId: conversationId! }
          : m,
      );
      await refreshList();
    }
    await runStream(conversationId, question, entryPoint);
  }, [
    activeId,
    authFetch,
    chartGrounding,
    composer,
    entryPoint,
    messages.length,
    profile.profileId,
    refreshList,
    runStream,
  ]);

  const retry = useCallback(async () => {
    if (!activeId) {
      await send();
      return;
    }
    await runStream(activeId, lastQuestionRef.current, entryPoint);
  }, [activeId, entryPoint, runStream, send]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (jobIdRef.current) {
      void cancelBirthSkyJob(authFetch, jobIdRef.current);
    }
    setMachine("cancelled");
    trackBirthSkyEvent("birth_sky.conversation_cancelled", {});
    setStreamingText("");
    setMachine("idle");
  }, [authFetch]);

  return {
    open,
    machine,
    entitlement,
    conversations,
    activeId,
    messages,
    streamingText,
    composer,
    setComposer,
    errorMessage,
    offline,
    openAskAmy,
    send,
    retry,
    cancel,
    closeAiFlow,
    selectConversation: hydrate,
    newConversation: () => {
      setActiveId(null);
      localMessagesRef.current = [];
      setMessages([]);
      setStreamingText("");
      setErrorMessage(null);
      setMachine("idle");
      planRef.current = null;
    },
    setActiveId,
  };
}
