import React from "react";
import { Text, StyleSheet, Pressable, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  count: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  onPress: () => void;
  testID?: string;
};

export default function ActivityCard({
  title,
  count,
  icon,
  gradient,
  onPress,
  testID,
}: Props) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const c = useColors();

  return (
    <AnimatedPressable
      testID={testID}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count}`}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Ionicons name={icon} size={24} color="#fff" />
      </LinearGradient>
      <View style={{ marginTop: 14 }}>
        <Text style={[styles.title, { color: c.textStrong }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.count, { color: c.textSubtle }]}>{count}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 130,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  count: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
});
