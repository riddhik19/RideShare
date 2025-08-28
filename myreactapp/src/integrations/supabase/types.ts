export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          bulk_booking_id: string | null
          created_at: string
          id: string
          is_bulk_booking: boolean | null
          notif_15min_sent: boolean | null
          notif_15min_sent_at: string | null
          notif_1hr_sent: boolean | null
          notif_1hr_sent_at: string | null
          notif_30min_sent: boolean | null
          notif_30min_sent_at: string | null
          passenger_id: string
          passenger_notes: string | null
          preferred_seat: string | null
          ride_id: string
          seats_booked: number
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
          // NEW FIELDS FOR SEAT BOOKING
          seat_id: string | null
          booking_date: string | null
          selected_seats: string[] | null
          idempotency_key: string | null
        }
        Insert: {
          bulk_booking_id?: string | null
          created_at?: string
          id?: string
          is_bulk_booking?: boolean | null
          notif_15min_sent?: boolean | null
          notif_15min_sent_at?: string | null
          notif_1hr_sent?: boolean | null
          notif_1hr_sent_at?: string | null
          notif_30min_sent?: boolean | null
          notif_30min_sent_at?: string | null
          passenger_id: string
          passenger_notes?: string | null
          preferred_seat?: string | null
          ride_id: string
          seats_booked: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
          // NEW FIELDS FOR SEAT BOOKING
          seat_id?: string | null
          booking_date?: string | null
          selected_seats?: string[] | null
          idempotency_key?: string | null
        }
        Update: {
          bulk_booking_id?: string | null
          created_at?: string
          id?: string
          is_bulk_booking?: boolean | null
          notif_15min_sent?: boolean | null
          notif_15min_sent_at?: string | null
          notif_1hr_sent?: boolean | null
          notif_1hr_sent_at?: string | null
          notif_30min_sent?: boolean | null
          notif_30min_sent_at?: string | null
          passenger_id?: string
          passenger_notes?: string | null
          preferred_seat?: string | null
          ride_id?: string
          seats_booked?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          // NEW FIELDS FOR SEAT BOOKING
          seat_id?: string | null
          booking_date?: string | null
          selected_seats?: string[] | null
          idempotency_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          }
        ]
      }
      driver_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          document_url: string
          driver_id: string
          id: string
          rejection_reason: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          document_url: string
          driver_id: string
          id?: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          document_url?: string
          driver_id?: string
          id?: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      driver_ratings: {
        Row: {
          booking_id: string
          created_at: string
          driver_id: string
          feedback: string | null
          id: string
          passenger_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          driver_id: string
          feedback?: string | null
          id?: string
          passenger_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          driver_id?: string
          feedback?: string | null
          id?: string
          passenger_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          is_primary: boolean | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string
          notification_type: string
          read_at: string | null
          sent_at: string
          title: string
          user_id: string
          user_type: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          sent_at?: string
          title: string
          user_id: string
          user_type: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          sent_at?: string
          title?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp: string
          phone: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp: string
          phone: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          average_rating: number | null
          created_at: string
          email: string
          full_name: string
          gender: string | null
          id: string
          kyc_completed_at: string | null
          kyc_status: Database["public"]["Enums"]["verification_status"] | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          total_ratings: number | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          created_at?: string
          email: string
          full_name: string
          gender?: string | null
          id: string
          kyc_completed_at?: string | null
          kyc_status?: Database["public"]["Enums"]["verification_status"] | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          total_ratings?: number | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          average_rating?: number | null
          created_at?: string
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          kyc_completed_at?: string | null
          kyc_status?: Database["public"]["Enums"]["verification_status"] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          total_ratings?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          id: string
          driver_id: string
          vehicle_id: string
          from_city: string
          to_city: string
          departure_date: string
          departure_time: string
          pickup_point: string
          available_seats: number
          price_per_seat: number
          notes: string | null
          created_at: string
          updated_at: string
          // CORRECTED: Using 'status' instead of 'is_active' to match your actual database
          status: string // "active", "cancelled", etc.
          // Additional fields from your database
          vehicle_type_id: string | null
          seat_layout: any | null
          seat_pricing: any | null
          base_price: number | null
          total_seats: number
          vehicle_type: string | null
          departure_timestamp: string
          origin_point: any | null
          destination_point: any | null
        }
        Insert: {
          id?: string
          driver_id: string
          vehicle_id: string
          from_city: string
          to_city: string
          departure_date: string
          departure_time: string
          pickup_point: string
          available_seats: number
          price_per_seat: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          // CORRECTED: Using 'status' instead of 'is_active'
          status?: string
          // Additional fields
          vehicle_type_id?: string | null
          seat_layout?: any | null
          seat_pricing?: any | null
          base_price?: number | null
          total_seats?: number
          vehicle_type?: string | null
          departure_timestamp?: string
          origin_point?: any | null
          destination_point?: any | null
        }
        Update: {
          id?: string
          driver_id?: string
          vehicle_id?: string
          from_city?: string
          to_city?: string
          departure_date?: string
          departure_time?: string
          pickup_point?: string
          available_seats?: number
          price_per_seat?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          // CORRECTED: Using 'status' instead of 'is_active'
          status?: string
          // Additional fields
          vehicle_type_id?: string | null
          seat_layout?: any | null
          seat_pricing?: any | null
          base_price?: number | null
          total_seats?: number
          vehicle_type?: string | null
          departure_timestamp?: string
          origin_point?: any | null
          destination_point?: any | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          is_from_user: boolean
          message: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          is_from_user?: boolean
          message: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          is_from_user?: boolean
          message?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transfer_requests: {
        Row: {
          benefits: string[] | null
          created_at: string
          expires_at: string
          id: string
          original_booking_id: string
          original_ride_id: string
          passenger_id: string
          reason: string | null
          responded_at: string | null
          status: string | null
          target_booking_id: string
          target_ride_id: string
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string
          expires_at?: string
          id?: string
          original_booking_id: string
          original_ride_id: string
          passenger_id: string
          reason?: string | null
          responded_at?: string | null
          status?: string | null
          target_booking_id: string
          target_ride_id: string
        }
        Update: {
          benefits?: string[] | null
          created_at?: string
          expires_at?: string
          id?: string
          original_booking_id?: string
          original_ride_id?: string
          passenger_id?: string
          reason?: string | null
          responded_at?: string | null
          status?: string | null
          target_booking_id?: string
          target_ride_id?: string
        }
        Relationships: []
      }
      trip_tracking: {
        Row: {
          booking_id: string
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          driver_id: string
          estimated_arrival: string | null
          id: string
          last_updated: string | null
          passenger_id: string
          shared_with_emergency_contacts: boolean | null
          trip_status: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_id: string
          estimated_arrival?: string | null
          id?: string
          last_updated?: string | null
          passenger_id: string
          shared_with_emergency_contacts?: boolean | null
          trip_status?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_id?: string
          estimated_arrival?: string | null
          id?: string
          last_updated?: string | null
          passenger_id?: string
          shared_with_emergency_contacts?: boolean | null
          trip_status?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string | null
          car_model: string
          car_type: string
          color: string | null
          created_at: string
          driver_id: string
          id: string
          license_plate: string
          seat_capacity: number
          segment: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          car_model: string
          car_type: string
          color?: string | null
          created_at?: string
          driver_id: string
          id?: string
          license_plate: string
          seat_capacity: number
          segment?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          car_model?: string
          car_type?: string
          color?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          license_plate?: string
          seat_capacity?: number
          segment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          id: string
          name: string
          total_seats: number
          layout_config: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          total_seats: number
          layout_config?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          total_seats?: number
          layout_config?: any
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      cancel_ride: {
        Args: { ride_id_param: string }
        Returns: boolean
      }
      find_suitable_transfer_cabs: {
        Args: {
          p_booking_id: string
          p_passenger_gender: string
          p_passenger_age: number
          p_route_from: string
          p_route_to: string
          p_departure_date: string
          p_departure_time: string
          p_preferred_seat?: string
          p_original_vehicle_brand?: string
          p_original_vehicle_segment?: string
        }
        Returns: {
          ride_id: string
          priority: string
          compatibility_score: number
          reason: string
        }[]
      }
      get_driver_rating_summary: {
        Args: { target_driver: string }
        Returns: {
          avg_rating: number
          ratings_count: number
        }
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      document_type: "aadhaar" | "driving_license" | "vehicle_rc"
      user_role: "driver" | "passenger"
      verification_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      document_type: ["aadhaar", "driving_license", "vehicle_rc"],
      user_role: ["driver", "passenger"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const

// ========== HELPER TYPES FOR SEAT BOOKING ==========
export type Ride = Database['public']['Tables']['rides']['Row'];
export type RideInsert = Database['public']['Tables']['rides']['Insert'];
export type RideUpdate = Database['public']['Tables']['rides']['Update'];

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];

export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

export type VehicleType = Database['public']['Tables']['vehicle_types']['Row'];
export type VehicleTypeInsert = Database['public']['Tables']['vehicle_types']['Insert'];
export type VehicleTypeUpdate = Database['public']['Tables']['vehicle_types']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Additional seat booking specific types
export interface BookedSeat {
  seatId: string;
  passengerId: string;
  bookedAt: string;
  price: number;
}

export interface RideSearchResult {
  id: string;
  from_city: string;
  to_city: string;
  departure_time: string;
  base_price: number;
  available_seats: number;
  total_seats: number;
  vehicle_type: string;
  driver_name: string;
  driver_rating: number;
}

// Additional interfaces for better type safety
export interface RideWithDetails extends Ride {
  profiles?: {
    full_name: string;
    phone: string | null;
    average_rating: number | null;
    total_ratings: number | null;
  } | null;
  vehicles?: {
    car_model: string;
    car_type: string;
    color: string | null;
    brand: string | null;
    segment: string | null;
  } | null;
}

export interface BookingWithDetails extends Booking {
  profiles?: {
    full_name: string;
    phone: string | null;
  } | null;
  rides?: {
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    pickup_point: string;
    driver_id?: string;
    profiles?: {
      full_name: string;
      phone: string | null;
    } | null;
  } | null;
}