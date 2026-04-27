import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

interface PhonicsTestCardProps {
  childId?: number;
  onPress?: () => void;
  testID?: string;
}

export function PhonicsTestCard({ childId, onPress, testID = "card-phonics-test" }: PhonicsTestCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (childId != null) {
      router.push({ pathname: "/phonics-test" as never, params: { childId: String(childId) } as never });
    } else {
      router.push("/phonics-test" as never);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{ borderRadius: 18, overflow: "hidden" }}
      testID={testID}
    >
      <LinearGradient
        colors={["#7C3AED", "#D946EF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16, gap: 8 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="school" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🔤 Phonics Test</Text>
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>
              Daily 5Q · Weekly 20Q · age-tuned
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default PhonicsTestCard;
