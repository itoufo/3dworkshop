-- Add address column to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment to the address column
COMMENT ON COLUMN public.customers.address IS '顧客の住所';