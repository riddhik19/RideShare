import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  phone: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("📱 OTP service called");

  try {
    const { phone }: OTPRequest = await req.json();
    
    if (!phone) {
      throw new Error("Phone number is required");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database with expiration (5 minutes)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Delete any existing OTPs for this phone
    await supabase
      .from('otp_verifications')
      .delete()
      .eq('phone', phone);

    // Insert new OTP
    const { error: insertError } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        otp,
        expires_at: expiresAt.toISOString(),
        verified: false
      });

    if (insertError) {
      console.error("Database error:", insertError);
      throw new Error("Failed to store OTP");
    }

    // Send SMS
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Missing Twilio configuration");
    }

    const message = `Your RideShare verification code is: ${otp}. Valid for 5 minutes.`;
    
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', phone);
    formData.append('From', fromNumber);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const result = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", result);
      throw new Error(result.message || "Failed to send SMS");
    }

    console.log(`📱 OTP sent successfully to ${phone}:`, result.sid);

    return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
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