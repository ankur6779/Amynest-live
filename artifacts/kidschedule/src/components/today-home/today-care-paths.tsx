/**
 * Compact Home launchpad — existing modules only.
 * Sits under the sanctuary NRT. Not a marketing grid.
 */
import { AppLink } from "@/components/app-link";
import { writeStoredActiveChildId } from "@/hooks/use-active-child-id";
import { buildTodayCarePaths } from "@/lib/today-home/care-paths";

type Props = {
  childId?: number | null;
};

export function TodayCarePaths({ childId }: Props) {
  const paths = buildTodayCarePaths(childId);

  return (
    <nav
      className="th-care-paths"
      data-testid="today-care-paths"
      aria-label="What Amy can help with"
    >
      <p className="th-care-paths-label">What Amy can help with</p>
      <ul className="th-care-paths-list">
        {paths.map((path) => (
          <li key={path.id}>
            <AppLink
              href={path.href}
              source={`today-care-${path.id}`}
              className="th-care-path"
              data-testid={`today-care-${path.id}`}
              onClick={() => {
                if (childId != null) writeStoredActiveChildId(childId);
              }}
            >
              <span className="th-care-path-title">{path.title}</span>
              <span className="th-care-path-purpose">{path.purpose}</span>
            </AppLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
