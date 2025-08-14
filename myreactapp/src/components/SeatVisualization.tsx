import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, UserCheck } from 'lucide-react';

interface SeatVisualizationProps {
  totalSeats: number;
  availableSeats: number;
  vehicleType?: string;
}

export const SeatVisualization: React.FC<SeatVisualizationProps> = ({ 
  totalSeats, 
  availableSeats, 
  vehicleType = 'car' 
}) => {
  const bookedSeats = totalSeats - availableSeats;
  
  // Create seat layout based on vehicle type
  const getSeatLayout = () => {
    const seats = [];
    
    if (vehicleType.toLowerCase().includes('suv') || totalSeats > 6) {
      // SUV layout: 2-3-2 or similar
      const rows = Math.ceil(totalSeats / 3);
      for (let row = 0; row < rows; row++) {
        const seatsInRow = Math.min(3, totalSeats - row * 3);
        seats.push(seatsInRow);
      }
    } else {
      // Car layout: 2-2 or 2-3
      const rows = Math.ceil(totalSeats / 2);
      for (let row = 0; row < rows; row++) {
        const seatsInRow = Math.min(2, totalSeats - row * 2);
        seats.push(seatsInRow);
      }
    }
    
    return seats;
  };

  const seatLayout = getSeatLayout();
  let seatIndex = 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Seat Availability</h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Booked</span>
          </div>
        </div>
      </div>
      
      <Card className="p-4 bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="space-y-2">
          {/* Driver seat */}
          <div className="flex justify-center mb-3">
            <div className="w-8 h-6 bg-gray-200 border border-gray-400 rounded-t-lg flex items-center justify-center">
              <User className="h-3 w-3 text-gray-600" />
            </div>
          </div>
          
          {/* Passenger seats */}
          {seatLayout.map((seatsInRow, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-2">
              {Array.from({ length: seatsInRow }, (_, seatInRowIndex) => {
                const currentSeatIndex = seatIndex++;
                const isBooked = currentSeatIndex < bookedSeats;
                
                return (
                  <div
                    key={seatInRowIndex}
                    className={`w-8 h-6 border rounded flex items-center justify-center transition-colors ${
                      isBooked
                        ? 'bg-red-100 border-red-300 text-red-600'
                        : 'bg-green-100 border-green-300 text-green-600'
                    }`}
                    title={`Seat ${currentSeatIndex + 1} - ${isBooked ? 'Booked' : 'Available'}`}
                  >
                    {isBooked ? (
                      <UserCheck className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-2 border-t border-blue-200">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total: {totalSeats} seats</span>
            <span className="text-green-600 font-medium">
              {availableSeats} available
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};