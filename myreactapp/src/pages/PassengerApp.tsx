// Fixed PassengerApp.tsx - Key fixes:
// 1. Corrected vehicle relationship query
// 2. Fixed status field usage (status instead of is_active)
// 3. Better error handling and logging
// 4. Simplified queries to match actual database structure

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
import { ArrowLeft, Search, MapPin, Calendar, Clock, Users, History, User, LogOut, Phone, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TripHistory from '@/components/TripHistory';
import PassengerProfile from '@/components/PassengerProfile';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// Simplified types based on actual database structure
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
  notes: string | null;
  status: string;
  // Joined data
  driver_profile?: {
    full_name: string | null;
    phone: string | null;
    average_rating: number | null;
    total_ratings: number | null;
  } | null;
  vehicle_info?: {
    car_model: string | null;
    car_type: string | null;
    color: string | null;
  } | null;
}

interface Booking {
  id: string;
  seats_booked: number;
  status: string;
  total_price: number;
  ride_info?: {
    from_city: string | null;
    to_city: string | null;
    departure_date: string;
    departure_time: string;
    driver_name: string | null;
  } | null;
}

export const PassengerApp = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // ✅ FIXED: Simplified fetchAllRides with better error handling
  const fetchAllRides = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching all available rides...');
      
      // Step 1: Get basic rides data first
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .gt('available_seats', 0)
        .order('departure_date', { ascending: true });

      console.log('🔍 Basic rides query result:', { data: ridesData, error: ridesError });

      if (ridesError) {
        console.error('❌ Error in basic rides query:', ridesError);
        throw ridesError;
      }
      
      if (!ridesData || ridesData.length === 0) {
        console.log('📭 No rides found');
        setRides([]);
        return;
      }

      // Step 2: Get driver profiles for these rides
      const driverIds = [...new Set(ridesData.map(ride => ride.driver_id))];
      const { data: driversData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, average_rating, total_ratings')
        .in('id', driverIds);

      // Step 3: Get vehicle information
      const vehicleIds = [...new Set(ridesData.map(ride => ride.vehicle_id))];
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, car_model, car_type, color')
        .in('id', vehicleIds);

      // Step 4: Combine all data
      const enrichedRides: Ride[] = ridesData.map(ride => ({
        ...ride,
        driver_profile: driversData?.find(d => d.id === ride.driver_id) || null,
        vehicle_info: vehiclesData?.find(v => v.id === ride.vehicle_id) || null
      }));

      console.log('✅ Successfully fetched and enriched rides:', enrichedRides.length);
      setRides(enrichedRides);
      
    } catch (error) {
      console.error('❌ Error fetching rides:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available rides. Please try again.",
        variant: "destructive"
      });
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Simplified handleSearch function
  const handleSearch = async () => {
    setLoading(true);
    try {
      console.log('🔍 Searching rides with filters:', searchForm);
      
      // Build query step by step
      let query = supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gt('available_seats', 0)
        .gte('departure_date', new Date().toISOString().split('T')[0]);

      // Apply filters if provided
      if (searchForm.from.trim()) {
        query = query.ilike('from_city', `%${searchForm.from.trim()}%`);
      }
      if (searchForm.to.trim()) {
        query = query.ilike('to_city', `%${searchForm.to.trim()}%`);
      }
      if (searchForm.date) {
        query = query.eq('departure_date', searchForm.date);
      }
      if (searchForm.seats > 0) {
        query = query.gte('available_seats', searchForm.seats);
      }

      const { data: ridesData, error } = await query.order('departure_date', { ascending: true });

      console.log('🔍 Search results:', { data: ridesData, error, count: ridesData?.length });

      if (error) {
        console.error('❌ Search error:', error);
        throw error;
      }
      
      if (!ridesData || ridesData.length === 0) {
        setRides([]);
        toast({
          title: "No rides found",
          description: "No rides match your search criteria. Try different filters.",
        });
        return;
      }

      // Get additional data for search results
      const driverIds = [...new Set(ridesData.map(ride => ride.driver_id))];
      const vehicleIds = [...new Set(ridesData.map(ride => ride.vehicle_id))];

      const [driversData, vehiclesData] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone, average_rating, total_ratings').in('id', driverIds),
        supabase.from('vehicles').select('id, car_model, car_type, color').in('id', vehicleIds)
      ]);

      const enrichedResults: Ride[] = ridesData.map(ride => ({
        ...ride,
        driver_profile: driversData.data?.find(d => d.id === ride.driver_id) || null,
        vehicle_info: vehiclesData.data?.find(v => v.id === ride.vehicle_id) || null
      }));
      
      setRides(enrichedResults);
      
    } catch (error) {
      console.error('❌ Error searching rides:', error);
      toast({
        title: "Search Error",
        description: "Failed to search rides. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: RLS-compatible fetchMyBookings with better error handling
  const fetchMyBookings = async () => {
    if (!profile?.id) {
      console.log('No profile ID available for bookings');
      return;
    }

    try {
      console.log('📋 Fetching bookings for user:', profile.id);
      
      // Step 1: Get bookings (this should work as passenger can view their own bookings)
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('passenger_id', profile.id)
        .order('created_at', { ascending: false });

      console.log('📋 Bookings query result:', { data: bookingsData, error });

      if (error) {
        console.error('❌ Bookings query failed:', error);
        throw error;
      }

      if (!bookingsData || bookingsData.length === 0) {
        console.log('📋 No bookings found');
        setBookings([]);
        return;
      }

      // Step 2: Get ride details for each booking (handle RLS restrictions)
      const rideIds = [...new Set(bookingsData.map(b => b.ride_id))];
      
      // Use a more specific select to avoid RLS issues
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('id, from_city, to_city, departure_date, departure_time, driver_id')
        .in('id', rideIds);

      if (ridesError) {
        console.warn('⚠️ Could not fetch ride details, using limited booking info:', ridesError);
        // If we can't get ride details due to RLS, just show bookings without ride info
        const limitedBookings: Booking[] = bookingsData.map(booking => ({
          ...booking,
          ride_info: null
        }));
        setBookings(limitedBookings);
        return;
      }

      // Step 3: Get driver names (handle RLS restrictions)
      const driverIds = [...new Set(ridesData?.map(r => r.driver_id) || [])];
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', driverIds);

      if (driversError) {
        console.warn('⚠️ Could not fetch driver info:', driversError);
      }

      // Step 4: Combine data
      const enrichedBookings: Booking[] = bookingsData.map(booking => {
        const rideInfo = ridesData?.find(r => r.id === booking.ride_id);
        const driverInfo = driversData?.find(d => d.id === rideInfo?.driver_id);
        
        if (!rideInfo) {
          console.warn('Ride not found for booking:', booking.id);
          return {
            ...booking,
            ride_info: null
          };
        }
        
        return {
          ...booking,
          ride_info: {
            from_city: rideInfo.from_city,
            to_city: rideInfo.to_city,
            departure_date: rideInfo.departure_date,
            departure_time: rideInfo.departure_time,
            driver_name: driverInfo?.full_name || null
          }
        };
      });

      console.log('✅ Bookings with details:', enrichedBookings.length);
      setBookings(enrichedBookings);
      
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setBookings([]);
    }
  };

  // ✅ FIXED: Simplified handleBookRide
  const handleBookRide = async () => {
  if (!selectedRide || !profile) {
    toast({
      title: "Missing Information",
      description: "Please ensure ride and profile are selected",
      variant: "destructive"
    });
    return;
  }

  setBookingLoading(true);

  try {
    // Try the booking insert without complex validation
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        passenger_id: profile.id,
        ride_id: selectedRide.id,
        seats_booked: bookingForm.seats,
        total_price: selectedRide.price_per_seat * bookingForm.seats,
        status: 'pending' // Try 'pending' instead of 'confirmed'
      })
      .select()
      .single();

    if (error) {
      console.error('Booking error:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw new Error(error.message);
    }

    toast({
      title: "Booking Successful!",
      description: "Your ride has been booked.",
    });

    setIsBookingDialogOpen(false);
    setBookingForm({ seats: 1, notes: '' });
    setSelectedRide(null);

    fetchMyBookings();
    fetchAllRides();

  } catch (error: any) {
    toast({
      title: "Booking Failed",
      description: error.message,
      variant: "destructive"
    });
  } finally {
    setBookingLoading(false);
  }
};

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
                                    Driver: {ride.driver_profile?.full_name || 'Unknown Driver'}
                                  </p>
                                  {ride.driver_profile?.average_rating && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-xs">{ride.driver_profile.average_rating.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-primary">₹{ride.price_per_seat}</p>
                                <p className="text-sm text-muted-foreground">per seat</p>
                              </div>
                            </div>
                        
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                        
                            {ride.vehicle_info && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm text-muted-foreground">
                                  Vehicle: {ride.vehicle_info.car_model || 'Unknown'} ({ride.vehicle_info.car_type || 'Unknown'})
                                  {ride.vehicle_info.color && ` - ${ride.vehicle_info.color}`}
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
                                  {selectedRide && selectedRide.driver_profile && (
                                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                                      <h4 className="font-semibold mb-2">Driver Information</h4>
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                          <span className="font-semibold text-primary text-lg">
                                            {selectedRide.driver_profile.full_name?.charAt(0) || 'D'}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-medium">{selectedRide.driver_profile.full_name || 'Unknown Driver'}</p>
                                          {selectedRide.driver_profile.phone && (
                                            <p className="text-xs text-muted-foreground">
                                              {selectedRide.driver_profile.phone}
                                            </p>
                                          )}
                                          {selectedRide.driver_profile.average_rating && (
                                            <div className="flex items-center gap-1 mt-1">
                                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                              <span className="text-xs">{selectedRide.driver_profile.average_rating.toFixed(1)}</span>
                                              <span className="text-xs text-muted-foreground">
                                                ({selectedRide.driver_profile.total_ratings || 0} reviews)
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        {selectedRide.driver_profile.phone && (
                                          <Button size="sm" variant="outline" 
                                            onClick={() => window.open(`tel:${selectedRide.driver_profile?.phone}`)}>
                                            <Phone className="h-4 w-4" />
                                          </Button>
                                        )}
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
                              
                              {selectedRide?.driver_profile?.phone && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(`tel:${ride.driver_profile?.phone}`)}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              )}
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
                                  {booking.ride_info?.from_city || 'N/A'} → {booking.ride_info?.to_city || 'N/A'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Driver: {booking.ride_info?.driver_name || 'Unknown Driver'}
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
                                {booking.ride_info && new Date(booking.ride_info.departure_date).toLocaleDateString()}
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

            <TabsContent value="profile">
              <PassengerProfile />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};