import React from "react";

// Strip props that React Native accepts but the DOM does not, so RN style
// arrays / refresh controls don't leak into div/button attributes (which
// triggers React DOM proxy errors).
function stripRnProps({
  style,
  contentContainerStyle,
  refreshControl,
  showsHorizontalScrollIndicator,
  showsVerticalScrollIndicator,
  decelerationRate,
  snapToInterval,
  snapToAlignment,
  horizontal,
  numberOfLines,
  onPressIn,
  onPressOut,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  accessible,
  hitSlop,
  pointerEvents,
  pagingEnabled,
  scrollEventThrottle,
  initialNumToRender,
  windowSize,
  getItemLayout,
  onScroll,
  onMomentumScrollEnd,
  onLayout,
  ...rest
}: any) {
  return rest;
}

const View = ({ children, testID, ...props }: any) =>
  React.createElement(
    "div",
    { "data-testid": testID, ...stripRnProps(props) },
    children,
  );

const Text = ({ children, testID, ...props }: any) =>
  React.createElement(
    "span",
    { "data-testid": testID, ...stripRnProps(props) },
    children,
  );

// Pressable / TouchableOpacity translate RN accessibility props to DOM aria-*
// before stripping, so testing-library's getByLabelText / getByRole queries
// can find them. stripRnProps then removes the original RN-only prop names
// so they don't leak onto the underlying <button>.
const Pressable = ({
  children,
  onPress,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  testID,
  ...props
}: any) =>
  React.createElement(
    "button",
    {
      onClick: onPress,
      "aria-label": accessibilityLabel,
      role: accessibilityRole,
      // Translate RN accessibilityState fields onto their DOM aria-* twins
      // so testing-library queries (toHaveAttribute("aria-selected", ...))
      // can read them. Only translate the props the hub actually uses today.
      ...(accessibilityState && typeof accessibilityState === "object"
        ? {
            ...(accessibilityState.selected != null && {
              "aria-selected": String(accessibilityState.selected),
            }),
            ...(accessibilityState.disabled != null && {
              "aria-disabled": String(accessibilityState.disabled),
            }),
            ...(accessibilityState.checked != null && {
              "aria-checked": String(accessibilityState.checked),
            }),
            ...(accessibilityState.expanded != null && {
              "aria-expanded": String(accessibilityState.expanded),
            }),
          }
        : {}),
      "data-testid": testID,
      ...stripRnProps(props),
    },
    children,
  );

const TouchableOpacity = ({
  children,
  onPress,
  testID,
  accessibilityLabel,
  accessibilityRole,
  ...props
}: any) =>
  React.createElement(
    "button",
    {
      onClick: onPress,
      "data-testid": testID,
      "aria-label": accessibilityLabel,
      role: accessibilityRole,
      ...stripRnProps(props),
    },
    children,
  );

const ScrollView = ({ children, testID, ...props }: any) =>
  React.createElement(
    "div",
    { "data-testid": testID, ...stripRnProps(props) },
    children,
  );

const Modal = ({ children, visible }: any) =>
  visible ? React.createElement("div", {}, children) : null;

const ActivityIndicator = () => React.createElement("span", {}, "loading…");

const Image = ({ source, style, ...rest }: any) =>
  React.createElement("img", { src: source?.uri ?? source, ...rest });

const Dimensions = { get: () => ({ width: 375, height: 812 }) };

const useWindowDimensions = () => ({ width: 375, height: 812, scale: 2, fontScale: 1 });

// ─── FlatList test surface ──────────────────────────────────────────────────
//
// Tests that exercise pager wiring (e.g. `hub.tsx`'s horizontal section
// pager) need to:
//   1. Capture `scrollToOffset` calls on the FlatList ref.
//   2. Invoke the `onMomentumScrollEnd` handler the component wired up.
//
// The mock attaches both via a forwarded ref + a module-scoped registry
// keyed by the test-id of the FlatList. Tests can then assert against
// `__flatListTestState.scrollToOffsetCalls` or call the captured momentum
// handler synthetically. `reset()` is exposed so test files can clear the
// registry between cases.
type ScrollToOffsetCall = { offset: number; animated?: boolean };

interface FlatListTestState {
  scrollToOffsetCalls: ScrollToOffsetCall[];
  lastInstance: { scrollToOffset: (opts: ScrollToOffsetCall) => void } | null;
  lastMomentumHandler: ((e: any) => void) | null;
  lastScrollHandler: ((e: any) => void) | null;
  reset: () => void;
}

