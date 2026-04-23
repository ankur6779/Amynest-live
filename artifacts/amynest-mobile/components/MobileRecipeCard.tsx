import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type MobileRecipe = {
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  tip?: string;
};

export type MobileNutrition = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes?: string;
};

export type MobileRecipeCardProps = {
  meal?: string | null;
  recipe?: MobileRecipe | null;
  nutrition?: MobileNutrition | null;
};

export function MobileRecipeCard({ meal, recipe, nutrition }: MobileRecipeCardProps) {
  if (!recipe && !nutrition) return null;
  return (
    <View style={s.container} testID="mobile-recipe-card">
      <Text style={s.header} testID="mobile-recipe-header">
        👨‍🍳 Recipe & Nutrition{meal ? ` — ${meal}` : ""}
      </Text>
      {recipe ? (
        <View testID="mobile-recipe-section">
          <Text style={s.meta}>
            Prep {recipe.prepTime} · Cook {recipe.cookTime} · Serves {recipe.servings}
          </Text>
          <Text style={s.subheading}>Ingredients</Text>
          {(recipe.ingredients ?? []).map((ing, i) => (
            <Text key={`ing-${i}`} style={s.body}>• {ing}</Text>
          ))}
          <Text style={s.subheading}>Steps</Text>
          {(recipe.steps ?? []).map((st, i) => (
            <Text key={`st-${i}`} style={s.body}>{i + 1}. {st}</Text>
          ))}
          {recipe.tip ? (
            <Text style={s.tip}>💡 {recipe.tip}</Text>
          ) : null}
        </View>
      ) : null}
      {nutrition ? (
        <View testID="mobile-nutrition-section">
          <Text style={s.subheading}>Nutrition (approx.)</Text>
          <View style={s.macroRow}>
            <View style={s.macroBox}>
              <Text style={s.macroValue} testID="macro-calories">{nutrition.calories}</Text>
              <Text style={s.macroLabel}>Cal</Text>
            </View>
            <View style={s.macroBox}>
              <Text style={s.macroValue} testID="macro-protein">{nutrition.protein}</Text>
              <Text style={s.macroLabel}>Protein</Text>
            </View>
            <View style={s.macroBox}>
              <Text style={s.macroValue} testID="macro-carbs">{nutrition.carbs}</Text>
              <Text style={s.macroLabel}>Carbs</Text>
            </View>
            <View style={s.macroBox}>
              <Text style={s.macroValue} testID="macro-fat">{nutrition.fat}</Text>
              <Text style={s.macroLabel}>Fat</Text>
            </View>
          </View>
          {nutrition.notes ? (
            <Text style={s.tip}>{nutrition.notes}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 6 },
  header: { fontWeight: "700", fontSize: 13 },
  meta: { fontSize: 11, opacity: 0.7 },
  subheading: { fontWeight: "700", marginTop: 4 },
  body: { fontSize: 12 },
  tip: { fontStyle: "italic", marginTop: 4 },
  macroRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  macroBox: { flex: 1, alignItems: "center" },
  macroValue: { fontWeight: "700", fontSize: 11 },
  macroLabel: { fontSize: 9 },
});
