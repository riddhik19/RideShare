import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ CRITICAL: Use SERVICE ROLE KEY to bypass RLS completely
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  // Service role bypasses RLS
);

interface BookingRequest {
  passenger_id: string;
  ride_id: string;
  seats_booked: number;
  total_price: number;
  passenger_notes?: string;
  seat_id?: string;
  booking_date?: string;
  selected_seats?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  try {
    const bookingData: BookingRequest = await req.json();
    console.log('📝 Creating booking via Edge Function:', bookingData);

    // ✅ Step 1: Validate the ride exists and has available seats
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('available_seats, status, driver_id, price_per_seat, base_price, total_seats')
      .eq('id', bookingData.ride_id)
      .single();

    if (rideError || !ride) {
      console.error('Ride validation failed:', rideError);
      throw new Error('Ride not found');
    }

    if (ride.status !== 'active') {
      throw new Error('This ride is no longer available');
    }

    if (ride.available_seats < bookingData.seats_booked) {
      throw new Error(`Only ${ride.available_seats} seats available`);
    }

    if (ride.driver_id === bookingData.passenger_id) {
      throw new Error('You cannot book your own ride');
    }

    // ✅ Step 2: Check for duplicate bookings using SERVICE ROLE
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('ride_id', bookingData.ride_id)
      .eq('passenger_id', bookingData.passenger_id)
      .maybeSingle();

    if (existingBooking) {
      throw new Error('You have already booked this ride');
    }

    // ✅ Step 3: If seat_id is provided, check seat availability
    if (bookingData.seat_id) {
      const { data: seatBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('ride_id', bookingData.ride_id)
        .eq('seat_id', bookingData.seat_id)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (seatBooking) {
        throw new Error('This seat has already been booked');
      }
    }

    // ✅ Step 4: Create the booking (service role bypasses RLS policies)
    const bookingInsertData = {
      passenger_id: bookingData.passenger_id,
      ride_id: bookingData.ride_id,
      seats_booked: bookingData.seats_booked,
      total_price: bookingData.total_price,
      status: 'confirmed',
      passenger_notes: bookingData.passenger_notes || null,
      seat_id: bookingData.seat_id || null,
      booking_date: bookingData.booking_date || new Date().toISOString().split('T')[0],
      selected_seats: bookingData.selected_seats || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Creating booking with data:', bookingInsertData);

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingInsertData)
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    // ✅ Step 5: Update available seats
    const { error: updateError } = await supabase
      .from('rides')
      .update({ 
        available_seats: ride.available_seats - bookingData.seats_booked,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingData.ride_id);

    if (updateError) {
      console.warn('Failed to update ride seats:', updateError);
      // Don't fail the booking for this, but log it
    }

    console.log('✅ Booking created successfully:', newBooking.id);

    return new Response(
      JSON.stringify({
        success: true,
        booking: newBooking,
        message: 'Booking created successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in booking creation:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);