export const __flatListTestState: FlatListTestState = {
  scrollToOffsetCalls: [],
  lastInstance: null,
  lastMomentumHandler: null,
  lastScrollHandler: null,
  reset() {
    this.scrollToOffsetCalls = [];
    this.lastInstance = null;
    this.lastMomentumHandler = null;
    this.lastScrollHandler = null;
  },
};

const FlatList = React.forwardRef<any, any>(function FlatList(
  {
    data,
    renderItem,
    keyExtractor,
    ListHeaderComponent,
    ListFooterComponent,
    testID,
    onScroll,
    onMomentumScrollEnd,
    ...props
  }: any,
  ref,
) {
  React.useImperativeHandle(
    ref,
    () => {
      const inst = {
        scrollToOffset: (opts: ScrollToOffsetCall) => {
          __flatListTestState.scrollToOffsetCalls.push(opts);
        },
        scrollToIndex: (_opts: { index: number; animated?: boolean }) => {},
        scrollToEnd: (_opts?: { animated?: boolean }) => {},
      };
      __flatListTestState.lastInstance = inst;
      return inst;
    },
    [],
  );
  // Keep the latest handlers on every render so tests always invoke the
  // most recently wired callback (e.g. after `pageWidth` updates).
  __flatListTestState.lastMomentumHandler = onMomentumScrollEnd ?? null;
  __flatListTestState.lastScrollHandler = onScroll ?? null;

  const items = Array.isArray(data) ? data : [];
  return React.createElement(
    "div",
    { "data-testid": testID, ...stripRnProps(props) },
    [
      ListHeaderComponent && React.createElement(
        "div",
        { key: "__header" },
        typeof ListHeaderComponent === "function"
          ? React.createElement(ListHeaderComponent)
          : ListHeaderComponent,
      ),
      ...items.map((item: any, index: number) =>
        React.createElement(
          "div",
          { key: keyExtractor ? keyExtractor(item, index) : String(index) },
          renderItem ? renderItem({ item, index }) : null,
        ),
      ),
      ListFooterComponent && React.createElement(
        "div",
        { key: "__footer" },
        typeof ListFooterComponent === "function"
          ? React.createElement(ListFooterComponent)
          : ListFooterComponent,
      ),
    ].filter(Boolean),
  );
});

const StyleSheet = {
  create: (styles: Record<string, any>) => styles,
  absoluteFill: {},
};

const TextInput = ({
  value,
  onChangeText,
  placeholder,
  testID,
  ...rest
}: any) =>
  React.createElement("input", {
    value,
    onChange: (e: any) => onChangeText?.(e.target.value),
    placeholder,
    "data-testid": testID,
    ...stripRnProps(rest),
  });

const KeyboardAvoidingView = ({ children, ...rest }: any) =>
  React.createElement("div", stripRnProps(rest), children);

const Platform = { OS: "ios", select: (obj: any) => obj.ios ?? obj.default };

// PanResponder is gesture-only on RN; in jsdom we never trigger pan
// gestures, so a no-op stub is sufficient for any component that builds
// a responder during render (e.g. the Command Center's swipeable
// timeline rows).
const PanResponder = {
  create: (_config: any) => ({
    panHandlers: {},
  }),
};

// ─── Animated ───────────────────────────────────────────────────────────────
//
// Minimal Animated surface so components like the Hub's section pager can
// `new Animated.Value(0)`, wire `Animated.event`, and render `Animated.View`
// in the jsdom test environment. `interpolate` returns another AnimatedValue
// rather than throwing so transform style props don't blow up render. The
// `timing` / `spring` / `parallel` / `sequence` / `loop` helpers are no-op
// shims that snap the target to its `toValue` and immediately invoke the
// completion callback so animation chains in tests don't dangle (used by
// the Command Center's swipe-to-skip row).

class AnimatedValue {
  _value: number;
  _listeners: Array<(v: { value: number }) => void> = [];
  constructor(initial: number = 0) {
    this._value = initial;
  }
  setValue(v: number): void {
    this._value = v;
    this._listeners.forEach((l) => l({ value: v }));
  }
  addListener(fn: (v: { value: number }) => void): string {
    this._listeners.push(fn);
    return String(this._listeners.length - 1);
  }
  removeListener(_id: string): void {
    // no-op for tests
  }
  removeAllListeners(): void {
    this._listeners = [];
  }
  stopAnimation(_cb?: (v: number) => void): void {
    // no-op for tests
  }
  interpolate(_config: unknown): AnimatedValue {
    return new AnimatedValue(0);
  }
  __getValue(): number {
    return this._value;
  }
}

