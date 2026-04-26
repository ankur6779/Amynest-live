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
  accessible,
  hitSlop,
  pointerEvents,
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

const Pressable = ({ children, onPress, ...props }: any) =>
  React.createElement(
    "button",
    { onClick: onPress, ...stripRnProps(props) },
    children,
  );

const TouchableOpacity = ({ children, onPress, testID, ...props }: any) =>
  React.createElement(
    "button",
    { onClick: onPress, "data-testid": testID, ...stripRnProps(props) },
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

const StyleSheet = {
  create: (styles: Record<string, any>) => styles,
  absoluteFill: {},
};

const TextInput = ({ value, onChangeText, placeholder, testID, ...rest }: any) =>
  React.createElement("input", {
    value,
    onChange: (e: any) => onChangeText?.(e.target.value),
    placeholder,
    "data-testid": testID,
    ...rest,
  });

const KeyboardAvoidingView = ({ children, ...rest }: any) =>
  React.createElement("div", rest, children);

const Platform = { OS: "ios", select: (obj: any) => obj.ios ?? obj.default };

export {
  View, Text, Pressable, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, Image, Dimensions, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform,
};
