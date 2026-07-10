ALTER TABLE avalon_seats
ADD COLUMN IF NOT EXISTS private_message text NOT NULL DEFAULT 'private message';
