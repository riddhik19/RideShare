-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', false);

-- Create storage policies for driver documents
CREATE POLICY "Drivers can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Drivers can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Drivers can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create enum for document types
CREATE TYPE document_type AS ENUM ('aadhaar', 'driving_license', 'vehicle_rc');

-- Create enum for verification status
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create driver_documents table
CREATE TABLE public.driver_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  document_type document_type NOT NULL,
  document_url TEXT NOT NULL,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, document_type)
);

-- Enable Row Level Security
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for driver_documents
CREATE POLICY "Drivers can view their own documents" 
ON public.driver_documents 
FOR SELECT 
USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own documents" 
ON public.driver_documents 
FOR INSERT 
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own documents" 
ON public.driver_documents 
FOR UPDATE 
USING (auth.uid() = driver_id);

-- Add verification status to profiles table
ALTER TABLE public.profiles ADD COLUMN kyc_status verification_status DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN kyc_completed_at TIMESTAMP WITH TIME ZONE;

-- Create trigger for automatic timestamp updates on driver_documents
CREATE TRIGGER update_driver_documents_updated_at
BEFORE UPDATE ON public.driver_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();