ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image text NOT NULL DEFAULT '/avatar.png';

UPDATE users
SET profile_image = '/avatar.png'
WHERE profile_image IS NULL
   OR length(trim(profile_image)) = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_profile_image_not_blank'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_profile_image_not_blank
      CHECK (length(trim(profile_image)) > 0);
  END IF;
END;
$$;
