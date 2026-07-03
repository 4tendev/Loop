DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_auth_methods_provider_provider_user_id_key'
  ) THEN
    ALTER TABLE user_auth_methods
      ADD CONSTRAINT user_auth_methods_provider_provider_user_id_key
      UNIQUE (provider, provider_user_id);
  END IF;
END;
$$;
