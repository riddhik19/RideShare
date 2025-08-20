import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Car, Calendar, Users, MapPin, Clock, Edit, Trash2, Shield, CheckCircle, Star, TrendingUp, Navigation, Bell, LogOut } from 'lucide-react';
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

interface Ride {
  id: string;
  available_seats: number;
  created_at: string;
  departure_date: string;
  departure_time: string;
  driver_id: string;
  from_city: string;
  is_active: boolean;
  notes: string | null;
  pickup_point: string;
  price_per_seat: number;
  to_city: string;
  vehicles?: Vehicle | null;
}

interface Profile {
  full_name: string | null;
  phone: string | null;
}

interface BookingRide {
  from_city: string | null;
  to_city: string | null;
  departure_date: string;
  departure_time: string;
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
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData>({ avg_rating: 0, ratings_count: 0 });
  const [stats, setStats] = useState<Stats>({ activeRides: 0, upcomingRides: 0, totalBookings: 0 });

  useEffect(() => {
    if (profile?.id) {
      fetchMyRides();
      fetchMyBookings();
      fetchRatingData();
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

  const fetchMyRides = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          vehicles (
            car_model,
            car_type,
            color
          )
        `)
        .eq('driver_id', profile.id)
        .eq('is_active', true)
        .order('departure_date', { ascending: true });

      if (error) throw error;

      setMyRides(data || []);

      // Calculate stats
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const activeRides = data?.length || 0;
      const upcomingRides = data?.filter(ride => {
        const rideDate = new Date(ride.departure_date);
        return rideDate >= now && rideDate <= oneWeekFromNow;
      }).length || 0;

      setStats(prev => ({ ...prev, activeRides, upcomingRides }));
    } catch (error) {
      console.error('Error fetching rides:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your rides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Attempting to cancel ride:', rideId);
      
      // Call the database function to cancel the ride
      const { data, error } = await supabase.rpc('cancel_ride', {
        ride_id_param: rideId
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Ride not found or already cancelled, or you do not have permission to cancel this ride');
      }

      console.log('Ride cancelled successfully');
      toast({
        title: "Success",
        description: "Ride cancelled successfully"
      });
      fetchMyRides(); // Refresh the rides list
    } catch (error) {
      console.error('Error cancelling ride:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel ride. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
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
    fetchRatingData(); // Refresh rating data after new rides
  };

  const fetchMyBookings = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles:passenger_id (
            full_name,
            phone
          ),
          rides!inner (
            from_city,
            to_city,
            departure_date,
            departure_time
          )
        `)
        .eq('rides.driver_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setMyBookings(data || []);
      setStats(prev => ({ ...prev, totalBookings: data?.length || 0 }));
    } catch (error) {
      console.error('Error fetching bookings:', error);
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
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => navigate('/rides-management')}>
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
                Click to manage rides
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Upcoming Rides</CardTitle>
              <div className="p-2 bg-blue-100 rounded-full">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.upcomingRides}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Clock className="h-3 w-3 mr-1" />
                This week
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Total Bookings</CardTitle>
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                All time
              </p>
            </CardContent>
          </Card>

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
                      {myRides.map((ride) => (
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
                              {booking.rides?.departure_date && new Date(booking.rides.departure_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
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