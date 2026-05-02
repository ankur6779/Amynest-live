import React, {  useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CATEGORY_LABELS, MAX_HISTORY, STAGE_LABELS,
  STORAGE_KEY_DRAFT, STORAGE_KEY_HISTORY,
  addCustomQuestion, addManualAction, archiveSession,
  buildAmyHint, createSession, deleteFromHistory, progressVsPrevious,
  removeAction, removeQuestion, sessionStats, setMeta, setNotes,
  setQuestionResponse, setStage, suggestActions, toggleAction, toggleQuestion,
  type PtmCategory, type PtmSession, type PtmStage,
} from "@workspace/ptm-prep";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, palette } from "@/constants/colors";

const STAGE_ORDER: PtmStage[] = ["prepare", "attend", "act"];

async function loadDraft(): Promise<PtmSession | null> {
  try { const raw = await AsyncStorage.getItem(STORAGE_KEY_DRAFT); return raw ? (JSON.parse(raw) as PtmSession) : null; }
  catch { return null; }
}
async function saveDraft(s: PtmSession | null) {
  try { if (s) await AsyncStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(s)); else await AsyncStorage.removeItem(STORAGE_KEY_DRAFT); } catch {}
}
async function loadHistory(): Promise<PtmSession[]> {
  try { const raw = await AsyncStorage.getItem(STORAGE_KEY_HISTORY); if (!raw) return []; const p = JSON.parse(raw); return Array.isArray(p) ? (p as PtmSession[]).slice(0, MAX_HISTORY) : []; }
  catch { return []; }
}
async function saveHistory(h: PtmSession[]) {
  try { await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(h)); } catch {}
}

