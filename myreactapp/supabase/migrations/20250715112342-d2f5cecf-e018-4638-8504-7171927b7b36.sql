-- Add phone number to profiles table (required for passengers)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create emergency_contacts table for SOS functionality
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency_contacts
CREATE POLICY "Users can manage their own emergency contacts" 
ON public.emergency_contacts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create support_chats table for in-app chat
CREATE TABLE public.support_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_from_user BOOLEAN NOT NULL DEFAULT true,
  admin_id UUID,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

-- Create policies for support_chats
CREATE POLICY "Users can view their own support chats" 
ON public.support_chats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create support messages" 
ON public.support_chats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_from_user = true);

-- Create trip_tracking table for live location sharing
CREATE TABLE public.trip_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  passenger_id UUID NOT NULL,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  estimated_arrival TEXT,
  trip_status TEXT DEFAULT 'not_started' CHECK (trip_status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  shared_with_emergency_contacts BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trip_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_tracking
CREATE POLICY "Users can view tracking for their trips" 
ON public.trip_tracking 
FOR SELECT 
USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Drivers can update tracking for their trips" 
ON public.trip_tracking 
FOR ALL 
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_emergency_contacts_updated_at
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_chats_updated_at
BEFORE UPDATE ON public.support_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();