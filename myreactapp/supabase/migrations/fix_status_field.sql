-- Fix the rides table to use consistent status field
ALTER TABLE public.rides 
DROP COLUMN IF EXISTS is_active;

ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed'));

-- Update existing data
UPDATE public.rides SET status = 'active' WHERE status IS NULL;

-- Update the cancel_ride function
CREATE OR REPLACE FUNCTION public.cancel_ride(ride_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.rides
  SET status = 'cancelled', updated_at = now()
  WHERE id = ride_id_param 
    AND driver_id = auth.uid()
    AND status = 'active';
  
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Update RLS policies for rides
DROP POLICY IF EXISTS "Anyone can view active rides" ON public.rides;
CREATE POLICY "Anyone can view active rides" ON public.rides
  FOR SELECT USING (status = 'active');