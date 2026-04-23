import React from "react";

const View = ({ children, testID, style, ...rest }: any) =>
  React.createElement("div", { "data-testid": testID, ...rest }, children);

const Text = ({ children, testID, style, ...rest }: any) =>
  React.createElement("span", { "data-testid": testID, ...rest }, children);

const Pressable = ({ children, onPress, ...rest }: any) =>
  React.createElement("button", { onClick: onPress, ...rest }, children);

const TouchableOpacity = ({ children, onPress, ...rest }: any) =>
  React.createElement("button", { onClick: onPress, ...rest }, children);

const ScrollView = ({ children, ...rest }: any) =>
  React.createElement("div", rest, children);

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

export {
  View, Text, Pressable, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, Image, Dimensions, StyleSheet,
};
