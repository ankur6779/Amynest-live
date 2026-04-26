import React from "react";
const Animated = {
  View: ({ children, ...rest }: any) => React.createElement("div", rest, children),
  Text: ({ children, ...rest }: any) => React.createElement("span", rest, children),
};
export const FadeIn = {};
export const FadeInUp = { duration: () => ({ easing: () => ({}) }) };
export const FadeOutUp = { duration: () => ({}) };
export const SlideInDown = {};
export const SlideOutDown = {};
export const LinearTransition = { duration: () => ({}) };
export const useSharedValue = (initial: any) => ({ value: initial });
export const useAnimatedStyle = (_fn: any) => ({});
export const withTiming = (value: any) => value;
export const Easing = {
  linear: () => 0,
  ease: () => 0,
  out: (_fn: any) => () => 0,
  in: (_fn: any) => () => 0,
  inOut: (_fn: any) => () => 0,
  cubic: () => 0,
};
export default Animated;
