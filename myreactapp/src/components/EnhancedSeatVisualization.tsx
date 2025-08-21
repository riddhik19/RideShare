import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, UserCheck, Car } from 'lucide-react';

interface SeatInfo {
  id: string;
  type: 'front' | 'window' | 'middle' | 'driver';
  isBooked: boolean;
  isSelected: boolean;
  bookedBy?: string;
  price: number;
}

interface EnhancedSeatVisualizationProps {
  totalSeats: number;
  availableSeats: number;
  basePrice: number;
  vehicleType?: string;
  onSeatSelect?: (selectedSeats: string[], totalPrice: number) => void;
  maxSelectableSeats?: number;
  bookedSeats?: Array<{
    seatId: string;
    passengerName: string;
  }>;
  isSelectable?: boolean;
  isDriverView?: boolean;
}

export const EnhancedSeatVisualization: React.FC<EnhancedSeatVisualizationProps> = ({ 
  totalSeats, 
  availableSeats, 
  basePrice,
  vehicleType = 'car',
  onSeatSelect,
  maxSelectableSeats = 1,
  bookedSeats = [],
  isSelectable = true,
  isDriverView = false
}) => {
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Seat pricing configuration
  const seatPricing = {
    front: basePrice + 100,
    window: basePrice + 50,
    middle: basePrice,
    driver: 0
  };

  // Generate seat layout based on total seats
  useEffect(() => {
    const generateSeats = () => {
      const seatLayout: SeatInfo[] = [];
      
      // Always add driver seat
      seatLayout.push({
        id: 'driver',
        type: 'driver',
        isBooked: true,
        isSelected: false,
        bookedBy: 'Driver',
        price: 0
      });

      if (totalSeats <= 4) {
        // Small car layout: Front passenger + 2-3 rear seats
        seatLayout.push({
          id: 'F1',
          type: 'front',
          isBooked: false,
          isSelected: false,
          price: seatPricing.front
        });

        // Rear seats
        for (let i = 1; i <= totalSeats - 1; i++) {
          const seatId = `R${i}`;
          const seatType = i === 1 || i === 3 ? 'window' : 'middle';
          seatLayout.push({
            id: seatId,
            type: seatType,
            isBooked: false,
            isSelected: false,
            price: seatPricing[seatType]
          });
        }
      } else if (totalSeats <= 6) {
        // Medium car/SUV layout: Front passenger + 4-5 rear seats
        seatLayout.push({
          id: 'F1',
          type: 'front',
          isBooked: false,
          isSelected: false,
          price: seatPricing.front
        });

        // Rear seats (2 rows)
        const rearSeats = totalSeats - 1;
        const firstRowSeats = Math.min(3, rearSeats);
        const secondRowSeats = rearSeats - firstRowSeats;

        for (let i = 1; i <= firstRowSeats; i++) {
          const seatId = `R1_${i}`;
          const seatType = i === 1 || i === 3 ? 'window' : 'middle';
          seatLayout.push({
            id: seatId,
            type: seatType,
            isBooked: false,
            isSelected: false,
            price: seatPricing[seatType]
          });
        }

        for (let i = 1; i <= secondRowSeats; i++) {
          const seatId = `R2_${i}`;
          const seatType = i === 1 || i === 2 ? 'window' : 'middle';
          seatLayout.push({
            id: seatId,
            type: seatType,
            isBooked: false,
            isSelected: false,
            price: seatPricing[seatType]
          });
        }
      } else {
        // Large vehicle layout: Front passenger + multiple rows
        seatLayout.push({
          id: 'F1',
          type: 'front',
          isBooked: false,
          isSelected: false,
          price: seatPricing.front
        });

        // Multiple rear rows
        const rearSeats = totalSeats - 1;
        const rows = Math.ceil(rearSeats / 3);
        
        for (let row = 1; row <= rows; row++) {
          const seatsInRow = Math.min(3, rearSeats - (row - 1) * 3);
          for (let seat = 1; seat <= seatsInRow; seat++) {
            const seatId = `R${row}_${seat}`;
            const seatType = seat === 1 || seat === 3 ? 'window' : 'middle';
            seatLayout.push({
              id: seatId,
              type: seatType,
              isBooked: false,
              isSelected: false,
              price: seatPricing[seatType]
            });
          }
        }
      }

      // Mark booked seats
      bookedSeats.forEach(bookedSeat => {
        const seat = seatLayout.find(s => s.id === bookedSeat.seatId);
        if (seat) {
          seat.isBooked = true;
          seat.bookedBy = bookedSeat.passengerName;
        }
      });

      return seatLayout;
    };

    setSeats(generateSeats());
  }, [totalSeats, basePrice, bookedSeats]);

  const handleSeatClick = (seatId: string) => {
    if (!isSelectable || isDriverView) return;
    
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.isBooked || seat.type === 'driver') return;

    let newSelectedSeats: string[];
    
    if (selectedSeats.includes(seatId)) {
      // Deselect seat
      newSelectedSeats = selectedSeats.filter(id => id !== seatId);
    } else {
      // Select seat (respect max limit)
      if (selectedSeats.length >= maxSelectableSeats) {
        newSelectedSeats = [...selectedSeats.slice(1), seatId];
      } else {
        newSelectedSeats = [...selectedSeats, seatId];
      }
    }

    setSelectedSeats(newSelectedSeats);

    // Update seat selection state
    setSeats(prev => prev.map(seat => ({
      ...seat,
      isSelected: newSelectedSeats.includes(seat.id)
    })));

    // Calculate total price and notify parent
    const totalPrice = newSelectedSeats.reduce((total, seatId) => {
      const seat = seats.find(s => s.id === seatId);
      return total + (seat?.price || 0);
    }, 0);

    onSeatSelect?.(newSelectedSeats, totalPrice);
  };

  const getSeatClassName = (seat: SeatInfo) => {
    const baseClasses = "w-12 h-8 border rounded flex items-center justify-center transition-all duration-200 cursor-pointer relative";
    
    if (seat.type === 'driver') {
      return `${baseClasses} bg-gray-700 border-gray-600 text-white cursor-not-allowed`;
    }
    
    if (seat.isBooked) {
      return `${baseClasses} bg-red-100 border-red-300 text-red-600 cursor-not-allowed`;
    }
    
    if (seat.isSelected) {
      return `${baseClasses} bg-blue-200 border-blue-400 text-blue-700 ring-2 ring-blue-400`;
    }
    
    // Available seats with type-based styling
    const typeColors = {
      front: 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100',
      window: 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100',
      middle: 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100',
      driver: ''
    };
    
    return `${baseClasses} ${typeColors[seat.type]} ${!isSelectable || isDriverView ? 'cursor-not-allowed' : 'hover:scale-105'}`;
  };

  const renderSeatIcon = (seat: SeatInfo) => {
    if (seat.type === 'driver') {
      return <Car className="h-4 w-4" />;
    }
    
    if (seat.isBooked) {
      return <UserCheck className="h-3 w-3" />;
    }
    
    return <User className="h-3 w-3" />;
  };

  const groupSeatsByRow = () => {
    const rows: { [key: string]: SeatInfo[] } = {};
    
    seats.forEach(seat => {
      if (seat.type === 'driver') {
        if (!rows['driver']) rows['driver'] = [];
        rows['driver'].push(seat);
      } else if (seat.id.startsWith('F')) {
        if (!rows['front']) rows['front'] = [];
        rows['front'].push(seat);
      } else {
        const rowMatch = seat.id.match(/R(\d+)_/);
        const rowKey = rowMatch ? `row_${rowMatch[1]}` : 'rear';
        if (!rows[rowKey]) rows[rowKey] = [];
        rows[rowKey].push(seat);
      }
    });
    
    return rows;
  };

  const seatRows = groupSeatsByRow();
  const totalPrice = selectedSeats.reduce((total, seatId) => {
    const seat = seats.find(s => s.id === seatId);
    return total + (seat?.price || 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Seat Selection</h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
            <span>Front (+₹100)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Window (+₹50)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Middle (Base)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Booked</span>
          </div>
        </div>
      </div>
      
      <Card className="p-4 bg-gradient-to-b from-blue-50 to-blue-100 relative">
        {/* Vehicle outline */}
        <div className="border-2 border-gray-400 rounded-lg p-4 bg-white/50 min-h-[200px]">
          <div className="space-y-3">
            {/* Driver Row */}
            {seatRows.driver && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center gap-2">
                  {seatRows.driver.map((seat) => (
                    <div key={seat.id} className="text-center">
                      <div
                        className={getSeatClassName(seat)}
                        onClick={() => handleSeatClick(seat.id)}
                        title={`Driver Seat`}
                      >
                        {renderSeatIcon(seat)}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 block">Driver</span>
                    </div>
                  ))}
                  <div className="ml-4 text-xs text-gray-500">
                    🚗 Front of Vehicle
                  </div>
                </div>
              </div>
            )}

            {/* Front Passenger Row */}
            {seatRows.front && (
              <div className="flex justify-end mb-4">
                <div className="flex gap-2">
                  {seatRows.front.map((seat) => (
                    <div key={seat.id} className="text-center">
                      <div
                        className={getSeatClassName(seat)}
                        onClick={() => handleSeatClick(seat.id)}
                        title={`Front Seat - ₹${seat.price}`}
                      >
                        {renderSeatIcon(seat)}
                        {seat.isSelected && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 block">
                        ₹{seat.price}
                      </span>
                      {seat.isBooked && (
                        <span className="text-xs text-red-600 block truncate max-w-[48px]">
                          {seat.bookedBy}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rear Rows */}
            {Object.keys(seatRows)
              .filter(key => key.startsWith('row_') || key === 'rear')
              .sort()
              .map((rowKey) => (
                <div key={rowKey} className="flex justify-center gap-2 mb-2">
                  {seatRows[rowKey].map((seat) => (
                    <div key={seat.id} className="text-center">
                      <div
                        className={getSeatClassName(seat)}
                        onClick={() => handleSeatClick(seat.id)}
                        title={`${seat.type} Seat - ₹${seat.price}`}
                      >
                        {renderSeatIcon(seat)}
                        {seat.isSelected && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 block">
                        ₹{seat.price}
                      </span>
                      {seat.isBooked && (
                        <span className="text-xs text-red-600 block truncate max-w-[48px]">
                          {seat.bookedBy}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex justify-between items-center text-sm">
            <div className="space-y-1">
              <div>Total Seats: {totalSeats}</div>
              <div className="text-green-600 font-medium">
                Available: {availableSeats - selectedSeats.length}
              </div>
            </div>
            
            {selectedSeats.length > 0 && (
              <div className="text-right">
                <div className="font-medium">Selected: {selectedSeats.length} seat(s)</div>
                <div className="text-lg font-bold text-primary">
                  Total: ₹{totalPrice}
                </div>
              </div>
            )}
          </div>
          
          {selectedSeats.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <div className="text-xs text-blue-800">
                <strong>Selected Seats:</strong> {selectedSeats.join(', ')}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Breakdown: {selectedSeats.map(seatId => {
                  const seat = seats.find(s => s.id === seatId);
                  return `${seatId} (₹${seat?.price})`;
                }).join(', ')}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};