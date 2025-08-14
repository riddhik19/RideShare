import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TransferResponse {
  transferRequestId: string;
  response: 'accepted' | 'declined';
  passengerId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transferRequestId, response, passengerId }: TransferResponse = await req.json();

    console.log(`Processing transfer response: ${response} for request:`, transferRequestId);

    // Get the transfer request details
    const { data: transferRequest, error: fetchError } = await supabase
      .from('transfer_requests')
      .select(`
        *,
        original_ride:rides!transfer_requests_original_ride_id_fkey (*),
        target_ride:rides!transfer_requests_target_ride_id_fkey (*)
      `)
      .eq('id', transferRequestId)
      .eq('passenger_id', passengerId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !transferRequest) {
      throw new Error('Transfer request not found or expired');
    }

    // Check if request has expired
    if (new Date() > new Date(transferRequest.expires_at)) {
      await supabase
        .from('transfer_requests')
        .update({ status: 'expired' })
        .eq('id', transferRequestId);
      
      throw new Error('Transfer request has expired');
    }

    // Update transfer request status
    const { error: updateError } = await supabase
      .from('transfer_requests')
      .update({
        status: response,
        responded_at: new Date().toISOString()
      })
      .eq('id', transferRequestId);

    if (updateError) {
      throw updateError;
    }

    if (response === 'accepted') {
      // Execute the transfer
      
      // 1. Get original booking details
      const { data: originalBooking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', transferRequest.original_booking_id)
        .single();

      if (bookingError || !originalBooking) {
        throw new Error('Original booking not found');
      }

      // 2. Create new booking in target ride
      const { data: newBooking, error: newBookingError } = await supabase
        .from('bookings')
        .insert({
          passenger_id: originalBooking.passenger_id,
          ride_id: transferRequest.target_ride_id,
          seats_booked: originalBooking.seats_booked,
          total_price: originalBooking.total_price,
          status: 'confirmed',
          passenger_notes: originalBooking.passenger_notes,
          preferred_seat: originalBooking.preferred_seat,
          is_bulk_booking: originalBooking.is_bulk_booking,
          bulk_booking_id: originalBooking.bulk_booking_id
        })
        .select()
        .single();

      if (newBookingError) {
        throw newBookingError;
      }

      // 3. Update available seats in both rides
      const { error: originalRideError } = await supabase.rpc('increment', {
        table_name: 'rides',
        row_id: transferRequest.original_ride_id,
        column_name: 'available_seats',
        increment_value: originalBooking.seats_booked
      });

      const { error: targetRideError } = await supabase.rpc('decrement', {
        table_name: 'rides',
        row_id: transferRequest.target_ride_id,
        column_name: 'available_seats',
        decrement_value: originalBooking.seats_booked
      });

      // 4. Cancel original booking
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', transferRequest.original_booking_id);

      // 5. Update transfer request with new booking ID
      await supabase
        .from('transfer_requests')
        .update({ target_booking_id: newBooking.id })
        .eq('id', transferRequestId);

      console.log('Transfer completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transfer completed successfully',
          newBookingId: newBooking.id
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      console.log('Transfer declined by passenger');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transfer declined'
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('Error in respond-transfer function:', error);
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