/** Parse Firebase email action link params from query string or hash. */
export function parseFirebaseActionParams(
  location: Pick<Location, "search" | "hash"> = window.location,
): { mode: string | null; oobCode: string | null } {
  const search = new URLSearchParams(location.search);
  let mode = search.get("mode");
  let oobCode = search.get("oobCode");

  if ((!mode || !oobCode) && location.hash) {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    mode = mode ?? hash.get("mode");
    oobCode = oobCode ?? hash.get("oobCode");
  }

  return { mode, oobCode };
}
