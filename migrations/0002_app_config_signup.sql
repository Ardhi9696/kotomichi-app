-- Migration: remote login-config booleans in app_config (key/value table — no schema change).
INSERT INTO app_config (key, value_json, description) VALUES
    ('signup.enabled',        '{"value": true}', 'Allow self-registration (Create account link on login)'),
    ('signup.reset_password', '{"value": true}', 'Allow password reset (Forgot password link on login)')
ON CONFLICT (key) DO NOTHING;