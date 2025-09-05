// /src/components/RideSearchBooking.tsx
// Fixed version with correct status field and all imports

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DynamicSeatBooking } from '@/components/DynamicSeatBooking';
import { Search, MapPin, Clock, IndianRupee, Users, Car } from 'lucide-react';

interface RideSearchResult {
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
  driver_name: string;
  driver_rating: number | null;
  car_model: string;
  car_type: string;
}

interface RideSearchBookingProps {
  userId: string;
}

export const RideSearchBooking: React.FC<RideSearchBookingProps> = ({ userId }) => {
  const { toast } = useToast();
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchResults, setSearchResults] = useState<RideSearchResult[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // ✅ FIXED: Updated searchRides function with correct status field
  // ✅ FIXED: searchRides with correct status field
const searchRides = async () => {
  if (!fromLocation || !toLocation || !searchDate) {
    toast({
      title: 'Missing Information',
      description: 'Please fill in all search fields',
      variant: 'destructive',
    });
    return;
  }

  setSearching(true);
  
  try {
    // Fix: Use explicit foreign key relationship name
    const { data: rides, error } = await supabase
      .from('rides')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          average_rating
        ),
        vehicles!rides_vehicle_id_fkey (
          car_model,
          car_type
        )
      `)
      .ilike('from_city', `%${fromLocation}%`)
      .ilike('to_city', `%${toLocation}%`)
      .eq('departure_date', searchDate)
      .eq('status', 'active') // Use correct status field
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true });

    if (error) throw error;

    const results: RideSearchResult[] = rides.map(ride => ({
      id: ride.id,
      from_city: ride.from_city,
      to_city: ride.to_city,
      departure_date: ride.departure_date,
      departure_time: ride.departure_time,
      price_per_seat: ride.price_per_seat,
      available_seats: ride.available_seats,
      total_seats: ride.total_seats,
      base_price: ride.base_price,
      vehicle_type: ride.vehicle_type,
      driver_name: ride.profiles?.full_name || 'Unknown Driver',
      driver_rating: ride.profiles?.average_rating || 4.5,
      car_model: ride.vehicles?.car_model || 'Car',
      car_type: ride.vehicles?.car_type || 'Standard'
    }));

    setSearchResults(results);
    
    if (results.length === 0) {
      toast({
        title: 'No Rides Found',
        description: 'No rides available for your search criteria',
      });
    }

  } catch (error) {
    console.error('Error searching rides:', error);
    toast({
      title: 'Search Error',
      description: 'Failed to search rides. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setSearching(false);
  }
};


  const handleBookingComplete = (bookingData: any) => {
    toast({
      title: 'Booking Successful!',
      description: 'Your seat has been confirmed. Check your bookings for details.',
    });
    
    // Refresh search results to update available seats
    if (searchResults.length > 0) {
      searchRides();
    }
    
    // Clear selected ride to go back to search results
    setSelectedRide(null);
  };

  if (selectedRide) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedRide(null)}
          >
            ← Back to Results
          </Button>
          <h2 className="text-xl font-semibold">Book Your Seat</h2>
        </div>
        
        <DynamicSeatBooking
          ride={selectedRide}
          userId={userId}
          onBookingComplete={handleBookingComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Your Ride
          </CardTitle>
          <CardDescription>
            Search for available rides and book your preferred seat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                placeholder="Departure city"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                placeholder="Destination city"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchRides}
                disabled={searching}
                className="w-full"
              >
                {searching ? 'Searching...' : 'Search Rides'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Rides ({searchResults.length})</h3>
          
          {searchResults.map((ride) => (
            <Card key={ride.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">
                        {ride.from_city} → {ride.to_city}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(`${ride.departure_date}T${ride.departure_time}`).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {ride.available_seats} of {ride.total_seats || 5} available
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        {ride.car_model} {ride.car_type}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Driver:</span>
                      <span className="font-medium">{ride.driver_name}</span>
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm text-gray-600 ml-1">
                          {ride.driver_rating?.toFixed(1) || '4.5'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-bold text-green-700 mb-2">
                      <IndianRupee className="h-4 w-4" />
                      {ride.base_price || ride.price_per_seat}
                      <span className="text-sm font-normal text-gray-600">base</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">
                        <div>Front: +₹100</div>
                        <div>Window: +₹50</div>
                      </div>
                      
                      <Button 
                        onClick={() => setSelectedRide(ride)}
                        size="sm"
                        disabled={ride.available_seats === 0}
                      >
                        {ride.available_seats === 0 ? 'Fully Booked' : 'Select Seat'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No results message */}
      {searchResults.length === 0 && fromLocation && toLocation && searchDate && !searching && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-600 mb-4">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No rides found for your search criteria</p>
              <p className="text-sm">Try different locations or dates</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};