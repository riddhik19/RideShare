-- Create ratings table for driver feedback
CREATE TABLE public.driver_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  passenger_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

-- Enable Row Level Security
ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for driver_ratings
CREATE POLICY "Drivers can view ratings about them" 
ON public.driver_ratings 
FOR SELECT 
USING (auth.uid() = driver_id);

CREATE POLICY "Passengers can create ratings for their bookings" 
ON public.driver_ratings 
FOR INSERT 
WITH CHECK (
  auth.uid() = passenger_id AND 
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = booking_id 
    AND bookings.passenger_id = auth.uid()
    AND bookings.status = 'confirmed'
  )
);

CREATE POLICY "Passengers can update their own ratings" 
ON public.driver_ratings 
FOR UPDATE 
USING (auth.uid() = passenger_id);

-- Add average rating to profiles table
ALTER TABLE public.profiles ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE public.profiles ADD COLUMN total_ratings INTEGER DEFAULT 0;

-- Create trigger for automatic timestamp updates on driver_ratings
CREATE TRIGGER update_driver_ratings_updated_at
BEFORE UPDATE ON public.driver_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update driver's average rating
CREATE OR REPLACE FUNCTION public.update_driver_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.0)
      FROM public.driver_ratings 
      WHERE driver_id = COALESCE(NEW.driver_id, OLD.driver_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.driver_ratings 
      WHERE driver_id = COALESCE(NEW.driver_id, OLD.driver_id)
    )
  WHERE id = COALESCE(NEW.driver_id, OLD.driver_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update average rating when ratings change
CREATE TRIGGER update_driver_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.driver_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_driver_average_rating();