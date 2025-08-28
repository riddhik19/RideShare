export const calculateDynamicPrice = (basePrice: number, availableSeats: number, totalSeats: number, seatType: string): number => {
  // Demand multiplier based on availability
  const availability = availableSeats / totalSeats;
  let demandMultiplier = 1.0;
  
  if (availability < 0.3) demandMultiplier = 1.5; // High demand
  else if (availability < 0.6) demandMultiplier = 1.2; // Medium demand
  
  // Base price with seat type premium
  let price = basePrice;
  switch (seatType) {
    case 'front': price += 100; break;
    case 'window': price += 50; break;
    default: break;
  }
  
  return Math.round(price * demandMultiplier);
};