import React from "react";
import { View, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import SmartMealSuggestions from "@/components/SmartMealSuggestions";

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={theme.gradient}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Stack.Screen options={{ title: t("screens.meals.title") }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <SmartMealSuggestions />
      </ScrollView>
    </View>
  );
}
