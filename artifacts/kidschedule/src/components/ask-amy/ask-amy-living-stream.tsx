/**
 * Ask Amy Phase 2 — Help companionship living surface.
 * Ask Amy + Emotional as one calm room. Keep prompts. Never chatbot / helpdesk / AI tool.
 * Presentation only — AI / memory / APIs untouched.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { AppLink } from "@/components/app-link";
import {
  ASK_AMY_QUIET_PATHS,
  assistantCompanionshipHref,
  recommendAskAmyAction,
  type AskAmyPathId,
} from "@/lib/ask-amy/living-room";
import "@/pages/first-experience-material.css";
import "./ask-amy-living-room.css";

const HELP_MEMORY = ROOM_HEROES.help;

const ASK_PROMPT_IDS = ["sleep", "tantrums", "picky", "school"] as const;
const FEELING_IDS = ["overwhelmed", "anxious", "connect", "break"] as const;

export type AskAmyLivingStreamProps = {
  childName: string;
  /** null = companionship open only — no prompt catalogue under fold */
  activePath?: AskAmyPathId | null;
  onSelectPath: (pathId: AskAmyPathId) => void;
};

export function AskAmyLivingStream({
  childName,
  activePath = null,
  onSelectPath,
}: AskAmyLivingStreamProps) {
  const { t } = useTranslation();
  const recommend = useMemo(
    () => recommendAskAmyAction(childName),
    [childName],
  );

  return (
    <div
      className="aa-living-surface"
      data-testid="ask-amy-living-stream"
      data-aa-living="1"
      data-aa-hierarchy="deepen"
    >
      <header className="aa-today-hero" data-testid="ask-amy-today-hero">
        <div
          className="fe-memory-mount aa-today-memory"
          data-testid="ask-amy-visual-memory"
          data-fe-shot={HELP_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={HELP_MEMORY.src}
              alt={HELP_MEMORY.alt}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="aa-today-readability" aria-hidden="true" />
            <div className="aa-today-copy">
              <p className="aa-today-eyebrow">
                {t("ask_amy.living.eyebrow", {
                  defaultValue: "Today's Help",
                })}
              </p>
              <h1 className="aa-today-title">
                {t("ask_amy.living.title", {
                  name: childName,
                  defaultValue: `I'm here with you and ${childName}.`,
                })}
              </h1>
              <p className="aa-today-purpose">
                {t("ask_amy.living.purpose", {
                  defaultValue:
                    "Amy is a companion — never a chatbot, helpdesk, or AI tool.",
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <AppLink
        href={assistantCompanionshipHref()}
        source="ask-amy-living-recommend"
        className="aa-recommend-btn"
        data-testid="ask-amy-recommend"
      >
        <span className="aa-recommend-cue">{recommend.label}</span>
        <span className="aa-recommend-title">{recommend.title}</span>
        <span className="aa-recommend-purpose">{recommend.purpose}</span>
      </AppLink>

      <div className="aa-quiet-band">
        <p className="aa-quiet-label">
          {t("ask_amy.living.quiet_paths", {
            defaultValue: "Quiet ways to be with Amy",
          })}
        </p>
        <div className="aa-quiet-list" data-testid="ask-amy-quiet-paths">
          {ASK_AMY_QUIET_PATHS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="aa-quiet-path"
              data-testid={`ask-amy-quiet-${p.id}`}
              data-active={activePath === p.id ? "true" : "false"}
              aria-current={activePath === p.id ? "true" : undefined}
              onClick={() => onSelectPath(p.id)}
            >
              <span className="aa-quiet-path-title">{p.title}</span>
              <span className="aa-quiet-path-purpose">{p.purpose}</span>
            </button>
          ))}
        </div>
      </div>

      {activePath === "ask" ? (
        <div className="aa-deepen" data-testid="ask-amy-deepen-ask">
          <p className="aa-deepen-label">
            {t("ask_amy.living.ask_label", {
              defaultValue: "Gentle starting places",
            })}
          </p>
          <div className="aa-prompt-list">
            {ASK_PROMPT_IDS.map((id) => {
              const label = t(`parent_hub.amy.prompts.${id}.label`);
              const prompt = t(`parent_hub.amy.prompts.${id}.prompt`);
              return (
                <AppLink
                  key={id}
                  href={assistantCompanionshipHref(prompt)}
                  source={`ask-amy-prompt-${id}`}
                  className="aa-prompt-link"
                  data-testid={`ask-amy-prompt-${id}`}
                >
                  {label}
                </AppLink>
              );
            })}
          </div>
          <AppLink
            href={assistantCompanionshipHref()}
            source="ask-amy-open"
            className="aa-open-amy"
            data-testid="ask-amy-open"
          >
            {t("ask_amy.living.open", {
              defaultValue: "Talk with Amy quietly",
            })}
          </AppLink>
        </div>
      ) : null}

      {activePath === "feelings" ? (
        <div className="aa-deepen" data-testid="ask-amy-deepen-feelings">
          <p className="aa-deepen-label">
            {t("ask_amy.living.feelings_label", {
              defaultValue: "When the feeling is heavy",
            })}
          </p>
          <div className="aa-prompt-list">
            {FEELING_IDS.map((id) => {
              const title = t(`parent_hub.emotional_cards.${id}.title`);
              const subtitle = t(`parent_hub.emotional_cards.${id}.subtitle`);
              const prompt = t(`parent_hub.emotional_cards.${id}.prompt`);
              return (
                <AppLink
                  key={id}
                  href={assistantCompanionshipHref(prompt)}
                  source={`ask-amy-feeling-${id}`}
                  className="aa-prompt-link"
                  data-testid={`ask-amy-feeling-${id}`}
                >
                  {title}
                  <span className="aa-prompt-sub">{subtitle}</span>
                </AppLink>
              );
            })}
          </div>
          <AppLink
            href={assistantCompanionshipHref()}
            source="ask-amy-feelings-open"
            className="aa-open-amy"
            data-testid="ask-amy-feelings-open"
          >
            {t("ask_amy.living.open_feelings", {
              defaultValue: "Sit with Amy for a moment",
            })}
          </AppLink>
        </div>
      ) : null}

      <p className="aa-support-note">
        {t("ask_amy.living.continuity", {
          defaultValue: "We'll continue helping as your child grows.",
        })}
      </p>
      <p className="aa-support-note aa-support-invite">{PREMIUM_VOICE.invitation}</p>
      <p className="aa-support-note aa-support-continue">
        {t("ask_amy.living.continue_support", {
          defaultValue: PREMIUM_VOICE.continueCta,
        })}
      </p>
    </div>
  );
}
