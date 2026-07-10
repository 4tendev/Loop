ALTER TABLE avalon_quest_team_members
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

UPDATE avalon_quest_team_members
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE avalon_quest_team_members
ALTER COLUMN id SET NOT NULL;

ALTER TABLE avalon_quest_team_members
DROP CONSTRAINT IF EXISTS avalon_quest_team_members_pkey;

ALTER TABLE avalon_quest_team_members
DROP CONSTRAINT IF EXISTS avalon_quest_team_members_quest_id_seat_id_key;

ALTER TABLE avalon_quest_team_members
ADD CONSTRAINT avalon_quest_team_members_pkey PRIMARY KEY (id);

ALTER TABLE avalon_quest_team_members
ALTER COLUMN seat_id DROP NOT NULL;

ALTER TABLE avalon_quest_team_members
ADD CONSTRAINT avalon_quest_team_members_quest_id_seat_id_key UNIQUE (quest_id, seat_id);
