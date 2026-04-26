import React from "react";

function stripAnimProps({
  entering: _entering,
  exiting: _exiting,
  layout: _layout,
  style: _style,
  ...rest
}: any) {
  return rest;
}

const Animated = {
  View: ({ children, ...props }: any) =>
    React.createElement("div", stripAnimProps(props), children),
  Text: ({ children, ...props }: any) =>
    React.createElement("span", stripAnimProps(props), children),
  createAnimatedComponent: (Component: any) => Component,
};

const chainable: any = new Proxy(
  {},
  {
    get: () => (..._args: any[]) => chainable,
  },
);
export const FadeIn = chainable;
export const FadeInUp = chainable;
export const FadeOutUp = chainable;
export const SlideInDown = chainable;
export const SlideOutDown = chainable;
export const LinearTransition = chainable;
export const useSharedValue = (initial: any) => ({ value: initial });
export const useAnimatedStyle = (_fn: any) => ({});
export const withTiming = (value: any) => value;
export const withSpring = (value: any) => value;
export const Easing = {
  linear: () => 0,
  ease: () => 0,
  out: (_fn: any) => () => 0,
  in: (_fn: any) => () => 0,
  inOut: (_fn: any) => () => 0,
  cubic: () => 0,
};
export default Animated;
