/**
 * Teacher Mode — architecture-ready stubs (disabled by default).
 * Enable later via feature flag without rewriting Reading Academy core.
 */

export type TeacherAssignment = {
  id: string;
  bookId: string;
  childId: number;
  assignedAt: number;
  dueAt?: number;
  completedAt?: number | null;
  note?: string;
};

export type TeacherClassroomSnapshot = {
  classroomId: string;
  childIds: number[];
  assignments: TeacherAssignment[];
  /** Aggregate analytics placeholders */
  avgStoriesCompleted: number;
  avgWordsRead: number;
};

export const TEACHER_MODE_ENABLED = false;

export function createEmptyClassroom(classroomId: string): TeacherClassroomSnapshot {
  return {
    classroomId,
    childIds: [],
    assignments: [],
    avgStoriesCompleted: 0,
    avgWordsRead: 0,
  };
}

/** Future: assign a decodable book to a child. */
export function assignBookToChild(
  classroom: TeacherClassroomSnapshot,
  childId: number,
  bookId: string,
): TeacherClassroomSnapshot {
  if (!TEACHER_MODE_ENABLED) return classroom;
  const assignment: TeacherAssignment = {
    id: `asg-${childId}-${bookId}-${Date.now()}`,
    bookId,
    childId,
    assignedAt: Date.now(),
    completedAt: null,
  };
  return {
    ...classroom,
    childIds: classroom.childIds.includes(childId)
      ? classroom.childIds
      : [...classroom.childIds, childId],
    assignments: [...classroom.assignments, assignment],
  };
}

export function teacherModeStatus(): {
  enabled: boolean;
  message: string;
} {
  return {
    enabled: TEACHER_MODE_ENABLED,
    message: TEACHER_MODE_ENABLED
      ? "Teacher Mode is active."
      : "Teacher Mode is architecture-ready and disabled in production.",
  };
}
