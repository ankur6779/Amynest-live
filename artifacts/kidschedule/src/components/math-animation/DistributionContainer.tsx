import type { SceneContainer, SceneObject } from "@workspace/math-tricks";
import { GroupContainer } from "./GroupContainer";

interface DistributionContainerProps {
  baskets: SceneContainer[];
  objectsByContainer: Map<string, SceneObject[]>;
  sceneSize: number;
  reduced: boolean;
  onTapObject?: (object: SceneObject) => void;
  interactive?: boolean;
  celebrating?: boolean;
}

/**
 * Lays out the division "sharing" view: an evenly spaced row of baskets that
 * each fill up as objects are dealt out. Wraps to multiple rows on narrow
 * screens so it stays mobile-friendly.
 */
export function DistributionContainer({
  baskets,
  objectsByContainer,
  sceneSize,
  reduced,
  onTapObject,
  interactive,
  celebrating,
}: DistributionContainerProps) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-2.5">
      {baskets.map((basket) => (
        <GroupContainer
          key={basket.id}
          container={basket}
          objects={objectsByContainer.get(basket.id) ?? []}
          sceneSize={sceneSize}
          reduced={reduced}
          onTapObject={onTapObject}
          interactive={interactive}
          dense={baskets.length > 3}
          celebrating={celebrating}
        />
      ))}
    </div>
  );
}
