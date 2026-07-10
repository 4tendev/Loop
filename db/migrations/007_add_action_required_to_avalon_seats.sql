ALTER TABLE avalon_seats
ADD COLUMN IF NOT EXISTS action_required_type text;

ALTER TABLE avalon_seats
ADD COLUMN IF NOT EXISTS action_required_id uuid;

ALTER TABLE avalon_seats
DROP CONSTRAINT IF EXISTS avalon_seats_action_required_pair_check;

ALTER TABLE avalon_seats
ADD CONSTRAINT avalon_seats_action_required_pair_check
CHECK (
  (action_required_type IS NULL AND action_required_id IS NULL)
  OR (action_required_type IS NOT NULL AND action_required_id IS NOT NULL)
);
