import React, { useCallback, useRef } from "react";
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
  children,
}: HubTileProps) {
  // Use the standard RN Animated API so we can type the interpolated
  // transform without `as any` at the call site. The `useNativeDriver`
  // flag below keeps the animation off the JS thread.
  const scale = useRef(new Animated.Value(1)).current;

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

  const wrapperStyle: StyleProp<ViewStyle> = [
    styles.tile,
    featured && styles.featured,
    style,
    { transform: [{ scale }] },
  ];

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
});

export default HubTile;
