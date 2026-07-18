ALTER TABLE avalon_games
ADD COLUMN IF NOT EXISTS table_name text;

ALTER TABLE avalon_games
DROP CONSTRAINT IF EXISTS avalon_games_table_name_length_check;

ALTER TABLE avalon_games
ADD CONSTRAINT avalon_games_table_name_length_check
CHECK (
  table_name IS NULL
  OR char_length(btrim(table_name)) BETWEEN 1 AND 60
);
