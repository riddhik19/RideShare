// /src/components/SeatVisualization.tsx
// FIXED - Enhanced Interactive Seat Map for your database structure

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { User, UserCheck, Car, IndianRupee } from 'lucide-react';
import { 
  LayoutConfig, 
  Seat, 
  BookedSeat,
  getBookableSeats,
  getSeatCssClass,
  getSeatTypeColor 
} from '@/utils/seatLayoutUtils';

interface SeatVisualizationProps {
  rideId: string;
  layoutConfig: LayoutConfig;
  basePrice: number;
  bookedSeats?: BookedSeat[];
  onSeatSelect?: (seatId: string, price: number) => Promise<void>;
  userId?: string;
  readOnly?: boolean;
}

export const SeatVisualization: React.FC<SeatVisualizationProps> = ({ 
  rideId,
  layoutConfig,
  basePrice,
  bookedSeats = [],
  onSeatSelect,
  userId,
  readOnly = false
}) => {
  const { toast } = useToast();
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentBookedSeats, setCurrentBookedSeats] = useState<BookedSeat[]>(bookedSeats);

  // Real-time subscription to seat bookings (FIXED: use 'bookings' table)
  useEffect(() => {
    const subscription = supabase
      .channel(`ride-${rideId}-seats`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',  // FIXED: Changed from 'ride_bookings' to 'bookings'
          filter: `ride_id=eq.${rideId}`
        }, 
        (payload) => {
          console.log('Seat booking update:', payload);
          fetchLatestBookings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [rideId]);

  const fetchLatestBookings = async () => {
    try {
      // FIXED: Use 'bookings' table with correct column names
      const { data, error } = await supabase
        .from('bookings')  // FIXED: Changed from 'ride_bookings'
        .select('seat_id, passenger_id, created_at, total_price')  // FIXED: Changed 'price' to 'total_price'
        .eq('ride_id', rideId)
        .eq('status', 'confirmed')
        .not('seat_id', 'is', null);  // Only get seat-specific bookings

      if (error) throw error;

      // FIXED: Map the correct column names
      const bookings: BookedSeat[] = data.map(booking => ({
        seatId: booking.seat_id!,  // FIXED: Use seat_id correctly
        passengerId: booking.passenger_id,  // FIXED: Use passenger_id correctly
        bookedAt: booking.created_at,  // FIXED: Use created_at correctly
        price: booking.total_price  // FIXED: Use total_price instead of price
      }));

      setCurrentBookedSeats(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const getSeatPrice = (seat: Seat): number => {
    switch (seat.type) {
      case 'front':
        return basePrice + 100;
      case 'window':
        return basePrice + 50;
      case 'middle':
        return basePrice;
      default:
        return basePrice;
    }
  };

  const isSeatBooked = (seatId: string): boolean => {
    return currentBookedSeats.some(booking => booking.seatId === seatId);
  };

  const isSeatBookedByCurrentUser = (seatId: string): boolean => {
    return currentBookedSeats.some(
      booking => booking.seatId === seatId && booking.passengerId === userId
    );
  };

  const handleSeatClick = async (seat: Seat) => {
    if (readOnly || !seat.bookable || !onSeatSelect || !userId) return;

    const isBooked = isSeatBooked(seat.id);
    const isBookedByUser = isSeatBookedByCurrentUser(seat.id);

    if (isBooked && !isBookedByUser) {
      toast({
        title: 'Seat Unavailable',
        description: 'This seat has already been booked by another passenger.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const price = getSeatPrice(seat);
      await onSeatSelect(seat.id, price);
      setSelectedSeat(seat.id);
      
      toast({
        title: 'Seat Selected',
        description: `Seat ${seat.id} selected for ₹${price}`,
      });
    } catch (error) {
      toast({
        title: 'Booking Failed',
        description: 'Failed to book the seat. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSeat = (seat: Seat) => {
    const isBooked = isSeatBooked(seat.id);
    const isBookedByUser = isSeatBookedByCurrentUser(seat.id);
    const isSelected = selectedSeat === seat.id;
    const isHovered = hoveredSeat === seat.id;
    const isDriver = seat.type === 'driver';
    const price = getSeatPrice(seat);

    let seatStatus = '';
    if (isDriver) seatStatus = 'Driver';
    else if (isBooked) seatStatus = isBookedByUser ? 'Your Seat' : 'Booked';
    else if (seat.bookable) seatStatus = `₹${price}`;
    else seatStatus = 'N/A';

    return (
      <div key={seat.id} className="flex flex-col items-center space-y-1 relative">
        {/* Hover price tooltip */}
        {isHovered && !isDriver && seat.bookable && (
          <div className="absolute -top-12 bg-black text-white text-xs px-2 py-1 rounded shadow-lg z-10">
            ₹{price}
            <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}

        {/* Seat visual */}
        <div 
          className={`
            w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center 
            font-bold text-xs transition-all cursor-pointer
            ${getSeatCssClass(seat)}
            ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : ''}
            ${isBooked && !isBookedByUser ? 'opacity-50 cursor-not-allowed' : ''}
            ${isBookedByUser ? 'ring-2 ring-green-500 ring-offset-2' : ''}
            ${!isBooked && seat.bookable ? 'hover:scale-105 hover:shadow-md' : ''}
            ${loading ? 'opacity-75' : ''}
          `}
          onClick={() => handleSeatClick(seat)}
          onMouseEnter={() => setHoveredSeat(seat.id)}
          onMouseLeave={() => setHoveredSeat(null)}
          title={`Seat ${seat.id} - ${seatStatus}`}
        >
          <div className="text-xs font-bold">{seat.id}</div>
          {isDriver && <Car className="h-3 w-3 mt-0.5" />}
          {isBooked && !isDriver && (
            <UserCheck className={`h-3 w-3 mt-0.5 ${isBookedByUser ? 'text-green-600' : 'text-red-600'}`} />
          )}
          {!isBooked && !isDriver && seat.bookable && (
            <User className="h-3 w-3 mt-0.5 opacity-50" />
          )}
        </div>
        
        {/* Seat label and price */}
        <div className="text-center">
          <div className={`text-xs font-medium px-1 py-0.5 rounded ${getSeatTypeColor(seat.type)}`}>
            {seat.label}
          </div>
          {!isDriver && seat.bookable && (
            <div className="text-xs font-bold text-green-700 mt-1">
              {isBooked ? (isBookedByUser ? 'Yours' : 'Booked') : `₹${price}`}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSeatRow = (row: any, rowIndex: number) => {
    if (!row.seats || row.seats.length === 0) return null;

    const getRowLayout = () => {
      if (row.type === 'front') {
        return 'flex justify-center items-center gap-8 max-w-md mx-auto';
      }
      
      const seatCount = row.seats.length;
      if (seatCount === 2) {
        return 'flex justify-center gap-12 max-w-sm mx-auto';
      } else if (seatCount === 3) {
        return 'flex justify-center gap-6 max-w-md mx-auto';
      }
      
      return 'flex justify-center gap-6';
    };

    return (
      <div key={`${row.type}-${rowIndex}`} className="w-full">
        <div className={getRowLayout()}>
          {row.seats.map((seat: Seat) => renderSeat(seat))}
        </div>
      </div>
    );
  };

  const bookableSeats = getBookableSeats(layoutConfig);
  const availableSeats = bookableSeats.filter(seat => !isSeatBooked(seat.id));
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Car className="h-4 w-4" />
          Seat Selection
        </CardTitle>
        <CardDescription>
          Click on available seats to book. Hover for pricing details.
        </CardDescription>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline" className="text-green-700">
            {availableSeats.length} available
          </Badge>
          <Badge variant="outline" className="text-red-700">
            {currentBookedSeats.length} booked
          </Badge>
          <Badge variant="outline" className="text-blue-700">
            {layoutConfig.vehicleType}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-dashed border-gray-300">
          {/* Vehicle header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-t-xl text-sm font-medium">
              <Car className="h-4 w-4" />
              {layoutConfig.vehicleType}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {layoutConfig.totalSeats} Total Seats • {availableSeats.length} Available
            </div>
          </div>
          
          {/* Seat layout */}
          <div className="space-y-8 w-full">
            {layoutConfig.rows.map((row, rowIndex) => renderSeatRow(row, rowIndex))}
          </div>
          
          {/* Legend */}
          <div className="mt-8 space-y-3">
            <div className="text-center text-sm font-semibold text-gray-700">Seat Legend</div>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded flex items-center justify-center">
                  <User className="h-2 w-2 text-green-800" />
                </div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded flex items-center justify-center">
                  <UserCheck className="h-2 w-2 text-red-800" />
                </div>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-100 border-2 border-purple-300 rounded flex items-center justify-center">
                  <span className="text-purple-800 font-bold text-xs">F</span>
                </div>
                <span>Front (+₹100)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center">
                  <span className="text-blue-800 font-bold text-xs">W</span>
                </div>
                <span>Window (+₹50)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded flex items-center justify-center">
                  <span className="text-green-800 font-bold text-xs">M</span>
                </div>
                <span>Middle (Base)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};