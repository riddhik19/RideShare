// src/integrations/supabase/ratingService.ts
import { supabase } from './client';

export interface DriverRating {
  rating: number;
  review: string;
  created_at: string;
  passenger_id?: string;
  passenger_name?: string; // optional for display
}

export interface DriverRatingSummary {
  avg_rating: number;
  ratings_count: number;
}

// ➤ Submit or update a rating (RPC)
export const submitDriverRating = async (
  driverId: string,
  stars: number,
  review: string
): Promise<DriverRating | null> => {
  const { data, error } = await supabase.rpc<any, any>(
    'submit_driver_rating',
    { target_driver: driverId, stars, review_text: review }
  );

  if (error) {
    console.error('❌ Error submitting/updating rating:', error.message);
    return null;
  }

  return data ?? null;
};

// ➤ Fetch all ratings for a driver
export const getDriverRatings = async (driverId: string): Promise<DriverRating[]> => {
  const { data, error } = await supabase
    .from('driver_ratings')
    .select('rating, review, created_at, passenger_id')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('❌ Error fetching driver ratings:', error?.message);
    return [];
  }

  // ✅ Cast safely via unknown first
  return data as unknown as DriverRating[];
};

// ➤ Fetch average rating & total count (RPC)
export const getDriverRatingSummary = async (
  driverId: string
): Promise<DriverRatingSummary> => {
  const { data, error } = await supabase.rpc<any, any>(
    'get_driver_rating_summary',
    { target_driver: driverId }
  );

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { avg_rating: 0, ratings_count: 0 };
  }

  return data[0] as DriverRatingSummary;
};
