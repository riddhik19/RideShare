import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { PassengerConfirmationEmail } from "./_templates/passenger-confirmation.tsx";
import { DriverConfirmationEmail } from "./_templates/driver-confirmation.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  type: 'passenger' | 'driver';
  booking: {
    id: string;
    booking_reference: string;
    passenger_name: string;
    passenger_email: string;
    passenger_phone: string;
    driver_name: string;
    driver_email: string;
    driver_phone: string;
    driver_rating: number;
    driver_photo?: string;
    vehicle_details: {
      make: string;
      model: string;
      color: string;
      license_plate: string;
      type: string;
    };
    trip_details: {
      from_city: string;
      to_city: string;
      pickup_location: string;
      departure_date: string;
      departure_time: string;
      estimated_duration: string;
      fare_breakdown: {
        base_fare: number;
        taxes: number;
        total: number;
      };
    };
    seats_booked: number;
    passenger_rating?: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("📧 Email service called");

  try {
    const { type, booking }: BookingConfirmationRequest = await req.json();
    console.log(`📧 Processing ${type} email for booking:`, booking.id);
    
    let emailResponse;
    
    if (type === 'passenger') {
      const html = await renderAsync(
        React.createElement(PassengerConfirmationEmail, { booking })
      );
      
      emailResponse = await resend.emails.send({
        from: "RideShare <bookings@resend.dev>",
        to: [booking.passenger_email],
        subject: `✅ Ride Confirmed - ${booking.trip_details.from_city} to ${booking.trip_details.to_city} on ${booking.trip_details.departure_date}`,
        html,
      });
    } else {
      const html = await renderAsync(
        React.createElement(DriverConfirmationEmail, { booking })
      );
      
      emailResponse = await resend.emails.send({
        from: "RideShare <bookings@resend.dev>",
        to: [booking.driver_email],
        subject: `✅ New Ride Request Confirmed: ${booking.trip_details.from_city} to ${booking.trip_details.to_city}`,
        html,
      });
    }

    console.log("Booking confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
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