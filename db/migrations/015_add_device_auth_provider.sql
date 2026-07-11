ALTER TABLE user_auth_methods
  DROP CONSTRAINT IF EXISTS user_auth_methods_provider_check;

ALTER TABLE user_auth_methods
  ADD CONSTRAINT user_auth_methods_provider_check
  CHECK (provider IN ('email', 'google', 'telegram', 'device'));
