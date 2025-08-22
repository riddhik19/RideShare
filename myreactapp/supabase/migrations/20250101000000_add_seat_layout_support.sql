-- Add base_price and total_seats columns to rides table
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_seats INTEGER;

-- Update existing rides to have base_price equal to price_per_seat
UPDATE public.rides 
SET base_price = price_per_seat 
WHERE base_price IS NULL;

-- Update existing rides to have total_seats equal to available_seats (fallback)
UPDATE public.rides 
SET total_seats = available_seats 
WHERE total_seats IS NULL;

-- Add selected_seats column to bookings table to store selected seat IDs
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS selected_seats TEXT[];

-- Add check constraint to ensure base_price is positive
ALTER TABLE public.rides 
ADD CONSTRAINT check_base_price_positive 
CHECK (base_price > 0);

-- Add check constraint to ensure total_seats is reasonable
ALTER TABLE public.rides 
ADD CONSTRAINT check_total_seats_range 
CHECK (total_seats >= 1 AND total_seats <= 8);