-- ============================================================
-- Kotomichi (言道) — Database schema
-- Postgres / Supabase migration
-- Version: 1.2  (5 September 2026)
--
-- Design notes:
--   * `vocabulary` has NO "arti" column — meanings live in
--     `vocabulary_translations` keyed by locale (i18n content, §13).
--   * `deck_vocabulary` is pure curation (many-to-many) and holds
--     NO per-user progress — "new vs review" is decided at runtime
--     against `srs_progress` so words re-used across chapters are
--     never duplicated (§5.1).
--   * `srs_progress` is the FSRS state per user × word × direction.
--   * RLS policies: owner-only on user data, role-gated on content
--     (enforcement layer 2 / defence-in-depth, §6).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Profiles, roles, gamification state
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profile (
    id                  UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    display_name        TEXT        NOT NULL DEFAULT '',
    role                TEXT        NOT NULL DEFAULT 'user'
                        CHECK (role IN ('super_admin', 'admin', 'user')),
    preferred_locale    TEXT        NOT NULL DEFAULT 'en',
    theme               TEXT        NOT NULL DEFAULT 'system'
                        CHECK (theme IN ('light', 'dark', 'system')),
    -- gamification
    level               INT         NOT NULL DEFAULT 1,
    exp                 INT         NOT NULL DEFAULT 0,
    last_review_date    DATE,
    last_seen_at        TIMESTAMPTZ,
    current_streak      INT         NOT NULL DEFAULT 0,
    longest_streak      INT         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. Vocabulary (deduplicated, i18n via translation tables)
--    kanji is nullable (kana-only words); uniqueness is on the
--    composite reading (NULLS NOT DISTINCT => "あい" + NULL kanji
--    still counts as one word).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vocabulary (
    id              BIGSERIAL PRIMARY KEY,
    kanji           TEXT,
    hiragana        TEXT        NOT NULL,
    romaji          TEXT,
    jlpt_level      TEXT
                    CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    jft_basic       BOOLEAN     NOT NULL DEFAULT FALSE,
    part_of_speech  TEXT
                    CHECK (part_of_speech IS NULL OR part_of_speech IN
                           ('noun', 'verb', 'adverb', 'adjective',
                            'conjunction', 'demonstrative')),
    godan_verb      BOOLEAN     NOT NULL DEFAULT FALSE,
    ichidan_verb    BOOLEAN     NOT NULL DEFAULT FALSE,
    fukisoku        BOOLEAN     NOT NULL DEFAULT FALSE,
    i_adjective     BOOLEAN     NOT NULL DEFAULT FALSE,
    na_adjective    BOOLEAN     NOT NULL DEFAULT FALSE,
    jidoushi        BOOLEAN     NOT NULL DEFAULT FALSE,
    tadoushi        BOOLEAN     NOT NULL DEFAULT FALSE,
    verb_collocation BOOLEAN    NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by      UUID        REFERENCES user_profile (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vocab_reading
    ON vocabulary (kanji, hiragana) NULLS NOT DISTINCT;

CREATE TABLE IF NOT EXISTS vocabulary_translations (
    vocabulary_id   BIGINT      NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    locale          TEXT        NOT NULL,
    meaning         TEXT        NOT NULL,
    PRIMARY KEY (vocabulary_id, locale)
);

CREATE TABLE IF NOT EXISTS example_sentences (
    id              BIGSERIAL PRIMARY KEY,
    vocabulary_id   BIGINT      NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    japanese        TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS example_sentence_translations (
    example_sentence_id BIGINT  NOT NULL REFERENCES example_sentences (id) ON DELETE CASCADE,
    locale          TEXT        NOT NULL,
    translation     TEXT        NOT NULL,
    PRIMARY KEY (example_sentence_id, locale)
);

CREATE TABLE IF NOT EXISTS verb_collocations (
    id              BIGSERIAL PRIMARY KEY,
    vocabulary_id   BIGINT      NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    collocation     TEXT        NOT NULL,
    meaning         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audio_assets (
    id              BIGSERIAL PRIMARY KEY,
    vocabulary_id   BIGINT      NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    storage_key     TEXT        NOT NULL,           -- object key in R2 (via storage-port)
    lang            TEXT        NOT NULL DEFAULT 'ja',
    filename        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (vocabulary_id, lang)
);

-- ------------------------------------------------------------
-- 3. Decks / chapters + curation (no progress data here)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS decks (
    id              BIGSERIAL PRIMARY KEY,
    title           TEXT        NOT NULL,
    subtitle        TEXT,
    jlpt_level      TEXT        CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    jft_basic       BOOLEAN     NOT NULL DEFAULT FALSE,
    order_index     INT         NOT NULL DEFAULT 0,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by      UUID        REFERENCES user_profile (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deck_vocabulary (
    deck_id         BIGINT      NOT NULL REFERENCES decks (id) ON DELETE CASCADE,
    vocabulary_id   BIGINT      NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    order_in_deck   INT,
    PRIMARY KEY (deck_id, vocabulary_id)
);

-- ------------------------------------------------------------
-- 4. SRS / progression (FSRS state per user × word × direction)
--    direction: 1=Kanji→Meaning 2=Kanji→Hiragana 3=Hiragana→Meaning
--               4=Meaning→Hiragana 5=Hiragana→Kanji 6=Meaning→Kanji
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS srs_progress (
    user_id         UUID        NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    vocabulary_id   BIGINT      NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    direction       SMALLINT    NOT NULL CHECK (direction BETWEEN 1 AND 6),
    stability       DOUBLE PRECISION NOT NULL DEFAULT 0,
    difficulty      DOUBLE PRECISION NOT NULL DEFAULT 0,
    retrievability  DOUBLE PRECISION,                 -- last computed R(t,S), 0..1
    due_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_review_at  TIMESTAMPTZ,
    review_count    INT         NOT NULL DEFAULT 0,
    lapses          INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, vocabulary_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_progress (user_id, due_at);

CREATE TABLE IF NOT EXISTS review_log (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID          NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    vocabulary_id       BIGINT        NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    direction           SMALLINT      NOT NULL CHECK (direction BETWEEN 1 AND 6),
    is_new              BOOLEAN       NOT NULL DEFAULT FALSE,
    correctness         BOOLEAN       NOT NULL,
    elapsed_ms          INT           NOT NULL,
    rating              SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 4),
    stability_before    DOUBLE PRECISION,
    stability_after     DOUBLE PRECISION,
    difficulty_before   DOUBLE PRECISION,
    difficulty_after    DOUBLE PRECISION,
    retrievability_before DOUBLE PRECISION,
    reviewed_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_log_user_time ON review_log (user_id, reviewed_at DESC);

-- ---- audit trail of role changes (§ role management) ----
CREATE TABLE IF NOT EXISTS role_change_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID          NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    by_user_id      UUID          NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    from_role       TEXT          NOT NULL CHECK (from_role IN ('user', 'admin', 'super_admin')),
    to_role         TEXT          NOT NULL CHECK (to_role IN ('user', 'admin', 'super_admin')),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_change_user_time ON role_change_log (user_id, created_at DESC);

-- ------------------------------------------------------------
-- 5. Configuration (no hardcoding — §9.1)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direction_thresholds (
    direction           SMALLINT PRIMARY KEY CHECK (direction BETWEEN 1 AND 6),
    fast_threshold_ms   INT       NOT NULL DEFAULT 8000,   -- < fast => Easy (correct)
    good_threshold_ms   INT       NOT NULL DEFAULT 15000,  -- <= good => Good;  > good => Hard
    updated_by          UUID      REFERENCES user_profile (id),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_config (
    key             TEXT PRIMARY KEY,
    value_json      JSONB       NOT NULL,
    description     TEXT,
    updated_by      UUID        REFERENCES user_profile (id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seed defaults
INSERT INTO direction_thresholds (direction, fast_threshold_ms, good_threshold_ms) VALUES
    (1, 8000, 15000), (2, 8000, 15000), (3, 8000, 15000),
    (4, 8000, 15000), (5, 8000, 15000), (6, 8000, 15000)
ON CONFLICT (direction) DO NOTHING;

INSERT INTO app_config (key, value_json, description) VALUES
    ('exp.base',                        '{"value": 100}',                 'EXP needed to go from level L to L+1 = base * L^1.5'),
    ('exp.new_card',                    '{"value": 10}',                  'EXP rewarded per new-direction card completed'),
    ('exp.review_success',              '{"value": 3}',                   'EXP rewarded per correct review'),
    ('exp.streak_bonus_every',          '{"value": 7}',                   'Award streak bonus every N consecutive days'),
    ('exp.streak_bonus_amount',         '{"value": 25}',                  'EXP awarded on streak milestones'),
    ('srs.desired_retention',           '{"value": 0.9}',                 'Target retrievability for scheduling (gating uses ~90%)'),
    ('srs.direction_stability_threshold','{"value": 7}',                  'min stability (days) to unlock the next direction'),
    ('srs.daily_new_cap',               '{"value": 20}',                  'max new cards per day across decks'),
    ('srs.max_interval_days',           '{"value": 365}',                 'interval clamp'),
    ('deck.mastery_threshold',          '{"value": 0.9}',                 'avg R needed on current deck to unlock the next'),
    ('fsrs.decay',                      '{"value": -0.5}',                'FSRS-4.5 forgetting-curve decay'),
    ('fsrs.factor',                     '{"value": 0.2345679012345679}',  'FSRS-4.5 factor = 19/81'),
    ('fsrs.weights',                    '{"value": [0.4872,1.4003,3.7145,13.8206,5.1618,1.2298,0.8975,0.031,1.6474,0.1367,1.0461,2.1072,0.0793,0.3246,1.587,0.2272,2.8755]}', 'FSRS-4.5 default weights (17)'),
    ('signup.enabled',                  '{"value": true}',               'Allow self-registration (Create account link on login)'),
    ('signup.reset_password',           '{"value": true}',               'Allow password reset (Forgot password link on login)')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Grammar (Phase 3 — BKT). Isolated from MVP; schema prepared
--    now so no large migration is needed later (§7, §10).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grammar_skills (
    id              BIGSERIAL PRIMARY KEY,
    pattern         TEXT        NOT NULL UNIQUE,        -- e.g. "kondisional たら"
    pattern_transcription TEXT  NOT NULL,
    explanation     TEXT,
    jlpt_level      TEXT        CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    created_by      UUID        REFERENCES user_profile (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grammar_attempts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    skill_id        BIGINT      NOT NULL REFERENCES grammar_skills (id) ON DELETE CASCADE,
    question_variant TEXT       NOT NULL,               -- content variation per attempt
    correct         BOOLEAN     NOT NULL,
    elapsed_ms      INT         NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grammar_skill_state (
    user_id         UUID        NOT NULL REFERENCES user_profile (id) ON DELETE CASCADE,
    skill_id        BIGINT      NOT NULL REFERENCES grammar_skills (id) ON DELETE CASCADE,
    -- BKT parameters
    p_learn         DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    p_transition    DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    p_guess         DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    p_slip          DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    p_mastered      DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    attempts        INT         NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, skill_id)
);

-- ============================================================
-- 7. Row Level Security (defence-in-depth, §6 layer 2)
-- ============================================================

ALTER TABLE user_profile            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary               ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_translations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE example_sentences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE example_sentence_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE verb_collocations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_vocabulary          ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_progress             ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE direction_thresholds     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config               ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_skills           ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_attempts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_skill_state      ENABLE ROW LEVEL SECURITY;

-- Role helpers (SECURITY DEFINER => no RLS recursion).
-- `auth.uid()` is provided by Supabase; on other Postgres providers
-- this single helper is the only Supabase-coupled piece (§6).
CREATE OR REPLACE FUNCTION app_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profile
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
$$;

CREATE OR REPLACE FUNCTION app_is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profile
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM user_profile WHERE id = auth.uid();
$$;

-- ---- user_profile: self only (super_admin manages everyone) ----
DROP POLICY IF EXISTS user_profile_select ON user_profile;
CREATE POLICY user_profile_select ON user_profile
    FOR SELECT USING (id = auth.uid() OR app_is_super_admin());

DROP POLICY IF EXISTS user_profile_insert ON user_profile;
CREATE POLICY user_profile_insert ON user_profile
    FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS user_profile_update ON user_profile;
CREATE POLICY user_profile_update ON user_profile
    FOR UPDATE USING (id = auth.uid() OR app_is_super_admin())
    WITH CHECK (app_is_super_admin()
                OR (id = auth.uid() AND role = app_current_role()));

-- ---- srs_progress / review_log: owner only ----
DROP POLICY IF EXISTS srs_progress_all ON srs_progress;
CREATE POLICY srs_progress_all ON srs_progress
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS review_log_all ON review_log;
CREATE POLICY review_log_all ON review_log
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- grammar_attempts / grammar_skill_state: owner only ----
DROP POLICY IF EXISTS grammar_attempts_all ON grammar_attempts;
CREATE POLICY grammar_attempts_all ON grammar_attempts
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS grammar_skill_state_all ON grammar_skill_state;
CREATE POLICY grammar_skill_state_all ON grammar_skill_state
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- content tables: readable by authenticated users,
--            writeable only by admin / super_admin  ----
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['vocabulary', 'vocabulary_translations',
                             'example_sentences', 'example_sentence_translations',
                             'verb_collocations', 'audio_assets',
                             'decks', 'deck_vocabulary']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (true)', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_write ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_write ON %I FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin())', t, t);
    END LOOP;
END $$;

-- ---- direction_thresholds / app_config: everyone may read,
--            only super_admin may write (MVP)  ----
DROP POLICY IF EXISTS direction_thresholds_read ON direction_thresholds;
CREATE POLICY direction_thresholds_read ON direction_thresholds FOR SELECT USING (true);
DROP POLICY IF EXISTS direction_thresholds_write ON direction_thresholds;
CREATE POLICY direction_thresholds_write ON direction_thresholds
    FOR ALL USING (app_is_super_admin()) WITH CHECK (app_is_super_admin());

DROP POLICY IF EXISTS app_config_read ON app_config;
CREATE POLICY app_config_read ON app_config FOR SELECT USING (true);
DROP POLICY IF EXISTS app_config_write ON app_config;
CREATE POLICY app_config_write ON app_config
    FOR ALL USING (app_is_super_admin()) WITH CHECK (app_is_super_admin());

DROP POLICY IF EXISTS grammar_skills_read ON grammar_skills;
CREATE POLICY grammar_skills_read ON grammar_skills FOR SELECT USING (true);
DROP POLICY IF EXISTS grammar_skills_write ON grammar_skills;
CREATE POLICY grammar_skills_write ON grammar_skills
    FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());