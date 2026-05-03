import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { brand } from "@/constants/colors";

interface PhonicsLearningCardProps {
  childId?: number;
  onPress?: () => void;
  testID?: string;
}

export function PhonicsLearningCard({
  childId,
  onPress,
  testID = "card-phonics-learning",
}: PhonicsLearningCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (childId != null) {
      router.push({
        pathname: "/phonics-learning" as never,
        params: { childId: String(childId) } as never,
      });
    } else {
      router.push("/phonics-learning" as never);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{ borderRadius: 18, overflow: "hidden" }}
      testID={testID}
    >
      <LinearGradient
        colors={[brand.violet500, brand.violet600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16, gap: 8 }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
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
            <Ionicons name="book" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}
            >
              🔤 Phonics Learning
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 11.5,
                marginTop: 2,
              }}
            >
              Today's sound · Practise · age-tuned
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="rgba(255,255,255,0.8)"
          />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default PhonicsLearningCard;
