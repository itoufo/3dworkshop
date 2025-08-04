-- Enable RLS on workshops table
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to workshops" ON public.workshops;
DROP POLICY IF EXISTS "Allow all operations for workshops" ON public.workshops;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to workshops" 
ON public.workshops 
FOR SELECT 
TO public 
USING (true);

-- Create policy to allow all operations (for development)
-- Note: In production, you should restrict this to authenticated users or admins
CREATE POLICY "Allow all operations for workshops" 
ON public.workshops 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- Similarly for customers and bookings tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations for bookings" ON public.bookings;

-- Allow all operations for customers (for development)
CREATE POLICY "Allow all operations for customers" 
ON public.customers 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- Allow all operations for bookings (for development)
CREATE POLICY "Allow all operations for bookings" 
ON public.bookings 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);