-- Add age and gender columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add comments to new columns
COMMENT ON COLUMN public.customers.age IS '顧客の年齢';
COMMENT ON COLUMN public.customers.gender IS '顧客の性別 (male/female/other/prefer_not_to_say)';

-- Add check constraint for age
ALTER TABLE public.customers
ADD CONSTRAINT check_age CHECK (age >= 0 AND age <= 150);

-- Add check constraint for gender
ALTER TABLE public.customers
ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));