import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import CoachCard, { CARD_HEIGHT, type CoachWin } from "@/components/CoachCard";
import ProgressBar from "@/components/ProgressBar";
import AppDataStatusBanner from "@/components/AppDataStatusBanner";
import { useAppStore } from "@/store/useAppStore";
import { type ActionResult } from "@/components/ActionButtons";
import { brand, gradients, palette } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";

const { height: SCREEN_H } = Dimensions.get("window");

const ACCENTS: ReadonlyArray<readonly [string, string]> = [
  gradients.violetToPurple,
  gradients.violetToIndigo,
  gradients.deepVioletFlip,
  gradients.purpleToDeep,
  gradients.indigoToViolet,
  gradients.purpleToPurple,
];

const STARTER_WINS: Omit<CoachWin, "index" | "accent">[] = [
  {
    id: "w1",
    title: "Build a 'Calm Down First' habit",
    objective: "Help your child move from emotional flooding to a regulated state — without lectures or punishment.",
    explanation:
      "When a child is upset, the thinking part of their brain (prefrontal cortex) goes offline and the emotional brain (limbic system) takes over. No amount of reasoning works in this state — they literally can't access logic. Your job in that moment is not to teach, but to co-regulate. By staying calm, lowering your voice, and offering presence instead of solutions, you signal safety. Once their nervous system feels safe, the thinking brain comes back online — and only then can a real conversation happen. Over weeks, your child internalises this pattern and starts self-regulating.",
    actions: [
      "Get down to your child's eye level and soften your face.",
      "Lower your voice to half-volume — slower than feels natural.",
      "Name what you see: \"You're really upset right now. I'm here.\"",
      "Offer a body anchor — a hug, hand on back, or sit beside them.",
      "Wait until breathing slows before talking about what happened.",
    ],
    example:
      "Your 6-year-old slams her homework book and shouts \"I HATE THIS!\" Instead of \"Don't shout at me\", you sit beside her, breathe slowly, and say \"That looked really frustrating\". Two minutes of silence later, she leans into you. Now — and only now — you can ask what made it hard.",
    mistake:
      "Reasoning, threatening, or punishing while the child is dysregulated. \"If you don't calm down right now…\" pours fuel on the fire and teaches them their big feelings are dangerous to you.",
    microTask:
      "Today, the next time your child gets upset, do nothing for 60 seconds except be near them and breathe slowly. Notice what shifts.",
    science:
      "Based on Dr. Daniel Siegel's \"Connect & Redirect\" framework and polyvagal theory (Stephen Porges).",
  },
  {
    id: "w2",
    title: "Use 'Connection before Correction'",
    objective: "Reduce defiance and power struggles by leading with empathy before any expectation.",
    explanation:
      "Children comply with people they feel connected to — not people they fear. When you correct first (\"Stop that!\"), the child's brain registers threat and goes into fight/flight/freeze. When you connect first (a warm look, a touch, naming the feeling), the child's nervous system relaxes and the thinking brain stays online. The correction that follows is then heard, not resisted. This isn't permissive parenting — limits still hold firm. It's the *order* that changes everything: feel-then-fix, not fix-then-feel.",
    actions: [
      "Pause before reacting. Take one breath.",
      "Make eye contact and offer a small physical touch (shoulder/hand).",
      "Acknowledge feeling first: \"You really wanted to keep playing.\"",
      "Then state the limit calmly and clearly, just once.",
      "Offer a choice within the limit when possible.",
    ],
    example:
      "Bath time. Your child shouts \"NO BATH!\" Instead of \"Get in NOW\", kneel down: \"You were having so much fun with your blocks. It's hard to stop. Bath is happening — do you want to bring one block in, or pick a bath toy?\"",
    mistake:
      "Skipping the connection step because you're in a hurry. Three seconds of connection saves ten minutes of struggle.",
    microTask:
      "Pick one daily transition (meal, bath, bed) and lead with one connection sentence before the request — for the next 3 days.",
    science:
      "Drawn from Dr. Karyn Purvis's TBRI model and Dr. Becky Kennedy's \"two things are true\" framework.",
  },
  {
    id: "w3",
    title: "Replace 'Don't' with 'Do'",
    objective: "Make instructions land 3x faster by giving the brain a clear picture instead of a negation.",
    explanation:
      "The young brain processes images, not negations. \"Don't run\" creates a mental image of running. \"Walking feet, please\" creates an image of walking. The same applies to \"don't shout\", \"don't spill\", \"don't hit\". Each negative command forces the child to first picture the wrong thing, then suppress it, then guess the right thing. That's three steps. A positive instruction is one step — and it works in seconds. This isn't a small tweak — it's one of the highest-leverage shifts in everyday parenting.",
    actions: [
      "Catch yourself mid-\"don't\". Pause.",
      "Ask: what do I want them TO do? Picture it.",
      "Say it as an action: \"Feet on the floor\", \"Inside voice\", \"Gentle hands\".",
      "Add a why in 4 words or less: \"so toys stay safe\".",
      "Praise the moment they do it, even slightly.",
    ],
    example:
      "Toddler bangs spoon on table. Instead of \"Don't bang!\" → \"Spoon goes in the bowl.\" Or as you hand them a fragile cup → \"Two hands on the cup.\"",
    mistake:
      "Long explanations after the don't. \"Don't run because you'll fall and hurt yourself and we'll have to go to the doctor…\" — the child stopped listening at \"don't\".",
    microTask:
      "Count your \"don'ts\" today. Tomorrow, swap 5 of them for a positive instruction. Notice the difference.",
    science:
      "Linguistic research by Lev Vygotsky on inner speech, and modern work by Dr. Laura Markham (Aha! Parenting).",
  },
  {
    id: "w4",
    title: "The 'When-Then' command",
    objective: "End nagging by using the natural order of life as your authority — instead of yourself.",
    explanation:
      "When you say \"Brush your teeth!\", you become the obstacle to whatever the child wants next. When you say \"When teeth are brushed, then we read the story\", reality becomes the structure — and you become the helpful guide who gets them to the good thing. There's no power struggle because you're not the gatekeeper of NO; you're the helper toward YES. Critically: the \"when\" must always come before the \"then\". Reverse it (\"You can have story IF you brush\") and it sounds like a threat. The grammar matters.",
    actions: [
      "Identify what your child wants (the THEN).",
      "Identify the non-negotiable that must happen first (the WHEN).",
      "Say it in this exact order: \"When ___, then ___.\"",
      "Walk away if possible — no pressure, no repeating.",
      "When they do it, follow through on the THEN immediately.",
    ],
    example:
      "\"When your shoes are on, then we go to the park.\" Then you sit by the door and read your phone. The child decides when the park starts. They almost always choose: now.",
    mistake:
      "Repeating it five times. Say it once, then trust it. Repeating it teaches your child your words don't mean anything until the 5th time.",
    microTask:
      "Use one \"When-Then\" today around a sticky transition (screen off, getting dressed, leaving the playground).",
    science:
      "Behavioural psychology — Premack's principle (1959): high-frequency behaviour reinforces low-frequency behaviour.",
  },
  {
    id: "w5",
    title: "Repair after a rupture",
    objective: "Turn moments where you lost your cool into the deepest connection-building opportunities.",
    explanation:
      "Every parent loses their temper sometimes. What separates a secure parent–child bond from an anxious one is not the absence of rupture — it's the presence of repair. When you go back, calmly, and own your part (\"I yelled. That wasn't okay. I was overwhelmed, but it's not your fault.\"), you teach your child four life-changing things: (1) feelings are normal, (2) mistakes can be repaired, (3) they are still loved when things go wrong, (4) accountability is strength, not weakness. Repair done well makes the bond stronger than if the rupture never happened.",
    actions: [
      "Wait until you're truly calm — could be 10 minutes or 2 hours.",
      "Approach gently. Get to their level.",
      "Own your part specifically — no \"but you…\" attached.",
      "Validate their experience: \"That must have felt scary/unfair.\"",
      "End with reconnection: a hug, a shared activity, or just sitting together.",
    ],
    example:
      "You snapped because the milk spilled. Two hours later: \"Hey. Earlier when I shouted about the milk — that wasn't fair to you. Spills happen. I was tired and I took it out on you. I'm really sorry.\" Watch their face soften.",
    mistake:
      "Apologising with a defence: \"I'm sorry I shouted, BUT you should have been more careful.\" That's not repair, that's blame in apology clothing.",
    microTask:
      "Think of the most recent moment you wish had gone differently. Repair it today — even if it was days ago.",
    science:
      "Dr. Ed Tronick's \"Still Face\" experiments and Dr. Dan Hughes's PACE model (Playfulness, Acceptance, Curiosity, Empathy).",
  },
];

