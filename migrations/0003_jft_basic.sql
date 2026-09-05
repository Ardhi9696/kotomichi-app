-- Migration: JFT Basic flag. JFT Basic material is rated equivalent to JLPT N4,
-- so jft_basic = TRUE also pins jlpt_level = 'N4' in the app layer.
ALTER TABLE vocabulary
    ADD COLUMN jft_basic BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE decks
    ADD COLUMN jft_basic BOOLEAN NOT NULL DEFAULT FALSE;