// ─────────────────────────────────────────────────────────────────────────────
// Module 3 — Explainability Engine — Mobile Screen
// Mirrors the web /explain page. Provides:
//  • Context selector form (mood, sleep, energy, weather, caregiver)
//  • Decision factor chips with influence colouring
//  • Animated confidence bar
//  • Reasoning trace timeline
//  • AI Explanation audit history
// All colour values use the brand token palette (audit-ok comments).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import {
  ScrollView, StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, RefreshControl, Switch,
} from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { brand } from "@/constants/colors";
import { useExplainRoutine, useGetExplainHistory } from "@workspace/api-client-react";
import type { ExplanationResponse, ExplanationAuditEntry } from "@workspace/api-zod";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContextForm {
  mood: string;
  sleepQuality: string;
  energyLevel: string;
  weatherOutdoor: string;
  caregiver: string;
  withNarrative: boolean;
}

// ── Selector pill ─────────────────────────────────────────────────────────────

function PillSelector({
  options,
  value,
  onChange,
  colors,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(active ? "" : opt.value)}
            style={[
              styles.pill,
              { borderColor: active ? colors.primary : colors.border },
              active && { backgroundColor: colors.heroBadgeBg },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: active ? colors.primary : colors.textSubtle },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({
  value,
  tier,
  colors,
}: {
  value: number;
  tier: string;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();
  const fillColor =
    tier === "high"   ? "#10b981" : // audit-ok: confidence-high semantic green
    tier === "medium" ? "#f59e0b" : // audit-ok: confidence-medium semantic amber
                        colors.textFaint;
  return (
    <View style={styles.confBar}>
      <View style={styles.confLabelRow}>
        <Text style={[styles.confLabel, { color: colors.textSubtle }]}>{t("explain.confidence")}</Text>
        <Text style={[styles.confValue, { color: colors.primary }]}>{value}%</Text>
      </View>
      <View style={[styles.confTrack, { backgroundColor: colors.surfaceTrack }]}>
        <View style={[styles.confFill, { width: `${value}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

// ── Factor chip ───────────────────────────────────────────────────────────────

function FactorChip({
  label,
  influence,
  colors,
}: {
  label: string;
  influence: string;
  colors: ReturnType<typeof useColors>;
}) {
  const bg =
    influence === "positive" ? "#d1fae5" : // audit-ok: influence-positive semantic emerald
    influence === "negative" ? "#fee2e2" : // audit-ok: influence-negative semantic rose
                               colors.muted;
  const fg =
    influence === "positive" ? "#065f46" : // audit-ok: influence-positive dark text
    influence === "negative" ? "#991b1b" : // audit-ok: influence-negative dark text
                               colors.textBody;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ── Trace step ────────────────────────────────────────────────────────────────

function TraceStep({
  order,
  title,
  detail,
  colors,
}: {
  order: number;
  title: string;
  detail: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.traceStep}>
      <View style={[styles.traceNum, { backgroundColor: colors.heroBadgeBg }]}>
        <Text style={[styles.traceNumText, { color: colors.primary }]}>{order}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.traceTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.traceDetail, { color: colors.textSubtle }]}>{detail}</Text>
      </View>
    </View>
  );
}

// ── Audit row ─────────────────────────────────────────────────────────────────

function AuditRow({
  entry,
  colors,
}: {
  entry: ExplanationAuditEntry;
  colors: ReturnType<typeof useColors>;
}) {
  const tierColor =
    entry.confidenceTier === "high"   ? "#10b981" : // audit-ok: confidence-high semantic green
    entry.confidenceTier === "medium" ? "#f59e0b" : colors.textFaint; // audit-ok: confidence-medium semantic amber
  return (
    <View style={[styles.auditRow, { borderBottomColor: colors.surfaceTrack }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.auditSummary, { color: colors.foreground }]} numberOfLines={2}>
          {entry.summary}
        </Text>
        <View style={styles.auditMeta}>
          <View style={[styles.auditBadge, { backgroundColor: colors.heroBadgeBg }]}>
            <Text style={[styles.auditBadgeText, { color: colors.primary }]}>
              {entry.recommendationType}
            </Text>
          </View>
          <Text style={[styles.auditTime, { color: colors.textFaint }]}>
            {new Date(entry.generatedAt).toLocaleTimeString()}
          </Text>
        </View>
      </View>
      <Text style={[styles.auditConf, { color: tierColor }]}>{entry.confidenceValue}%</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ExplainScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  const [form, setForm] = useState<ContextForm>({
    mood: "",
    sleepQuality: "",
    energyLevel: "",
    weatherOutdoor: "",
    caregiver: "",
    withNarrative: false,
  });
  const [result, setResult] = useState<ExplanationResponse | undefined>();

  const explainMutation = useExplainRoutine();
  const historyQuery = useGetExplainHistory({ limit: 15 });

  const handleExplain = useCallback(() => {
    const context: Record<string, unknown> = {};
    if (form.mood)           context["mood"]           = form.mood;
    if (form.sleepQuality)   context["sleepQuality"]   = form.sleepQuality;
    if (form.energyLevel)    context["energyLevel"]    = form.energyLevel;
    if (form.weatherOutdoor) context["weatherOutdoor"] = form.weatherOutdoor;
    if (form.caregiver)      context["caregiver"]      = form.caregiver;

    explainMutation.mutate(
      { data: { context, sourceEngine: "hybrid", withNarrative: form.withNarrative } },
      {
        onSuccess: (data) => {
          setResult(data as ExplanationResponse);
          void historyQuery.refetch();
        },
      },
    );
  }, [form, explainMutation, historyQuery]);

  const set = (key: keyof ContextForm) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  return (
    <>
      <Stack.Screen options={{ title: t("explain.title"), headerShown: true }} />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isFetching}
            onRefresh={() => void historyQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="sparkles" size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("explain.title")}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSubtle }]}>{t("explain.subtitle")}</Text>

        {/* Context form */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.surfaceTrack }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("explain.context_heading")}
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{t("explain.field_mood")}</Text>
          <PillSelector
            options={[
              { label: "Happy", value: "happy" },
              { label: "Tired", value: "tired" },
              { label: "Grumpy", value: "grumpy" },
              { label: "Sick", value: "sick" },
            ]}
            value={form.mood}
            onChange={set("mood")}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{t("explain.field_sleep")}</Text>
          <PillSelector
            options={[
              { label: "Good", value: "good" },
              { label: "Average", value: "average" },
              { label: "Poor", value: "poor" },
            ]}
            value={form.sleepQuality}
            onChange={set("sleepQuality")}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{t("explain.field_energy")}</Text>
          <PillSelector
            options={[
              { label: "High", value: "high" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" },
            ]}
            value={form.energyLevel}
            onChange={set("energyLevel")}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{t("explain.field_weather")}</Text>
          <PillSelector
            options={[
              { label: "Outdoor", value: "yes" },
              { label: "Limited", value: "limited" },
              { label: "Indoor", value: "no" },
            ]}
            value={form.weatherOutdoor}
            onChange={set("weatherOutdoor")}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{t("explain.field_caregiver")}</Text>
          <PillSelector
            options={[
              { label: "Mom", value: "mom" },
              { label: "Dad", value: "dad" },
              { label: "Grandparent", value: "grandparent" },
              { label: "Babysitter", value: "babysitter" },
            ]}
            value={form.caregiver}
            onChange={set("caregiver")}
            colors={colors}
          />

          <View style={styles.narrativeRow}>
            <Text style={[styles.narrativeLabel, { color: colors.textBody }]}>
              {t("explain.with_narrative")}
            </Text>
            <View style={[styles.aiTag, { backgroundColor: colors.heroBadgeBg }]}>
              <Text style={[styles.aiTagText, { color: colors.primary }]}>AI</Text>
            </View>
            <Switch
              value={form.withNarrative}
              onValueChange={(v) => setForm((f) => ({ ...f, withNarrative: v }))}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleExplain}
            disabled={explainMutation.isPending}
            activeOpacity={0.8}
          >
            {explainMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>{t("explain.generate_btn")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Result card */}
        {result && (
          <View style={[styles.card, { backgroundColor: brand.violet50, borderColor: brand.violet200 }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t("explain.why_title")}
            </Text>
            <Text style={[styles.resultSummary, { color: colors.foreground }]}>{result.summary}</Text>

            <ConfidenceBar value={result.confidence.value} tier={result.confidence.tier} colors={colors} />
            <Text style={[styles.confRationale, { color: colors.textSubtle }]}>{result.confidence.rationale}</Text>

            {result.factors.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{t("explain.factors_heading")}</Text>
                <View style={styles.chipRow}>
                  {result.factors.map((f, i) => (
                    <FactorChip key={i} label={f.label} influence={f.influence} colors={colors} />
                  ))}
                </View>
              </>
            )}

            {result.trace.steps.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{t("explain.trace_heading")}</Text>
                {result.trace.steps.map((step) => (
                  <TraceStep key={step.order} {...step} colors={colors} />
                ))}
              </>
            )}

            {result.aiNarrative && (
              <View style={[styles.narrativeCard, { backgroundColor: colors.heroBadgeBg }]}>
                <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.narrativeText, { color: colors.primary }]}>
                  {result.aiNarrative}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* History */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.surfaceTrack }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("explain.history_heading")}</Text>
          {historyQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !historyQuery.data || historyQuery.data.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textFaint }]}>{t("explain.no_history")}</Text>
          ) : (
            (historyQuery.data as ExplanationAuditEntry[]).map((entry) => (
              <AuditRow key={entry.id} entry={entry} colors={colors} />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  content:        { padding: 16 },
  header:         { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headerTitle:    { fontSize: 20, fontWeight: "700" },
  subtitle:       { fontSize: 13, marginBottom: 16 },
  card:           { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionTitle:   { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  fieldLabel:     { fontSize: 11, fontWeight: "500", marginBottom: 6, marginTop: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  pillRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  pill:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillText:       { fontSize: 12, fontWeight: "500" },
  narrativeRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 8 },
  narrativeLabel: { fontSize: 12, flex: 1 },
  aiTag:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  aiTagText:      { fontSize: 10, fontWeight: "700" },
  btn:            { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 8 },
  btnText:        { color: "#fff", fontWeight: "600", fontSize: 14 },
  resultSummary:  { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  confBar:        { marginBottom: 4 },
  confLabelRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  confLabel:      { fontSize: 11 },
  confValue:      { fontSize: 11, fontWeight: "700" },
  confTrack:      { height: 6, borderRadius: 3, overflow: "hidden" },
  confFill:       { height: 6, borderRadius: 3 },
  confRationale:  { fontSize: 11, marginTop: 4, marginBottom: 8 },
  chipRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip:           { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  chipText:       { fontSize: 11, fontWeight: "500" },
  traceStep:      { flexDirection: "row", gap: 10, marginBottom: 10 },
  traceNum:       { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  traceNumText:   { fontSize: 10, fontWeight: "700" },
  traceTitle:     { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  traceDetail:    { fontSize: 11 },
  narrativeCard:  { flexDirection: "row", padding: 10, borderRadius: 10, marginTop: 8, alignItems: "flex-start" },
  narrativeText:  { fontSize: 12, flex: 1, fontStyle: "italic" },
  auditRow:       { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1 },
  auditSummary:   { fontSize: 12, marginBottom: 4 },
  auditMeta:      { flexDirection: "row", alignItems: "center", gap: 6 },
  auditBadge:     { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  auditBadgeText: { fontSize: 10, fontWeight: "600" },
  auditTime:      { fontSize: 10 },
  auditConf:      { fontWeight: "700", fontSize: 13, marginLeft: 8 },
  empty:          { textAlign: "center", paddingVertical: 20, fontSize: 13 },
});
