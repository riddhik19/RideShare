// /src/utils/seatLayoutUtils.ts
// Complete core utilities for seat management

// Types and interfaces
export interface Seat {
  id: string;
  type: 'driver' | 'front' | 'window' | 'middle' | 'premium' | 'economy';
  label: string;
  bookable: boolean;
  position?: string;
  row?: number;
  column?: number;
}

export interface SeatRow {
  type: 'front' | 'front-driver' | 'front-passenger' | 'middle' | 'back';
  seats: Seat[];
  rowIndex?: number;
}

export interface LayoutConfig {
  vehicleType: string;
  totalSeats: number;
  bookableSeats: number;
  rows: SeatRow[];
}

export interface VehicleType {
  id: string;
  name: string;
  total_seats: number;
  layout_config?: LayoutConfig;
}

export interface SeatPricing {
  [seatId: string]: number;
}

export interface BookedSeat {
  seatId: string;
  passengerId: string;
  bookedAt: string;
  price: number;
}

export interface PricingValidation {
  isValid: boolean;
  errors: string[];
}

export interface PricingStats {
  min: number;
  max: number;
  average: number;
  total: number;
  count: number;
}

// Core utility functions
export const getBookableSeats = (layout: LayoutConfig): Seat[] => {
  const bookableSeats: Seat[] = [];
  
  if (!layout || !layout.rows) {
    return bookableSeats;
  }
  
  layout.rows.forEach(row => {
    if (row.seats && Array.isArray(row.seats)) {
      row.seats.forEach(seat => {
        if (seat.bookable) {
          bookableSeats.push(seat);
        }
      });
    }
  });
  
  return bookableSeats;
};

export const applySmartPricing = (layout: LayoutConfig, basePrice: number): SeatPricing => {
  const pricing: SeatPricing = {};
  
  if (!layout || !layout.rows) {
    return pricing;
  }
  
  layout.rows.forEach(row => {
    if (row.seats && Array.isArray(row.seats)) {
      row.seats.forEach(seat => {
        if (seat.bookable) {
          switch (seat.type) {
            case 'premium':
              pricing[seat.id] = basePrice + 200;
              break;
            case 'front':
              pricing[seat.id] = basePrice + 100;
              break;
            case 'window':
              pricing[seat.id] = basePrice + 50;
              break;
            case 'middle':
              pricing[seat.id] = basePrice;
              break;
            case 'economy':
              pricing[seat.id] = Math.max(basePrice - 50, 100); // Minimum ₹100
              break;
            default:
              pricing[seat.id] = basePrice;
          }
        }
      });
    }
  });
  
  return pricing;
};

export const calculateTotalRevenue = (pricing: SeatPricing): number => {
  if (!pricing || typeof pricing !== 'object') {
    return 0;
  }
  
  return Object.values(pricing).reduce((total, price) => {
    return total + (typeof price === 'number' && !isNaN(price) ? price : 0);
  }, 0);
};

export const getSeatsByType = (layout: LayoutConfig, seatType: 'front' | 'window' | 'middle' | 'premium' | 'economy'): Seat[] => {
  const seats: Seat[] = [];
  
  if (!layout || !layout.rows) {
    return seats;
  }
  
  layout.rows.forEach(row => {
    if (row.seats && Array.isArray(row.seats)) {
      row.seats.forEach(seat => {
        if (seat.type === seatType) {
          seats.push(seat);
        }
      });
    }
  });
  
  return seats;
};

