-- Recurring fixed activities on child profile (tuition, sports, classes).
ALTER TABLE children ADD COLUMN IF NOT EXISTS fixed_activities JSONB;
