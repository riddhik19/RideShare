import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, UserCheck, Car, Settings } from 'lucide-react';

interface SeatLayoutProps {
  rideId: string;
  totalSeats: number;
  availableSeats: number;
  basePrice: number;
  bookedSeats?: string[];
  onSeatSelect: (seatId: string, price: number) => void;
  vehicleType?: 'sedan' | 'suv' | 'hatchback' | 'tempo';
}

interface Seat {
  id: string;
  type: 'driver' | 'front' | 'window' | 'middle' | 'aisle';
  price: number;
  isBooked: boolean;
  isSelected: boolean;
  row: number;
  position: number;
}

const RedBusStyleSeatLayout: React.FC<SeatLayoutProps> = ({
  rideId,
  totalSeats,
  availableSeats,
  basePrice,
  bookedSeats = [],
  onSeatSelect,
  vehicleType = 'sedan'
}) => {
  const { toast } = useToast();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  useEffect(() => {
    const generatedSeats = generateSeatLayout(totalSeats, vehicleType, basePrice, bookedSeats);
    setSeats(generatedSeats);
  }, [totalSeats, vehicleType, basePrice, bookedSeats]);

  const generateSeatLayout = (
    total: number, 
    type: string, 
    price: number, 
    booked: string[]
  ): Seat[] => {
    const seatLayout: Seat[] = [];
    
    seatLayout.push({
      id: 'D',
      type: 'driver',
      price: 0,
      isBooked: true,
      isSelected: false,
      row: 0,
      position: 0
    });

    if (total <= 4) {
      seatLayout.push({
        id: 'F1',
        type: 'front',
        price: price + 100,
        isBooked: booked.includes('F1'),
        isSelected: false,
        row: 0,
        position: 1
      });

      const backSeats = total - 2;
      for (let i = 0; i < backSeats; i++) {
        const seatId = `B${i + 1}`;
        seatLayout.push({
          id: seatId,
          type: i === 0 || i === 2 ? 'window' : 'middle',
          price: i === 0 || i === 2 ? price + 50 : price,
          isBooked: booked.includes(seatId),
          isSelected: false,
          row: 1,
          position: i
        });
      }
    } else if (total <= 7) {
      seatLayout.push({
        id: 'F1',
        type: 'front',
        price: price + 100,
        isBooked: booked.includes('F1'),
        isSelected: false,
        row: 0,
        position: 1
      });

      const middleSeats = Math.min(3, total - 3);
      for (let i = 0; i < middleSeats; i++) {
        const seatId = `M${i + 1}`;
        seatLayout.push({
          id: seatId,
          type: i === 0 || i === 2 ? 'window' : 'middle',
          price: i === 0 || i === 2 ? price + 50 : price,
          isBooked: booked.includes(seatId),
          isSelected: false,
          row: 1,
          position: i
        });
      }

      const backSeats = total - 3 - middleSeats;
      for (let i = 0; i < backSeats; i++) {
        const seatId = `B${i + 1}`;
        seatLayout.push({
          id: seatId,
          type: i === 0 || i === 2 ? 'window' : 'middle',
          price: i === 0 || i === 2 ? price + 50 : price,
          isBooked: booked.includes(seatId),
          isSelected: false,
          row: 2,
          position: i
        });
      }
    } else {
      seatLayout.push({
        id: 'F1',
        type: 'front',
        price: price + 100,
        isBooked: booked.includes('F1'),
        isSelected: false,
        row: 0,
        position: 1
      });

      const remainingSeats = total - 2;
      const rowCount = Math.ceil(remainingSeats / 3);
      
      for (let row = 0; row < rowCount; row++) {
        const seatsInRow = Math.min(3, remainingSeats - (row * 3));
        
        for (let pos = 0; pos < seatsInRow; pos++) {
          const seatId = `R${row + 1}${pos + 1}`;
          seatLayout.push({
            id: seatId,
            type: pos === 0 || pos === 2 ? 'window' : 'aisle',
            price: pos === 0 || pos === 2 ? price + 50 : price,
            isBooked: booked.includes(seatId),
            isSelected: false,
            row: row + 1,
            position: pos
          });
        }
      }
    }

    return seatLayout;
  };

  const handleSeatClick = (seat: Seat) => {
  if (seat.type === 'driver' || seat.isBooked) return;

  const isCurrentlySelected = selectedSeats.includes(seat.id);
  
  if (isCurrentlySelected) {
    setSelectedSeats(prev => prev.filter(id => id !== seat.id));
    setSeats(prev => prev.map(s => 
      s.id === seat.id ? { ...s, isSelected: false } : s
    ));
  } else {
    // ✅ FIXED: Single seat selection for ride-sharing
    setSelectedSeats([seat.id]);
    setSeats(prev => prev.map(s => ({
      ...s,
      isSelected: s.id === seat.id
    })));
    
    // ✅ FIXED: Dynamic pricing callback
    onSeatSelect(seat.id, seat.price);
    
    toast({
      title: 'Seat Selected',
      description: `Seat ${seat.id} selected for ₹${seat.price}`,
    });
  }
};

const renderSeat = (seat: Seat) => {
  return (
    <div
      key={seat.id}
      className="relative group"
      onMouseEnter={() => setHoveredSeat(seat.id)}
      onMouseLeave={() => setHoveredSeat(null)}
    >
      <div
        className={getSeatStyle(seat)}
        onClick={() => handleSeatClick(seat)}
      >
        {renderSeatIcon(seat)}
        
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
          {seat.id}
        </div>
        
        {/* ✅ FIXED: Hover pricing display */}
        {hoveredSeat === seat.id && seat.type !== 'driver' && !seat.isBooked && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs font-bold z-10 whitespace-nowrap">
            ₹{seat.price}
            {seat.type === 'front' && <div className="text-xs">Premium +₹100</div>}
            {seat.type === 'window' && <div className="text-xs">Window +₹50</div>}
          </div>
        )}
      </div>
    </div>
  );
};

  const getSeatStyle = (seat: Seat) => {
    let baseClasses = "w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-200 relative ";
    
    if (seat.type === 'driver') {
      return baseClasses + "bg-gray-800 border-gray-700 text-white cursor-not-allowed";
    }
    
    if (seat.isBooked) {
      return baseClasses + "bg-red-100 border-red-400 text-red-700 cursor-not-allowed opacity-75";
    }
    
    if (seat.isSelected) {
      return baseClasses + "bg-green-500 border-green-600 text-white shadow-lg scale-105 ring-2 ring-green-300";
    }
    
    switch (seat.type) {
      case 'front':
        return baseClasses + "bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100 hover:border-purple-400 hover:scale-105";
      case 'window':
        return baseClasses + "bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 hover:border-blue-400 hover:scale-105";
      case 'middle':
        return baseClasses + "bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400 hover:scale-105";
      case 'aisle':
        return baseClasses + "bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100 hover:border-yellow-400 hover:scale-105";
      default:
        return baseClasses + "bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400 hover:scale-105";
    }
  };

  const renderSeatIcon = (seat: Seat) => {
    if (seat.type === 'driver') {
      return <Settings className="h-5 w-5" />;
    }
    
    if (seat.isBooked) {
      return <UserCheck className="h-4 w-4" />;
    }
    
    if (seat.isSelected) {
      return <User className="h-4 w-4" />;
    }
    
    return <User className="h-3 w-3 opacity-60" />;
  };

  const seatRows = seats.reduce((rows, seat) => {
    if (!rows[seat.row]) {
      rows[seat.row] = [];
    }
    rows[seat.row].push(seat);
    return rows;
  }, {} as Record<number, Seat[]>);

  const totalPrice = selectedSeats.reduce((total, seatId) => {
    const seat = seats.find(s => s.id === seatId);
    return total + (seat?.price || 0);
  }, 0);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
          <Car className="h-5 w-5" />
          Select Your Seat
        </CardTitle>
        <div className="flex justify-center gap-4 text-sm">
          <Badge variant="outline" className="bg-green-50">
            {availableSeats} Available
          </Badge>
          <Badge variant="outline" className="bg-red-50">
            {bookedSeats.length} Booked
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-gradient-to-b from-blue-50 to-gray-100 p-4 rounded-xl border-2 border-dashed border-blue-300">
          <div className="text-center text-xs text-gray-600 mb-4 font-medium">
            🚗 Front of Vehicle
          </div>

          <div className="space-y-4">
            {Object.entries(seatRows)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([rowIndex, rowSeats]) => (
                <div key={rowIndex} className="flex justify-center gap-2">
                  {rowSeats
                    .sort((a, b) => a.position - b.position)
                    .map((seat) => (
                      <div
                        key={seat.id}
                        className="relative group"
                        onMouseEnter={() => setHoveredSeat(seat.id)}
                        onMouseLeave={() => setHoveredSeat(null)}
                      >
                        <div
                          className={getSeatStyle(seat)}
                          onClick={() => handleSeatClick(seat)}
                        >
                          {renderSeatIcon(seat)}
                          
                          <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                            {seat.id}
                          </div>
                          
                          {hoveredSeat === seat.id && seat.type !== 'driver' && !seat.isBooked && (
                            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs font-bold z-10 whitespace-nowrap">
                              ₹{seat.price}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
            <span>Front (+₹100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Window (+₹50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Middle (Base)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Booked</span>
          </div>
        </div>

        {selectedSeats.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-sm font-medium text-green-800">
                Selected: {selectedSeats.join(', ')}
              </div>
              <div className="text-2xl font-bold text-green-700 mt-1">
                ₹{totalPrice}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RedBusStyleSeatLayout;