-- Add notification tracking fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN notif_1hr_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notif_30min_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notif_15min_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notif_1hr_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN notif_30min_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN notif_15min_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of notification-pending bookings
CREATE INDEX idx_bookings_notification_status ON public.bookings(status, notif_1hr_sent, notif_30min_sent, notif_15min_sent);

-- Create notifications table to store all sent notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('passenger', 'driver')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('1_hour', '30_minutes', '15_minutes')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for system to insert notifications
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for efficient notification queries
CREATE INDEX idx_notifications_user_type ON public.notifications(user_id, notification_type, sent_at);
CREATE INDEX idx_notifications_booking ON public.notifications(booking_id, notification_type);