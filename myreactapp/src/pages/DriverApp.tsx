import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Car, Calendar, Users, MapPin, Clock, Edit, Trash2, Shield, CheckCircle, Star, TrendingUp, Navigation, Bell, LogOut, Eye, Phone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PostRideForm } from '@/components/PostRideForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NotificationSystem } from '@/components/NotificationSystem';
import KYCDocumentUpload from '@/components/KYCDocumentUpload';
import TripManagement from '@/components/TripManagement';
import DailyEarnings from '@/components/DailyEarnings';
import DriverRatingFeedback from '@/components/DriverRatingFeedback';
import LiveLocationSharing from '@/components/LiveLocationSharing';
import DriverProfile from '@/components/DriverProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDriverRatingSummary } from '@/integrations/supabase/ratingService';

// Type definitions
interface Vehicle {
  car_model: string | null;
  car_type: string | null;
  color: string | null;
}

interface Profile {
  full_name: string | null;
  phone: string | null;
}

interface RideBooking {
  id: string;
  seats_booked: number;
  status: string;
  passenger_id: string;
  profiles: Profile | null;
}

interface Ride {
  id: string;
  available_seats: number;
  created_at: string;
  departure_date: string;
  departure_time: string;
  driver_id: string;
  from_city: string;
  status: string;
  notes: string | null;
  pickup_point: string;
  price_per_seat: number;
  to_city: string;
  vehicle_id: string;
  vehicles?: Vehicle | null;
  bookings?: RideBooking[];
}

interface BookingRide {
  from_city: string | null;
  to_city: string | null;
  departure_date: string;
  departure_time: string;
  driver_id?: string;
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
  profiles?: Profile | null;
  rides?: BookingRide | null;
}

interface ExtendedProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status?: string;
}

interface RatingData {
  avg_rating: number;
  ratings_count: number;
}

interface Stats {
  activeRides: number;
  upcomingRides: number;
  totalBookings: number;
}

