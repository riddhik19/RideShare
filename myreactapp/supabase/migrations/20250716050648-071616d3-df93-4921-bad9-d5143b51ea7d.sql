-- Add gender and age fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN age integer CHECK (age >= 0 AND age <= 120);

-- Add preferred seat to bookings table
ALTER TABLE public.bookings 
ADD COLUMN preferred_seat text,
ADD COLUMN is_bulk_booking boolean DEFAULT false,
ADD COLUMN bulk_booking_id uuid;

-- Create transfer_requests table
CREATE TABLE public.transfer_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_booking_id uuid NOT NULL,
  target_booking_id uuid NOT NULL,
  passenger_id uuid NOT NULL,
  original_ride_id uuid NOT NULL,
  target_ride_id uuid NOT NULL,
  reason text DEFAULT 'safety_transfer',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  benefits text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT now() + interval '10 minutes',
  responded_at timestamp with time zone
);

-- Enable RLS on transfer_requests
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for transfer_requests
CREATE POLICY "Passengers can view their own transfer requests" 
ON public.transfer_requests 
FOR SELECT 
USING (auth.uid() = passenger_id);

CREATE POLICY "Passengers can update their own transfer requests" 
ON public.transfer_requests 
FOR UPDATE 
USING (auth.uid() = passenger_id AND status = 'pending');

CREATE POLICY "System can insert transfer requests" 
ON public.transfer_requests 
FOR INSERT 
WITH CHECK (true);

-- Add vehicle brand and segment to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN brand text,
ADD COLUMN segment text CHECK (segment IN ('sedan', 'suv', 'hatchback', 'mpv', 'luxury'));

-- Create function to handle transfer logic
CREATE OR REPLACE FUNCTION public.find_suitable_transfer_cabs(
  p_booking_id uuid,
  p_passenger_gender text,
  p_passenger_age integer,
  p_route_from text,
  p_route_to text,
  p_departure_date date,
  p_departure_time time,
  p_preferred_seat text DEFAULT NULL,
  p_original_vehicle_brand text DEFAULT NULL,
  p_original_vehicle_segment text DEFAULT NULL
)
RETURNS TABLE (
  ride_id uuid,
  priority text,
  compatibility_score integer,
  reason text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process for female passengers
  IF p_passenger_gender != 'female' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH potential_cabs AS (
    SELECT 
      r.id as ride_id,
      r.driver_id,
      r.vehicle_id,
      r.available_seats,
      v.brand,
      v.segment,
      -- Count existing passengers by gender
      COUNT(CASE WHEN pr.gender = 'male' THEN 1 END) as male_count,
      COUNT(CASE WHEN pr.gender = 'female' THEN 1 END) as female_count,
      COUNT(b.id) as total_passengers,
      -- Check for bulk bookings
      COUNT(DISTINCT b.bulk_booking_id) FILTER (WHERE b.bulk_booking_id IS NOT NULL) as bulk_groups,
      -- Check for same user bookings
      COUNT(DISTINCT b.passenger_id) as unique_passengers
    FROM public.rides r
    JOIN public.vehicles v ON r.vehicle_id = v.id
    LEFT JOIN public.bookings b ON r.id = b.ride_id AND b.status IN ('confirmed', 'pending')
    LEFT JOIN public.profiles pr ON b.passenger_id = pr.id
    WHERE 
      r.from_city = p_route_from
      AND r.to_city = p_route_to
      AND r.departure_date = p_departure_date
      AND r.departure_time BETWEEN (p_departure_time - interval '15 minutes') 
                                AND (p_departure_time + interval '15 minutes')
      AND r.available_seats > 0
      AND r.is_active = true
      AND r.id != (SELECT ride_id FROM public.bookings WHERE id = p_booking_id)
    GROUP BY r.id, r.driver_id, r.vehicle_id, r.available_seats, v.brand, v.segment
  )
  SELECT 
    pc.ride_id,
    CASE 
      -- Primary candidates: Only female passengers or empty
      WHEN pc.male_count = 0 THEN 'PRIMARY'
      -- Secondary candidates: Single male or bulk with adult female
      WHEN pc.male_count = 1 AND pc.unique_passengers > 1 THEN 'SECONDARY'
      WHEN pc.bulk_groups > 0 AND pc.female_count > 0 THEN 'SECONDARY'
      ELSE 'NOT_SUITABLE'
    END as priority,
    CASE 
      WHEN pc.male_count = 0 THEN 100
      WHEN pc.male_count = 1 AND pc.unique_passengers > 1 THEN 80
      WHEN pc.bulk_groups > 0 AND pc.female_count > 0 THEN 75
      ELSE 0
    END as compatibility_score,
    CASE 
      WHEN pc.male_count = 0 AND pc.female_count = 0 THEN 'Empty cab - maximum comfort and safety'
      WHEN pc.male_count = 0 AND pc.female_count > 0 THEN 'Female-only cab - enhanced safety and comfort'
      WHEN pc.male_count = 1 AND pc.unique_passengers > 1 THEN 'Mixed group with single male passenger'
      WHEN pc.bulk_groups > 0 AND pc.female_count > 0 THEN 'Group booking including female passengers'
      ELSE 'Not suitable for transfer'
    END as reason
  FROM potential_cabs pc
  WHERE 
    -- Vehicle compatibility check
    (p_original_vehicle_brand IS NULL OR pc.brand = p_original_vehicle_brand OR pc.segment = p_original_vehicle_segment)
    AND (
      -- Primary candidates
      pc.male_count = 0 
      OR 
      -- Secondary candidates
      (pc.male_count = 1 AND pc.unique_passengers > 1)
      OR 
      (pc.bulk_groups > 0 AND pc.female_count > 0)
    )
  ORDER BY 
    CASE 
      WHEN pc.male_count = 0 THEN 1
      ELSE 2
    END,
    compatibility_score DESC,
    pc.available_seats DESC;
END;
$$;