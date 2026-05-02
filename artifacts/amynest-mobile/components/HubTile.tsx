import React, { useCallback, useEffect, useRef } from "react";
import {
  Pressable,
  View,
  StyleSheet,
  Platform,
  Animated,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ACCENT_PINK } from "@/constants/colors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface HubTileProps {
  /** Optional press handler. When provided HubTile becomes a real Pressable;
   *  when omitted the touch animation still runs (via bubble-phase touch
   *  events) so inner Pressables receive the actual tap. */
  onPress?: () => void;
  /** Featured tiles use a slightly larger drop shadow + corner radius. */
  featured?: boolean;
  /** Pass-through accessibility label for press tiles. */
  accessibilityLabel?: string;
  /** Test id, propagated to the outer wrapper. */
  testID?: string;
  /** Custom style merged after the tile defaults. */
  style?: StyleProp<ViewStyle>;
  /**
   * When true, briefly draws an animated accent-pink ring around the tile
   * that fades over ~2.2s. Used by the Today's Plan quick-jump (Task #191)
   * to draw the parent's eye to the matching tile after jumping the pager.
   * Setting it back to false (or another tile becoming highlighted) cancels
   * the active animation and removes the ring.
   */
  highlighted?: boolean;
  children: React.ReactNode;
}

const PRESS_IN_DURATION = 120;
const PRESS_OUT_DURATION = 140;
const PRESS_SCALE = 0.97;

/**
 * Shared press-to-scale primitive used by every tile in the Parent Hub's
 * 4-section pager. Tapping the tile briefly scales it to ~0.97 over ~120ms
 * with an ease-out timing function — gives the hub a responsive native feel
 * without committing to a particular visual style for the children.
 *
 * Two modes:
 *   1. With `onPress`: HubTile is the press target (Pressable + scale).
 *   2. Without `onPress`: HubTile uses bubble-phase `onTouchStart`/`onTouchEnd`
 *      handlers on a plain View so the scale animation still fires for ANY
 *      tap on the tile, while inner Pressables (legacy `Section` accordions
 *      etc.) still receive and own the actual tap. This satisfies the
 *      "any tile gets the shared press feedback" requirement without
 *      forcing every tile content to surface its primary action up here.
 */
export function HubTile({
  onPress,
  featured = false,
  accessibilityLabel,
  testID,
  style,
  highlighted = false,
  children,
}: HubTileProps) {
  // Use the standard RN Animated API so we can type the interpolated
  // transform without `as any` at the call site. The `useNativeDriver`
  // flag below keeps the animation off the JS thread.
  const scale = useRef(new Animated.Value(1)).current;
  // Highlight ring opacity — animated on the JS thread (false) because it
  // drives a borderColor-style ring; brief and one-shot so the cost is
  // negligible. Fades from 1 → 0 over ~2.2s when `highlighted` flips true.
  const glow = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: PRESS_SCALE,
      duration: PRESS_IN_DURATION,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: PRESS_OUT_DURATION,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  useEffect(() => {
    if (highlighted) {
      // Snap to fully visible, then fade out. The brief delay lets the
      // user notice the ring appearing before it starts fading.
      glow.stopAnimation();
      glow.setValue(1);
      Animated.timing(glow, {
        toValue: 0,
        duration: 2000,
        delay: 200,
        useNativeDriver: false,
      }).start();
    } else {
      glow.stopAnimation();
      glow.setValue(0);
    }
  }, [highlighted, glow]);

  const wrapperStyle: StyleProp<ViewStyle> = [
    styles.tile,
    featured && styles.featured,
    style,
    { transform: [{ scale }] },
  ];

  // Sibling absolute-fill ring layered over the tile content. `pointerEvents`
  // is `none` so it never intercepts taps that should reach inner Pressables.
  const highlightRing = (
    <Animated.View
      pointerEvents="none"
      style={[styles.highlightRing, { opacity: glow }]}
      testID={testID ? `${testID}-highlight` : undefined}
    />
  );

  if (!onPress) {
    // Bubble-phase touch handlers: View doesn't capture the gesture, so
    // any inner Pressable still receives `onPress`. The scale just gives
    // visual feedback that the tap landed on the tile chrome.
    return (
      <Animated.View
        style={wrapperStyle}
        testID={testID}
        // `onStartShouldSetResponder` returning false means we never
        // become the responder — touches pass straight through to the
        // children — but the bubble-phase touch events still fire on us.
        onStartShouldSetResponder={() => false}
        onTouchStart={animateIn}
        onTouchEnd={animateOut}
        onTouchCancel={animateOut}
      >
        {children}
        {highlightRing}
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      onPressIn={(_e: GestureResponderEvent) => animateIn()}
      onPressOut={(_e: GestureResponderEvent) => animateOut()}
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={wrapperStyle}
    >
      {children}
      {highlightRing}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: "100%",
  },
  featured: {
    // Featured tiles are always full width; the drop shadow lives on the
    // child gradient/View so the press wrapper stays a clean transform target.
  },
  highlightRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: ACCENT_PINK,
    backgroundColor: "rgba(255,78,205,0.10)" /* audit-ok: ACCENT_PINK 10% */,
  },
});

export default HubTile;