function applyAnimatedEvent(mapping: any, src: any): void {
  if (!mapping || src == null) return;
  for (const key of Object.keys(mapping)) {
    const m = mapping[key];
    const s = src[key];
    if (m instanceof AnimatedValue) {
      if (typeof s === "number") m.setValue(s);
    } else if (typeof m === "object" && m !== null) {
      applyAnimatedEvent(m, s ?? {});
    }
  }
}

const animationLike = (target: any, toValue: number) => ({
  start: (cb?: (ev: { finished: boolean }) => void) => {
    if (target && typeof target.setValue === "function" && typeof toValue === "number") {
      target.setValue(toValue);
    }
    cb?.({ finished: true });
  },
  stop: () => {},
  reset: () => {},
});

const Animated = {
  Value: AnimatedValue,
  View: ({ children, testID, ...props }: any) =>
    React.createElement(
      "div",
      { "data-testid": testID, ...stripRnProps(props) },
      children,
    ),
  Text: ({ children, testID, ...props }: any) =>
    React.createElement(
      "span",
      { "data-testid": testID, ...stripRnProps(props) },
      children,
    ),
  ScrollView: ({ children, testID, ...props }: any) =>
    React.createElement(
      "div",
      { "data-testid": testID, ...stripRnProps(props) },
      children,
    ),
  event:
    (mappings: any[], _opts?: { useNativeDriver?: boolean }) =>
    (event: any) => {
      for (const mapping of mappings) applyAnimatedEvent(mapping, event);
    },
  // The pager passes a forwardRef component (FlatList) into
  // `createAnimatedComponent`, then attaches `ref={pagerRef}` to the
  // returned component. Returning the component unchanged preserves the
  // forwarded ref so tests can still capture `scrollToOffset` calls.
  createAnimatedComponent: (Component: any) => Component,
  // No-op animation drivers for the Command Center's swipe row.
  timing: (target: any, { toValue }: { toValue: number }) => animationLike(target, toValue),
  spring: (target: any, { toValue }: { toValue: number }) => animationLike(target, toValue),
  decay: (target: any, _cfg: unknown) => animationLike(target, target?._value ?? 0),
  parallel: (anims: Array<{ start: (cb?: () => void) => void }>) => ({
    start: (cb?: () => void) => {
      anims.forEach((a) => a.start());
      cb?.();
    },
    stop: () => {},
  }),
  sequence: (anims: Array<{ start: (cb?: () => void) => void }>) => ({
    start: (cb?: () => void) => {
      anims.forEach((a) => a.start());
      cb?.();
    },
    stop: () => {},
  }),
  loop: (anim: { start: (cb?: () => void) => void }) => ({
    start: (cb?: () => void) => {
      anim.start();
      cb?.();
    },
    stop: () => {},
  }),
};

// LayoutAnimation / UIManager are touched at module load time by hub.tsx's
// Android branch. They never need to actually animate in tests; the no-op
// surface below just keeps the imports satisfied.
const LayoutAnimation = {
  configureNext: (_config: unknown, _onAnimationDidEnd?: () => void) => {},
  Presets: {
    easeInEaseOut: {},
    linear: {},
    spring: {},
  },
  Types: {
    spring: "spring",
    linear: "linear",
    easeInEaseOut: "easeInEaseOut",
    easeIn: "easeIn",
    easeOut: "easeOut",
    keyboard: "keyboard",
  },
  Properties: {
    opacity: "opacity",
    scaleXY: "scaleXY",
    scaleX: "scaleX",
    scaleY: "scaleY",
  },
  create: (_duration: number, _type?: string, _property?: string) => ({}),
};

const UIManager = {
  setLayoutAnimationEnabledExperimental: (_enabled: boolean) => {},
  measure: (_node: number, _cb: any) => {},
  measureInWindow: (_node: number, _cb: any) => {},
  measureLayout: (_node: number, _rel: number, _err: any, _cb: any) => {},
};

export {
  View, Text, Pressable, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, Image, Dimensions, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform,
  FlatList, useWindowDimensions,
  PanResponder, Animated, LayoutAnimation, UIManager,
};
