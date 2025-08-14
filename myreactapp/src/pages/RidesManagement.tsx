import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Phone, MessageSquare, Navigation, Edit, Trash2, Eye, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Ride {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  pickup_point: string;
  available_seats: number;
  price_per_seat: number;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  bookings?: Booking[];
}

interface Booking {
  id: string;
  seats_booked: number;
  total_price: number;
  status: string;
  passenger_notes: string;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string;
    avatar_url?: string;
  } | null;
}

const RidesManagement: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  const [pastRides, setPastRides] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    fetchMyRides();
  }, [profile?.id]);

  const fetchMyRides = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch active rides (today and future)
      const { data: activeData, error: activeError } = await supabase
        .from('rides')
        .select(`
          *,
          bookings (
            id,
            seats_booked,
            total_price,
            status,
            passenger_notes,
            created_at,
            profiles:passenger_id (
              full_name,
              phone,
              avatar_url
            )
          )
        `)
        .eq('driver_id', profile?.id ?? '')
        .gte('departure_date', today)
        .order('departure_date', { ascending: true });

      if (activeError) throw activeError;

      // Fetch past rides
      const { data: pastData, error: pastError } = await supabase
        .from('rides')
        .select(`
          *,
          bookings (
            id,
            seats_booked,
            total_price,
            status,
            passenger_notes,
            created_at,
            profiles:passenger_id (
              full_name,
              phone,
              avatar_url
            )
          )
        `)
        .eq('driver_id', profile?.id ?? '')
        .lt('departure_date', today)
        .order('departure_date', { ascending: false });

      if (pastError) throw pastError;

      setActiveRides((activeData as Ride[]) || []);
      setPastRides((pastData as Ride[]) || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'confirmed': 'default',
      'pending': 'secondary',
      'cancelled': 'destructive',
      'completed': 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleRideStatus = async (rideId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ is_active: !currentStatus })
        .eq('id', rideId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ride ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });

      fetchMyRides();
    } catch (error) {
      console.error('Error updating ride status:', error);
      toast({
        title: "Error",
        description: "Failed to update ride status",
        variant: "destructive"
      });
    }
  };

  const RideCard: React.FC<{ ride: Ride; showActions?: boolean }> = ({ ride, showActions = true }) => (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 flex items-center gap-2">
              {ride.from_city} → {ride.to_city}
              {ride.is_active ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(ride.departure_date)}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {ride.departure_time}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {ride.available_seats} seats
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {ride.pickup_point}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">₹{ride.price_per_seat}</div>
            <div className="text-sm text-muted-foreground">per seat</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {ride.notes && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm italic">"{ride.notes}"</p>
          </div>
        )}

        {/* Bookings Section */}
        {ride.bookings && ride.bookings.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Passengers ({ride.bookings.length})
            </h4>
            <div className="space-y-2">
              {ride.bookings.map((booking) => (
                <div key={booking.id} className="bg-background border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{booking.profiles?.full_name || 'Unknown Passenger'}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.seats_booked} seat{booking.seats_booked > 1 ? 's' : ''} • ₹{booking.total_price}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status)}
                      {booking.profiles?.phone && (
                        <Button size="sm" variant="outline">
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {booking.passenger_notes && (
                    <p className="text-xs text-muted-foreground italic">
                      Note: {booking.passenger_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setSelectedRide(ride)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ride Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <RideCard ride={ride} showActions={false} />
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleRideStatus(ride.id, ride.is_active)}
            >
              {ride.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-primary/5 to-secondary/5 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/driver')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Rides Management
                </h1>
                <p className="text-muted-foreground">Manage your active and past rides</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Total: {activeRides.length + pastRides.length} rides
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-muted/50 to-muted p-1 rounded-xl">
              <TabsTrigger 
                value="active" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white"
              >
                Active Rides ({activeRides.length})
              </TabsTrigger>
              <TabsTrigger 
                value="past"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-secondary/80 data-[state=active]:text-white"
              >
                Past Rides ({pastRides.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeRides.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Navigation className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Rides</h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have any active rides scheduled. Create your first ride to start earning!
                    </p>
                    <Button onClick={() => navigate('/driver')}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Post New Ride
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeRides.map((ride) => (
                    <RideCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastRides.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Past Rides</h3>
                    <p className="text-muted-foreground">
                      Your completed rides will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pastRides.map((ride) => (
                    <RideCard key={ride.id} ride={ride} showActions={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RidesManagement;