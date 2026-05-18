import type { ShimUser } from "@/lib/firebase-auth-context";

export function getUserDisplayName(user: ShimUser | null | undefined): string {
  if (!user) return "User";
  const fromName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fromName) return fromName;
  if (user.fullName?.trim()) return user.fullName.trim();
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    "User"
  );
}

export function getUserEmail(user: ShimUser | null | undefined): string {
  if (!user) return "";
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    ""
  );
}

export function getUserInitials(user: ShimUser | null | undefined): string {
  if (!user) return "U";
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  const email = getUserEmail(user);
  return (email[0] ?? "U").toUpperCase();
}

export function getUserAvatarUrl(user: ShimUser | null | undefined): string | undefined {
  return user?.imageUrl ?? undefined;
}
