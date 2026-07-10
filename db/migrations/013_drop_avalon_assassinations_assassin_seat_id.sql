DROP INDEX IF EXISTS avalon_assassinations_assassin_seat_id_idx;

ALTER TABLE avalon_assassinations
DROP COLUMN IF EXISTS assassin_seat_id;