export const DriverApp = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isPostRideOpen, setIsPostRideOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [todaysRides, setTodaysRides] = useState<Ride[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData>({ avg_rating: 0, ratings_count: 0 });
  const [stats, setStats] = useState<Stats>({ activeRides: 0, upcomingRides: 0, totalBookings: 0 });
  
  // State for dialog visibility and data
  const [isActiveRidesDialogOpen, setIsActiveRidesDialogOpen] = useState(false);
  const [isUpcomingRidesDialogOpen, setIsUpcomingRidesDialogOpen] = useState(false);
  const [isTotalBookingsDialogOpen, setIsTotalBookingsDialogOpen] = useState(false);
  const [upcomingRides, setUpcomingRides] = useState<Ride[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (profile?.id) {
      fetchMyRides();
      fetchMyBookings();
      fetchRatingData();
      fetchUpcomingRides();
      fetchAllBookings();
    }
  }, [profile?.id]);

  const fetchRatingData = async () => {
    if (!profile?.id) return;
    try {
      const summary = await getDriverRatingSummary(profile.id);
      setRatingData(summary);
    } catch (error) {
      console.error('Error fetching rating data:', error);
    }
  };

  // ✅ FIXED: fetchMyRides - Use status field instead of is_active
  const fetchMyRides = async () => {
  if (!profile?.id) return;
  setLoading(true);
  try {
    console.log('🚗 Fetching rides for driver:', profile.id);
    
    // Fix: Use explicit foreign key relationship name instead of just 'vehicles'
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        vehicles!rides_vehicle_id_fkey (
          car_model,
          car_type,
          color
        )
      `)
      .eq('driver_id', profile.id)
      .eq('status', 'active')
      .order('departure_date', { ascending: true });

    console.log('🚗 Rides query result:', { data, error });

    if (error) throw error;

    setMyRides(data || []);

    // Calculate today's rides
    const today = new Date().toISOString().split('T')[0];
    const todaysRides = (data || []).filter(ride => 
      ride.departure_date === today
    );

    setTodaysRides(todaysRides);
    setStats(prev => ({ ...prev, activeRides: todaysRides.length }));
    
  } catch (error) {
    console.error('❌ Error fetching rides:', error);
    toast({
      title: "Error",
      description: "Failed to fetch your rides",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};

  // Fix 2: fetchUpcomingRides - Simplified approach with status field
  const fetchUpcomingRides = async () => {
  if (!profile?.id) return;
  try {
    console.log('📅 Fetching upcoming rides...');
    
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneWeekString = oneWeekFromNow.toISOString().split('T')[0];
    
    // Step 1: Get rides in date range with active status - Fix vehicle relationship
    const { data: ridesData, error: ridesError } = await supabase
      .from('rides')
      .select(`
        *,
        vehicles!rides_vehicle_id_fkey (
          car_model,
          car_type,
          color
        )
      `)
      .eq('driver_id', profile.id)
      .eq('status', 'active')
      .gte('departure_date', todayString)
      .lte('departure_date', oneWeekString)
      .order('departure_date', { ascending: true });

    if (ridesError) throw ridesError;
    console.log('📅 Found rides:', ridesData?.length);

    if (!ridesData || ridesData.length === 0) {
      setUpcomingRides([]);
      setStats(prev => ({ ...prev, upcomingRides: 0 }));
      return;
    }

    // Step 2: Get bookings for these rides
    const rideIds = ridesData.map(ride => ride.id);
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .in('ride_id', rideIds)
      .eq('status', 'confirmed');

    if (bookingsError) throw bookingsError;
    console.log('📅 Found bookings:', bookingsData?.length);

    // Step 3: Get passenger details for bookings
    const passengerIds = [...new Set(bookingsData?.map(b => b.passenger_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', passengerIds);

    // Step 4: Combine all data
    const ridesWithDetails = ridesData.map(ride => {
      const rideBookings = (bookingsData || [])
        .filter(booking => booking.ride_id === ride.id)
        .map(booking => {
          const passengerProfile = profilesData?.find(p => p.id === booking.passenger_id);
          return {
            ...booking,
            profiles: passengerProfile || null
          };
        });

      return {
        ...ride,
        bookings: rideBookings
      };
    });

    // Only include rides that have confirmed bookings
    const ridesWithBookings = ridesWithDetails.filter(ride => 
      ride.bookings && ride.bookings.length > 0
    );

    console.log('✅ Upcoming rides with bookings:', ridesWithBookings.length);
    setUpcomingRides(ridesWithBookings);
    setStats(prev => ({ ...prev, upcomingRides: ridesWithBookings.length }));
    
  } catch (error) {
    console.error('❌ Error fetching upcoming rides:', error);
    setStats(prev => ({ ...prev, upcomingRides: 0 }));
  }
};

  // Fix 3: fetchAllBookings - Completely rewritten
  const fetchAllBookings = async () => {
    if (!profile?.id) return;
    try {
      console.log('📋 Fetching all bookings...');

      // Step 1: Get all rides by this driver (including cancelled ones for booking history)
      const { data: driverRides, error: ridesError } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', profile.id);

      if (ridesError) throw ridesError;
      
      if (!driverRides || driverRides.length === 0) {
        console.log('📋 No rides found for driver');
        setAllBookings([]);
        setStats(prev => ({ ...prev, totalBookings: 0 }));
        return;
      }

      const rideIds = driverRides.map(ride => ride.id);
      console.log('📋 Found ride IDs:', rideIds.length);

      // Step 2: Get all bookings for these rides
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('ride_id', rideIds)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      console.log('📋 Found bookings:', bookingsData?.length);

      if (!bookingsData || bookingsData.length === 0) {
        setAllBookings([]);
        setStats(prev => ({ ...prev, totalBookings: 0 }));
        return;
      }

      // Step 3: Get passenger profiles
      const passengerIds = [...new Set(bookingsData.map(b => b.passenger_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', passengerIds);

      // Step 4: Get ride details
      const { data: ridesData } = await supabase
        .from('rides')
        .select('id, from_city, to_city, departure_date, departure_time')
        .in('id', rideIds);

      // Step 5: Combine data
      const bookingsWithDetails = bookingsData.map(booking => {
        const passengerProfile = profilesData?.find(p => p.id === booking.passenger_id);
        const rideDetails = ridesData?.find(r => r.id === booking.ride_id);
        
        return {
          ...booking,
          profiles: passengerProfile || null,
          rides: rideDetails || null
        };
      });

      console.log('✅ All bookings with details:', bookingsWithDetails.length);
      setAllBookings(bookingsWithDetails);
      setStats(prev => ({ ...prev, totalBookings: bookingsWithDetails.length }));
      
    } catch (error) {
      console.error('❌ Error fetching all bookings:', error);
      setStats(prev => ({ ...prev, totalBookings: 0 }));
    }
  };

  // ✅ FIXED: handleCancelRide - Use status field instead of is_active
  const handleCancelRide = async (rideId: string) => {
  if (!profile?.id) return;

  try {
    const { data, error } = await supabase
      .from('rides')
      .update({ 
        status: 'cancelled', // ✅ FIXED: Use status field
        updated_at: new Date().toISOString()
      })
      .eq('id', rideId)
      .eq('driver_id', profile.id)
      .select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      throw new Error('Ride not found or permission denied');
    }

    toast({ title: "Success", description: "Ride cancelled successfully" });
    fetchMyRides();
    fetchUpcomingRides();
  } catch (error) {
    console.error('Error cancelling ride:', error);
    toast({
      title: "Error",
      description: "Failed to cancel ride. Please try again.",
      variant: "destructive"
    });
  }
};

  const handleEditRide = (ride: Ride) => {
    setEditingRide(ride);
    setIsPostRideOpen(true);
  };

  const handleRidePosted = () => {
    setIsPostRideOpen(false);
    setEditingRide(null);
    fetchMyRides();
    fetchUpcomingRides();
    fetchRatingData();
  };

  const fetchMyBookings = async () => {
    if (!profile?.id) return;
    
    try {
      // Use the same fallback approach
      const { data: driverRides } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', profile.id);
      
      if (driverRides && driverRides.length > 0) {
        const rideIds = driverRides.map(ride => ride.id);
        
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            profiles:passenger_id (
              full_name,
              phone
            ),
            rides:ride_id (
              from_city,
              to_city,
              departure_date,
              departure_time
            )
          `)
          .in('ride_id', rideIds)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setMyBookings(data || []);
      } else {
        setMyBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setMyBookings([]);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account"
      });
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Type guard for profile with kyc_status
  const profileWithKyc = profile as ExtendedProfile & { kyc_status?: string };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header with Profile and Verification Status */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={profile?.avatar_url || ''} 
                  alt={profile?.full_name || 'User'} 
                />
                <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-3xl font-bold">Driver Dashboard</h1>
                  {profileWithKyc?.kyc_status === 'approved' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <span>Welcome back, {profile?.full_name}</span>
                  {ratingData.ratings_count > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{ratingData.avg_rating.toFixed(1)}</span>
                      <span className="text-sm">({ratingData.ratings_count} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationSystem />
            <Dialog open={isPostRideOpen} onOpenChange={setIsPostRideOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Post New Ride
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRide ? 'Edit Ride' : 'Post a New Ride'}</DialogTitle>
                  <DialogDescription>
                    {editingRide ? 'Update your ride details' : 'Create a ride listing for passengers to book'}
                  </DialogDescription>
                </DialogHeader>
                <PostRideForm onSuccess={handleRidePosted} editData={editingRide} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Enhanced Stats Cards with Better Visual Hierarchy */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Active Rides Card - Clickable */}
          <Card 
            className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-200 cursor-pointer group"
            onClick={() => setIsActiveRidesDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary group-hover:text-primary/80">Active Rides</CardTitle>
              <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                <Car className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeRides}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Today's rides
              </p>
            </CardContent>
          </Card>

          {/* Upcoming Rides Card - Clickable */}
          <Card 
            className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            onClick={() => setIsUpcomingRidesDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Upcoming Rides</CardTitle>
              <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.upcomingRides}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Clock className="h-3 w-3 mr-1" />
                Click to view details
              </p>
            </CardContent>
          </Card>

          {/* Total Bookings Card - Clickable */}
          <Card 
            className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            onClick={() => setIsTotalBookingsDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Total Bookings</CardTitle>
              <div className="p-2 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Click to view details
              </p>
            </CardContent>
          </Card>

          {/* Rating Card */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Rating</CardTitle>
              <div className="p-2 bg-orange-100 rounded-full">
                <Star className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-3xl font-bold">
                  {ratingData.ratings_count > 0 ? ratingData.avg_rating.toFixed(1) : '0.0'}
                </div>
                {ratingData.ratings_count > 0 && renderStars(Math.round(ratingData.avg_rating))}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {ratingData.ratings_count} reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Rides Dialog */}
        <Dialog open={isActiveRidesDialogOpen} onOpenChange={setIsActiveRidesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Active Rides Today ({stats.activeRides})
                <Button variant="ghost" size="sm" onClick={() => setIsActiveRidesDialogOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                Your rides scheduled for today ({new Date().toLocaleDateString()})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {todaysRides.length > 0 ? (
                todaysRides.map((ride) => (
                  <Card key={ride.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {ride.from_city} → {ride.to_city}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {ride.vehicles?.car_model || 'N/A'} ({ride.vehicles?.car_type || 'N/A'})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">₹{ride.price_per_seat}</p>
                          <p className="text-sm text-muted-foreground">per seat</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          Today
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
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditRide(ride)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCancelRide(ride.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No rides scheduled for today</p>
                  <p className="text-sm">Your today's rides will appear here</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Upcoming Rides Dialog */}
        <Dialog open={isUpcomingRidesDialogOpen} onOpenChange={setIsUpcomingRidesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Upcoming Rides ({stats.upcomingRides})
                <Button variant="ghost" size="sm" onClick={() => setIsUpcomingRidesDialogOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                Rides with confirmed bookings in the next 7 days
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {upcomingRides.length > 0 ? (
                upcomingRides.map((ride) => (
                  <Card key={ride.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {ride.from_city} → {ride.to_city}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(ride.departure_date)} at {ride.departure_time}</span>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {ride.bookings?.length || 0} Booking(s)
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          {ride.pickup_point}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                          {ride.available_seats} seats available
                        </div>
                      </div>

                      {/* Show passenger details if available */}
                      {ride.bookings && ride.bookings.length > 0 && (
                        <div className="border-t pt-3">
                          <h4 className="font-medium mb-2">Passengers:</h4>
                          <div className="space-y-2">
                            {ride.bookings.map((booking: RideBooking, index: number) => (
                              <div key={index} className="flex items-center justify-between bg-muted/50 rounded p-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-medium">
                                      {booking.profiles?.full_name?.charAt(0) || 'P'}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{booking.profiles?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {booking.seats_booked} seat(s)
                                    </p>
                                  </div>
                                </div>
                                {booking.profiles?.phone && (
                                  <Button size="sm" variant="outline">
                                    <Phone className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No upcoming rides with bookings</p>
                  <p className="text-sm">Confirmed bookings will appear here</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Total Bookings Dialog */}
        <Dialog open={isTotalBookingsDialogOpen} onOpenChange={setIsTotalBookingsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Total Bookings ({stats.totalBookings})
                <Button variant="ghost" size="sm" onClick={() => setIsTotalBookingsDialogOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                All bookings for your rides (past and upcoming)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {allBookings.length > 0 ? (
                allBookings.map((booking) => (
                  <Card key={booking.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">
                            {booking.rides?.from_city} → {booking.rides?.to_city}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Passenger: {booking.profiles?.full_name || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(booking.status)}
                          <p className="text-sm font-medium mt-1">₹{booking.total_price}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {booking.rides && formatDate(booking.rides.departure_date)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {booking.rides?.departure_time}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                          {booking.seats_booked} seat(s)
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          {booking.profiles?.phone || 'N/A'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No bookings yet</p>
                  <p className="text-sm">Passenger bookings will appear here</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Navigation Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-8 h-12 p-1 bg-muted rounded-lg">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Trips</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="ratings" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Ratings</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center space-x-2">
              <Navigation className="h-4 w-4" />
              <span className="hidden sm:inline">Live Track</span>
            </TabsTrigger>
            <TabsTrigger value="kyc" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">KYC</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="logout" 
              className="flex items-center space-x-2 hover:bg-destructive/10 data-[state=active]:bg-destructive/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Rides</CardTitle>
                  <CardDescription>
                    {myRides.length > 0 ? `${myRides.length} active ride(s)` : 'Manage your posted rides'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>Loading your rides...</p>
                    </div>
                  ) : myRides.length > 0 ? (
                    <div className="space-y-4">
                      {myRides.slice(0, 3).map((ride) => (
                        <div key={ride.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {ride.from_city} → {ride.to_city}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {ride.vehicles?.car_model || 'N/A'} ({ride.vehicles?.car_type || 'N/A'})
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-primary">₹{ride.price_per_seat}</p>
                              <p className="text-sm text-muted-foreground">per seat</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              {formatDate(ride.departure_date)}
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
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditRide(ride)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleCancelRide(ride.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                      {myRides.length > 3 && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setIsActiveRidesDialogOpen(true)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View All {myRides.length} Rides
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Car className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No rides posted yet</p>
                      <p className="text-sm">Start by posting your first ride</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>
                    {myBookings.length > 0 ? `${myBookings.length} booking(s)` : 'Latest passenger bookings'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myBookings.length > 0 ? (
                    <div className="space-y-4">
                      {myBookings.slice(0, 3).map((booking) => (
                        <div key={booking.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold">
                                {booking.profiles?.full_name || 'Unknown User'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {booking.rides?.from_city || 'N/A'} → {booking.rides?.to_city || 'N/A'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Seats:</span> {booking.seats_booked}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Amount:</span> ₹{booking.total_price}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>{' '}
                              {booking.rides?.departure_date && formatDate(booking.rides.departure_date)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {allBookings.length > 3 && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setIsTotalBookingsDialogOpen(true)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View All {allBookings.length} Bookings
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No bookings yet</p>
                      <p className="text-sm">Bookings will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trips" className="space-y-6">
            <TripManagement />
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <DailyEarnings />
          </TabsContent>

          <TabsContent value="ratings" className="space-y-6">
            <DriverRatingFeedback />
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <LiveLocationSharing />
          </TabsContent>

          <TabsContent value="kyc" className="space-y-6">
            <KYCDocumentUpload />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <DriverProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};