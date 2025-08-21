import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, UserCheck, Car, Settings, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SeatInfo {
  id: string;
  type: 'front' | 'window' | 'middle' | 'driver';
  isBooked: boolean;
  isSelected: boolean;
  bookedBy?: string;
  price: number;
  row: number;
  position: number;
}

interface BookedSeat {
  seatId: string;
  passengerName: string;
}

interface EnhancedSeatVisualizationProps {
  totalSeats: number;
  availableSeats: number;
  basePrice: number;
  vehicleType?: string;
  onSeatSelect?: (selectedSeats: string[], totalPrice: number) => void;
  maxSelectableSeats?: number;
  bookedSeats?: BookedSeat[];
  isSelectable?: boolean;
  isDriverView?: boolean;
  showPricing?: boolean;
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
  isDriverView = false,
  showPricing = true
}) => {
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

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
        price: 0,
        row: 0,
        position: 0
      });

      // Add front passenger seat
      seatLayout.push({
        id: 'F1',
        type: 'front',
        isBooked: false,
        isSelected: false,
        price: seatPricing.front,
        row: 0,
        position: 1
      });

      // Generate rear seats based on total seats
      const rearSeats = totalSeats - 1; // Excluding front passenger seat
      let seatCounter = 1;

      if (totalSeats <= 4) {
        // Small car: 1 front + 2-3 rear seats in one row
        for (let i = 0; i < rearSeats; i++) {
          const seatId = `R1_${i + 1}`;
          const seatType = (i === 0 || i === 2) ? 'window' : 'middle';
          seatLayout.push({
            id: seatId,
            type: seatType,
            isBooked: false,
            isSelected: false,
            price: seatPricing[seatType],
            row: 1,
            position: i
          });
        }
      } else if (totalSeats <= 7) {
        // Medium car/SUV: 1 front + multiple rear seats in 2 rows
        const firstRowSeats = Math.min(3, rearSeats);
        const secondRowSeats = rearSeats - firstRowSeats;

        // First rear row
        for (let i = 0; i < firstRowSeats; i++) {
          const seatId = `R1_${i + 1}`;
          const seatType = (i === 0 || i === 2) ? 'window' : 'middle';
          seatLayout.push({
            id: seatId,
            type: seatType,
            isBooked: false,
            isSelected: false,
            price: seatPricing[seatType],
            row: 1,
            position: i
          });
        }

        // Second rear row
        for (let i = 0; i < secondRowSeats; i++) {
          const seatId = `R2_${i + 1}`;
          const seatType = (i === 0 || i === 1) ? 'window' : 'middle';
          seatLayout.push({
            id: seatId,
            type: seatType,
            isBooked: false,
            isSelected: false,
            price: seatPricing[seatType],
            row: 2,
            position: i
          });
        }
      } else {
        // Large vehicle: Multiple rows
        const rows = Math.ceil(rearSeats / 3);
        
        for (let row = 0; row < rows; row++) {
          const seatsInThisRow = Math.min(3, rearSeats - (row * 3));
          
          for (let seat = 0; seat < seatsInThisRow; seat++) {
            const seatId = `R${row + 1}_${seat + 1}`;
            const seatType = (seat === 0 || seat === 2) ? 'window' : 'middle';
            seatLayout.push({
              id: seatId,
              type: seatType,
              isBooked: false,
              isSelected: false,
              price: seatPricing[seatType],
              row: row + 1,
              position: seat
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
    setSelectedSeats([]); // Reset selection when seats change
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
        // Replace the oldest selection with new one
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
    const baseClasses = "relative w-12 h-12 border-2 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer transform hover:scale-105 font-medium text-xs";
    
    if (seat.type === 'driver') {
      return `${baseClasses} bg-gray-800 border-gray-700 text-white cursor-not-allowed hover:scale-100`;
    }
    
    if (seat.isBooked) {
      return `${baseClasses} bg-red-100 border-red-400 text-red-700 cursor-not-allowed hover:scale-100 opacity-75`;
    }
    
    if (seat.isSelected) {
      return `${baseClasses} bg-blue-500 border-blue-600 text-white shadow-lg ring-2 ring-blue-300`;
    }
    
    // Available seats with type-based styling
    const typeColors = {
      front: 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100 hover:border-purple-400',
      window: 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100 hover:border-green-400',
      middle: 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400',
      driver: ''
    };
    
    return `${baseClasses} ${typeColors[seat.type]} ${!isSelectable || isDriverView ? 'cursor-not-allowed hover:scale-100' : ''}`;
  };

  const renderSeatIcon = (seat: SeatInfo) => {
    if (seat.type === 'driver') {
      return <Settings className="h-6 w-6" />;
    }
    
    if (seat.isBooked) {
      return <UserCheck className="h-5 w-5" />;
    }
    
    if (seat.isSelected) {
      return <User className="h-5 w-5" />;
    }
    
    return <User className="h-4 w-4 opacity-60" />;
  };

  const getSeatTooltipContent = (seat: SeatInfo) => {
    if (seat.type === 'driver') {
      return "Driver Seat";
    }
    
    if (seat.isBooked) {
      return `Booked by ${seat.bookedBy}`;
    }
    
    const seatTypeNames = {
      front: 'Front Seat',
      window: 'Window Seat',
      middle: 'Middle Seat',
      driver: 'Driver Seat'
    };
    
    return (
      <div className="text-center">
        <div className="font-semibold">{seatTypeNames[seat.type]}</div>
        <div className="text-lg font-bold text-green-400">₹{seat.price}</div>
        {seat.type === 'front' && <div className="text-xs">Premium (+₹100)</div>}
        {seat.type === 'window' && <div className="text-xs">Window (+₹50)</div>}
        {seat.type === 'middle' && <div className="text-xs">Standard</div>}
      </div>
    );
  };

  const groupSeatsByRow = () => {
    const rows: { [key: number]: SeatInfo[] } = {};
    
    seats.forEach(seat => {
      if (!rows[seat.row]) {
        rows[seat.row] = [];
      }
      rows[seat.row].push(seat);
    });
    
    // Sort seats within each row by position
    Object.keys(rows).forEach(rowKey => {
      rows[parseInt(rowKey)].sort((a, b) => a.position - b.position);
    });
    
    return rows;
  };

  const seatRows = groupSeatsByRow();
  const totalPrice = selectedSeats.reduce((total, seatId) => {
    const seat = seats.find(s => s.id === seatId);
    return total + (seat?.price || 0);
  }, 0);

  const getRowLabel = (rowNumber: number) => {
    if (rowNumber === 0) return "Front";
    return `Row ${rowNumber}`;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Legend */}
        {showPricing && (
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Select Your Seats</h4>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-purple-100 border-2 border-purple-300 rounded"></div>
                <span>Front (+₹100)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                <span>Window (+₹50)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
                <span>Standard</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                <span>Booked</span>
              </div>
            </div>
          </div>
        )}
        
        <Card className="p-6 bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200">
          {/* Vehicle visualization */}
          <div className="relative bg-white rounded-xl border-3 border-gray-400 p-6 shadow-inner min-h-[300px]">
            {/* Dashboard indicator */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
              🚗 Front of Vehicle
            </div>
            
            <div className="space-y-6 mt-8">
              {Object.keys(seatRows)
                .map(Number)
                .sort((a, b) => a - b)
                .map((rowNumber) => (
                  <div key={rowNumber} className="space-y-2">
                    <div className="text-xs font-medium text-gray-600 text-center">
                      {getRowLabel(rowNumber)}
                    </div>
                    
                    <div className={`flex justify-center gap-3 ${rowNumber === 0 ? 'mb-8' : ''}`}>
                      {seatRows[rowNumber].map((seat) => (
                        <Tooltip key={seat.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={getSeatClassName(seat)}
                              onClick={() => handleSeatClick(seat.id)}
                              onMouseEnter={() => setHoveredSeat(seat.id)}
                              onMouseLeave={() => setHoveredSeat(null)}
                            >
                              {renderSeatIcon(seat)}
                              
                              {/* Selection indicator */}
                              {seat.isSelected && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
                              )}
                              
                              {/* Seat ID */}
                              <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                                {seat.id !== 'driver' ? seat.id : 'D'}
                              </div>
                              
                              {/* Price on hover */}
                              {hoveredSeat === seat.id && seat.type !== 'driver' && !seat.isBooked && (
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs font-bold z-10">
                                  ₹{seat.price}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {getSeatTooltipContent(seat)}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Summary Section */}
          <div className="mt-6 pt-6 border-t border-blue-200">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Total Seats: <span className="text-blue-600">{totalSeats}</span>
                </div>
                <div className="text-sm font-medium text-green-600">
                  Available: {availableSeats - selectedSeats.length}
                </div>
                {bookedSeats.length > 0 && (
                  <div className="text-sm text-red-600">
                    Booked: {bookedSeats.length}
                  </div>
                )}
              </div>
              
              {selectedSeats.length > 0 && (
                <div className="text-right">
                  <div className="text-sm font-medium">
                    Selected: {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{totalPrice}
                  </div>
                </div>
              )}
            </div>
            
            {selectedSeats.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800 font-medium mb-2">
                  Selected Seats: {selectedSeats.join(', ')}
                </div>
                <div className="text-xs text-blue-600">
                  {selectedSeats.map(seatId => {
                    const seat = seats.find(s => s.id === seatId);
                    const seatTypeNames = {
                      front: 'Front',
                      window: 'Window',
                      middle: 'Standard',
                      driver: 'Driver'
                    };
                    return `${seatId} (${seatTypeNames[seat?.type || 'middle']} - ₹${seat?.price})`;
                  }).join(', ')}
                </div>
              </div>
            )}
            
            {!isSelectable && isDriverView && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800 text-sm">
                  <Info className="h-4 w-4" />
                  <span>This is how passengers will see your seat layout</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};