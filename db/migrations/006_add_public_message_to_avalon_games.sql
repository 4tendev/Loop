ALTER TABLE avalon_games
ADD COLUMN IF NOT EXISTS public_message text NOT NULL DEFAULT 'بازی در مرحله لابی است.';
