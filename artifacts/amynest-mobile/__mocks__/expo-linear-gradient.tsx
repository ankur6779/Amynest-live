import React from "react";
export const LinearGradient = ({
  children,
  colors: _colors,
  start: _start,
  end: _end,
  locations: _locations,
  style: _style,
  ...rest
}: any) => React.createElement("div", rest, children);
