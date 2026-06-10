import type {
  ActivityParams,
  AdditionPayload,
  CountingPayload,
  DailyPayload,
  DivisionPayload,
  MultiplicationPayload,
  PatternPayload,
  PuzzlePayload,
  SubtractionPayload,
} from "@workspace/math-playground";
import { CountingAdventure } from "./CountingAdventure";
import { AdditionLab } from "./AdditionLab";
import { SubtractionGarden } from "./SubtractionGarden";
import { MultiplicationFactory } from "./MultiplicationFactory";
import { DivisionBakery } from "./DivisionBakery";
import { NumberPatterns } from "./NumberPatterns";
import { MathPuzzles } from "./MathPuzzles";
import type { ActivitySharedProps } from "./activity-shared-props";

interface ActivityTaskRendererProps extends ActivitySharedProps {
  activity: ActivityParams;
}

export function ActivityTaskRenderer({
  activity,
  amy,
  accentColor,
  onComplete,
  engagement,
  childId,
}: ActivityTaskRendererProps) {
  switch (activity.activityId) {
    case "counting_adventure":
      return (
        <CountingAdventure
          payload={activity.payload as CountingPayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={onComplete}
          engagement={engagement}
          childId={childId}
        />
      );
    case "addition_lab":
      return (
        <AdditionLab
          payload={activity.payload as AdditionPayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={onComplete}
          engagement={engagement}
          childId={childId}
        />
      );
    case "subtraction_garden":
      return (
        <SubtractionGarden
          payload={activity.payload as SubtractionPayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={onComplete}
          engagement={engagement}
          childId={childId}
        />
      );
    case "multiplication_factory":
      return (
        <MultiplicationFactory
          payload={activity.payload as MultiplicationPayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={onComplete}
          engagement={engagement}
          childId={childId}
        />
      );
    case "division_bakery":
      return (
        <DivisionBakery
          payload={activity.payload as DivisionPayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={onComplete}
          engagement={engagement}
          childId={childId}
        />
      );
    case "number_patterns":
      return (
        <NumberPatterns
          payload={activity.payload as PatternPayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={onComplete}
          engagement={engagement}
          childId={childId}
        />
      );
    case "math_puzzles":
      return (
        <MathPuzzles
          payload={activity.payload as PuzzlePayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={onComplete}
          engagement={engagement}
          childId={childId}
        />
      );
    case "daily_challenge":
      return null;
    default:
      return null;
  }
}

export type { DailyPayload };
