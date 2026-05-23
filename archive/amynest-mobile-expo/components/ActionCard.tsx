import React from "react";
import { Text, StyleSheet, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  onPress: () => void;
  width?: number;
  testID?: string;
};

export default function ActionCard({
  title,
  description,
  icon,
  gradient,
  onPress,
  width = 220,
  testID,
}: Props) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
      style={[{ width }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Animated.View style={styles.iconWrap}>
          <Ionicons name={icon} size={26} color="#fff" />
        </Animated.View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{description}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 160,
    borderRadius: 22,
    padding: 18,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 12,
  },
  desc: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 4,
  },
});
