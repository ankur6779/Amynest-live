/** Free plan allows one child profile; premium users may add more. */
export const FREE_CHILD_LIMIT = 1;

export function isAddChildBlocked(isPremium: boolean, existingCount: number): boolean {
  return !isPremium && existingCount >= FREE_CHILD_LIMIT;
}
