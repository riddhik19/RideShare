// /src/components/DynamicSeatBooking.tsx
// Fixed version with all imports and correct syntax

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SeatVisualization } from '@/components/SeatVisualization';
import { 
  LayoutConfig, 
  BookedSeat, 
  getPredefinedLayouts 
} from '@/utils/seatLayoutUtils';
import { IndianRupee, Users, MapPin, Clock } from 'lucide-react';

interface RideData {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  total_seats: number | null;
  base_price: number | null;
  vehicle_type: string | null;
}

interface DynamicSeatBookingProps {
  ride: RideData;
  userId: string;
  onBookingComplete?: (bookingData: any) => void;
}

export const DynamicSeatBooking: React.FC<DynamicSeatBookingProps> = ({
  ride,
  userId,
  onBookingComplete
}) => {
  const { toast } = useToast();
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [bookedSeats, setBookedSeats] = useState<BookedSeat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Initialize seat layout
  useEffect(() => {
    const totalSeats = ride.total_seats || 5; // Default to 5 if not set
    const layouts = getPredefinedLayouts(totalSeats);
    if (layouts.length > 0) {
      setLayoutConfig(layouts[0]);
    }
  }, [ride.total_seats]);

  // Fetch current bookings
  useEffect(() => {
    fetchBookings();
  }, [ride.id]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('seat_id, passenger_id, created_at, total_price')
        .eq('ride_id', ride.id)
        .eq('status', 'confirmed')
        .not('seat_id', 'is', null); // Only get seat-specific bookings

      if (error) throw error;

      const bookings: BookedSeat[] = data.map(booking => ({
        seatId: booking.seat_id!,
        passengerId: booking.passenger_id,
        bookedAt: booking.created_at,
        price: booking.total_price
      }));

      setBookedSeats(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleSeatSelect = async (seatId: string, price: number) => {
    setSelectedSeat(seatId);
  };

  // ✅ FIXED: Updated confirmBooking function with proper seat_id handling
  const confirmBooking = async () => {
    if (!selectedSeat || !layoutConfig) return;
    
    setBookingInProgress(true);
    
    try {
      // ✅ FIXED: Check if specific seat is still available
      const { data: existingBooking, error: checkError } = await supabase
        .from('bookings')
        .select('id')
        .eq('ride_id', ride.id)
        .eq('seat_id', selectedSeat) // Check specific seat
        .eq('status', 'confirmed')
        .single();

      if (existingBooking) {
        throw new Error('Seat has been booked by another passenger');
      }

      // Calculate price based on seat type
      const seat = layoutConfig.rows
        .flatMap(row => row.seats)
        .find(s => s.id === selectedSeat);
      
      if (!seat) throw new Error('Seat not found');

      // Calculate dynamic price based on seat type
      const basePrice = ride.base_price || ride.price_per_seat;
      let seatPrice = basePrice;
      if (seat.type === 'front') seatPrice += 100;
      else if (seat.type === 'window') seatPrice += 50;

      // ✅ FIXED: Create booking with specific seat_id
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          ride_id: ride.id,
          passenger_id: userId,
          seat_id: selectedSeat, // ✅ Store specific seat
          seats_booked: 1,
          total_price: seatPrice,
          status: 'confirmed',
          booking_date: new Date().toISOString()
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // ✅ FIXED: Update available seats in ride
      const { error: updateError } = await supabase
        .from('rides')
        .update({ 
          available_seats: ride.available_seats - 1 
        })
        .eq('id', ride.id);

      if (updateError) throw updateError;

      // Refresh bookings to show the new booking
      await fetchBookings();

      toast({
        title: 'Booking Confirmed!',
        description: `Seat ${selectedSeat} booked successfully for ₹${seatPrice}`,
      });

      // Reset selection
      setSelectedSeat(null);

      onBookingComplete?.(booking);
      
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to book seat. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBookingInProgress(false);
    }
  };

  if (!layoutConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div>Loading seat layout...</div>
        </CardContent>
      </Card>
    );
  }

  const basePrice = ride.base_price || ride.price_per_seat;

  return (
    <div className="space-y-6">
      {/* Ride Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {ride.from_city} → {ride.to_city}
          </CardTitle>
          <CardDescription className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(`${ride.departure_date}T${ride.departure_time}`).toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <IndianRupee className="h-4 w-4" />
              Base Price: ₹{basePrice}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {ride.available_seats} of {ride.total_seats || 5} available
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Seat Selection */}
      <SeatVisualization
        rideId={ride.id}
        layoutConfig={layoutConfig}
        basePrice={basePrice}
        bookedSeats={bookedSeats}
        onSeatSelect={handleSeatSelect}
        userId={userId}
        readOnly={false}
      />

      {/* Booking Confirmation */}
      {selectedSeat && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Selected Seat:</span>
                <Badge variant="outline" className="text-blue-700">
                  {selectedSeat}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Price:</span>
                <span className="font-bold text-green-700">
                  ₹{(() => {
                    const seat = layoutConfig.rows
                      .flatMap(row => row.seats)
                      .find(s => s.id === selectedSeat);
                    
                    if (!seat) return basePrice;
                    
                    let price = basePrice;
                    if (seat.type === 'front') price += 100;
                    else if (seat.type === 'window') price += 50;
                    return price;
                  })()}
                </span>
              </div>

              <Button 
                onClick={confirmBooking}
                disabled={bookingInProgress}
                className="w-full"
              >
                {bookingInProgress ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};