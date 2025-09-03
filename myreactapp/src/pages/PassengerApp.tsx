import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Search, MapPin, Calendar, Clock, Users, History, MessageSquare, Shield, Navigation, Star, Phone, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SupportChat from '@/components/SupportChat';
import TripHistory from '@/components/TripHistory';
import EmergencyContactsSOS from '@/components/EmergencyContactsSOS';
import LiveLocationSharing from '@/components/LiveLocationSharing';
import PassengerProfile from '@/components/PassengerProfile';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// Complete type definitions matching Supabase structure
interface DriverProfile {
  full_name: string | null;
  phone: string | null;
}

interface Vehicle {
  car_model: string | null;
  car_type: string | null;
  color: string | null;
}

// Updated Ride interface to match actual Supabase data structure
interface Ride {
  id: string;
  driver_id: string;
  vehicle_id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  pickup_point: string;
  available_seats: number;
  price_per_seat: number;
  base_price: number | null;
  total_seats: number | null;
  vehicle_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Optional joined data
  profiles?: DriverProfile | null;
  vehicles?: Vehicle | null;
}

interface BookingRide {
  from_city: string | null;
  to_city: string | null;
  departure_date: string;
  departure_time: string;
  pickup_point?: string | null;
  profiles?: DriverProfile | null;
}

interface Booking {
  id: string;
  bulk_booking_id: string | null;
  created_at: string;
  is_bulk_booking: boolean | null;
  notif_15min_sent: boolean | null;
  notif_15min_sent_at: string | null;
  notif_1hr_sent: boolean | null;
  seats_booked: number;
  status: string;
  total_price: number;
  ride_id: string;
  passenger_id: string;
  profiles?: DriverProfile | null;
  rides?: BookingRide | null;
}

// Helper function to safely cast Supabase data to Ride type
const mapToRide = (data: any): Ride => ({
  id: data.id,
  driver_id: data.driver_id,
  vehicle_id: data.vehicle_id,
  from_city: data.from_city,
  to_city: data.to_city,
  departure_date: data.departure_date,
  departure_time: data.departure_time,
  pickup_point: data.pickup_point,
  available_seats: data.available_seats,
  price_per_seat: data.price_per_seat,
  base_price: data.base_price ?? null,
  total_seats: data.total_seats ?? null,
  vehicle_type: data.vehicle_type ?? null,
  notes: data.notes,
  status: data.status,
  created_at: data.created_at,
  updated_at: data.updated_at,
  profiles: data.profiles || null,
  vehicles: data.vehicles || null,
});

// Helper function to safely cast Supabase data to Booking type
const mapToBooking = (data: any): Booking => ({
  id: data.id,
  bulk_booking_id: data.bulk_booking_id,
  created_at: data.created_at,
  is_bulk_booking: data.is_bulk_booking,
  notif_15min_sent: data.notif_15min_sent,
  notif_15min_sent_at: data.notif_15min_sent_at,
  notif_1hr_sent: data.notif_1hr_sent,
  seats_booked: data.seats_booked,
  status: data.status,
  total_price: data.total_price,
  ride_id: data.ride_id || '',
  passenger_id: data.passenger_id || '',
  profiles: data.profiles || null,
  rides: data.rides ? {
    from_city: data.rides.from_city || 'Unknown',
    to_city: data.rides.to_city || 'Unknown',
    departure_date: data.rides.departure_date || '',
    departure_time: data.rides.departure_time || '',
    pickup_point: data.rides.pickup_point || null,
    profiles: data.rides.profiles || null
  } : null
});

export const PassengerApp = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account"
      });
      
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [searchForm, setSearchForm] = useState({
    from: '',
    to: '',
    date: '',
    seats: 1
  });
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [bookingForm, setBookingForm] = useState({
    seats: 1,
    notes: ''
  });
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchAllRides();
    fetchMyBookings();
  }, []);

  // Fix 3: fetchAllRides - Use only the fallback approach
  // Replace fetchAllRides in PassengerApp.tsx (around line 150)