export const validateSeatPricing = (pricing: SeatPricing, layout: LayoutConfig): PricingValidation => {
  const errors: string[] = [];
  
  if (!layout || !layout.rows) {
    errors.push('Invalid layout configuration');
    return { isValid: false, errors };
  }
  
  if (!pricing || typeof pricing !== 'object') {
    errors.push('Invalid pricing configuration');
    return { isValid: false, errors };
  }
  
  const bookableSeats = getBookableSeats(layout);
  
  bookableSeats.forEach(seat => {
    const price = pricing[seat.id];
    
    if (!price || typeof price !== 'number' || isNaN(price)) {
      errors.push(`Seat ${seat.id} needs a valid price`);
    } else if (price <= 0) {
      errors.push(`Seat ${seat.id} price must be greater than 0`);
    } else if (price < 50) {
      errors.push(`Seat ${seat.id} price too low (minimum ₹50)`);
    } else if (price > 10000) {
      errors.push(`Seat ${seat.id} price too high (maximum ₹10,000)`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getPricingStats = (pricing: SeatPricing): PricingStats => {
  if (!pricing || typeof pricing !== 'object') {
    return { min: 0, max: 0, average: 0, total: 0, count: 0 };
  }
  
  const prices = Object.values(pricing).filter(price => 
    typeof price === 'number' && !isNaN(price) && price > 0
  );
  
  if (prices.length === 0) {
    return { min: 0, max: 0, average: 0, total: 0, count: 0 };
  }
  
  const total = prices.reduce((sum, price) => sum + price, 0);
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: total / prices.length,
    total,
    count: prices.length
  };
};

export const getSeatCssClass = (seat: Seat): string => {
  const baseClasses = 'border-2 transition-all duration-200';
  
  if (!seat) {
    return `${baseClasses} bg-gray-100 border-gray-300 text-gray-800`;
  }
  
  switch (seat.type) {
    case 'driver':
      return `${baseClasses} bg-gray-600 text-white border-gray-700`;
    case 'premium':
      return `${baseClasses} bg-yellow-100 border-yellow-400 text-yellow-900`;
    case 'front':
      return `${baseClasses} bg-purple-100 border-purple-300 text-purple-800`;
    case 'window':
      return `${baseClasses} bg-blue-100 border-blue-300 text-blue-800`;
    case 'middle':
      return `${baseClasses} bg-green-100 border-green-300 text-green-800`;
    case 'economy':
      return `${baseClasses} bg-gray-100 border-gray-400 text-gray-700`;
    default:
      return `${baseClasses} bg-gray-100 border-gray-300 text-gray-800`;
  }
};

export const getSeatTypeColor = (seatType: string): string => {
  switch (seatType) {
    case 'driver':
      return 'text-gray-700 bg-gray-100 border-gray-300';
    case 'premium':
      return 'text-yellow-800 bg-yellow-50 border-yellow-200';
    case 'front':
      return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'window':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'middle':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'economy':
      return 'text-gray-700 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

// Format layout for display (ensures proper structure)
export const formatSeatLayoutForDisplay = (layout: LayoutConfig): LayoutConfig => {
  if (!layout || !layout.rows) {
    return {
      vehicleType: 'Unknown',
      totalSeats: 0,
      bookableSeats: 0,
      rows: []
    };
  }
  
  const formattedRows = layout.rows.map((row, index) => ({
    ...row,
    rowIndex: index,
    seats: row.seats ? row.seats.map(seat => ({
      ...seat,
      row: seat.row ?? index,
      column: seat.column ?? 0
    })) : []
  }));
  
  return {
    ...layout,
    rows: formattedRows
  };
};

// Generate seat ID based on position and type
export const generateSeatId = (rowType: string, position: number, seatType?: string): string => {
  const prefix = rowType.charAt(0).toUpperCase();
  
  if (seatType === 'driver') {
    return 'D';
  }
  
  return `${prefix}${position}`;
};

// Calculate optimal pricing based on demand and seat type
export const calculateOptimalPricing = (
  layout: LayoutConfig, 
  basePrice: number, 
  demandMultiplier: number = 1.0
): SeatPricing => {
  const pricing: SeatPricing = {};
  
  if (!layout || !layout.rows) {
    return pricing;
  }
  
  layout.rows.forEach(row => {
    if (row.seats && Array.isArray(row.seats)) {
      row.seats.forEach(seat => {
        if (seat.bookable) {
          let price = basePrice;
          
          // Base pricing by seat type
          switch (seat.type) {
            case 'premium':
              price = basePrice + 200;
              break;
            case 'front':
              price = basePrice + 100;
              break;
            case 'window':
              price = basePrice + 50;
              break;
            case 'middle':
              price = basePrice;
              break;
            case 'economy':
              price = Math.max(basePrice - 50, 100);
              break;
            default:
              price = basePrice;
          }
          
          // Apply demand multiplier
          price = Math.round(price * demandMultiplier);
          
          // Ensure minimum price
          price = Math.max(price, 50);
          
          pricing[seat.id] = price;
        }
      });
    }
  });
  
  return pricing;
};

// Predefined layouts for different seat counts
export const getPredefinedLayouts = (totalSeats: number): LayoutConfig[] => {
  const layouts: LayoutConfig[] = [];
  
  switch (totalSeats) {
    case 2:
      // 2-seater (driver + 1 passenger)
      layouts.push({
        vehicleType: '2-Seater',
        totalSeats: 2,
        bookableSeats: 1,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          }
        ]
      });
      break;
      
    case 4:
      // 4-seater car
      layouts.push({
        vehicleType: '4-Seater',
        totalSeats: 4,
        bookableSeats: 3,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          },
          {
            type: 'back',
            seats: [
              { id: 'B1', type: 'window', label: 'Window', bookable: true, position: 'back-left' },
              { id: 'B2', type: 'window', label: 'Window', bookable: true, position: 'back-right' }
            ]
          }
        ]
      });
      break;
      
    case 5:
      // 5-seater car
      layouts.push({
        vehicleType: '5-Seater',
        totalSeats: 5,
        bookableSeats: 4,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          },
          {
            type: 'back',
            seats: [
              { id: 'B1', type: 'window', label: 'Window', bookable: true, position: 'back-left' },
              { id: 'B2', type: 'middle', label: 'Middle', bookable: true, position: 'back-center' },
              { id: 'B3', type: 'window', label: 'Window', bookable: true, position: 'back-right' }
            ]
          }
        ]
      });
      break;
      
    case 6:
      // 6-seater MPV
      layouts.push({
        vehicleType: '6-Seater MPV',
        totalSeats: 6,
        bookableSeats: 5,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          },
          {
            type: 'middle',
            seats: [
              { id: 'M1', type: 'window', label: 'Window', bookable: true, position: 'middle-left' },
              { id: 'M2', type: 'window', label: 'Window', bookable: true, position: 'middle-right' }
            ]
          },
          {
            type: 'back',
            seats: [
              { id: 'B1', type: 'window', label: 'Window', bookable: true, position: 'back-left' },
              { id: 'B2', type: 'window', label: 'Window', bookable: true, position: 'back-right' }
            ]
          }
        ]
      });
      break;
      
    case 7:
      // 7-seater SUV (2-2-3 configuration)
      layouts.push({
        vehicleType: '7-Seater SUV',
        totalSeats: 7,
        bookableSeats: 6,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          },
          {
            type: 'middle',
            seats: [
              { id: 'M1', type: 'window', label: 'Window', bookable: true, position: 'middle-left' },
              { id: 'M2', type: 'window', label: 'Window', bookable: true, position: 'middle-right' }
            ]
          },
          {
            type: 'back',
            seats: [
              { id: 'B1', type: 'window', label: 'Window', bookable: true, position: 'back-left' },
              { id: 'B2', type: 'middle', label: 'Middle', bookable: true, position: 'back-center' },
              { id: 'B3', type: 'window', label: 'Window', bookable: true, position: 'back-right' }
            ]
          }
        ]
      });
      
      // Alternative 7-seater layout (2-3-2 configuration)
      layouts.push({
        vehicleType: '7-Seater Van',
        totalSeats: 7,
        bookableSeats: 6,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          },
          {
            type: 'middle',
            seats: [
              { id: 'M1', type: 'window', label: 'Window', bookable: true, position: 'middle-left' },
              { id: 'M2', type: 'middle', label: 'Middle', bookable: true, position: 'middle-center' },
              { id: 'M3', type: 'window', label: 'Window', bookable: true, position: 'middle-right' }
            ]
          },
          {
            type: 'back',
            seats: [
              { id: 'B1', type: 'window', label: 'Window', bookable: true, position: 'back-left' },
              { id: 'B2', type: 'window', label: 'Window', bookable: true, position: 'back-right' }
            ]
          }
        ]
      });
      break;
      
    case 8:
      // 8-seater van
      layouts.push({
        vehicleType: '8-Seater Van',
        totalSeats: 8,
        bookableSeats: 7,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          },
          {
            type: 'middle',
            seats: [
              { id: 'M1', type: 'window', label: 'Window', bookable: true, position: 'middle-left' },
              { id: 'M2', type: 'middle', label: 'Middle', bookable: true, position: 'middle-center' },
              { id: 'M3', type: 'window', label: 'Window', bookable: true, position: 'middle-right' }
            ]
          },
          {
            type: 'back',
            seats: [
              { id: 'B1', type: 'window', label: 'Window', bookable: true, position: 'back-left' },
              { id: 'B2', type: 'middle', label: 'Middle', bookable: true, position: 'back-center' },
              { id: 'B3', type: 'window', label: 'Window', bookable: true, position: 'back-right' }
            ]
          }
        ]
      });
      break;
      
    case 9:
      // 9-seater tempo traveller (2-3-4 configuration)
      layouts.push({
        vehicleType: '9-Seater Tempo',
        totalSeats: 9,
        bookableSeats: 8,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          },
          {
            type: 'middle',
            seats: [
              { id: 'M1', type: 'window', label: 'Window', bookable: true, position: 'middle-left' },
              { id: 'M2', type: 'middle', label: 'Middle', bookable: true, position: 'middle-center' },
              { id: 'M3', type: 'window', label: 'Window', bookable: true, position: 'middle-right' }
            ]
          },
          {
            type: 'back',
            seats: [
              { id: 'B1', type: 'window', label: 'Window', bookable: true, position: 'back-left' },
              { id: 'B2', type: 'middle', label: 'Middle', bookable: true, position: 'back-left-center' },
              { id: 'B3', type: 'middle', label: 'Middle', bookable: true, position: 'back-right-center' },
              { id: 'B4', type: 'window', label: 'Window', bookable: true, position: 'back-right' }
            ]
          }
        ]
      });
      break;
      
    default:
      // Default layout for unknown configurations
      const bookableSeats = Math.max(1, totalSeats - 1); // Exclude driver
      layouts.push({
        vehicleType: `${totalSeats}-Seater`,
        totalSeats,
        bookableSeats,
        rows: [
          {
            type: 'front',
            seats: [
              { id: 'F1', type: 'front', label: 'Front', bookable: true, position: 'front-left' },
              { id: 'D', type: 'driver', label: 'Driver', bookable: false, position: 'front-right' }
            ]
          }
        ]
      });
  }
  
  return layouts;
};

