-- Track "last seen" / online presence per user.
-- Heartbeat + page views update user_profile.last_seen_at, so admins can
-- distinguish users who are currently online from those who never logged in.
ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Backfill from existing review activity so old users are no longer
-- reported as "never active" once they have reviewed something.
UPDATE user_profile
SET last_seen_at = sub.last_review
FROM (
    SELECT user_id, MAX(reviewed_at) AS last_review
    FROM review_log
    GROUP BY user_id
) sub
WHERE user_profile.id = sub.user_id
  AND user_profile.last_seen_at IS NULL;