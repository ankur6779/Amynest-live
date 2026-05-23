import React from "react";

const Slider = ({
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  testID,
  ...rest
}: {
  value?: number;
  minimumValue?: number;
  maximumValue?: number;
  onValueChange?: (v: number) => void;
  testID?: string;
  [key: string]: unknown;
}) =>
  React.createElement("input", {
    type: "range",
    value: String(value ?? 0),
    min: String(minimumValue ?? 0),
    max: String(maximumValue ?? 1),
    "data-testid": testID,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onValueChange?.(Number(e.target.value)),
    readOnly: !onValueChange,
    ...rest,
  });

export default Slider;