const EXTRA_WINS: Omit<CoachWin, "index" | "accent">[] = [
  {
    id: "ex1",
    title: "Lower the demand, raise the success",
    objective: "Break a stuck pattern by shrinking the ask until your child can succeed.",
    explanation:
      "When a child resists a task repeatedly, the demand is usually too big for their current capacity — emotionally, physically, or cognitively. Resistance isn't defiance; it's overwhelm wearing a tough mask. Instead of fighting harder, shrink the ask radically. \"Tidy your room\" becomes \"Pick up three things and stop.\" Each small win rebuilds the child's belief that they CAN do it — and competence, not pressure, is what scales effort. After a week of micro-wins, you can quietly raise the bar again.",
    actions: [
      "Identify the task they're resisting.",
      "Cut it into a piece they could do in 60 seconds.",
      "Make it a game or a challenge with a clear stop point.",
      "Celebrate the completion — specifically and warmly.",
      "Hold that smaller bar for a few days before nudging it up.",
    ],
    example:
      "Child won't do homework. Try: \"Just write your name and the date. Then we stop and decide what's next.\" Often, once they're sitting and the pen is moving, they continue.",
    mistake:
      "Shrinking the task but staying tense or sarcastic about it (\"Oh, can you manage even THAT much?\"). The tone undoes the technique.",
    microTask:
      "Pick one stuck task today. Shrink the ask to something tiny. Watch what happens.",
    science:
      "Behavioural shaping (B.F. Skinner) and Dr. Ross Greene's Collaborative & Proactive Solutions model.",
  },
  {
    id: "ex2",
    title: "Use playful parenting to dissolve resistance",
    objective: "Turn a power struggle into a giggle — and watch cooperation appear.",
    explanation:
      "Laughter releases oxytocin and lowers cortisol — for both of you. A child who is laughing is, by definition, no longer in fight-or-flight. This is why playful parenting is one of the most underused superpowers. Acting silly, pretending you can't lift a tiny shoe, or racing them to the bathroom shifts the moment from \"me vs. you\" to \"us, having fun, getting things done\". It works fastest with kids 2–8 and beautifully even with older children when done with respect.",
    actions: [
      "Catch the rising tension early — before it escalates.",
      "Make yourself the silly one (never make the child the joke).",
      "Use exaggeration: a giant yawn, a wobbly walk, a pretend battle with the sock.",
      "Keep the goal in sight — playfulness is the path, not the destination.",
      "Stop when they ask to stop. Respect always wins.",
    ],
    example:
      "Child won't put on pyjamas. You hold up the pyjamas: \"These pyjamas keep trying to put themselves on the dog! Quick, save them!\" Child rushes over giggling.",
    mistake:
      "Forcing the play when the child is already deeply dysregulated. Below a certain threshold, they need calm, not silliness.",
    microTask:
      "Try one silly intervention today on a daily friction point. Notice how it changes the energy.",
    science:
      "Dr. Lawrence Cohen's \"Playful Parenting\" and Dr. Stuart Brown's research on play and brain development.",
  },
  {
    id: "ex3",
    title: "Special 1-on-1 time (15 minutes)",
    objective: "Refill your child's connection cup so the rest of the day flows easier.",
    explanation:
      "Most behavioural challenges are connection challenges in disguise. A child who feels deeply seen by their parent for even 15 focused minutes a day shows fewer outbursts, listens better, and sleeps more peacefully. The key word is *focused* — phone away, no siblings, no agenda. The child leads. You follow. This isn't a reward to be earned; it's a daily nutrient like food or sleep. Even 10 minutes counts. The ROI on this is the highest of any parenting intervention.",
    actions: [
      "Pick a consistent 10–15 minute slot daily — same time if possible.",
      "Phone in another room. Siblings occupied elsewhere.",
      "Let your child choose the activity (within reason).",
      "Narrate what you see them doing instead of asking questions.",
      "End with a warm, predictable closing: \"That was special. Same time tomorrow?\"",
    ],
    example:
      "After dinner, 7:00–7:15. Your child picks Lego. You sit on the floor and say \"Wow, you put the red one on top — that's tall!\" rather than quizzing or instructing. Watch their face.",
    mistake:
      "Multitasking — checking your phone, prepping dinner, taking a call. The child knows. The magic only works at 100% presence.",
    microTask:
      "Schedule 15 minutes today. Block it on your phone like a meeting. Show up fully.",
    science:
      "Dr. Stanley Greenspan's Floortime, and decades of attachment research (Bowlby, Ainsworth, Sroufe).",
  },
  {
    id: "ex4",
    title: "Pre-teach the next transition",
    objective: "Cut transition meltdowns by 70% by removing the surprise.",
    explanation:
      "Children's brains process change much more slowly than adults'. A sudden \"Time to leave!\" feels jarring even when expected. Pre-teaching — giving multiple gentle warnings before a transition — gives their brain time to switch tracks. The pattern: warn far out, warn middle, warn close. By the third warning, they've already started preparing internally. This single shift dramatically reduces the resistance you face at every transition: leaving the park, ending screens, getting out the bath, going to bed.",
    actions: [
      "10 minutes before: \"In 10 minutes we'll start packing up.\"",
      "5 minutes before: \"5 more minutes — pick what you'll do last.\"",
      "1 minute before: \"One minute. Decide your last thing.\"",
      "At time: come close, soft tone, follow through gently.",
      "Acknowledge the hard feeling if it comes: \"Yeah. It's hard to stop.\"",
    ],
    example:
      "At the park: \"10 more minutes!\" then \"5 minutes — one last slide?\" then \"Last go on the swing.\" By the time you leave, they've already accepted it.",
    mistake:
      "Skipping the warnings because \"we're already late.\" The 90 seconds you save by skipping causes a 10-minute meltdown.",
    microTask:
      "Use the 10/5/1 warning pattern on the next transition today — even if you usually don't.",
    science:
      "Executive function research on attentional shifting (Adele Diamond) and predictability in attachment (Bowlby).",
  },
  {
    id: "ex5",
    title: "The 5-second pause",
    objective: "Stop your auto-reaction and choose your response — the highest-impact 5 seconds in parenting.",
    explanation:
      "Most of the parenting moments we regret happen in the first 3 seconds of a triggering event. A spilled drink, a loud no, a sibling fight — and we react before our adult brain has even arrived. A simple 5-second pause (count to 5, take one breath, drop your shoulders) is enough to let the prefrontal cortex come back online. From there, you can choose. Without that pause, your childhood, your stress, and the day's accumulated load all speak for you. With the pause, YOU speak.",
    actions: [
      "Notice the heat rising — chest, jaw, voice.",
      "Mentally say: \"Pause.\"",
      "Take one slow inhale through the nose, slower exhale through the mouth.",
      "Drop your shoulders. Soften your face.",
      "Then — and only then — speak or act.",
    ],
    example:
      "Child knocks over juice for the third time. You feel the snap rising. Pause. Breathe. \"That was a big spill. Let's get a cloth.\" Voice steady. No lecture.",
    mistake:
      "Using the pause as punishment silence (\"I'm so disappointed I can't even speak\"). That's a different — and harmful — thing.",
    microTask:
      "Notice the next time you feel triggered today. Practise the 5-second pause once. That's the whole task.",
    science:
      "Neuroscience of the amygdala hijack (Daniel Goleman) and mindfulness-based parenting research (Susan Bögels).",
  },
  {
    id: "ex6",
    title: "Validate before you problem-solve",
    objective: "Get past the wall of resistance by letting your child feel truly heard first.",
    explanation:
      "When a child is upset, their #1 need is to feel that the person in front of them GETS IT. Jumping to solutions (\"Just tell the teacher!\", \"Don't worry, you'll have other friends\") feels dismissive — even when the advice is good. Pure validation, before any solving, opens the door. The formula: name the feeling, normalise it, then ask if they want help. Often they don't need a fix at all — they needed to be witnessed. This is true for 4-year-olds and teenagers.",
    actions: [
      "Put down what you're doing. Face them.",
      "Reflect back: \"That sounds really hard.\"",
      "Name the feeling: \"You're feeling left out.\"",
      "Normalise: \"Anyone would feel that way.\"",
      "Ask: \"Do you want me to just listen, or help you think about it?\"",
    ],
    example:
      "Child: \"Riya didn't sit with me at lunch.\" Don't say: \"Just sit with someone else!\" Say: \"Oh, that hurts. You really wanted to be with her today.\" Watch the shoulders drop.",
    mistake:
      "Validating with a hidden \"but\" — \"I hear you, BUT you need to toughen up.\" That cancels the validation completely.",
    microTask:
      "Today, when your child shares something hard, validate for 60 seconds before offering anything else.",
    science:
      "Marshall Rosenberg's Nonviolent Communication and Dr. John Gottman's emotion-coaching research.",
  },
];

