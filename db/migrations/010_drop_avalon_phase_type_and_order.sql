ALTER TABLE avalon_phases
DROP CONSTRAINT IF EXISTS avalon_phases_game_id_phase_order_key;

ALTER TABLE avalon_phases
DROP COLUMN IF EXISTS type,
DROP COLUMN IF EXISTS phase_order;
