CREATE TABLE IF NOT EXISTS avalon_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'lobby'
    CHECK (status IN ('lobby', 'inProgress', 'completed', 'cancelled')),
  player_count integer NOT NULL CHECK (player_count BETWEEN 5 AND 10),
  use_oberon boolean NOT NULL DEFAULT false,
  use_lady_of_the_lake boolean NOT NULL DEFAULT false,
  role_exposing boolean NOT NULL DEFAULT false,
  public_message text NOT NULL DEFAULT 'بازی در مرحله لابی است.',
  winner_side text CHECK (winner_side IN ('good', 'evil')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS avalon_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES avalon_games(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('merlin', 'percival', 'servant', 'assassin', 'morgana', 'mordred', 'oberon')),
  number integer NOT NULL CHECK (number > 0),
  private_message text NOT NULL DEFAULT 'private message',
  action_required_type text,
  action_required_id uuid,
  player_id uuid REFERENCES users(id) ON DELETE SET NULL,
  CHECK (
    (action_required_type IS NULL AND action_required_id IS NULL)
    OR (action_required_type IS NOT NULL AND action_required_id IS NOT NULL)
  ),
  CONSTRAINT avalon_seats_game_id_number_key UNIQUE (game_id, number),
  CONSTRAINT avalon_seats_game_id_player_id_key UNIQUE (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS avalon_seats_game_id_idx
ON avalon_seats (game_id);

CREATE INDEX IF NOT EXISTS avalon_seats_player_id_idx
ON avalon_seats (player_id);

CREATE TABLE IF NOT EXISTS avalon_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES avalon_games(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS avalon_phases_game_id_idx
ON avalon_phases (game_id);

CREATE TABLE IF NOT EXISTS avalon_nights (
  id uuid PRIMARY KEY REFERENCES avalon_phases(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL UNIQUE REFERENCES avalon_phases(id) ON DELETE CASCADE,
  CHECK (id = phase_id)
);

CREATE TABLE IF NOT EXISTS avalon_night_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  night_id uuid NOT NULL REFERENCES avalon_nights(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  is_checked boolean NOT NULL DEFAULT false,
  CONSTRAINT avalon_night_checks_night_id_seat_id_key UNIQUE (night_id, seat_id)
);

CREATE INDEX IF NOT EXISTS avalon_night_checks_night_id_idx
ON avalon_night_checks (night_id);

CREATE INDEX IF NOT EXISTS avalon_night_checks_seat_id_idx
ON avalon_night_checks (seat_id);

CREATE TABLE IF NOT EXISTS avalon_quests (
  id uuid PRIMARY KEY REFERENCES avalon_phases(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL UNIQUE REFERENCES avalon_phases(id) ON DELETE CASCADE,
  king_seat_id uuid NOT NULL REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  CHECK (id = phase_id)
);

CREATE INDEX IF NOT EXISTS avalon_quests_king_seat_id_idx
ON avalon_quests (king_seat_id);

CREATE TABLE IF NOT EXISTS avalon_quest_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES avalon_quests(id) ON DELETE CASCADE,
  seat_id uuid REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  CONSTRAINT avalon_quest_team_members_quest_id_seat_id_key UNIQUE (quest_id, seat_id)
);

CREATE INDEX IF NOT EXISTS avalon_quest_team_members_seat_id_idx
ON avalon_quest_team_members (seat_id);

CREATE TABLE IF NOT EXISTS avalon_quest_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES avalon_quests(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approve', 'disapprove')),
  CONSTRAINT avalon_quest_decisions_quest_id_seat_id_key UNIQUE (quest_id, seat_id)
);

CREATE INDEX IF NOT EXISTS avalon_quest_decisions_seat_id_idx
ON avalon_quest_decisions (seat_id);

CREATE TABLE IF NOT EXISTS avalon_missions (
  id uuid PRIMARY KEY REFERENCES avalon_phases(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL UNIQUE REFERENCES avalon_phases(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL UNIQUE REFERENCES avalon_quests(id) ON DELETE RESTRICT,
  CHECK (id = phase_id)
);

CREATE TABLE IF NOT EXISTS avalon_mission_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES avalon_missions(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  vote text NOT NULL CHECK (vote IN ('success', 'fail')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avalon_mission_votes_mission_id_seat_id_key UNIQUE (mission_id, seat_id)
);

CREATE INDEX IF NOT EXISTS avalon_mission_votes_seat_id_idx
ON avalon_mission_votes (seat_id);

CREATE TABLE IF NOT EXISTS avalon_lady_checks (
  id uuid PRIMARY KEY REFERENCES avalon_phases(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL UNIQUE REFERENCES avalon_phases(id) ON DELETE CASCADE,
  lady_seat_id uuid NOT NULL REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  target_seat_id uuid NOT NULL REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  CHECK (id = phase_id),
  CHECK (lady_seat_id <> target_seat_id)
);

CREATE INDEX IF NOT EXISTS avalon_lady_checks_lady_seat_id_idx
ON avalon_lady_checks (lady_seat_id);

CREATE INDEX IF NOT EXISTS avalon_lady_checks_target_seat_id_idx
ON avalon_lady_checks (target_seat_id);

CREATE TABLE IF NOT EXISTS avalon_assassinations (
  id uuid PRIMARY KEY REFERENCES avalon_phases(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL UNIQUE REFERENCES avalon_phases(id) ON DELETE CASCADE,
  target_seat_id uuid REFERENCES avalon_seats(id) ON DELETE RESTRICT,
  CHECK (id = phase_id)
);

CREATE INDEX IF NOT EXISTS avalon_assassinations_target_seat_id_idx
ON avalon_assassinations (target_seat_id);