const fetchAllRides = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          phone,
          average_rating,
          total_ratings
        ),
        vehicles (
          car_model,
          car_type,
          color
        )
      `)
      .eq('status', 'active') // ✅ FIXED: Use status field
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .order('departure_date', { ascending: true });

    if (error) throw error;
    
    const typedRides = (data || []).map(mapToRide);
    setRides(typedRides);
    
  } catch (error) {
    console.error('Error fetching rides:', error);
    // Fallback logic remains the same...
  } finally {
    setLoading(false);
  }
};

  // Fix 1: fetchMyBookings - Remove complex joins
  const fetchMyBookings = async () => {
    console.log('DEBUG: Starting fetchMyBookings');
    console.log('Profile:', profile);
    console.log('Profile ID:', profile?.id);
    
    if (!profile?.id) {
      console.error('No profile ID available');
      return;
    }

    try {
      console.log('Attempting simple bookings query...');
      
      // Step 1: Get bookings (simple query)
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('passenger_id', profile.id)
        .order('created_at', { ascending: false });

      console.log('Bookings query result:', { bookingsData, error });

      if (error) {
        console.error('Bookings query failed:', error);
        throw error;
      }

      if (!bookingsData || bookingsData.length === 0) {
        console.log('No bookings found');
        setBookings([]);
        return;
      }

      console.log('Bookings fetched successfully:', bookingsData.length);

      // Step 2: Get ride details for each booking - FIXED TYPING
      const bookingsWithRides = await Promise.all(
        bookingsData.map(async (booking): Promise<Booking> => {
          const { data: rideData, error: rideError } = await supabase
            .from('rides')
            .select('from_city, to_city, departure_date, departure_time, pickup_point, driver_id')
            .eq('id', booking.ride_id)
            .single();

          if (rideError) {
            console.warn('Ride not found for booking:', booking.id);
            // Return properly typed booking with null rides
            return {
              id: booking.id,
              bulk_booking_id: booking.bulk_booking_id,
              created_at: booking.created_at,
              is_bulk_booking: booking.is_bulk_booking,
              notif_15min_sent: booking.notif_15min_sent,
              notif_15min_sent_at: booking.notif_15min_sent_at,
              notif_1hr_sent: booking.notif_1hr_sent,
              seats_booked: booking.seats_booked,
              status: booking.status,
              total_price: booking.total_price,
              ride_id: booking.ride_id,
              passenger_id: booking.passenger_id,
              profiles: null,
              rides: null
            };
          }

          // Step 3: Get driver profile
          let driverProfile: DriverProfile | null = null;
          if (rideData.driver_id) {
            const { data: driverData } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('id', rideData.driver_id)
              .single();
            driverProfile = driverData;
          }

          // Return properly typed booking
          return {
            id: booking.id,
            bulk_booking_id: booking.bulk_booking_id,
            created_at: booking.created_at,
            is_bulk_booking: booking.is_bulk_booking,
            notif_15min_sent: booking.notif_15min_sent,
            notif_15min_sent_at: booking.notif_15min_sent_at,
            notif_1hr_sent: booking.notif_1hr_sent,
            seats_booked: booking.seats_booked,
            status: booking.status,
            total_price: booking.total_price,
            ride_id: booking.ride_id,
            passenger_id: booking.passenger_id,
            profiles: null, // This goes at booking level, not rides level
            rides: {
              from_city: rideData.from_city || 'Unknown',
              to_city: rideData.to_city || 'Unknown',
              departure_date: rideData.departure_date || '',
              departure_time: rideData.departure_time || '',
              pickup_point: rideData.pickup_point || null,
              profiles: driverProfile
            }
          };
        })
      );

      console.log('Bookings with ride details:', bookingsWithRides.length);
      setBookings(bookingsWithRides);
      
    } catch (error) {
      console.error('fetchMyBookings catch block:', error);
      setBookings([]);
    }
  };

  // Fix 2: handleBookRide - Add comprehensive debugging
  const handleBookRide = async () => {
    console.log('Starting handleBookRide');
    console.log('Selected Ride:', selectedRide);
    console.log('Profile:', profile);
    console.log('Booking Form:', bookingForm);
    
    if (!selectedRide || !profile) {
      console.error('Missing selectedRide or profile');
      return;
    }
    
    setBookingLoading(true);
    
    try {
      const totalPrice = selectedRide.price_per_seat * bookingForm.seats;
      console.log('Total price calculated:', totalPrice);

      // Step 1: Verify ride still exists and is active
      const { data: currentRide, error: rideCheckError } = await supabase
        .from('rides')
        .select('id, available_seats, status')
        .eq('id', selectedRide.id)
        .single();

      console.log('Ride check result:', { currentRide, rideCheckError });

      if (rideCheckError || !currentRide) {
        throw new Error('Ride not found or no longer available');
      }

      if (currentRide.status !== 'active') {
        throw new Error('Ride is no longer active');
      }

      if (currentRide.available_seats < bookingForm.seats) {
        throw new Error(`Only ${currentRide.available_seats} seats available`);
      }

      // Step 2: Create the booking - FIXED TYPING
      const bookingData = {
        passenger_id: profile.id,
        ride_id: selectedRide.id,
        seats_booked: bookingForm.seats,
        total_price: totalPrice,
        passenger_notes: bookingForm.notes || null,
        status: 'confirmed' as const // Add 'as const' for proper typing
      };

      console.log('Booking data to insert:', bookingData);

      // FIXED: Remove .single() since insert returns array
      const { data: bookingResult, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();

      console.log('Booking insert result:', bookingResult);
      console.log('Booking insert error:', bookingError);

      if (bookingError) {
        throw new Error(`Booking failed: ${bookingError.message}`);
      }

      // Step 3: Update ride availability
      const { error: updateError } = await supabase
        .from('rides')
        .update({ 
          available_seats: currentRide.available_seats - bookingForm.seats,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRide.id);

      if (updateError) {
        console.error('Failed to update ride seats:', updateError);
        // Don't throw error here as booking was successful
      }

      console.log('Booking created successfully!');
      
      toast({
        title: "Booking Successful!",
        description: `Your booking for ${bookingForm.seats} seat(s) has been confirmed.`
      });
      
      setIsBookingDialogOpen(false);
      setBookingForm({ seats: 1, notes: '' });
      setSelectedRide(null);
      fetchMyBookings();
      fetchAllRides();
      
    } catch (error: any) {
      console.error('handleBookRide error:', error);
      
      toast({
        title: "Booking Failed",
        description: error?.message || "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setBookingLoading(false);
    }
  };

  // Replace handleSearch in PassengerApp.tsx (around line 220)
const handleSearch = async () => {
  setLoading(true);
  try {
    let query = supabase
      .from('rides')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          phone,
          average_rating,
          total_ratings
        ),
        vehicles (
          car_model,
          car_type,
          color
        )
      `)
      .eq('status', 'active') // ✅ FIXED: Use status field
      .gte('departure_date', new Date().toISOString().split('T')[0]);

    if (searchForm.from) {
      query = query.ilike('from_city', `%${searchForm.from}%`);
    }
    if (searchForm.to) {
      query = query.ilike('to_city', `%${searchForm.to}%`);
    }
    if (searchForm.date) {
      query = query.eq('departure_date', searchForm.date);
    }
    if (searchForm.seats) {
      query = query.gte('available_seats', searchForm.seats);
    }

    const { data, error } = await query.order('departure_date', { ascending: true });

    if (error) throw error;
    
    const typedResults = (data || []).map(mapToRide);
    setRides(typedResults);
    
  } catch (error) {
    console.error('Error searching rides:', error);
    // Fallback logic...
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header - Trustworthy & Welcoming Colors */}
        <div className="border-b bg-gradient-to-r from-success/5 to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/')} className="border-primary/20 hover:bg-primary/10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">Passenger Dashboard</h1>
                <p className="text-muted-foreground">Hello, {profile?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 shadow-sm">
                {profile?.role || 'Passenger'}
              </Badge>
              {(profile as any)?.average_rating && (
                <div className="flex items-center gap-1 text-sm bg-gradient-to-r from-warning/10 to-warning/20 px-3 py-1.5 rounded-lg border border-warning/20 shadow-sm">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-medium text-warning-foreground">{(profile as any).average_rating}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-destructive/20 hover:bg-destructive hover:text-destructive-foreground">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          <Tabs defaultValue="search" className="space-y-6">
            <TabsList className="flex w-full justify-around bg-gradient-to-r from-muted/50 to-muted p-1 rounded-xl overflow-x-auto">
              <TabsTrigger value="search" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">
                <Search className="h-4 w-4" />
                Find Rides
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-secondary/80 data-[state=active]:text-white data-[state=active]:shadow-md">
                <History className="h-4 w-4" />
                Trip History
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-success data-[state=active]:to-success/80 data-[state=active]:text-white data-[state=active]:shadow-md">
                <Navigation className="h-4 w-4" />
                Live Tracking
              </TabsTrigger>
              <TabsTrigger value="emergency" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-destructive data-[state=active]:to-destructive/80 data-[state=active]:text-white data-[state=active]:shadow-md">
                <Shield className="h-4 w-4" />
                Emergency
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-warning data-[state=active]:to-warning/80 data-[state=active]:text-white data-[state=active]:shadow-md">
                <MessageSquare className="h-4 w-4" />
                Support
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-accent/80 data-[state=active]:text-white data-[state=active]:shadow-md">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="mr-2 h-5 w-5" />
                    Search Rides
                  </CardTitle>
                  <CardDescription>Find rides that match your travel plans</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from">From</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="from" 
                          placeholder="Departure city" 
                          className="pl-10"
                          value={searchForm.from}
                          onChange={(e) => setSearchForm(prev => ({ ...prev, from: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="to">To</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="to" 
                          placeholder="Destination city" 
                          className="pl-10"
                          value={searchForm.to}
                          onChange={(e) => setSearchForm(prev => ({ ...prev, to: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              setSearchForm(prev => ({ 
                                ...prev, 
                                date: date ? format(date, "yyyy-MM-dd") : "" 
                              }));
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="seats">Seats</Label>
                      <Input 
                        id="seats" 
                        type="number" 
                        placeholder="1" 
                        min="1" 
                        max="8"
                        value={searchForm.seats}
                        onChange={(e) => setSearchForm(prev => ({ ...prev, seats: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-4">
                    <Button onClick={handleSearch} disabled={loading} className="md:w-auto">
                      <Search className="mr-2 h-4 w-4" />
                      {loading ? 'Searching...' : 'Search Rides'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={fetchAllRides} 
                      disabled={loading}
                    >
                      Show All Rides
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Rides</CardTitle>
                    <CardDescription>
                      {rides.length > 0 ? `${rides.length} ride(s) available` : 'Recent rides matching your preferences'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Loading rides...</p>
                      </div>
                    ) : rides.length > 0 ? (
                      <div className="space-y-4">
                        {rides.map((ride) => (
                          <div key={ride.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                  {ride.from_city} → {ride.to_city}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm text-muted-foreground">
                                    Driver: {ride.profiles?.full_name || 'Unknown Driver'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-primary">₹{ride.price_per_seat}</p>
                                <p className="text-sm text-muted-foreground">per seat</p>
                              </div>
                            </div>
                        
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                {new Date(ride.departure_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                {ride.departure_time}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                {ride.available_seats} seats
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                {ride.pickup_point}
                              </div>
                            </div>
                        
                            {ride.vehicles && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm text-muted-foreground">
                                  Vehicle: {ride.vehicles.car_model || 'Unknown'} ({ride.vehicles.car_type || 'Unknown'})
                                  {ride.vehicles.color && ` - ${ride.vehicles.color}`}
                                </p>
                              </div>
                            )}
                        
                            {ride.notes && (
                              <div className="mt-3">
                                <p className="text-sm">{ride.notes}</p>
                              </div>
                            )}
                        
                            <div className="mt-4 flex gap-2">
                              <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button 
                                    className="flex-1" 
                                    onClick={() => setSelectedRide(ride)}
                                  >
                                    Book This Ride
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Book Your Ride</DialogTitle>
                                    <DialogDescription>
                                      {selectedRide?.from_city} → {selectedRide?.to_city} on {selectedRide && new Date(selectedRide.departure_date).toLocaleDateString()}
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  {/* Driver Profile in Booking Dialog */}
                                  {selectedRide && (
                                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                                      <h4 className="font-semibold mb-2">Driver Information</h4>
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                          <span className="font-semibold text-primary text-lg">
                                            {selectedRide.profiles?.full_name?.charAt(0) || 'D'}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-medium">{selectedRide.profiles?.full_name || 'Unknown Driver'}</p>
                                          {selectedRide.profiles?.phone && (
                                            <p className="text-xs text-muted-foreground">
                                              {selectedRide.profiles.phone}
                                            </p>
                                          )}
                                        </div>
                                        <Button size="sm" variant="outline" 
                                          onClick={() => window.open(`tel:${selectedRide.profiles?.phone}`)}>
                                          <Phone className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                              
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="booking-seats">Number of Seats</Label>
                                      <Input
                                        id="booking-seats"
                                        type="number"
                                        min="1"
                                        max={selectedRide?.available_seats || 1}
                                        value={bookingForm.seats}
                                        onChange={(e) => setBookingForm(prev => ({ 
                                          ...prev, 
                                          seats: parseInt(e.target.value) || 1 
                                        }))}
                                      />
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Available: {selectedRide?.available_seats} seats
                                      </p>
                                    </div>
                                
                                    <div>
                                      <Label htmlFor="booking-notes">Notes (Optional)</Label>
                                      <Textarea
                                        id="booking-notes"
                                        placeholder="Any special requirements or notes..."
                                        value={bookingForm.notes}
                                        onChange={(e) => setBookingForm(prev => ({ 
                                          ...prev, 
                                          notes: e.target.value 
                                        }))}
                                      />
                                    </div>
                                
                                    <div className="border-t pt-4">
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold">Total Price:</span>
                                        <span className="text-xl font-bold text-primary">
                                          ₹{selectedRide ? (selectedRide.price_per_seat * bookingForm.seats).toFixed(2) : '0.00'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                              
                                  <DialogFooter>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setIsBookingDialogOpen(false)}
                                      disabled={bookingLoading}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      onClick={handleBookRide}
                                      disabled={bookingLoading || bookingForm.seats > (selectedRide?.available_seats || 0)}
                                    >
                                      {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(`tel:${ride.profiles?.phone}`)}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No rides found</p>
                        <p className="text-sm">Try searching for a specific route or check back later</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>
                      {bookings.length > 0 ? `${bookings.length} booking(s)` : 'Your upcoming and past bookings'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookings.length > 0 ? (
                      <div className="space-y-4">
                        {bookings.slice(0, 3).map((booking) => (
                          <div key={booking.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-semibold">
                                  {booking.rides?.from_city || 'N/A'} → {booking.rides?.to_city || 'N/A'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Driver: {booking.rides?.profiles?.full_name || 'Unknown Driver'}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {booking.status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                {booking.rides && new Date(booking.rides.departure_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                {booking.seats_booked} seats
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t flex justify-between items-center">
                              <span className="text-sm font-medium">Total: ₹{booking.total_price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No bookings yet</p>
                        <p className="text-sm">Your bookings will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <TripHistory />
            </TabsContent>

            <TabsContent value="tracking">
              <LiveLocationSharing />
            </TabsContent>

            <TabsContent value="emergency">
              <EmergencyContactsSOS />
            </TabsContent>

            <TabsContent value="support">
              <SupportChat />
            </TabsContent>

            <TabsContent value="profile">
              <PassengerProfile />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};