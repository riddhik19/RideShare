import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string;
  message: string;
  type: 'booking_confirmation' | 'otp' | 'general';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("📱 SMS service called");

  try {
    const { to, message, type }: SMSRequest = await req.json();
    
    console.log(`📱 Attempting to send ${type} SMS to: ${to}`);
    console.log(`📱 Message: ${message.substring(0, 50)}...`);
    
    if (!to || !message) {
      throw new Error("Phone number and message are required");
    }
    
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      console.error("Missing Twilio configuration:", { 
        hasAccountSid: !!accountSid, 
        hasAuthToken: !!authToken, 
        hasFromNumber: !!fromNumber 
      });
      throw new Error("Missing Twilio configuration");
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', to);
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

    console.log(`📱 ${type} SMS sent successfully to ${to}:`, result.sid);

    return new Response(JSON.stringify({ success: true, messageSid: result.sid }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-sms-notification function:", error);
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