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

interface TransferRequest {
  bookingId: string;
  passengerGender: string;
  passengerAge: number;
  routeFrom: string;
  routeTo: string;
  departureDate: string;
  departureTime: string;
  preferredSeat?: string;
  originalVehicleBrand?: string;
  originalVehicleSegment?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      bookingId,
      passengerGender,
      passengerAge,
      routeFrom,
      routeTo,
      departureDate,
      departureTime,
      preferredSeat,
      originalVehicleBrand,
      originalVehicleSegment
    }: TransferRequest = await req.json();

    console.log('Processing safety transfer request for booking:', bookingId);

    // Only process for female passengers
    if (passengerGender !== 'female') {
      return new Response(
        JSON.stringify({ message: 'Transfer feature only available for female passengers' }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Call the database function to find suitable transfer cabs
    const { data: suitableCabs, error } = await supabase.rpc('find_suitable_transfer_cabs', {
      p_booking_id: bookingId,
      p_passenger_gender: passengerGender,
      p_passenger_age: passengerAge,
      p_route_from: routeFrom,
      p_route_to: routeTo,
      p_departure_date: departureDate,
      p_departure_time: departureTime,
      p_preferred_seat: preferredSeat,
      p_original_vehicle_brand: originalVehicleBrand,
      p_original_vehicle_segment: originalVehicleSegment
    });

    if (error) {
      console.error('Error finding suitable cabs:', error);
      throw error;
    }

    if (!suitableCabs || suitableCabs.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No suitable transfer cabs found',
          transfers: []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the best candidate (highest priority and score)
    const bestCandidate = suitableCabs[0];

    // Get passenger info for the transfer request
    const { data: booking } = await supabase
      .from('bookings')
      .select('passenger_id')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Get ride details for the target cab
    const { data: targetRide } = await supabase
      .from('rides')
      .select(`
        *,
        vehicles (*),
        profiles (full_name, average_rating)
      `)
      .eq('id', bestCandidate.ride_id)
      .single();

    if (!targetRide) {
      throw new Error('Target ride not found');
    }

    // Create transfer request
    const { data: transferRequest, error: transferError } = await supabase
      .from('transfer_requests')
      .insert({
        original_booking_id: bookingId,
        target_booking_id: null, // Will be filled when accepted
        passenger_id: booking.passenger_id,
        original_ride_id: bookingId, // This needs to be corrected to get from booking
        target_ride_id: bestCandidate.ride_id,
        reason: 'safety_transfer',
        benefits: [
          bestCandidate.reason,
          'Enhanced safety and comfort',
          'Better passenger compatibility',
          `Vehicle: ${targetRide.vehicles.brand} ${targetRide.vehicles.car_model}`,
          `Driver rating: ${targetRide.profiles.average_rating || 'New driver'}`
        ]
      })
      .select()
      .single();

    if (transferError) {
      console.error('Error creating transfer request:', transferError);
      throw transferError;
    }

    console.log('Transfer request created successfully:', transferRequest.id);

    return new Response(
      JSON.stringify({
        success: true,
        transferRequest: {
          id: transferRequest.id,
          targetRide: {
            id: targetRide.id,
            driverName: targetRide.profiles.full_name,
            driverRating: targetRide.profiles.average_rating,
            vehicle: `${targetRide.vehicles.brand} ${targetRide.vehicles.car_model}`,
            vehicleColor: targetRide.vehicles.color,
            licensePlate: targetRide.vehicles.license_plate,
            departureTime: targetRide.departure_time,
            pickupPoint: targetRide.pickup_point
          },
          priority: bestCandidate.priority,
          reason: bestCandidate.reason,
          benefits: transferRequest.benefits,
          expiresAt: transferRequest.expires_at
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in safety-transfer function:', error);
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