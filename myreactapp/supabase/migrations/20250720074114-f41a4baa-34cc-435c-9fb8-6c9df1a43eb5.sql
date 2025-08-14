-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies (only system can manage OTPs for security)
CREATE POLICY "System can manage OTP verifications" 
ON public.otp_verifications 
FOR ALL 
USING (true);

-- Add phone number to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;