// Helper function to get seat by ID
export const getSeatById = (layout: LayoutConfig, seatId: string): Seat | null => {
  if (!layout || !layout.rows) {
    return null;
  }
  
  for (const row of layout.rows) {
    if (row.seats && Array.isArray(row.seats)) {
      for (const seat of row.seats) {
        if (seat.id === seatId) {
          return seat;
        }
      }
    }
  }
  
  return null;
};

// Check if layout is valid
export const isValidLayout = (layout: LayoutConfig): boolean => {
  if (!layout || typeof layout !== 'object') {
    return false;
  }
  
  if (!layout.rows || !Array.isArray(layout.rows)) {
    return false;
  }
  
  if (layout.rows.length === 0) {
    return false;
  }
  
  // Check if all rows have valid seats
  for (const row of layout.rows) {
    if (!row.seats || !Array.isArray(row.seats)) {
      return false;
    }
    
    // Check if each seat has required properties
    for (const seat of row.seats) {
      if (!seat.id || typeof seat.id !== 'string') {
        return false;
      }
      
      if (!seat.type || typeof seat.type !== 'string') {
        return false;
      }
      
      if (typeof seat.bookable !== 'boolean') {
        return false;
      }
    }
  }
  
  return true;
};

// ---------------- Default Export ----------------
export default {
  getBookableSeats,
  applySmartPricing,
  calculateTotalRevenue,
  getSeatsByType,
  validateSeatPricing,
  getPricingStats,
  getSeatCssClass,
  getSeatTypeColor,
  formatSeatLayoutForDisplay,
  getPredefinedLayouts,
  generateSeatId,
  calculateOptimalPricing,
  getSeatById,
  isValidLayout,
};
