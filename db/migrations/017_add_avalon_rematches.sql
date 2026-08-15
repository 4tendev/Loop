ALTER TABLE avalon_games
ADD COLUMN IF NOT EXISTS rematch_of_game_id uuid UNIQUE
  REFERENCES avalon_games(id) ON DELETE SET NULL;

ALTER TABLE avalon_games
ADD COLUMN IF NOT EXISTS initial_king_predecessor_seat_number integer
  CHECK (initial_king_predecessor_seat_number > 0);

CREATE TABLE IF NOT EXISTS avalon_rematch_votes (
  game_id uuid NOT NULL REFERENCES avalon_games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS avalon_rematch_votes_player_id_idx
ON avalon_rematch_votes (player_id);
