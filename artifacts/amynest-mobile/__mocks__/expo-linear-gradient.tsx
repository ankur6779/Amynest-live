import React from "react";
// Surfaces `colors` as a `data-colors` JSON attribute so brand-lockdown tests
// can assert on the actual gradient stops a screen renders. Pre-existing tests
// don't read `data-colors`, so adding this attribute is non-breaking.
export const LinearGradient = ({
  children,
  colors,
  start: _start,
  end: _end,
  locations: _locations,
  style: _style,
  ...rest
}: any) =>
  React.createElement(
    "div",
    {
      "data-colors": Array.isArray(colors) ? JSON.stringify(colors) : undefined,
      ...rest,
    },
    children,
  );
