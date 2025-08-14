-- Create a security definer function to handle ride cancellation
-- This bypasses RLS policies since it runs with elevated privileges
CREATE OR REPLACE FUNCTION public.cancel_ride(ride_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the ride to set is_active = false
  -- Only if the current user is the driver of this ride
  UPDATE public.rides
  SET is_active = false, updated_at = now()
  WHERE id = ride_id_param 
    AND driver_id = auth.uid()
    AND is_active = true;
  
  -- Return true if a row was actually updated
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;