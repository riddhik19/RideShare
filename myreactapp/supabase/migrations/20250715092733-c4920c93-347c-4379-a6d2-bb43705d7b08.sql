-- Fix the handle_new_user function to properly handle role conversion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Safely convert role from metadata
  BEGIN
    user_role_value := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION
    WHEN invalid_text_representation THEN
      user_role_value := 'passenger'::user_role;
  END;
  
  -- If role is null, default to passenger
  IF user_role_value IS NULL THEN
    user_role_value := 'passenger'::user_role;
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