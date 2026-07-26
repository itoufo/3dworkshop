-- 日程（開催回）ごとに「親子向け」フラグを持つ
-- 親子向けの日程は、保護者の同伴が無料・定員外になる（bookings.companion_count と併用）。
-- 非親子向けの日程では、付き添いの保護者も参加人数（1席分の料金）に含める。
ALTER TABLE workshop_sessions
  ADD COLUMN IF NOT EXISTS is_family_friendly BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN workshop_sessions.is_family_friendly IS '親子向けの開催回か。true の日程は保護者同伴が無料・定員外（companion_count）';
