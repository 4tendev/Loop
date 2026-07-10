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
