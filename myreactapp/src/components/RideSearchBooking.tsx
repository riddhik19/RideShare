import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, MapPin, Calendar, Clock, Users, Star, Phone, Car, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedSeatVisualization } from '@/components/EnhancedSeatVisualization';
import { CitySearch } from '@/components/ui/city-search';

interface Ride {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  pickup_point: string;
  available_seats: number;
  total_seats: number;
  base_price: number;
  price_per_seat?: number;
  notes: string | null;
  created_at?: string;
  driver_id?: string;
  is_active?: boolean;
  status?: string;
  updated_at?: string;
  vehicles: {
    car_model: string | null;
    car_type: string | null;
    color: string | null;
  } | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
    avatar_url?: string | null;
    average_rating: number | null;
    total_ratings: number | null;
  };
  booked_seats?: Array<{
    seat_id: string;
    passenger_name: string;
  }>;
}

interface UserBooking {
  ride_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  selected_seats?: string[];
}

const RideSearchBooking: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    from_city: '',
    to_city: '',
    departure_date: '',
    min_seats: 1
  });
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [bookingForm, setBookingForm] = useState({
    passenger_name: '',
    passenger_phone: '',
    passenger_email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    passenger_notes: '',
    gender: '',
    age: '',
    selected_seats: [] as string[],
    total_price: 0
  });
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [userBookings, setUserBookings] = useState<UserBooking[]>([]);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [seatSelections, setSeatSelections] = useState<{[rideId: string]: {seats: string[], price: number}}>({});

  useEffect(() => {
    if (profile?.id) {
      fetchUserBookings();
    }
  }, [profile?.id]);

  useEffect(() => {
    searchRides();
  }, []);

  const fetchUserBookings = async () => {
    if (!profile?.id) {
      console.log('No profile ID available for booking fetch');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('ride_id, status, seats_booked')
        .eq('passenger_id', profile.id)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        console.error('Error fetching bookings:', error);
        setUserBookings([]);
        return;
      }
      
      const bookings: UserBooking[] = (data || []).map((booking: any) => ({
        ride_id: booking.ride_id,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
        selected_seats: []
      }));
      
      setUserBookings(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setUserBookings([]);
      toast({
        title: "Warning",
        description: "Could not load your booking history",
        variant: "destructive"
      });
    }
  };

  const fetchBookedSeats = async (rideId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          seats_booked,
          selected_seats,
          profiles:passenger_id (
            full_name
          )
        `)
        .eq('ride_id', rideId)
        .in('status', ['confirmed', 'pending']);

      if (error) {
        console.error('Error fetching booked seats:', error);
        return [];
      }

      const bookedSeats: Array<{ seat_id: string; passenger_name: string }> = [];
      
      (data || []).forEach((booking: any, index: number) => {
        const seatsBooked = booking.seats_booked || 1;
        const passengerName = booking.profiles?.full_name || 'Anonymous';
        const selectedSeats = booking.selected_seats || [];
        
        if (selectedSeats.length > 0) {
          // Use actual selected seats if available
          selectedSeats.forEach((seatId: string) => {
            bookedSeats.push({
              seat_id: seatId,
              passenger_name: passengerName
            });
          });
        } else {
          // Fallback: generate seat IDs based on seats_booked
          for (let i = 0; i < seatsBooked; i++) {
            bookedSeats.push({
              seat_id: `R${Math.floor(index / 2) + 1}_${(index % 2) + 1}`,
              passenger_name: passengerName
            });
          }
        }
      });

      return bookedSeats;
    } catch (error) {
      console.error('Error fetching booked seats:', error);
      return [];
    }
  };

  const searchRides = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('rides')
        .select(`
          *,
          vehicles (
            car_model,
            car_type,
            color
          ),
          profiles:driver_id (
            full_name,
            phone,
            avatar_url,
            average_rating,
            total_ratings
          )
        `)
        .eq('is_active', true)
        .gt('available_seats', 0)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true });

      if (searchFilters.from_city) {
        query = query.ilike('from_city', `%${searchFilters.from_city}%`);
      }
      if (searchFilters.to_city) {
        query = query.ilike('to_city', `%${searchFilters.to_city}%`);
      }
      if (searchFilters.departure_date) {
        query = query.eq('departure_date', searchFilters.departure_date);
      }
      if (searchFilters.min_seats > 1) {
        query = query.gte('available_seats', searchFilters.min_seats);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const ridesWithBookedSeats = await Promise.all(
        (data || []).map(async (ride: any) => {
          const bookedSeats = await fetchBookedSeats(ride.id);
          return {
            ...ride,
            base_price: ride.base_price || ride.price_per_seat || 100,
            total_seats: ride.total_seats || ride.available_seats || 4,
            booked_seats: bookedSeats
          };
        })
      );
      
      setRides(ridesWithBookedSeats);
    } catch (error) {
      console.error('Error searching rides:', error);
      toast({
        title: "Error",
        description: "Failed to search rides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeatSelection = (rideId: string, selectedSeats: string[], totalPrice: number) => {
    setSeatSelections(prev => ({
      ...prev,
      [rideId]: { seats: selectedSeats, price: totalPrice }
    }));
  };

  const openBookingDialog = (ride: Ride) => {
    setSelectedRide(ride);
    const selection = seatSelections[ride.id];
    if (selection) {
      setBookingForm(prev => ({
        ...prev,
        selected_seats: selection.seats,
        total_price: selection.price
      }));
    }
    setIsBookingDialogOpen(true);
  };

  const bookRide = async () => {
    if (!selectedRide || !profile) return;

    if (!bookingForm.gender || !bookingForm.age || !bookingForm.passenger_name || !bookingForm.passenger_phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required passenger details",
        variant: "destructive"
      });
      return;
    }

    const selectedSeats = seatSelections[selectedRide.id]?.seats || [];
    if (selectedSeats.length === 0) {
      toast({
        title: "No Seats Selected",
        description: "Please select at least one seat",
        variant: "destructive"
      });
      return;
    }

    const existingBooking = userBookings.find(booking => 
      booking.ride_id === selectedRide.id && 
      ['pending', 'confirmed'].includes(booking.status)
    );

    if (existingBooking) {
      toast({
        title: "Already Booked",
        description: "You have an active booking for this ride. Cancel it first to book again.",
        variant: "destructive"
      });
      return;
    }

    if (selectedSeats.length > selectedRide.available_seats) {
      toast({
        title: "Not Enough Seats",
        description: `Only ${selectedRide.available_seats} seat(s) available. Please select fewer seats.`,
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    try {
      // Update profile with gender and age
      await supabase
        .from('profiles')
        .update({
          gender: bookingForm.gender,
          age: parseInt(bookingForm.age)
        })
        .eq('id', profile.id);

      // Create booking with selected seats
      const bookingData: any = {
        ride_id: selectedRide.id,
        passenger_id: profile.id,
        seats_booked: selectedSeats.length,
        total_price: seatSelections[selectedRide.id]?.price || 0,
        passenger_notes: bookingForm.passenger_notes,
        status: 'pending',
        selected_seats: selectedSeats
      };

      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) {
        console.error('❌ Booking creation error:', error);
        throw error;
      }

      console.log('✅ Booking created successfully:', newBooking);

      // Update available seats
      const newAvailableSeats = selectedRide.available_seats - selectedSeats.length;
      await supabase
        .from('rides')
        .update({ available_seats: newAvailableSeats })
        .eq('id', selectedRide.id);

      const bookingReference = `RS${newBooking.id.substring(0, 8).toUpperCase()}`;
      
      toast({
        title: "Booking Successful!",
        description: `Your booking for ${selectedSeats.length} seat(s) has been submitted for approval. Reference: ${bookingReference}`
      });

      setIsBookingDialogOpen(false);
      setSelectedRide(null);
      setBookingForm({ 
        passenger_name: '',
        passenger_phone: '',
        passenger_email: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        passenger_notes: '', 
        gender: '', 
        age: '',
        selected_seats: [],
        total_price: 0
      });
      
      // Clear seat selection for this ride
      setSeatSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[selectedRide.id];
        return newSelections;
      });
      
      fetchUserBookings();
      searchRides();

    } catch (error) {
      console.error('Error booking ride:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to book the ride. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  const renderStars = (rating: number | null, totalRatings: number | null) => {
    if (!totalRatings || totalRatings === 0) return <span className="text-xs text-muted-foreground">No ratings</span>;
    
    const safeRating = rating || 0;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= safeRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {safeRating.toFixed(1)} ({totalRatings})
        </span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMinPriceForRide = (ride: Ride) => {
    return ride.base_price;
  };

  const getMaxPriceForRide = (ride: Ride) => {
    return ride.base_price + 100;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Search & Book Rides</h2>
        <p className="text-muted-foreground">
          Find and book city-to-city rides with verified drivers. Select your preferred seats!
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Rides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="from_city">From City</Label>
              <CitySearch
                placeholder="Search departure city..."
                value={searchFilters.from_city}
                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, from_city: value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="to_city">To City</Label>
              <CitySearch
                placeholder="Search destination city..."
                value={searchFilters.to_city}
                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, to_city: value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="departure_date">Date</Label>
              <Input
                id="departure_date"
                type="date"
                value={searchFilters.departure_date}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, departure_date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="min_seats">Min Seats</Label>
              <Input
                id="min_seats"
                type="number"
                min="1"
                max="8"
                value={searchFilters.min_seats}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, min_seats: parseInt(e.target.value) }))}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={searchRides} disabled={loading} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rides List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rides.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Rides Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search filters to find more rides.
              </p>
            </CardContent>
          </Card>
        ) : (
          rides.map((ride) => (
            <Card key={ride.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">
                        {ride.from_city} → {ride.to_city}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {ride.available_seats} seat{ride.available_seats !== 1 ? 's' : ''} left
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(ride.departure_date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {ride.departure_time}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {ride.pickup_point}
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        {ride.vehicles?.car_model || 'Vehicle info unavailable'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      ₹{getMinPriceForRide(ride)} - ₹{getMaxPriceForRide(ride)}
                    </div>
                    <div className="text-xs text-muted-foreground">per seat</div>
                  </div>
                </div>

                {/* Driver Information */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Driver Information
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {(ride.profiles.full_name || 'Unknown').charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{ride.profiles.full_name || 'Unknown Driver'}</p>
                        {renderStars(ride.profiles.average_rating, ride.profiles.total_ratings)}
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <p><span className="text-muted-foreground">Vehicle:</span> {ride.vehicles?.car_type || 'N/A'}</p>
                      <p><span className="text-muted-foreground">Color:</span> {ride.vehicles?.color || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {ride.notes && (
                    <div className="mt-3 p-2 bg-background rounded border-l-4 border-primary">
                      <p className="text-sm italic">"{ride.notes}"</p>
                    </div>
                  )}
                </div>

                {/* Enhanced Seat Layout - Now Visible in Search Results */}
                <div className="mb-6">
                  <EnhancedSeatVisualization
                    totalSeats={ride.total_seats}
                    availableSeats={ride.available_seats}
                    basePrice={ride.base_price}
                    vehicleType={ride.vehicles?.car_type || 'car'}
                    onSeatSelect={(selectedSeats, totalPrice) => handleSeatSelection(ride.id, selectedSeats, totalPrice)}
                    maxSelectableSeats={Math.min(4, ride.available_seats)}
                    bookedSeats={ride.booked_seats?.map(seat => ({
                      seatId: seat.seat_id,
                      passengerName: seat.passenger_name
                    })) || []}
                    isSelectable={true}
                    isDriverView={false}
                    showPricing={true}
                  />
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Contact available after booking</span>
                  </div>
                  
                  {(() => {
                    const existingBooking = userBookings.find(booking => 
                      booking.ride_id === ride.id && 
                      ['pending', 'confirmed'].includes(booking.status)
                    );
                    
                    const availableSeats = ride.available_seats;
                    const selectedSeats = seatSelections[ride.id]?.seats || [];
                    
                    if (existingBooking) {
                      return (
                        <Button variant="outline" disabled>
                          Already Booked
                        </Button>
                      );
                    }
                    
                    if (availableSeats === 0) {
                      return (
                        <Button variant="outline" disabled>
                          Fully Booked
                        </Button>
                      );
                    }
                    
                    return (
                      <Dialog open={isBookingDialogOpen && selectedRide?.id === ride.id} onOpenChange={(open) => {
                        if (!open) {
                          setIsBookingDialogOpen(false);
                          setSelectedRide(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            onClick={() => openBookingDialog(ride)}
                            disabled={selectedSeats.length === 0}
                            className={selectedSeats.length > 0 ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {selectedSeats.length === 0 
                              ? 'Select Seats First' 
                              : `Book ${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''} - ₹${seatSelections[ride.id]?.price || 0}`
                            }
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Complete Your Booking</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Trip Summary */}
                            <div className="bg-muted/50 rounded-lg p-4">
                              <h4 className="font-semibold mb-2">{ride.from_city} → {ride.to_city}</h4>
                              <div className="text-sm space-y-1">
                                <p><span className="text-muted-foreground">Date:</span> {formatDate(ride.departure_date)}</p>
                                <p><span className="text-muted-foreground">Time:</span> {ride.departure_time}</p>
                                <p><span className="text-muted-foreground">Pickup:</span> {ride.pickup_point}</p>
                                <p><span className="text-muted-foreground">Driver:</span> {ride.profiles.full_name || 'Unknown Driver'}</p>
                                <p><span className="text-muted-foreground">Selected Seats:</span> {selectedSeats.join(', ')}</p>
                                <p><span className="text-muted-foreground">Total Price:</span> ₹{seatSelections[ride.id]?.price || 0}</p>
                              </div>
                            </div>
                            
                            {/* Passenger Details Form */}
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-semibold text-sm text-muted-foreground">PASSENGER DETAILS</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="passenger_name">Full Name *</Label>
                                  <Input
                                    id="passenger_name"
                                    placeholder="Enter full name"
                                    value={bookingForm.passenger_name}
                                    onChange={(e) => setBookingForm(prev => ({ 
                                      ...prev, 
                                      passenger_name: e.target.value 
                                    }))}
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="passenger_phone">Phone Number *</Label>
                                  <Input
                                    id="passenger_phone"
                                    placeholder="Enter phone number"
                                    value={bookingForm.passenger_phone}
                                    onChange={(e) => setBookingForm(prev => ({ 
                                      ...prev, 
                                      passenger_phone: e.target.value 
                                    }))}
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label htmlFor="passenger_email">Email Address (Optional)</Label>
                                <Input
                                  id="passenger_email"
                                  type="email"
                                  placeholder="Enter email address"
                                  value={bookingForm.passenger_email}
                                  onChange={(e) => setBookingForm(prev => ({ 
                                    ...prev, 
                                    passenger_email: e.target.value 
                                  }))}
                                />
                              </div>
                            </div>
                            
                            {/* Personal Information */}
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-semibold text-sm text-muted-foreground">PERSONAL INFORMATION</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="gender">Gender *</Label>
                                  <Select 
                                    value={bookingForm.gender} 
                                    onValueChange={(value) => setBookingForm(prev => ({ ...prev, gender: value }))}
                                  >
                                    <SelectTrigger id="gender">
                                      <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="female">Female</SelectItem>
                                      <SelectItem value="male">Male</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor="age">Age *</Label>
                                  <Input
                                    id="age"
                                    type="number"
                                    min="18"
                                    max="100"
                                    placeholder="Your age"
                                    value={bookingForm.age}
                                    onChange={(e) => setBookingForm(prev => ({ 
                                      ...prev, 
                                      age: e.target.value 
                                    }))}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Emergency Contact */}
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-semibold text-sm text-muted-foreground">EMERGENCY CONTACT (Optional)</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                                  <Input
                                    id="emergency_contact_name"
                                    placeholder="Emergency contact name"
                                    value={bookingForm.emergency_contact_name}
                                    onChange={(e) => setBookingForm(prev => ({ 
                                      ...prev, 
                                      emergency_contact_name: e.target.value 
                                    }))}
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                                  <Input
                                    id="emergency_contact_phone"
                                    placeholder="Emergency contact phone"
                                    value={bookingForm.emergency_contact_phone}
                                    onChange={(e) => setBookingForm(prev => ({ 
                                      ...prev, 
                                      emergency_contact_phone: e.target.value 
                                    }))}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Notes */}
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-semibold text-sm text-muted-foreground">ADDITIONAL NOTES</h4>
                              
                              <div>
                                <Label htmlFor="passenger_notes">Additional Notes (Optional)</Label>
                                <Textarea
                                  id="passenger_notes"
                                  placeholder="Any special requests, dietary restrictions, or information for the driver..."
                                  value={bookingForm.passenger_notes}
                                  onChange={(e) => setBookingForm(prev => ({ 
                                    ...prev, 
                                    passenger_notes: e.target.value 
                                  }))}
                                />
                              </div>
                            </div>
                            
                            {/* Booking Terms & Conditions */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <h5 className="font-semibold text-amber-800 mb-2">Important Information</h5>
                              <ul className="text-sm text-amber-700 space-y-1">
                                <li>• Please arrive at pickup point 10 minutes before departure time</li>
                                <li>• Your booking will be confirmed by the driver</li>
                                <li>• Cancellation allowed up to 2 hours before departure</li>
                                <li>• Driver contact details will be shared after confirmation</li>
                              </ul>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                              <Button 
                                variant="outline" 
                                onClick={() => setIsBookingDialogOpen(false)}
                                disabled={booking}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={bookRide} 
                                disabled={booking || selectedSeats.length === 0}
                                className="flex-2 min-w-[200px]"
                              >
                                {booking ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Booking...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>Confirm Booking</span>
                                    <span className="bg-white/20 px-2 py-1 rounded text-sm">
                                      ₹{seatSelections[ride.id]?.price || 0}
                                    </span>
                                  </div>
                                )}
                              </Button>
                            </div>
                            
                            {/* Help Text */}
                            <div className="text-center text-xs text-muted-foreground border-t pt-4">
                              <p>Need help? Contact support at support@rideshare.com</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Filters */}
      {rides.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Quick Filters:</h4>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchFilters(prev => ({ ...prev, min_seats: 1 }))}
                  className={searchFilters.min_seats === 1 ? 'bg-primary text-white' : ''}
                >
                  Any Seats
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchFilters(prev => ({ ...prev, min_seats: 2 }))}
                  className={searchFilters.min_seats === 2 ? 'bg-primary text-white' : ''}
                >
                  2+ Seats
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchFilters(prev => ({ ...prev, min_seats: 4 }))}
                  className={searchFilters.min_seats === 4 ? 'bg-primary text-white' : ''}
                >
                  4+ Seats
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchFilters({
                      from_city: '',
                      to_city: '',
                      departure_date: '',
                      min_seats: 1
                    });
                    searchRides();
                  }}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button for Quick Search (Mobile Friendly) */}
      {rides.length > 5 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="rounded-full w-12 h-12 shadow-lg"
            size="sm"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RideSearchBooking;