-- Recurring fixed activities on child profile (tuition, sports, classes).
ALTER TABLE children ADD COLUMN IF NOT EXISTS fixed_activities JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE children SET fixed_activities = '[]'::jsonb WHERE fixed_activities IS NULL;
