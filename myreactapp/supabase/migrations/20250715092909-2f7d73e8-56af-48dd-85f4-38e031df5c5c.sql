-- Check if user_role type exists, if not create it
DO $$
BEGIN
    -- Try to create the enum type
    CREATE TYPE public.user_role AS ENUM ('driver', 'passenger');
EXCEPTION
    WHEN duplicate_object THEN
        -- Type already exists, do nothing
        NULL;
END$$;

-- Check if booking_status type exists, if not create it  
DO $$
BEGIN
    -- Try to create the enum type
    CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN
        -- Type already exists, do nothing
        NULL;
END$$;

-- Now recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value public.user_role;
BEGIN
  -- Safely convert role from metadata
  BEGIN
    user_role_value := (new.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION
    WHEN invalid_text_representation THEN
      user_role_value := 'passenger'::public.user_role;
    WHEN OTHERS THEN
      user_role_value := 'passenger'::public.user_role;
  END;
  
  -- If role is null, default to passenger
  IF user_role_value IS NULL THEN
    user_role_value := 'passenger'::public.user_role;
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    user_role_value
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;