BEGIN;
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS shipping_address_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_cutoff_days integer NOT NULL DEFAULT 0 CHECK (booking_cutoff_days BETWEEN 0 AND 365);
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS shipping_postal_code text,
  ADD COLUMN IF NOT EXISTS shipping_prefecture text,
  ADD COLUMN IF NOT EXISTS shipping_address text;

-- オンラインの作品制作ワークショップに適用。発送のないウェビナーは除外する。
UPDATE public.workshops SET shipping_address_required = true, booking_cutoff_days = 5
WHERE NOT coalesce(is_service, false)
  AND (title LIKE '%オンライン%' OR location LIKE '%オンライン%')
  AND title NOT LIKE '%ウェビナー%';

-- ブラウザから直接保存される仮予約にも住所と締切を適用する。
-- 決済済み予約の更新には適用しない（決済開始後のWebhookを妨げない）。
CREATE OR REPLACE FUNCTION public.validate_workshop_booking_policy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w public.workshops%ROWTYPE;
  s public.workshop_sessions%ROWTYPE;
  event_day date;
BEGIN
  SELECT * INTO STRICT w FROM public.workshops WHERE id = NEW.workshop_id;
  event_day := w.event_date;
  IF NEW.session_id IS NOT NULL THEN
    SELECT * INTO s FROM public.workshop_sessions WHERE id = NEW.session_id AND workshop_id = NEW.workshop_id;
    IF NOT FOUND OR s.status <> 'scheduled' THEN
      RAISE EXCEPTION 'この開催日には予約できません';
    END IF;
    event_day := s.event_date;
  END IF;
  IF w.booking_cutoff_days > 0 AND (event_day IS NULL OR now() >= ((event_day - w.booking_cutoff_days)::timestamp AT TIME ZONE 'Asia/Tokyo')) THEN
    RAISE EXCEPTION 'この開催日の予約受付は終了しました';
  END IF;
  IF w.shipping_address_required AND (
    NEW.shipping_postal_code IS NULL OR NEW.shipping_postal_code !~ '^[0-9]{3}-?[0-9]{4}$'
    OR NEW.shipping_prefecture IS NULL OR NEW.shipping_prefecture NOT IN (
      '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県')
    OR NEW.shipping_address IS NULL OR length(btrim(NEW.shipping_address)) = 0
  ) THEN
    RAISE EXCEPTION '日本国内の郵便番号・都道府県・住所を入力してください';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_workshop_booking_policy ON public.bookings;
CREATE TRIGGER validate_workshop_booking_policy BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_workshop_booking_policy();
COMMIT;