export default function PtmPrepScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ childId?: string; childName?: string }>();
  const childId = typeof params.childId === "string" ? params.childId : undefined;
  const childName = typeof params.childName === "string" ? params.childName : undefined;
  const [session, setSession] = useState<PtmSession | null>(null);
  const [history, setHistory] = useState<PtmSession[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { (async () => {
    const [d, h] = await Promise.all([loadDraft(), loadHistory()]);
    setSession(d); setHistory(h); setHydrated(true);
  })(); }, []);

  useEffect(() => { if (hydrated) void saveDraft(session); }, [session, hydrated]);

  // Keep the active session linked to the current child. Includes `session?.id`
  // in deps so the effect also runs after async draft hydration (where session
  // flips from null → loaded value) — otherwise a draft saved for child A
  // could remain bound to A when the parent opens PTM for child B.
  useEffect(() => {
    if (!session || !childId) return;
    if (session.childId !== childId || session.childName !== childName) {
      setSession((s) => (s ? setMeta(s, { childId, childName }) : s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, childName, session?.id]);

  const stats = useMemo(() => session ? sessionStats(session) : null, [session]);
  const amyHint = useMemo(() => session ? buildAmyHint(session.actions) : null, [session]);
  const carry = useMemo(() => session ? progressVsPrevious(session, history) : null, [session, history]);
  // Filter past-PTM list to the currently selected child to avoid sibling bleed.
  const visibleHistory = useMemo(
    () => (childId ? history.filter((h) => (h.childId ?? null) === childId) : history),
    [history, childId],
  );

  const start = () => setSession(createSession({ childId, childName }));
  const complete = async () => {
    if (!session) return;
    const next = archiveSession(history, session);
    setHistory(next); await saveHistory(next); setSession(null);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <Stack.Screen options={{
        headerTitle: "PTM Prep",
        headerStyle: { backgroundColor: "#0f0c29" }, // audit-ok: intentional dark bg / custom color
        headerTintColor: colors.foreground,
      }} />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 60 }}>
        {!session ? (
          <>
            <LinearGradient colors={[brand.violet400, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <Text style={{ fontSize: 28 }}>🧾</Text>
              <Text style={styles.heroTitle}>PTM Prep Assistant</Text>
              <Text style={styles.heroSub}>A simple Prepare → Attend → Act flow for your child's next Parent-Teacher Meeting.</Text>
              <Pressable onPress={start} style={styles.heroBtn}>
                <Ionicons name="sparkles" size={14} color={brand.violet600} />
                <Text style={styles.heroBtnText}>Start a PTM Prep</Text>
              </Pressable>
            </LinearGradient>
            <HistoryBlock history={visibleHistory} colors={colors} onDelete={async (id) => { const next = deleteFromHistory(history, id); setHistory(next); await saveHistory(next); }} />
          </>
        ) : (
          <>
            {/* Stage stepper */}
            <View style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.metaLabel}>PTM · {session.date}</Text>
                <Pressable onPress={() => Alert.alert(t("alerts.ptm.discard_title"), t("alerts.ptm.discard_msg"), [
                  { text: "Cancel" }, { text: "Discard", style: "destructive", onPress: () => setSession(null) },
                ])}>
                  <Text style={{ fontSize: 11, color: palette.gray400 }}>🗑 Discard</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {STAGE_ORDER.map((s, i) => {
                  const active = session.stage === s;
                  const done = STAGE_ORDER.indexOf(session.stage) > i;
                  return (
                    <Pressable key={s} onPress={() => setSession((cur) => cur ? setStage(cur, s) : cur)}
                      style={[styles.stageBtn, active ? styles.stageActive : done ? styles.stageDone : styles.stageIdle]}>
                      <Text style={[styles.stageText, active ? { color: "#fff" } : done ? { color: palette.emerald700 } : { color: colors.textMuted }]}>
                        {STAGE_LABELS[s].emoji} {STAGE_LABELS[s].title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {stats && (
                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <Text style={styles.statText}>📋 {stats.selected} prepared</Text>
                  <Text style={styles.statText}>✍️ {stats.asked} asked</Text>
                  <Text style={styles.statText}>🎯 {stats.doneActions}/{stats.totalActions} actions</Text>
                </View>
              )}
            </View>

            {carry && carry.carriedOver.length > 0 && (
              <View style={styles.carryBox}>
                <Text style={styles.carryText}>
                  <Text style={{ fontWeight: "800" }}>Last PTM ({carry.prevDate}):</Text> {carry.prevDoneCount}/{carry.prevTotal} actions done. {carry.carriedOver.length} item(s) still pending — keep going!
                </Text>
              </View>
            )}

            {session.stage === "prepare" && <PrepareStage session={session} setSession={setSession} colors={colors} />}
            {session.stage === "attend" && <AttendStage session={session} setSession={setSession} colors={colors} />}
            {session.stage === "act" && <ActStage session={session} setSession={setSession} amyHint={amyHint} onComplete={complete} colors={colors} />}

            <HistoryBlock history={visibleHistory} colors={colors} onDelete={async (id) => { const next = deleteFromHistory(history, id); setHistory(next); await saveHistory(next); }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function PrepareStage({ session, setSession, colors }: any) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [customText, setCustomText] = useState("");
  const cats: PtmCategory[] = ["academic", "behavior", "social", "custom"];

  const submit = () => {
    if (!customText.trim()) return;
    setSession((s: PtmSession | null) => s ? addCustomQuestion(s, customText) : s);
    setCustomText("");
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={session.teacherName ?? ""}
            onChangeText={(t) => setSession((s: PtmSession | null) => s ? setMeta(s, { teacherName: t.slice(0, 60) }) : s)}
            placeholder="Teacher's name" placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            value={session.className ?? ""}
            onChangeText={(t) => setSession((s: PtmSession | null) => s ? setMeta(s, { className: t.slice(0, 30) }) : s)}
            placeholder="Class / grade" placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1 }]}
          />
        </View>
      </View>

      {cats.map((cat) => {
        const items = session.questions.filter((q: any) => q.category === cat);
        return (
          <View key={cat} style={styles.card}>
            <Text style={styles.sectionTitle}>
              {CATEGORY_LABELS[cat].emoji} {CATEGORY_LABELS[cat].title}
              <Text style={{ color: colors.textMuted, fontWeight: "500" }}>  ({items.filter((q: any) => q.selected).length}/{items.length})</Text>
            </Text>
            {items.length === 0 ? (
              <Text style={styles.italicMuted}>No questions yet.</Text>
            ) : items.map((q: any) => (
              <View key={q.id} style={styles.qRow}>
                <Pressable onPress={() => setSession((s: PtmSession | null) => s ? toggleQuestion(s, q.id, "selected") : s)}>
                  <Ionicons name={q.selected ? "checkmark-circle" : "ellipse-outline"} size={18} color={q.selected ? brand.violet600 : colors.textMuted} />
                </Pressable>
                <Text style={[styles.qText, { color: q.selected ? colors.text : colors.textMuted }]}>{q.text}</Text>
                {q.category === "custom" && (
                  <Pressable onPress={() => setSession((s: PtmSession | null) => s ? removeQuestion(s, q.id) : s)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={14} color={palette.rose500} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        );
      })}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>✏️ Add your own question</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={customText} onChangeText={setCustomText}
            placeholder="e.g. Is my child enjoying art class?" placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1 }]}
            onSubmitEditing={submit} returnKeyType="done"
          />
          <Pressable onPress={submit} style={styles.primaryBtn}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => setSession((s: PtmSession | null) => s ? setStage(s, "attend") : s)} style={styles.advanceBtn}>
        <Text style={styles.advanceBtnText}>I'm ready — start the meeting</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

function AttendStage({ session, setSession, colors }: any) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const selected = session.questions.filter((q: any) => q.selected);
  const fields: [keyof PtmSession["notes"], string, string][] = [
    ["teacherFeedback", "Teacher feedback", "What did the teacher say overall?"],
    ["weakAreas", "Weak areas", "Where does my child struggle?"],
    ["suggestions", "Suggestions", "What did the teacher suggest we try?"],
  ];

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📋 Quick notes</Text>
        {fields.map(([k, label, ph]) => (
          <View key={k} style={{ marginTop: 6 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              value={session.notes[k]} multiline numberOfLines={3}
              onChangeText={(t) => setSession((s: PtmSession | null) => s ? setNotes(s, { [k]: t.slice(0, 800) } as any) : s)}
              placeholder={ph} placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textarea]}
            />
          </View>
        ))}
      </View>

      {selected.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tick off questions you've asked</Text>
          {selected.map((q: any) => (
            <View key={q.id} style={{ marginTop: 6 }}>
              <View style={styles.qRow}>
                <Pressable onPress={() => setSession((s: PtmSession | null) => s ? toggleQuestion(s, q.id, "asked") : s)}>
                  <Ionicons name={q.asked ? "checkmark-circle" : "ellipse-outline"} size={18} color={q.asked ? palette.emerald500 : colors.textMuted} />
                </Pressable>
                <Text style={[styles.qText, q.asked && { textDecorationLine: "line-through", color: colors.textMuted }]}>{q.text}</Text>
              </View>
              {q.asked && (
                <TextInput
                  value={q.response ?? ""}
                  onChangeText={(t) => setSession((s: PtmSession | null) => s ? setQuestionResponse(s, q.id, t.slice(0, 200)) : s)}
                  placeholder="What did the teacher say?" placeholderTextColor={colors.textMuted}
                  style={[styles.input, { marginLeft: 26, marginTop: 4, fontSize: 12 }]}
                />
              )}
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => setSession((s: PtmSession | null) => s ? setStage(s, "prepare") : s)} style={[styles.secondaryBtn, { flex: 1 }]}>
          <Text style={styles.secondaryBtnText}>← Back</Text>
        </Pressable>
        <Pressable onPress={() => setSession((s: PtmSession | null) => {
          if (!s) return s;
          const next = setStage(s, "act");
          return s.actions.length === 0 ? { ...next, actions: suggestActions(s.notes) } : next;
        })} style={[styles.advanceBtn, { flex: 1 }]}>
          <Text style={styles.advanceBtnText}>Build action plan</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function ActStage({ session, setSession, amyHint, onComplete, colors }: any) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [manualText, setManualText] = useState("");

  const regenerate = () => setSession((s: PtmSession | null) => {
    if (!s) return s;
    const fresh = suggestActions(s.notes);
    const doneByText = new Map(s.actions.filter((a) => a.done).map((a) => [a.text.toLowerCase(), true] as const));
    return { ...s, actions: fresh.map((a) => doneByText.has(a.text.toLowerCase()) ? { ...a, done: true } : a) };
  });

  const addManual = () => {
    if (!manualText.trim()) return;
    setSession((s: PtmSession | null) => s ? { ...s, actions: addManualAction(s.actions, manualText) } : s);
    setManualText("");
  };

  return (
    <View style={{ gap: 12 }}>
      {amyHint && (
        <View style={styles.amyBox}>
          <Text style={{ fontSize: 16 }}>🤖</Text>
          <Text style={styles.amyText}>{amyHint}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={styles.sectionTitle}>🎯 Action plan</Text>
          <Pressable onPress={regenerate}><Text style={styles.regenLink}>Re-generate from notes</Text></Pressable>
        </View>
        {session.actions.length === 0 ? (
          <Text style={styles.italicMuted}>Add notes in the Attend step, then come back here — Amy will pull out action items for you.</Text>
        ) : session.actions.map((a: any) => (
          <View key={a.id} style={styles.qRow}>
            <Pressable onPress={() => setSession((s: PtmSession | null) => s ? { ...s, actions: toggleAction(s.actions, a.id) } : s)}>
              <Ionicons name={a.done ? "checkmark-circle" : "ellipse-outline"} size={18} color={a.done ? palette.emerald500 : colors.textMuted} />
            </Pressable>
            <Text style={[styles.qText, a.done && { textDecorationLine: "line-through", color: colors.textMuted }]}>{a.text}</Text>
            <Pressable onPress={() => setSession((s: PtmSession | null) => s ? { ...s, actions: removeAction(s.actions, a.id) } : s)} hitSlop={8}>
              <Ionicons name="trash-outline" size={14} color={palette.rose500} />
            </Pressable>
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <TextInput value={manualText} onChangeText={setManualText}
            placeholder='e.g. "Daily 10 min handwriting"' placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1 }]} onSubmitEditing={addManual} returnKeyType="done"
          />
          <Pressable onPress={addManual} style={styles.primaryBtn}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => setSession((s: PtmSession | null) => s ? setStage(s, "attend") : s)} style={[styles.secondaryBtn, { flex: 1 }]}>
          <Text style={styles.secondaryBtnText}>← Back</Text>
        </Pressable>
        <Pressable onPress={onComplete} style={[styles.completeBtn, { flex: 1 }]}>
          <Text style={styles.advanceBtnText}>Save & finish</Text>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function HistoryBlock({ history, colors, onDelete }: { history: PtmSession[]; colors: any; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  if (history.length === 0) return null;
  return (
    <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
      <Pressable onPress={() => setOpen(!open)} style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.sectionTitle}>🗂 Past PTMs ({history.length})</Text>
        <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={14} color={colors.textMuted} />
      </Pressable>
      {open && history.map((s) => {
        const stats = sessionStats(s);
        const isOpen = expanded === s.id;
        return (
          <View key={s.id} style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable onPress={() => setExpanded(isOpen ? null : s.id)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontWeight: "800", fontSize: 12, color: colors.text }}>{s.date}{s.teacherName ? ` · ${s.teacherName}` : ""}</Text>
              <Text style={{ fontSize: 10.5, color: colors.textMuted }}>✍️ {stats.asked} asked · 🎯 {stats.doneActions}/{stats.totalActions} actions done</Text>
            </Pressable>
            {isOpen && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
                {s.notes.teacherFeedback ? <NoteBlock label="Feedback" text={s.notes.teacherFeedback} colors={colors} /> : null}
                {s.notes.weakAreas ? <NoteBlock label="Weak areas" text={s.notes.weakAreas} colors={colors} /> : null}
                {s.notes.suggestions ? <NoteBlock label="Suggestions" text={s.notes.suggestions} colors={colors} /> : null}
                {s.actions.length > 0 && (
                  <View>
                    <Text style={styles.fieldLabel}>Actions</Text>
                    {s.actions.map((a) => (
                      <Text key={a.id} style={[{ fontSize: 12, color: colors.text }, a.done && { textDecorationLine: "line-through", color: colors.textMuted }]}>
                        {a.done ? "✅" : "▫️"} {a.text}
                      </Text>
                    ))}
                  </View>
                )}
                <Pressable onPress={() => Alert.alert(t("alerts.ptm.delete_past_title"), "", [
                  { text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => onDelete(s.id) },
                ])}>
                  <Text style={{ fontSize: 11, color: palette.rose500 }}>🗑 Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function NoteBlock({ label, text, colors }: { label: string; text: string; colors: any }) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={{ fontSize: 12, color: colors.text }}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1 },
    heroCard: { borderRadius: 18, padding: 18, gap: 8 },
    heroTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },
    heroSub: { color: "rgba(255,255,255,0.92)", fontSize: 12.5, lineHeight: 18 },
    heroBtn: { marginTop: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    heroBtnText: { color: brand.violet600, fontWeight: "800", fontSize: 13 },

    card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
    metaLabel: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase", color: colors.textMuted },
    sectionTitle: { fontSize: 12.5, fontWeight: "800", color: colors.text, marginBottom: 4 },
    fieldLabel: { fontSize: 11, fontWeight: "800", color: colors.textMuted, marginBottom: 3 },
    italicMuted: { fontSize: 11.5, color: colors.textMuted, fontStyle: "italic" },
    statText: { fontSize: 10.5, color: colors.textMuted },

    stageBtn: { flex: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, alignItems: "center" },
    stageActive: { backgroundColor: brand.violet600, borderColor: brand.violet600 },
    stageDone: { backgroundColor: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.35)" },
    stageIdle: { backgroundColor: colors.surface, borderColor: colors.border },
    stageText: { fontSize: 11.5, fontWeight: "800" },

    qRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
    qText: { flex: 1, fontSize: 12.5, color: colors.text, lineHeight: 17 },

    input: { height: 38, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontSize: 12.5 },
    textarea: { height: 70, paddingTop: 8, textAlignVertical: "top" },

    primaryBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, height: 38, borderRadius: 10, backgroundColor: brand.violet600 },
    primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 12.5 },
    secondaryBtn: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    secondaryBtnText: { color: colors.text, fontWeight: "800", fontSize: 13 },
    advanceBtn: { height: 42, borderRadius: 12, backgroundColor: brand.violet600, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    advanceBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    completeBtn: { height: 42, borderRadius: 12, backgroundColor: palette.emerald500, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },

    carryBox: { padding: 10, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.10)", borderWidth: 1, borderColor: "rgba(245,158,11,0.35)" },
    carryText: { fontSize: 12, color: colors.text },

    amyBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 12, backgroundColor: "rgba(139,92,246,0.10)", borderWidth: 1, borderColor: "rgba(139,92,246,0.20)" },
    amyText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.text },
    regenLink: { fontSize: 11, color: brand.violet600, fontWeight: "800" },
  });
}