export default function PremiumCoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();

  const [phase, setPhase] = useState<"loading" | "intro" | "cards">("loading");
  const [introText, setIntroText] = useState("");
  const [wins, setWins] = useState<CoachWin[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<Record<string, ActionResult>>({});
  const [pendingScrollTo, setPendingScrollTo] = useState<number | null>(null);
  const extraIdxRef = useRef(0);
  const listRef = useRef<FlatList<CoachWin>>(null);

  const introFull =
    "Hi, I'm Amy. I've put together your first 5 wins. Try them in order. If something doesn't land, tap 'Not yet' and I'll bring more.";

  // Loading → intro → cards
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("intro"), 1100);
    const { t } = useTranslation();
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "intro") return;
    let i = 0;
    let postTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      i += 1;
      setIntroText(introFull.slice(0, i));
      if (i >= introFull.length) {
        clearInterval(interval);
        postTimeout = setTimeout(() => {
          setWins(
            STARTER_WINS.map((w, idx) => ({
              ...w,
              index: idx + 1,
              accent: ACCENTS[idx % ACCENTS.length],
            })),
          );
          setPhase("cards");
        }, 700);
      }
    }, 28);
    return () => {
      clearInterval(interval);
      if (postTimeout) clearTimeout(postTimeout);
    };
  }, [phase]);

  // Deterministic post-append scroll: when wins length grows past pending target, scroll there
  useEffect(() => {
    if (pendingScrollTo === null) return;
    if (pendingScrollTo >= 0 && pendingScrollTo < wins.length) {
      const id = requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: pendingScrollTo, animated: true });
        setPendingScrollTo(null);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [pendingScrollTo, wins.length]);

  const progress = useMemo(() => {
    if (wins.length === 0) return 0;
    const totalCredit = wins.reduce((sum, w) => {
      const r = completed[w.id];
      if (r === "worked") return sum + 1;
      if (r === "partial") return sum + 0.5;
      return sum;
    }, 0);
    return Math.min(1, totalCredit / wins.length);
  }, [wins, completed]);

  const handleAction = useCallback(
    (winId: string, indexAtAction: number, result: ActionResult) => {
      setCompleted((prev) => ({ ...prev, [winId]: result }));
      const next = indexAtAction + 1;
      if (result === "not_worked") {
        // Append a new win, then queue scroll — effect runs once wins state commits
        setWins((prev) => {
          const idx = extraIdxRef.current % EXTRA_WINS.length;
          extraIdxRef.current += 1;
          const base = EXTRA_WINS[idx];
          const newWin: CoachWin = {
            ...base,
            id: `${base.id}-${prev.length + 1}`,
            index: prev.length + 1,
            accent: ACCENTS[prev.length % ACCENTS.length],
          };
          return [...prev, newWin];
        });
        setPendingScrollTo(next);
      } else {
        setPendingScrollTo(next);
      }
    },
    [],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const raw = Math.round(y / CARD_HEIGHT);
      setActiveIndex(Math.max(0, Math.min(wins.length - 1, raw)));
    },
    [wins.length],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[brand.violet50, palette.blue50, palette.fuchsia50]}
        locations={[0, 0.5, 1]}
        style={styles.bg}
      >
        {/* Decorative blobs */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.blob, { top: -60, left: -40, backgroundColor: `${brand.purple500}18` }]} />
          <View style={[styles.blob, { top: 200, right: -60, backgroundColor: `${brand.violet500}14`, width: 280, height: 280 }]} />
          <View style={[styles.blob, { bottom: -40, left: 30, backgroundColor: `${brand.indigo500}16` }]} />
        </View>

        {/* TOP HEADER (always visible) */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("screens.coach_premium.close_coach")}
          >
            <Ionicons name="close" size={22} color={c.textSubtle} />
          </TouchableOpacity>

          {/* Dots indicator */}
          {phase === "cards" && wins.length > 0 && (
            <View style={styles.dotsRow}>
              {wins.slice(0, Math.min(wins.length, 8)).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeIndex && styles.dotActive,
                  ]}
                />
              ))}
              {wins.length > 8 && <Text style={styles.dotsMore}>+{wins.length - 8}</Text>}
            </View>
          )}

          <View style={styles.progressPill}>
            <Ionicons name="sparkles" size={11} color={brand.violet600} />
            <Text style={styles.progressPillText}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        <AppDataStatusBanner />

        {/* Header progress bar */}
        {phase === "cards" && (
          <View style={styles.progressBarWrap}>
            <ProgressBar progress={progress} height={6} />
          </View>
        )}

        {/* PHASE: LOADING */}
        {phase === "loading" && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color={brand.purple500} />
            </View>
            <Text style={[styles.loadingTitle, { color: c.textStrong }]}>{t("screens.coach_premium.amy_is_thinking")}</Text>
            <Text style={[styles.loadingSub, { color: c.textSubtle }]}>{t("screens.coach_premium.curating_your_personal_wins")}</Text>
          </Animated.View>
        )}

        {/* PHASE: INTRO (typing) */}
        {phase === "intro" && (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.center}>
            <LinearGradient
              colors={gradients.violetToPurple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.amyAvatar}
            >
              <Ionicons name="sparkles" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.introBubble}>
              <Text style={[styles.introText, { color: c.textStrong }]}>
                {introText}
                <Text style={styles.caret}>|</Text>
              </Text>
            </View>
          </Animated.View>
        )}

        {/* PHASE: CARDS */}
        {phase === "cards" && wins.length > 0 && (
          <FlatList
            ref={listRef}
            data={wins}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={CARD_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, index) => ({
              length: CARD_HEIGHT,
              offset: CARD_HEIGHT * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              // Fallback: scroll to approximate offset, then retry once layout is ready
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
              setTimeout(() => {
                if (info.index >= 0 && info.index < wins.length) { // i18n-ok: code expression
                  listRef.current?.scrollToIndex({ index: info.index, animated: true });
                }
              }, 120);
            }}
            renderItem={({ item, index }) => (
              <CoachCard
                win={item}
                total={wins.length}
                topInset={insets.top}
                bottomInset={insets.bottom}
                onAction={(r) => handleAction(item.id, index, r)}
              />
            )}
          />
        )}
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 9999,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${brand.violet600}25`,
  },
  dotActive: {
    width: 18,
    backgroundColor: brand.violet600,
  },
  dotsMore: {
    color: brand.violet600,
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },
  progressPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${brand.violet600}10`,
    borderWidth: 1,
    borderColor: `${brand.violet600}30`,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  progressPillText: {
    color: brand.violet800,
    fontSize: 12.5,
    fontWeight: "800",
  },
  progressBarWrap: {
    position: "absolute",
    top: 78,
    left: 24,
    right: 24,
    zIndex: 9,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: `${brand.purple500}25`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  loadingSub: {
    fontSize: 14,
    fontWeight: "500",
  },
  amyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  introBubble: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    textAlign: "center",
  },
  caret: {
    color: brand.purple500,
    fontWeight: "800",
  },
});
