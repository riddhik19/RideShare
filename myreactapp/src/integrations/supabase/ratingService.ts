// src/integrations/supabase/ratingService.ts
import { supabase } from './client';

// Types
export interface DriverRating {
  id: string;
  rating: number;
  feedback: string;
  created_at: string;
  passenger_id: string;
  booking_id: string;
  passenger_name?: string;
}

export interface DriverRatingSummary {
  avg_rating: number;
  ratings_count: number;
}

// ➤ Submit or update a rating for a driver
export const submitDriverRating = async (
  driverId: string,
  bookingId: string,
  stars: number,
  feedback: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'User not authenticated' };

    const { data: existingRating } = await supabase
      .from('driver_ratings')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('passenger_id', user.id)
      .maybeSingle();

    let result;
    if (existingRating) {
      result = await supabase
        .from('driver_ratings')
        .update({
          rating: stars,
          feedback: feedback || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('driver_ratings')
        .insert({
          driver_id: driverId,
          passenger_id: user.id,
          booking_id: bookingId,
          rating: stars,
          feedback: feedback || null
        })
        .select()
        .single();
    }

    if (result.error) return { success: false, message: result.error.message };

    return {
      success: true,
      message: existingRating ? 'Rating updated successfully' : 'Rating submitted successfully',
      data: result.data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// ➤ Get driver rating summary using RPC
export const getDriverRatingSummary = async (
  driverId: string
): Promise<DriverRatingSummary> => {
  try {
    const { data, error } = await supabase.rpc(
      'get_driver_rating_summary',
      { target_driver: driverId }
    );

    if (error) {
      console.error('Error fetching driver rating summary:', error);
      return { avg_rating: 0, ratings_count: 0 };
    }

    if (!data || !Array.isArray(data)) return { avg_rating: 0, ratings_count: 0 };

    const row = (data as any)[0];
    return {
      avg_rating: Number(row?.avg_rating) || 0,
      ratings_count: Number(row?.ratings_count) || 0
    };
  } catch (error) {
    console.error('Error fetching driver rating summary:', error);
    return { avg_rating: 0, ratings_count: 0 };
  }
};

// ➤ Fetch all ratings for a driver with passenger details
export const getDriverRatings = async (driverId: string): Promise<DriverRating[]> => {
  try {
    const { data, error } = await supabase
      .from('driver_ratings')
      .select(`
        id,
        rating,
        feedback,
        created_at,
        passenger_id,
        booking_id,
        passenger_profile:profiles!driver_ratings_passenger_id_fkey (
          full_name
        )
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map(rating => ({
      id: rating.id,
      rating: rating.rating,
      feedback: rating.feedback || '',
      created_at: rating.created_at,
      passenger_id: rating.passenger_id,
      booking_id: rating.booking_id,
      passenger_name: (rating.passenger_profile as any)?.full_name || 'Anonymous'
    }));
  } catch {
    return [];
  }
};

// ➤ Check if passenger can rate a specific booking
export const canRateBooking = async (bookingId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: booking } = await supabase
      .from('bookings')
      .select('status, passenger_id')
      .eq('id', bookingId)
      .eq('passenger_id', user.id)
      .eq('status', 'confirmed')
      .maybeSingle();

    return !!booking;
  } catch {
    return false;
  }
};

// ➤ Get existing rating for a booking
export const getExistingRating = async (bookingId: string): Promise<DriverRating | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('driver_ratings')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('passenger_id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      rating: data.rating,
      feedback: data.feedback || '',
      created_at: data.created_at,
      passenger_id: data.passenger_id,
      booking_id: data.booking_id
    };
  } catch {
    return null;
  }
};
