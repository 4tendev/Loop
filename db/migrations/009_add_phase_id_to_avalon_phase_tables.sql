ALTER TABLE avalon_nights
ADD COLUMN IF NOT EXISTS phase_id uuid;

UPDATE avalon_nights
SET phase_id = id
WHERE phase_id IS NULL;

ALTER TABLE avalon_nights
ALTER COLUMN phase_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_nights_phase_id_key'
  ) THEN
    ALTER TABLE avalon_nights
    ADD CONSTRAINT avalon_nights_phase_id_key UNIQUE (phase_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_nights_phase_id_fkey'
  ) THEN
    ALTER TABLE avalon_nights
    ADD CONSTRAINT avalon_nights_phase_id_fkey
    FOREIGN KEY (phase_id) REFERENCES avalon_phases(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_nights_id_phase_id_check'
  ) THEN
    ALTER TABLE avalon_nights
    ADD CONSTRAINT avalon_nights_id_phase_id_check CHECK (id = phase_id);
  END IF;
END $$;

ALTER TABLE avalon_quests
ADD COLUMN IF NOT EXISTS phase_id uuid;

UPDATE avalon_quests
SET phase_id = id
WHERE phase_id IS NULL;

ALTER TABLE avalon_quests
ALTER COLUMN phase_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_quests_phase_id_key'
  ) THEN
    ALTER TABLE avalon_quests
    ADD CONSTRAINT avalon_quests_phase_id_key UNIQUE (phase_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_quests_phase_id_fkey'
  ) THEN
    ALTER TABLE avalon_quests
    ADD CONSTRAINT avalon_quests_phase_id_fkey
    FOREIGN KEY (phase_id) REFERENCES avalon_phases(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_quests_id_phase_id_check'
  ) THEN
    ALTER TABLE avalon_quests
    ADD CONSTRAINT avalon_quests_id_phase_id_check CHECK (id = phase_id);
  END IF;
END $$;

ALTER TABLE avalon_missions
ADD COLUMN IF NOT EXISTS phase_id uuid;

UPDATE avalon_missions
SET phase_id = id
WHERE phase_id IS NULL;

ALTER TABLE avalon_missions
ALTER COLUMN phase_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_missions_phase_id_key'
  ) THEN
    ALTER TABLE avalon_missions
    ADD CONSTRAINT avalon_missions_phase_id_key UNIQUE (phase_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_missions_phase_id_fkey'
  ) THEN
    ALTER TABLE avalon_missions
    ADD CONSTRAINT avalon_missions_phase_id_fkey
    FOREIGN KEY (phase_id) REFERENCES avalon_phases(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_missions_id_phase_id_check'
  ) THEN
    ALTER TABLE avalon_missions
    ADD CONSTRAINT avalon_missions_id_phase_id_check CHECK (id = phase_id);
  END IF;
END $$;

ALTER TABLE avalon_lady_checks
ADD COLUMN IF NOT EXISTS phase_id uuid;

UPDATE avalon_lady_checks
SET phase_id = id
WHERE phase_id IS NULL;

ALTER TABLE avalon_lady_checks
ALTER COLUMN phase_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_lady_checks_phase_id_key'
  ) THEN
    ALTER TABLE avalon_lady_checks
    ADD CONSTRAINT avalon_lady_checks_phase_id_key UNIQUE (phase_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_lady_checks_phase_id_fkey'
  ) THEN
    ALTER TABLE avalon_lady_checks
    ADD CONSTRAINT avalon_lady_checks_phase_id_fkey
    FOREIGN KEY (phase_id) REFERENCES avalon_phases(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_lady_checks_id_phase_id_check'
  ) THEN
    ALTER TABLE avalon_lady_checks
    ADD CONSTRAINT avalon_lady_checks_id_phase_id_check CHECK (id = phase_id);
  END IF;
END $$;

ALTER TABLE avalon_assassinations
ADD COLUMN IF NOT EXISTS phase_id uuid;

UPDATE avalon_assassinations
SET phase_id = id
WHERE phase_id IS NULL;

ALTER TABLE avalon_assassinations
ALTER COLUMN phase_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_assassinations_phase_id_key'
  ) THEN
    ALTER TABLE avalon_assassinations
    ADD CONSTRAINT avalon_assassinations_phase_id_key UNIQUE (phase_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_assassinations_phase_id_fkey'
  ) THEN
    ALTER TABLE avalon_assassinations
    ADD CONSTRAINT avalon_assassinations_phase_id_fkey
    FOREIGN KEY (phase_id) REFERENCES avalon_phases(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avalon_assassinations_id_phase_id_check'
  ) THEN
    ALTER TABLE avalon_assassinations
    ADD CONSTRAINT avalon_assassinations_id_phase_id_check CHECK (id = phase_id);
  END IF;
END $$;
