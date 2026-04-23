import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type Recipe = {
  id: number;
  name: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  tip?: string | null;
};

type FormState = {
  name: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string;
  steps: string;
  tip: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  prepTime: "10 min",
  cookTime: "15 min",
  servings: "1 child",
  ingredients: "",
  steps: "",
  tip: "",
};

function recipeToForm(r: Recipe): FormState {
  return {
    name: r.name,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    ingredients: r.ingredients.join("\n"),
    steps: r.steps.join("\n"),
    tip: r.tip ?? "",
  };
}

function formToPayload(f: FormState) {
  return {
    name: f.name.trim(),
    prepTime: f.prepTime.trim() || "10 min",
    cookTime: f.cookTime.trim() || "15 min",
    servings: f.servings.trim() || "1 child",
    ingredients: f.ingredients.split("\n").map((s) => s.trim()).filter(Boolean),
    steps: f.steps.split("\n").map((s) => s.trim()).filter(Boolean),
    tip: f.tip.trim() || undefined,
  };
}

type Screen = "list" | "form";

export default function RecipesScreen() {
  const c = useColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const [screen, setScreen] = useState<Screen>("list");
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ["custom-recipes"],
    queryFn: async () => {
      const res = await authFetch("/api/recipes");
      if (!res.ok) throw new Error("Failed to load recipes");
      return res.json() as Promise<Recipe[]>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload = formToPayload(data);
      const url = editing ? `/api/recipes/${editing.id}` : "/api/recipes";
      const method = editing ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" })) as { error?: string };
        throw new Error(err.error || "Failed to save recipe");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-recipes"] });
      setScreen("list");
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-recipes"] });
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setScreen("form");
  }

  function openEdit(r: Recipe) {
    setEditing(r);
    setForm(recipeToForm(r));
    setFormError("");
    setScreen("form");
  }

  function confirmDelete(r: Recipe) {
    Alert.alert(
      "Delete Recipe",
      `Delete "${r.name}"? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(r.id),
        },
      ]
    );
  }

  function handleSubmit() {
    setFormError("");
    if (!form.name.trim()) { setFormError("Recipe name is required"); return; }
    if (!form.ingredients.trim()) { setFormError("At least one ingredient is required"); return; }
    if (!form.steps.trim()) { setFormError("At least one step is required"); return; }
    saveMutation.mutate(form);
  }

  if (screen === "form") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => setScreen("list")} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={c.foreground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{editing ? "Edit Recipe" : "Add Recipe"}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.formScroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.hint}>
            Name it to match meals in routines — e.g. "Idli" will match any routine meal containing "Idli".
          </Text>

          <Text style={s.fieldLabel}>Recipe Name *</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Idli, Paneer Paratha, Egg Bhurji"
            placeholderTextColor={c.textMuted}
            maxLength={100}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Prep Time</Text>
              <TextInput
                style={s.input}
                value={form.prepTime}
                onChangeText={(v) => setForm((f) => ({ ...f, prepTime: v }))}
                placeholder="10 min"
                placeholderTextColor={c.textMuted}
                maxLength={60}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Cook Time</Text>
              <TextInput
                style={s.input}
                value={form.cookTime}
                onChangeText={(v) => setForm((f) => ({ ...f, cookTime: v }))}
                placeholder="15 min"
                placeholderTextColor={c.textMuted}
                maxLength={60}
              />
            </View>
          </View>

          <Text style={s.fieldLabel}>Servings</Text>
          <TextInput
            style={s.input}
            value={form.servings}
            onChangeText={(v) => setForm((f) => ({ ...f, servings: v }))}
            placeholder="1 child"
            placeholderTextColor={c.textMuted}
            maxLength={60}
          />

          <Text style={s.fieldLabel}>Ingredients * (one per line)</Text>
          <TextInput
            style={[s.input, s.multiline]}
            value={form.ingredients}
            onChangeText={(v) => setForm((f) => ({ ...f, ingredients: v }))}
            placeholder={"1 cup rice\n1/2 cup dal\n1 tsp ghee"}
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={s.fieldLabel}>Steps * (one per line)</Text>
          <TextInput
            style={[s.input, s.multiline]}
            value={form.steps}
            onChangeText={(v) => setForm((f) => ({ ...f, steps: v }))}
            placeholder={"Wash rice.\nPressure cook.\nServe with ghee."}
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={s.fieldLabel}>Parent Tip (optional)</Text>
          <TextInput
            style={s.input}
            value={form.tip}
            onChangeText={(v) => setForm((f) => ({ ...f, tip: v }))}
            placeholder="e.g. Add ghee for extra flavour"
            placeholderTextColor={c.textMuted}
            maxLength={300}
          />

          {!!formError && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={s.errorText}>{formError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>{editing ? "Update Recipe" : "Save Recipe"}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Recipes</Text>
        <TouchableOpacity onPress={openAdd} style={s.addBtn} hitSlop={8}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
      >
        <Text style={s.subtitle}>
          Save your family recipes. When a meal name matches, the routine will show your recipe instead of the default one.
        </Text>

        {isLoading && (
          <ActivityIndicator style={{ marginTop: 32 }} color={c.primary} />
        )}

        {!isLoading && recipes.length === 0 && (
          <View style={s.emptyBox}>
            <MaterialCommunityIcons name="chef-hat" size={40} color="#F97316" />
            <Text style={s.emptyTitle}>No recipes saved yet</Text>
            <Text style={s.emptySubtitle}>
              Add your family's favourite recipes and they'll appear automatically in routines when the meal name matches.
            </Text>
            <TouchableOpacity style={s.saveBtn} activeOpacity={0.85} onPress={openAdd}>
              <Text style={s.saveBtnText}>Add your first recipe</Text>
            </TouchableOpacity>
          </View>
        )}

        {recipes.map((recipe) => (
          <View key={recipe.id} style={s.card}>
            <View style={s.cardHeader}>
              <MaterialCommunityIcons name="chef-hat" size={16} color="#F97316" />
              <Text style={s.cardName} numberOfLines={2}>{recipe.name}</Text>
            </View>
            <View style={s.cardMeta}>
              <View style={s.metaItem}>
                <Ionicons name="timer-outline" size={12} color={c.textMuted} />
                <Text style={s.metaText}>Prep: {recipe.prepTime}</Text>
              </View>
              <View style={s.metaItem}>
                <Ionicons name="flame-outline" size={12} color={c.textMuted} />
                <Text style={s.metaText}>Cook: {recipe.cookTime}</Text>
              </View>
              <View style={s.metaItem}>
                <Ionicons name="people-outline" size={12} color={c.textMuted} />
                <Text style={s.metaText}>{recipe.servings}</Text>
              </View>
            </View>
            <Text style={s.cardCount}>
              {recipe.ingredients.length} ingredients · {recipe.steps.length} steps{recipe.tip ? " · 💡 Tip" : ""}
            </Text>
            <View style={s.cardActions}>
              <TouchableOpacity
                style={s.editBtn}
                activeOpacity={0.85}
                onPress={() => openEdit(recipe)}
              >
                <Ionicons name="pencil" size={14} color="#6366F1" />
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteBtn}
                activeOpacity={0.85}
                onPress={() => confirmDelete(recipe)}
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                <Text style={s.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.glassBorder,
      backgroundColor: c.background,
    },
    backBtn: {
      width: 36, height: 36,
      borderRadius: 18,
      alignItems: "center", justifyContent: "center",
      backgroundColor: c.calloutBg,
    },
    addBtn: {
      width: 36, height: 36,
      borderRadius: 18,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#F97316",
    },
    headerTitle: {
      fontSize: 17, fontWeight: "800", color: c.foreground,
    },
    subtitle: {
      fontSize: 13, color: c.textMuted, lineHeight: 18, marginBottom: 4,
    },
    emptyBox: {
      alignItems: "center", padding: 32, gap: 10,
    },
    emptyTitle: {
      fontSize: 16, fontWeight: "800", color: c.foreground, marginTop: 4,
    },
    emptySubtitle: {
      fontSize: 13, color: c.textMuted, textAlign: "center", lineHeight: 18, maxWidth: 280,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1, borderColor: c.glassBorder,
      padding: 14, gap: 8,
    },
    cardHeader: {
      flexDirection: "row", alignItems: "center", gap: 8,
    },
    cardName: {
      flex: 1, fontSize: 15, fontWeight: "800", color: c.foreground,
    },
    cardMeta: {
      flexDirection: "row", flexWrap: "wrap", gap: 10,
    },
    metaItem: {
      flexDirection: "row", alignItems: "center", gap: 4,
    },
    metaText: {
      fontSize: 11, color: c.textMuted, fontWeight: "600",
    },
    cardCount: {
      fontSize: 11, color: c.textMuted,
    },
    cardActions: {
      flexDirection: "row", gap: 8, marginTop: 4,
    },
    editBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
      paddingVertical: 8, borderRadius: 10,
      backgroundColor: "rgba(99,102,241,0.1)",
      borderWidth: 1, borderColor: "rgba(99,102,241,0.25)",
    },
    editBtnText: {
      fontSize: 12, fontWeight: "700", color: "#6366F1",
    },
    deleteBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
      paddingVertical: 8, borderRadius: 10,
      backgroundColor: "rgba(220,38,38,0.08)",
      borderWidth: 1, borderColor: "rgba(220,38,38,0.2)",
    },
    deleteBtnText: {
      fontSize: 12, fontWeight: "700", color: "#DC2626",
    },
    saveBtn: {
      backgroundColor: "#F97316",
      paddingVertical: 14, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
      marginTop: 8,
    },
    saveBtnText: {
      color: "#fff", fontSize: 15, fontWeight: "800",
    },
    formScroll: {
      padding: 16, gap: 4,
    },
    hint: {
      fontSize: 13, color: c.textMuted, lineHeight: 18, marginBottom: 12,
    },
    fieldLabel: {
      fontSize: 13, fontWeight: "700", color: c.foreground, marginBottom: 6, marginTop: 8,
    },
    input: {
      backgroundColor: c.calloutBg,
      borderWidth: 1, borderColor: c.glassBorder,
      borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: c.foreground,
    },
    multiline: {
      minHeight: 100, paddingTop: 10,
    },
    errorBox: {
      flexDirection: "row", gap: 8,
      backgroundColor: "rgba(220,38,38,0.08)",
      borderWidth: 1, borderColor: "rgba(220,38,38,0.25)",
      borderRadius: 10, padding: 10, alignItems: "center",
      marginTop: 8,
    },
    errorText: {
      flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "600",
    },
  });
}
