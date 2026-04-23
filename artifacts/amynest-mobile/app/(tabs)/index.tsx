import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList, Platform, ActivityIndicator,
  Modal, Pressable, Animated, Dimensions, Easing, Image,
} from "react-native";
import { useUser } from "@/lib/firebase-auth";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";

import Svg, { Circle } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemePalette } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import { LanguageRow } from "@/components/LanguageRow";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import { brand, brandAlpha } from "@/constants/colors";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";
import LockedBlock from "@/components/LockedBlock";

const LOGO_IMG = require("@assets/ChatGPT_Image_Apr_19,_2026,_02_10_25_PM_1776957728257.png");


type Colors = ReturnType<typeof useColors>;

function HeroGreeting({
  displayName, hasChildren, onMenu, onAskAmy,
}: { displayName: string; hasChildren: boolean; onMenu: () => void; onAskAmy: () => void }) {
  const styles = useThemedStyles();
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={["rgba(123,63,242,0.30)", "rgba(255,78,205,0.22)", "rgba(20,20,43,0.0)"] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroGreeting}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroBrandRow}>
          <ExpoImage source={LOGO_IMG} style={styles.heroLogo} contentFit="contain" />
          <Text style={styles.heroBrand}>Amy Nest</Text>
          <LinearGradient
            colors={[brand.primary, "#FF4ECD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBadge}
          >
            <Text style={styles.aiBadgeText}>AI</Text>
          </LinearGradient>
          <TouchableOpacity
            onPress={onAskAmy}
            hitSlop={8}
            activeOpacity={0.8}
            style={styles.amyAiHeaderBtn}
          >
            <LinearGradient
              colors={[brand.primary, "#FF4ECD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.amyAiHeaderBtnGrad}
            >
              <AmyFace size={15} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onMenu} hitSlop={10} style={styles.menuBtn} activeOpacity={0.8}>
          <Ionicons name="menu" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.heroEyebrow}>{t(getGreetingKey()).toUpperCase()}</Text>
      <Text style={styles.heroTitle}>
        👋 {displayName ? t("dashboard.greeting_with_name", { name: displayName }) : t("dashboard.greeting_no_name")}
      </Text>
      <Text style={styles.heroSub}>
        {hasChildren ? `${t("dashboard.planned_for_you")} ❤️` : `${t("dashboard.setup_first")} 🌟`}
      </Text>
    </LinearGradient>
  );
}
