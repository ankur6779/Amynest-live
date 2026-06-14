/** Free plan allows one child profile; premium allows two (demo account exempt on server). */
export const FREE_CHILD_LIMIT = 1;

export function isAddChildBlocked(childrenMax: number, existingCount: number): boolean {
  return existingCount >= childrenMax;
}
