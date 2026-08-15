ALTER TABLE avalon_games
ADD COLUMN IF NOT EXISTS initial_lady_predecessor_seat_number integer
  CHECK (initial_lady_predecessor_seat_number > 0);
