/**
 * Compact Home launchpad — existing modules only.
 * Sits under the sanctuary NRT. Not a marketing grid.
 */
import { AppLink } from "@/components/app-link";
import { writeStoredActiveChildId } from "@/hooks/use-active-child-id";
import { buildTodayCarePaths, type TodayCarePathInput } from "@/lib/today-home/care-paths";

function applyRoomHash(href: string) {
  const hash = href.split("#")[1];
  if (!hash || typeof window === "undefined") return;
  window.setTimeout(() => {
    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    } else {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }, 0);
}

type Props = TodayCarePathInput;

export function TodayCarePaths({
  childId,
  ageYears,
  ageMonths,
  routineCount,
  stage,
}: Props) {
  const paths = buildTodayCarePaths({
    childId,
    ageYears,
    ageMonths,
    routineCount,
    stage,
  });

  if (paths.length === 0) return null;

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
                applyRoomHash(path.href);
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
