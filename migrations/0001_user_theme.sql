-- Migration: add per-user theme preference
-- Run once against an existing database.
ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system'));