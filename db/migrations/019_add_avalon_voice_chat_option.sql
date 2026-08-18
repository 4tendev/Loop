ALTER TABLE avalon_games
ADD COLUMN IF NOT EXISTS use_voice_chat boolean NOT NULL DEFAULT true;
