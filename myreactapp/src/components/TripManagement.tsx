import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin, Users, Phone, MessageSquare, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  seats_booked: number;
  total_price: number;
  status: string;
  passenger_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string | null;
    avatar_url?: string | null;
  };
  rides: {
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    pickup_point: string;
  };
}

const TripManagement: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    fetchUpcomingBookings();
  }, [profile?.id]);

  const fetchUpcomingBookings = async () => {
    if (!profile?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles:passenger_id (
            full_name,
            phone,
            avatar_url
          ),
          rides!inner (
            from_city,
            to_city,
            departure_date,
            departure_time,
            pickup_point,
            driver_id
          )
        `)
        .eq('rides.driver_id', profile.id)
        .gte('rides.departure_date', today)
        .in('status', ['confirmed', 'pending'])
        .order('rides.departure_date', { ascending: true });

      if (error) throw error;
      setUpcomingBookings((data || []) as Booking[]);
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch upcoming bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Booking ${newStatus} successfully`
      });

      fetchUpcomingBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date().toDateString();
    const tripDate = new Date(dateString).toDateString();
    return today === tripDate;
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Trip Management</h2>
        <p className="text-muted-foreground">
          Manage your upcoming trips and passenger bookings
        </p>
      </div>

      {upcomingBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Upcoming Trips</h3>
            <p className="text-muted-foreground">
              Your upcoming bookings will appear here when passengers book your rides.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {upcomingBookings.map((booking) => (
            <Card key={booking.id} className={`transition-all hover:shadow-md ${
              isToday(booking.rides.departure_date) ? 'border-primary shadow-lg' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {booking.rides.from_city} → {booking.rides.to_city}
                      {isToday(booking.rides.departure_date) && (
                        <Badge variant="default" className="ml-2">Today</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(booking.rides.departure_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {booking.rides.departure_time}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Passenger Details */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Passenger Details
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {booking.profiles.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{booking.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.seats_booked} seat{booking.seats_booked > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {booking.profiles.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.profiles.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-muted-foreground">Pickup:</span> {booking.rides.pickup_point}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount:</span> ₹{booking.total_price}
                        </div>
                        {booking.passenger_notes && (
                          <div>
                            <span className="text-muted-foreground">Notes:</span> {booking.passenger_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {booking.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Confirm Booking
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  
                  {booking.status === 'confirmed' && (
                    <>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      <Button size="sm" variant="outline">
                        <Navigation className="h-4 w-4 mr-2" />
                        Navigate
                      </Button>
                      {booking.profiles.phone && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`tel:${booking.profiles.phone}`)}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripManagement;