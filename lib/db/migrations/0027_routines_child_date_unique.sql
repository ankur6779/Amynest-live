-- P0 data integrity: one routine per (child_id, date).
-- Safe migration: dedupe existing rows, then add uniqueness.

DELETE FROM routines r
USING routines r2
WHERE r.child_id = r2.child_id
  AND r.date = r2.date
  AND r.id < r2.id;

CREATE UNIQUE INDEX IF NOT EXISTS routines_child_date_uq
  ON routines (child_id, date);
