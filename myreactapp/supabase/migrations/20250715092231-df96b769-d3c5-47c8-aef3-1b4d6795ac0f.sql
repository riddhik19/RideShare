-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('driver', 'passenger');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  car_type TEXT NOT NULL,
  car_model TEXT NOT NULL,
  license_plate TEXT NOT NULL UNIQUE,
  color TEXT,
  seat_capacity INTEGER NOT NULL CHECK (seat_capacity > 0 AND seat_capacity <= 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  pickup_point TEXT NOT NULL,
  available_seats INTEGER NOT NULL CHECK (available_seats > 0),
  price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat > 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seats_booked INTEGER NOT NULL CHECK (seats_booked > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  status booking_status NOT NULL DEFAULT 'pending',
  passenger_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ride_id, passenger_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for vehicles
CREATE POLICY "Drivers can view their own vehicles" ON public.vehicles
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own vehicles" ON public.vehicles
  FOR UPDATE USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete their own vehicles" ON public.vehicles
  FOR DELETE USING (auth.uid() = driver_id);

-- Create policies for rides
CREATE POLICY "Anyone can view active rides" ON public.rides
  FOR SELECT USING (is_active = true);

CREATE POLICY "Drivers can insert their own rides" ON public.rides
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own rides" ON public.rides
  FOR UPDATE USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete their own rides" ON public.rides
  FOR DELETE USING (auth.uid() = driver_id);

-- Create policies for bookings
CREATE POLICY "Passengers can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = passenger_id);

CREATE POLICY "Drivers can view bookings for their rides" ON public.bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT driver_id FROM public.rides WHERE id = ride_id
    )
  );

CREATE POLICY "Passengers can insert their own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers can update their own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = passenger_id);

CREATE POLICY "Drivers can update booking status for their rides" ON public.bookings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT driver_id FROM public.rides WHERE id = ride_id
    )
  );

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'passenger')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();