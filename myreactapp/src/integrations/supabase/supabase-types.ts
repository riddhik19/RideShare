// src/integrations/supabase/supabase-types.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      driver_ratings: {
        Row: {
          id: string;
          driver_id: string;
          passenger_id: string;
          booking_id: string;
          rating: number;
          feedback: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          average_rating: number;
          total_ratings: number;
        };
      };
      bookings: {
        Row: {
          id: string;
          passenger_id: string;
          status: string;
        };
      };
    };
    Functions: {
      get_driver_rating_summary: {
        Args: { target_driver: string };
        Returns: { avg_rating: number; ratings_count: number };
      };
      submit_driver_rating: {
        Args: { target_driver: string; target_booking: string; stars: number; review_text?: string };
        Returns: { id: string; rating: number; feedback: string | null; created_at: string };
      };
    };
  };
}
