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
import { SafetyTransferNotification } from '@/components/SafetyTransferNotification';
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
  base_price: number;
  price_per_seat?: number;
  notes: string | null;
  created_at?: string;
  driver_id?: string;
  is_active?: boolean;
  status?: string;
  updated_at?: string;
  total_seats?: number;
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

interface BookingData {
  ride_id: string;
  status: string;
  selected_seats?: string[];
  profiles?: {
    full_name: string;
  };
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
  const [transferRequest, setTransferRequest] = useState<any>(null);
  const [showTransferNotification, setShowTransferNotification] = useState(false);
  const [userBookings, setUserBookings] = useState<UserBooking[]>([]);

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
      // First try to fetch without selected_seats
      const { data, error } = await supabase
        .from('bookings')
        .select('ride_id, status')
        .eq('passenger_id', profile.id)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        throw error;
      }
      
      const bookings = (data || []).map(booking => ({
        ride_id: booking.ride_id,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
        selected_seats: [] // Initialize as empty array
      }));
      
      setUserBookings(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your bookings",
        variant: "destructive"
      });
    }
  };

  const fetchBookedSeats = async (rideId: string) => {
    try {
      // Try to fetch booked seats with a simpler query
      const { data, error } = await supabase
        .from('bookings')
        .select('passenger_id')
        .eq('ride_id', rideId)
        .in('status', ['confirmed', 'pending']);

      if (error) {
        throw error;
      }

      // For now, return empty array as we don't have seat selection implemented
      // You'll need to implement proper seat tracking in your database
      return [];
    } catch (error) {
      console.error('Error fetching booked seats:', error);
      return [];
    }
  };

  const convertBookedSeats = (bookedSeats: Array<{ seat_id: string; passenger_name: string }>) => {
    return bookedSeats.map(seat => ({
      seatId: seat.seat_id,
      passengerName: seat.passenger_name
    }));
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
            base_price: ride.price_per_seat || 100, // Use price_per_seat if base_price doesn't exist
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

  const handleSeatSelection = (selectedSeats: string[], totalPrice: number) => {
    setBookingForm(prev => ({
      ...prev,
      selected_seats: selectedSeats,
      total_price: totalPrice
    }));
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

    if (bookingForm.selected_seats.length === 0) {
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

    if (bookingForm.selected_seats.length > selectedRide.available_seats) {
      toast({
        title: "Not Enough Seats",
        description: `Only ${selectedRide.available_seats} seat(s) available. Please select fewer seats.`,
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    try {
      await supabase
        .from('profiles')
        .update({
          gender: bookingForm.gender,
          age: parseInt(bookingForm.age)
        })
        .eq('id', profile.id);

      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({
          ride_id: selectedRide.id,
          passenger_id: profile.id,
          seats_booked: bookingForm.selected_seats.length,
          total_price: bookingForm.total_price,
          passenger_notes: bookingForm.passenger_notes,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Booking creation error:', error);
        throw error;
      }

      console.log('✅ Booking created successfully:', newBooking);

      const newAvailableSeats = selectedRide.available_seats - bookingForm.selected_seats.length;
      await supabase
        .from('rides')
        .update({ available_seats: newAvailableSeats })
        .eq('id', selectedRide.id);

      if (bookingForm.gender === 'female') {
        try {
          const { data: transferData, error: transferError } = await supabase.functions.invoke('safety-transfer', {
            body: {
              bookingId: newBooking.id,
              passengerGender: bookingForm.gender,
              passengerAge: parseInt(bookingForm.age),
              routeFrom: selectedRide.from_city,
              routeTo: selectedRide.to_city,
              departureDate: selectedRide.departure_date,
              departureTime: selectedRide.departure_time,
              preferredSeat: bookingForm.selected_seats[0],
              originalVehicleBrand: selectedRide.vehicles?.car_type,
              originalVehicleSegment: selectedRide.vehicles?.car_type
            }
          });

          if (transferData?.transferRequest) {
            setTransferRequest(transferData.transferRequest);
            setShowTransferNotification(true);
          }
        } catch (transferError) {
          console.log('No suitable transfer found or transfer service unavailable');
        }
      }

      const bookingReference = `RS${newBooking.id.substring(0, 8).toUpperCase()}`;
      
      const emailPromises = [
        supabase.functions.invoke('send-booking-confirmation', {
          body: {
            type: 'passenger',
            booking: {
              id: newBooking.id,
              booking_reference: bookingReference,
              passenger_name: profile.full_name || bookingForm.passenger_name,
              passenger_email: profile.email || bookingForm.passenger_email,
              passenger_phone: profile.phone || bookingForm.passenger_phone,
              driver_name: selectedRide.profiles.full_name || 'Unknown Driver',
              driver_email: 'driver@rideshare.com',
              driver_phone: selectedRide.profiles.phone || '',
              driver_rating: selectedRide.profiles.average_rating || 0,
              vehicle_details: {
                make: selectedRide.vehicles?.car_model?.split(' ')[0] || 'Unknown',
                model: selectedRide.vehicles?.car_model?.split(' ').slice(1).join(' ') || 'Vehicle',
                color: selectedRide.vehicles?.color || 'Unknown',
                license_plate: 'XX-XX-XXXX',
                type: selectedRide.vehicles?.car_type || 'Standard'
              },
              trip_details: {
                from_city: selectedRide.from_city,
                to_city: selectedRide.to_city,
                pickup_location: selectedRide.pickup_point,
                departure_date: selectedRide.departure_date,
                departure_time: selectedRide.departure_time,
                estimated_duration: '2-3 hours',
                fare_breakdown: {
                  base_fare: bookingForm.total_price * 0.9,
                  taxes: bookingForm.total_price * 0.1,
                  total: bookingForm.total_price
                }
              },
              seats_booked: bookingForm.selected_seats.length,
              passenger_rating: 0
            }
          }
        }),
        
        supabase.functions.invoke('send-booking-confirmation', {
          body: {
            type: 'driver',
            booking: {
              id: newBooking.id,
              booking_reference: bookingReference,
              passenger_name: profile.full_name || bookingForm.passenger_name,
              passenger_email: profile.email || bookingForm.passenger_email,
              passenger_phone: profile.phone || bookingForm.passenger_phone,
              driver_name: selectedRide.profiles.full_name || 'Unknown Driver',
              driver_email: 'driver@rideshare.com',
              driver_phone: selectedRide.profiles.phone || '',
              driver_rating: selectedRide.profiles.average_rating || 0,
              vehicle_details: {
                make: selectedRide.vehicles?.car_model?.split(' ')[0] || 'Unknown',
                model: selectedRide.vehicles?.car_model?.split(' ').slice(1).join(' ') || 'Vehicle',
                color: selectedRide.vehicles?.color || 'Unknown',
                license_plate: 'XX-XX-XXXX',
                type: selectedRide.vehicles?.car_type || 'Standard'
              },
              trip_details: {
                from_city: selectedRide.from_city,
                to_city: selectedRide.to_city,
                pickup_location: selectedRide.pickup_point,
                departure_date: selectedRide.departure_date,
                departure_time: selectedRide.departure_time,
                estimated_duration: '2-3 hours',
                fare_breakdown: {
                  base_fare: bookingForm.total_price * 0.9,
                  taxes: bookingForm.total_price * 0.1,
                  total: bookingForm.total_price
                }
              },
              seats_booked: bookingForm.selected_seats.length,
              passenger_rating: 0
            }
          }
        })
      ];

      const smsPromises = [];
      
      if (bookingForm.passenger_phone) {
        smsPromises.push(
          supabase.functions.invoke('send-sms-notification', {
            body: {
              to: bookingForm.passenger_phone,
              message: `🚗 Booking Confirmed! Trip: ${selectedRide.from_city} to ${selectedRide.to_city} on ${formatDate(selectedRide.departure_date)} at ${selectedRide.departure_time}. Seats: ${bookingForm.selected_seats.join(', ')}. Ref: ${bookingReference}`,
              type: 'booking_confirmation'
            }
          })
        );
      }
      
      if (selectedRide.profiles?.phone) {
        smsPromises.push(
          supabase.functions.invoke('send-sms-notification', {
            body: {
              to: selectedRide.profiles.phone,
              message: `🚗 New Booking Alert! ${bookingForm.passenger_name} booked seats ${bookingForm.selected_seats.join(', ')} for ${selectedRide.from_city} to ${selectedRide.to_city} on ${formatDate(selectedRide.departure_date)}. Ref: ${bookingReference}`,
              type: 'booking_confirmation'
            }
          })
        );
      }

      const allPromises = [...emailPromises, ...smsPromises];
      Promise.allSettled(allPromises).then(results => {
        results.forEach((result, index) => {
          if (index < emailPromises.length) {
            const emailType = index === 0 ? 'passenger' : 'driver';
            if (result.status === 'fulfilled') {
              console.log(`✅ ${emailType} email sent successfully:`, result.value);
            } else {
              console.error(`❌ ${emailType} email failed:`, result.reason);
            }
          } else {
            const smsIndex = index - emailPromises.length;
            const smsType = bookingForm.passenger_phone && smsIndex === 0 ? 'passenger' : 'driver';
            if (result.status === 'fulfilled') {
              console.log(`📱 ${smsType} SMS sent successfully:`, result.value);
            } else {
              console.error(`❌ ${smsType} SMS failed:`, result.reason);
            }
          }
        });
        
        const description = smsPromises.length > 0 
          ? `Your booking for seats ${bookingForm.selected_seats.join(', ')} has been submitted for approval. Confirmation emails and SMS sent!`
          : `Your booking for seats ${bookingForm.selected_seats.join(', ')} has been submitted for approval. Confirmation emails sent!`;
          
        toast({
          title: "Booking Successful!",
          description
        });
      });

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

  const handleTransferResponse = (response: 'accepted' | 'declined') => {
    setShowTransferNotification(false);
    setTransferRequest(null);
    
    if (response === 'accepted') {
      searchRides();
    }
  };

  const handleTransferExpire = () => {
    setShowTransferNotification(false);
    setTransferRequest(null);
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
      {showTransferNotification && transferRequest && (
        <SafetyTransferNotification
          transferRequest={transferRequest}
          onResponse={handleTransferResponse}
          onExpire={handleTransferExpire}
        />
      )}
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Search & Book Rides</h2>
        <p className="text-muted-foreground">
          Find and book city-to-city rides with verified drivers
        </p>
      </div>

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

                <EnhancedSeatVisualization
                  totalSeats={4}
                  availableSeats={ride.available_seats}
                  basePrice={ride.base_price}
                  vehicleType={ride.vehicles?.car_type || 'car'}
                  bookedSeats={convertBookedSeats(ride.booked_seats || [])}
                  isSelectable={false}
                  isDriverView={false}
                />

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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            onClick={() => setSelectedRide(ride)}
                            disabled={ride.available_seats === 0}
                          >
                            {ride.available_seats === 0 ? 'Fully Booked' : 'Book Now'}
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Book Your Ride</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            <div className="bg-muted/50 rounded-lg p-4">
                              <h4 className="font-semibold mb-2">{ride.from_city} → {ride.to_city}</h4>
                              <div className="text-sm space-y-1">
                                <p><span className="text-muted-foreground">Date:</span> {formatDate(ride.departure_date)}</p>
                                <p><span className="text-muted-foreground">Time:</span> {ride.departure_time}</p>
                                <p><span className="text-muted-foreground">Pickup:</span> {ride.pickup_point}</p>
                                <p><span className="text-muted-foreground">Driver:</span> {ride.profiles.full_name || 'Unknown Driver'}</p>
                              </div>
                            </div>
                            
                            <EnhancedSeatVisualization
                              totalSeats={4}
                              availableSeats={ride.available_seats}
                              basePrice={ride.base_price}
                              vehicleType={ride.vehicles?.car_type || 'car'}
                              onSeatSelect={handleSeatSelection}
                              maxSelectableSeats={Math.min(3, ride.available_seats)}
                              bookedSeats={convertBookedSeats(ride.booked_seats || [])}
                              isSelectable={true}
                              isDriverView={false}
                            />
                            
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
                              <h4 className="font-semibold text-sm text-muted-foreground">EMERGENCY CONTACT</h4>
                              
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
                            
                            {/* Travel Notes */}
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
                            
                            {/* Total Amount */}
                            {bookingForm.total_price > 0 && (
                              <div className="bg-primary/10 rounded-lg p-4 border-t pt-4">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold">Total Amount:</span>
                                  <span className="text-2xl font-bold text-primary">
                                    ₹{bookingForm.total_price}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {bookingForm.selected_seats.length} seat(s): {bookingForm.selected_seats.join(', ')}
                                </p>
                              </div>
                            )}
                            
                            <Button 
                              onClick={bookRide} 
                              disabled={booking || bookingForm.selected_seats.length === 0}
                              className="w-full"
                            >
                              {booking ? 'Booking...' : 'Confirm Booking'}
                            </Button>
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
    </div>
  );
};

export default RideSearchBooking;