-- Migration: richer vocabulary parts-of-speech + grammar flags.
-- 1. part_of_speech becomes a constrained enum (Noun, Verb, Adverb, Adjective,
--    Kata Sambung = conjunction, Kata Tunjuk = demonstrative). Unrecognized
--    legacy values are cleared before the CHECK is added so the ALTER never
--    fails on pre-existing rows.
UPDATE vocabulary SET part_of_speech = NULL
    WHERE part_of_speech IS NOT NULL
      AND part_of_speech NOT IN
          ('noun', 'verb', 'adverb', 'adjective', 'conjunction', 'demonstrative');

ALTER TABLE vocabulary
    ADD CONSTRAINT chk_vocab_part_of_speech
        CHECK (part_of_speech IS NULL OR part_of_speech IN
               ('noun', 'verb', 'adverb', 'adjective',
                'conjunction', 'demonstrative'));

-- 2. Grammar flags (all default false; filled by the admin vocabulary modal).
ALTER TABLE vocabulary
    ADD COLUMN godan_verb        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN ichidan_verb      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN fukisoku          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN i_adjective       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN na_adjective      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN jidoushi          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN tadoushi          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN verb_collocation  BOOLEAN NOT NULL DEFAULT FALSE;