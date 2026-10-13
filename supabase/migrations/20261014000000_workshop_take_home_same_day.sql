-- 作品をその場で持ち帰るワークショップ。詳細ページの特徴欄の「作品は後日発送」を
-- 「作品はその場でお持ち帰り（間に合わなければ2週間以内に後日発送）」に替える。
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS take_home_same_day boolean NOT NULL DEFAULT false;

-- 刺繍専用AI「Embroid」のワークショップ（フェルトに縫った刺繍をその場で渡す）
UPDATE public.workshops SET take_home_same_day = true
WHERE id = 'd3960a8e-da4c-487a-9be2-8a7173ae0bdc';
