// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — i18n key manifest
//
// Single source of truth for the English copy. Both the web and mobile artifacts
// sync this manifest into their own `en.json` under `screens.speech_coach.*`.
//
// IMPORTANT: keys are FLAT dotted paths starting with `screens.speech_coach.`.
// When syncing into a translation file, split each key on "." and merge into a
// nested object so the namespace is rendered as a single canonical block. Do
// not create a duplicate top-level `screens` key in any en.json — duplicate
// JSON keys silently shadow each other.
// ─────────────────────────────────────────────────────────────────────────────

export type I18nKeyManifest = Readonly<Record<string, string>>;

export const SPEECH_COACH_I18N_MANIFEST: I18nKeyManifest = {
  // ── Section header ───────────────────────────────────────────────────────
  "screens.speech_coach.title": "Amy Speech Coach",
  "screens.speech_coach.subtitle":
    "Build confident communication through fun daily speech activities.",
  "screens.speech_coach.hub_tile.title": "Amy Speech Coach",
  "screens.speech_coach.hub_tile.description":
    "Daily 5-minute speech sessions, milestones, and confidence-building games.",

  // ── CTAs ─────────────────────────────────────────────────────────────────
  "screens.speech_coach.cta.start_practice": "Start Speech Practice",
  "screens.speech_coach.cta.check_milestones": "Check Milestones",
  "screens.speech_coach.cta.daily_session": "Daily 5-Minute Session",
  "screens.speech_coach.cta.view_progress": "View Progress",
  "screens.speech_coach.cta.ask_amy_coach": "Ask Amy Coach",

  // ── Section: Speech Development Dashboard ────────────────────────────────
  "screens.speech_coach.dashboard.title": "Speech Development Dashboard",
  "screens.speech_coach.dashboard.speech_age": "Speech age",
  "screens.speech_coach.dashboard.weekly_score": "This week",
  "screens.speech_coach.dashboard.pronunciation_improvement": "Pronunciation",
  "screens.speech_coach.dashboard.daily_streak": "Daily streak",
  "screens.speech_coach.dashboard.streak_days_one": "{{count}} day",
  "screens.speech_coach.dashboard.streak_days_other": "{{count}} days",
  "screens.speech_coach.dashboard.confidence": "Confidence",
  "screens.speech_coach.dashboard.confidence_low": "Building",
  "screens.speech_coach.dashboard.confidence_mid": "Growing",
  "screens.speech_coach.dashboard.confidence_high": "Soaring",
  "screens.speech_coach.dashboard.milestones_completed":
    "{{done}} of {{total}} milestones on track",

  // ── Section: Milestone Checker ───────────────────────────────────────────
  "screens.speech_coach.milestones.section_title": "Milestone Checker",
  "screens.speech_coach.milestones.tab.1y": "1 Year",
  "screens.speech_coach.milestones.tab.2y": "2 Years",
  "screens.speech_coach.milestones.tab.3y": "3 Years",
  "screens.speech_coach.milestones.tab.4y_plus": "4+ Years",
  "screens.speech_coach.milestones.status.on_track": "On Track",
  "screens.speech_coach.milestones.status.needs_attention": "Needs Attention",
  "screens.speech_coach.milestones.status.consult_expert": "Consult Expert",

  // 1y milestones
  "screens.speech_coach.milestones.m_1y_first_words.label":
    "Says first real words",
  "screens.speech_coach.milestones.m_1y_first_words.hint":
    "Like \"mama\", \"dada\", or a familiar pet's name.",
  "screens.speech_coach.milestones.m_1y_responds_name.label":
    "Turns when their name is called",
  "screens.speech_coach.milestones.m_1y_responds_name.hint":
    "Looks up or stops what they're doing within a few seconds.",
  "screens.speech_coach.milestones.m_1y_gesture_wave.label":
    "Uses simple gestures",
  "screens.speech_coach.milestones.m_1y_gesture_wave.hint":
    "Waves bye-bye, points at things they want, claps along.",
  "screens.speech_coach.milestones.m_1y_simple_words.label":
    "Uses 5–10 simple words",
  "screens.speech_coach.milestones.m_1y_simple_words.hint":
    "Even if pronunciation is approximate — meaning is what counts.",

  // 2y milestones
  "screens.speech_coach.milestones.m_2y_two_word.label":
    "Combines two words",
  "screens.speech_coach.milestones.m_2y_two_word.hint":
    "Phrases like \"more milk\", \"my book\", \"go park\".",
  "screens.speech_coach.milestones.m_2y_follows_2step.label":
    "Follows two-step instructions",
  "screens.speech_coach.milestones.m_2y_follows_2step.hint":
    "\"Pick up your toy and put it in the box.\"",
  "screens.speech_coach.milestones.m_2y_50_words.label":
    "Uses 50+ words",
  "screens.speech_coach.milestones.m_2y_50_words.hint":
    "Vocabulary that's slowly growing day by day.",
  "screens.speech_coach.milestones.m_2y_names_familiar.label":
    "Names familiar people and objects",
  "screens.speech_coach.milestones.m_2y_names_familiar.hint":
    "Family members, favourite toys, body parts.",

  // 3y milestones
  "screens.speech_coach.milestones.m_3y_3plus_word_sentence.label":
    "Speaks in 3+ word sentences",
  "screens.speech_coach.milestones.m_3y_3plus_word_sentence.hint":
    "Even if grammar is still developing.",
  "screens.speech_coach.milestones.m_3y_asks_wh_questions.label":
    "Asks \"what / where / why\" questions",
  "screens.speech_coach.milestones.m_3y_asks_wh_questions.hint":
    "Curiosity is a great sign of language growth.",
  "screens.speech_coach.milestones.m_3y_intelligible_family.label":
    "Mostly understandable to family",
  "screens.speech_coach.milestones.m_3y_intelligible_family.hint":
    "Close family can understand most of what they say.",
  "screens.speech_coach.milestones.m_3y_uses_pronouns.label":
    "Uses pronouns (I, you, me)",
  "screens.speech_coach.milestones.m_3y_uses_pronouns.hint":
    "Mixing them up sometimes is completely normal.",

  // 4+ milestones
  "screens.speech_coach.milestones.m_4plus_full_sentences.label":
    "Speaks in full sentences",
  "screens.speech_coach.milestones.m_4plus_full_sentences.hint":
    "Sentences with subject, verb, and detail.",
  "screens.speech_coach.milestones.m_4plus_tells_story.label":
    "Tells short stories",
  "screens.speech_coach.milestones.m_4plus_tells_story.hint":
    "About their day, a book, or something they imagined.",
  "screens.speech_coach.milestones.m_4plus_intelligible_strangers.label":
    "Understandable to strangers",
  "screens.speech_coach.milestones.m_4plus_intelligible_strangers.hint":
    "People outside the family can follow what they're saying.",
  "screens.speech_coach.milestones.m_4plus_conversation_turns.label":
    "Takes turns in a conversation",
  "screens.speech_coach.milestones.m_4plus_conversation_turns.hint":
    "Listens, replies, and stays on the topic.",

  // ── Section: AI Pronunciation Practice ───────────────────────────────────
  "screens.speech_coach.pronounce.section_title": "AI Pronunciation Practice",
  "screens.speech_coach.pronounce.intro":
    "Tap to hear Amy say it, then let your child try.",
  "screens.speech_coach.pronounce.tab.letter": "Letters",
  "screens.speech_coach.pronounce.tab.phonic": "Phonics",
  "screens.speech_coach.pronounce.tab.word": "Words",
  "screens.speech_coach.pronounce.tab.sentence": "Sentences",
  "screens.speech_coach.pronounce.play": "Hear it",
  "screens.speech_coach.pronounce.replay": "Hear again",
  "screens.speech_coach.pronounce.listening": "Listening…",
  "screens.speech_coach.pronounce.start_recording": "Tap when ready",
  "screens.speech_coach.pronounce.stop_recording": "Stop",
  "screens.speech_coach.pronounce.feedback_great": "Great pronunciation!",
  "screens.speech_coach.pronounce.feedback_try_slow":
    "Lovely effort — try saying it a little more slowly.",
  "screens.speech_coach.pronounce.feedback_improvement":
    "Excellent improvement today!",
  "screens.speech_coach.pronounce.placeholder_note":
    "Speech analysis coming soon — for now, you decide together how it sounded.",

  // ── Section: Read Aloud & Repeat ─────────────────────────────────────────
  "screens.speech_coach.read_aloud.section_title": "Read Aloud & Repeat",
  "screens.speech_coach.read_aloud.intro":
    "Amy reads a short story, then your child repeats one line at a time.",
  "screens.speech_coach.read_aloud.play_story": "Play story",
  "screens.speech_coach.read_aloud.repeat_mode": "Repeat mode",
  "screens.speech_coach.read_aloud.compare_playback": "Compare playback",
  "screens.speech_coach.read_aloud.parent_listening": "Parent listening mode",
  "screens.speech_coach.read_aloud.confidence_score": "Confidence score",
  "screens.speech_coach.read_aloud.story_default_title": "Riya & the Rainy Day",
  "screens.speech_coach.read_aloud.story_default_body":
    "Riya looked outside. It was raining. She smiled, picked up her umbrella, and ran into the garden. The flowers were dancing in the rain.",

  // ── Section: Daily Speech Games ──────────────────────────────────────────
  "screens.speech_coach.games.section_title": "Daily Speech Games",
  "screens.speech_coach.games.rewards_label": "Rewards",
  "screens.speech_coach.games.stars_one": "{{count}} star",
  "screens.speech_coach.games.stars_other": "{{count}} stars",
  "screens.speech_coach.games.unlock_badge": "Unlock badge",
  "screens.speech_coach.games.animal_sounds.title": "Animal Sounds",
  "screens.speech_coach.games.animal_sounds.description":
    "Take turns making animal noises — cow, cat, lion, bird.",
  "screens.speech_coach.games.rhyming.title": "Rhyming Game",
  "screens.speech_coach.games.rhyming.description":
    "Say a word, then find words that rhyme with it.",
  "screens.speech_coach.games.tongue_exercises.title": "Tongue Exercises",
  "screens.speech_coach.games.tongue_exercises.description":
    "Wiggle the tongue side to side, touch the nose, click the roof of the mouth.",
  "screens.speech_coach.games.breathing.title": "Breathing Exercises",
  "screens.speech_coach.games.breathing.description":
    "Slow in through the nose, slow out through the mouth — like blowing out candles.",
  "screens.speech_coach.games.slow_vs_fast.title": "Slow vs Fast",
  "screens.speech_coach.games.slow_vs_fast.description":
    "Say the same sentence really slowly, then a little faster, then super fast.",
  "screens.speech_coach.games.emotion_express.title": "Emotion Expression",
  "screens.speech_coach.games.emotion_express.description":
    "Say one sentence three ways — happy, sad, surprised.",

  // ── Section: Parent Guidance ─────────────────────────────────────────────
  "screens.speech_coach.guidance.section_title": "Parent Guidance",
  "screens.speech_coach.guidance.amy_tip_label": "Amy Coach Tip",
  "screens.speech_coach.guidance.g_speech_delay_signs.title":
    "Signs of speech delay",
  "screens.speech_coach.guidance.g_speech_delay_signs.body":
    "By age 2, most children combine two words. By age 3, family understands most of their speech. If your child is well behind these markers, gentle, early support helps.",
  "screens.speech_coach.guidance.g_speech_delay_signs.tip":
    "Trust your instincts — checking in early never hurts and often reassures.",
  "screens.speech_coach.guidance.g_screen_time_impact.title":
    "Screen time and language",
  "screens.speech_coach.guidance.g_screen_time_impact.body":
    "Passive screen time can slow vocabulary growth in toddlers. Co-watching, narrating, and pausing to ask questions changes that.",
  "screens.speech_coach.guidance.g_screen_time_impact.tip":
    "Watch with your child whenever you can — your voice is the secret ingredient.",
  "screens.speech_coach.guidance.g_talking_with_toddlers.title":
    "How to talk with toddlers",
  "screens.speech_coach.guidance.g_talking_with_toddlers.body":
    "Slow down, use short sentences, look them in the eye, and leave space for them to reply — even if it's a sound, not a word.",
  "screens.speech_coach.guidance.g_talking_with_toddlers.tip":
    "Pauses invite words. Count slowly to five before filling the silence.",
  "screens.speech_coach.guidance.g_bilingual_development.title":
    "Bilingual speech development",
  "screens.speech_coach.guidance.g_bilingual_development.body":
    "Two languages do not cause delay. Children may mix them at first; clarity grows over time. Stay consistent — one parent, one language often works well.",
  "screens.speech_coach.guidance.g_bilingual_development.tip":
    "Keep using both languages. Confidence in their first language helps the second.",
  "screens.speech_coach.guidance.g_when_to_consult_expert.title":
    "When to consult an expert",
  "screens.speech_coach.guidance.g_when_to_consult_expert.body":
    "If you've been concerned for more than a few months, or your child has lost words they used to say, it's worth a chat with a paediatric speech-language professional.",
  "screens.speech_coach.guidance.g_when_to_consult_expert.tip":
    "Early support is gentle support — the earlier the conversation, the easier the path.",

  // ── Section: Emotion & Confidence Builder ────────────────────────────────
  "screens.speech_coach.affirmations.section_title": "Emotion & Confidence Builder",
  "screens.speech_coach.affirmations.intro":
    "A little encouragement after every session — for both of you.",
  "screens.speech_coach.affirmations.a_voice_matters": "Your voice matters.",
  "screens.speech_coach.affirmations.a_practice_takes_time":
    "Speaking takes practice.",
  "screens.speech_coach.affirmations.a_every_child_different":
    "Every child learns differently.",
  "screens.speech_coach.affirmations.a_doing_amazing":
    "You're doing amazing.",
  "screens.speech_coach.affirmations.a_sounds_become_words":
    "Sounds become words.",
  "screens.speech_coach.affirmations.a_words_become_stories":
    "Words become stories.",
  "screens.speech_coach.affirmations.a_patience_grows_confidence":
    "Patience grows confidence.",
  "screens.speech_coach.affirmations.a_listening_matters":
    "You're listening, and that matters.",
  "screens.speech_coach.affirmations.a_every_word_a_win":
    "Every word is a victory.",
  "screens.speech_coach.affirmations.a_trust_their_pace":
    "Trust your child's pace.",
  "screens.speech_coach.affirmations.a_pauses_are_speech":
    "Pauses are part of speech.",
  "screens.speech_coach.affirmations.a_wonderful_coach":
    "You're a wonderful coach.",

  // ── Section: Speech Progress Reports ─────────────────────────────────────
  "screens.speech_coach.reports.section_title": "Speech Progress Reports",
  "screens.speech_coach.reports.intro":
    "Your weekly summary across pronunciation, vocabulary, and confidence.",
  "screens.speech_coach.reports.improved_sounds": "Sounds improving",
  "screens.speech_coach.reports.difficult_sounds": "Sounds to keep practicing",
  "screens.speech_coach.reports.vocabulary_growth": "Vocabulary growth",
  "screens.speech_coach.reports.confidence_trend": "Confidence trend",
  "screens.speech_coach.reports.download_pdf": "Download PDF report",
  "screens.speech_coach.reports.pdf_coming_soon":
    "PDF reports coming soon — your weekly summary is being saved.",

  // ── Section: Expert Support placeholder ──────────────────────────────────
  "screens.speech_coach.expert.section_title":
    "Connect with Certified Speech Experts",
  "screens.speech_coach.expert.intro":
    "We're partnering with certified paediatric speech-language professionals. Join the waitlist and we'll let you know the moment it launches.",
  "screens.speech_coach.expert.join_waitlist": "Join the waitlist",
  "screens.speech_coach.expert.joined": "You're on the waitlist",
  "screens.speech_coach.expert.coming_soon_badge": "Coming soon",

  // ── Pronunciation prompt hints ───────────────────────────────────────────
  "screens.speech_coach.prompts.hint.letter": "Tap to hear the letter",
  "screens.speech_coach.prompts.hint.phonic": "Tap to hear the sound",
  "screens.speech_coach.prompts.hint.word": "Tap to hear the word",
  "screens.speech_coach.prompts.hint.sentence": "Tap to hear the sentence",
} as const;
