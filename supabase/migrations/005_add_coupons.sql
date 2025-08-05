-- Create enum for discount types
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type discount_type NOT NULL,
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  minimum_amount INTEGER DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  user_limit INTEGER DEFAULT 1,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  workshop_ids UUID[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coupon_usage table
CREATE TABLE public.coupon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  discount_amount INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add discount fields to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_active ON public.coupons(is_active);
CREATE INDEX idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_customer_id ON public.coupon_usage(customer_id);

-- Add comments
COMMENT ON TABLE public.coupons IS 'クーポンコード管理テーブル';
COMMENT ON COLUMN public.coupons.code IS 'クーポンコード（ユニーク）';
COMMENT ON COLUMN public.coupons.discount_type IS '割引タイプ（percentage: パーセント, fixed_amount: 固定額）';
COMMENT ON COLUMN public.coupons.discount_value IS '割引値（パーセントまたは円）';
COMMENT ON COLUMN public.coupons.minimum_amount IS '最低利用金額';
COMMENT ON COLUMN public.coupons.usage_limit IS '総使用回数上限';
COMMENT ON COLUMN public.coupons.usage_count IS '現在の使用回数';
COMMENT ON COLUMN public.coupons.user_limit IS '1ユーザーあたりの使用回数上限';
COMMENT ON COLUMN public.coupons.workshop_ids IS '対象ワークショップID配列（NULLの場合は全て対象）';

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for coupons
CREATE POLICY "Allow public read access to active coupons" 
ON public.coupons 
FOR SELECT 
TO public 
USING (is_active = true);

CREATE POLICY "Allow all operations for coupons (admin)" 
ON public.coupons 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- Create RLS policies for coupon_usage
CREATE POLICY "Allow all operations for coupon_usage" 
ON public.coupon_usage 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for coupons
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();