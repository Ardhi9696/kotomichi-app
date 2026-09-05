-- Quiz Sessions Migration
-- Tracks quiz progress per session for async background sync

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    deck_id BIGINT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('normal', 'hard')),
    session_index INT NOT NULL, -- 0-based index of session within quiz
    total_sessions INT NOT NULL, -- total number of sessions for this quiz
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'synced')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ,
    total_questions INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    total_exp INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, deck_id, mode, session_index)
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_deck ON quiz_sessions(user_id, deck_id, mode);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);

-- Quiz Session Answers - stores individual answers within a session
CREATE TABLE IF NOT EXISTS quiz_session_answers (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    vocabulary_id BIGINT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    direction SMALLINT NOT NULL,
    elapsed_ms INT NOT NULL,
    correct BOOLEAN NOT NULL,
    answer_text TEXT,
    speed_category TEXT CHECK (speed_category IN ('easy', 'good', 'hard')),
    exp_gained INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON quiz_session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_synced ON quiz_session_answers(synced) WHERE NOT synced;

-- Quiz Session Vocabulary Details - stores per-vocabulary per-direction timing
CREATE TABLE IF NOT EXISTS quiz_session_vocab_details (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    vocabulary_id BIGINT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    -- Direction 1: Kanji -> Meaning
    dir1_elapsed_ms INT,
    dir1_correct BOOLEAN,
    dir1_speed TEXT CHECK (dir1_speed IN ('easy', 'good', 'hard')),
    dir1_exp INT DEFAULT 0,
    -- Direction 2: Kanji -> Hiragana
    dir2_elapsed_ms INT,
    dir2_correct BOOLEAN,
    dir2_speed TEXT CHECK (dir2_speed IN ('easy', 'good', 'hard')),
    dir2_exp INT DEFAULT 0,
    -- Direction 3: Hiragana -> Meaning
    dir3_elapsed_ms INT,
    dir3_correct BOOLEAN,
    dir3_speed TEXT CHECK (dir3_speed IN ('easy', 'good', 'hard')),
    dir3_exp INT DEFAULT 0,
    -- Direction 4: Meaning -> Hiragana (hard mode)
    dir4_elapsed_ms INT,
    dir4_correct BOOLEAN,
    dir4_speed TEXT CHECK (dir4_speed IN ('easy', 'good', 'hard')),
    dir4_exp INT DEFAULT 0,
    -- Direction 5: Hiragana -> Kanji (hard mode)
    dir5_elapsed_ms INT,
    dir5_correct BOOLEAN,
    dir5_speed TEXT CHECK (dir5_speed IN ('easy', 'good', 'hard')),
    dir5_exp INT DEFAULT 0,
    -- Direction 6: Meaning -> Kanji (hard mode)
    dir6_elapsed_ms INT,
    dir6_correct BOOLEAN,
    dir6_speed TEXT CHECK (dir6_speed IN ('easy', 'good', 'hard')),
    dir6_exp INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, vocabulary_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_vocab_details_session ON quiz_session_vocab_details(session_id);