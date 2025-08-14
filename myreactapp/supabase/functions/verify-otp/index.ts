import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🔐 OTP verification service called");

  try {
    const { phone, otp }: VerifyOTPRequest = await req.json();
    
    if (!phone || !otp) {
      throw new Error("Phone number and OTP are required");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Verifying OTP for phone: ${phone}, OTP: ${otp}`);
    console.log(`Current time: ${new Date().toISOString()}`);

    // Check OTP with detailed logging
    const { data: otpData, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('otp', otp)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    console.log(`OTP query result:`, otpData);
    console.log(`OTP query error:`, otpError);

    // Also check if there are any OTPs for this phone at all
    const { data: allOtps } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`All recent OTPs for ${phone}:`, allOtps);

    if (otpError) {
      console.error("Database error during OTP verification:", otpError);
      throw new Error("Database error occurred");
    }

    if (!otpData) {
      console.log(`No valid OTP found for phone: ${phone}, OTP: ${otp}`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired OTP",
          debug: {
            phone,
            otp,
            currentTime: new Date().toISOString(),
            allOtps: allOtps?.map(o => ({
              otp: o.otp,
              verified: o.verified,
              expires_at: o.expires_at,
              created_at: o.created_at
            }))
          }
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpData.id);

    // Check if user exists with this phone
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    let userId;
    let userExists = !!profile;

    if (profile) {
      // User exists
      userId = profile.id;
      console.log(`Existing user found: ${userId}`);
    } else {
      // Create new user profile
      console.log(`Creating new user for phone: ${phone}`);
      
      const tempEmail = `${phone.replace('+', '')}@temp.rideshare.com`;
      const newUserId = crypto.randomUUID();
      
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUserId,
          email: tempEmail,
          phone,
          full_name: 'User',
          role: 'passenger'
        })
        .select()
        .single();

      if (profileError) {
        console.error("Error creating profile:", profileError);
        throw new Error("Failed to create user profile");
      }

      userId = newProfile.id;
      userExists = false;
      console.log(`New user created: ${userId}`);
    }

    console.log(`🔐 OTP verified successfully for ${phone}`);

    return new Response(JSON.stringify({ 
      success: true, 
      userExists,
      userId,
      phone,
      // Generate a simple token for authentication
      authToken: `mobile_auth_${userId}_${Date.now()}`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);