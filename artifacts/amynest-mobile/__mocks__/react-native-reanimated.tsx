import React from "react";
const Animated = {
  View: ({ children, ...rest }: any) => React.createElement("div", rest, children),
  Text: ({ children, ...rest }: any) => React.createElement("span", rest, children),
};
export const FadeIn = {};
export const SlideInDown = {};
export const SlideOutDown = {};
export default Animated;
