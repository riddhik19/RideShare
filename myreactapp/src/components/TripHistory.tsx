import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, Star, Phone, Car, Clock, MessageSquare, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TripHistory {
  id: string;
  seats_booked: number;
  total_price: number;
  status: string;
  passenger_notes: string;
  created_at: string;
  rides: {
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    pickup_point: string;
    driver_id: string;
    profiles: {
      full_name: string;
      phone: string;
      average_rating: number;
      total_ratings: number;
    } | null;
    vehicles: {
      car_model: string;
      car_type: string;
      color: string;
    } | null;
  };
  driver_ratings?: Array<{
    rating: number;
    feedback: string;
  }>;
}

const TripHistory: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<TripHistory[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripHistory | null>(null);
  const [ratingForm, setRatingForm] = useState({
    rating: 5,
    feedback: ''
  });
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    fetchTripHistory();
  }, [profile?.id]);

  const fetchTripHistory = async () => {
    if (!profile?.id) {
      console.log('No profile ID available');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          seats_booked,
          total_price,
          status,
          passenger_notes,
          created_at,
          ride_id
        `)
        .eq('passenger_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch ride details and ratings separately for better type safety
      const tripsWithDetails = await Promise.all((data || []).map(async (booking) => {
        const { data: ride } = await supabase
          .from('rides')
          .select(`
            from_city,
            to_city,
            departure_date,
            departure_time,
            pickup_point,
            driver_id,
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
          .eq('id', booking.ride_id)
          .single();

        const { data: ratings } = await supabase
          .from('driver_ratings')
          .select('rating, feedback')
          .eq('booking_id', booking.id);

        return {
          ...booking,
          rides: ride,
          driver_ratings: ratings || []
        };
      }));

      setTrips(tripsWithDetails.filter(trip => trip.rides) as TripHistory[]);
    } catch (error) {
      console.error('Error fetching trip history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trip history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!selectedTrip || !profile?.id) return;

    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('driver_ratings')
        .upsert({
          driver_id: selectedTrip.rides.driver_id,
          passenger_id: profile.id,
          booking_id: selectedTrip.id,
          rating: ratingForm.rating,
          feedback: ratingForm.feedback
        });

      if (error) throw error;

      toast({
        title: "Rating Submitted",
        description: "Thank you for rating your driver!"
      });

      setSelectedTrip(null);
      setRatingForm({ rating: 5, feedback: '' });
      fetchTripHistory(); // Refresh to show the rating

    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive"
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('passenger_id', profile.id);

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully."
      });

      fetchTripHistory(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive"
      });
    }
  };

  const downloadTripHistory = () => {
    const csvContent = [
      ['Date', 'From', 'To', 'Driver', 'Seats', 'Amount', 'Status'],
      ...trips.map(trip => [
        new Date(trip.rides.departure_date).toLocaleDateString(),
        trip.rides.from_city,
        trip.rides.to_city,
        trip.rides.profiles?.full_name || 'Unknown Driver',
        trip.seats_booked.toString(),
        trip.total_price.toString(),
        trip.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Trip History</h2>
          <p className="text-muted-foreground">
            View your past bookings and rate your experiences
          </p>
        </div>
        
        <Button onClick={downloadTripHistory} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download History
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Trip History</h3>
            <p className="text-muted-foreground">
              Your completed trips will appear here after you book and travel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">
                        {trip.rides.from_city} → {trip.rides.to_city}
                      </h3>
                      {getStatusBadge(trip.status)}
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(trip.rides.departure_date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {trip.rides.departure_time}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {trip.rides.pickup_point}
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        {trip.rides.vehicles?.car_model || 'Vehicle info unavailable'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">₹{trip.total_price}</div>
                    <div className="text-sm text-muted-foreground">
                      {trip.seats_booked} seat{trip.seats_booked > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Driver Information */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {trip.rides.profiles?.full_name?.charAt(0) || 'D'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{trip.rides.profiles?.full_name || 'Unknown Driver'}</p>
                        <div className="flex items-center gap-2">
                          {renderStars(trip.rides.profiles?.average_rating || 0)}
                          <span className="text-xs text-muted-foreground">
                            ({trip.rides.profiles?.total_ratings || 0} ratings)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <p><span className="text-muted-foreground">Vehicle:</span> {trip.rides.vehicles?.car_type || 'N/A'}</p>
                      <p><span className="text-muted-foreground">Color:</span> {trip.rides.vehicles?.color || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Trip Notes */}
                {trip.passenger_notes && (
                  <div className="bg-background border rounded-lg p-3 mb-4">
                    <p className="text-sm"><span className="font-medium">Your Notes:</span> {trip.passenger_notes}</p>
                  </div>
                )}

                {/* Rating Section */}
                {trip.driver_ratings && trip.driver_ratings.length > 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Your Rating</h4>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(trip.driver_ratings[0].rating)}
                      <span className="text-sm text-green-700">
                        {trip.driver_ratings[0].rating}/5 stars
                      </span>
                    </div>
                    {trip.driver_ratings[0].feedback && (
                      <p className="text-sm text-green-700 italic">
                        "{trip.driver_ratings[0].feedback}"
                      </p>
                    )}
                  </div>
                ) : trip.status === 'confirmed' ? (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      How was your trip experience?
                    </p>
                    
                    <Dialog open={selectedTrip?.id === trip.id} onOpenChange={(open) => !open && setSelectedTrip(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedTrip(trip)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Rate Driver
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rate Your Driver</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="bg-muted/50 rounded-lg p-4">
                            <h4 className="font-semibold mb-2">Trip Details</h4>
                            <p className="text-sm">{trip.rides.from_city} → {trip.rides.to_city}</p>
                            <p className="text-sm text-muted-foreground">
                              Driver: {trip.rides.profiles?.full_name || 'Unknown Driver'}
                            </p>
                          </div>
                          
                          <div>
                            <Label>Rating</Label>
                            <div className="flex items-center gap-2 mt-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setRatingForm(prev => ({ ...prev, rating: star }))}
                                  className="focus:outline-none"
                                >
                                  <Star
                                    className={`h-8 w-8 cursor-pointer transition-colors ${
                                      star <= ratingForm.rating 
                                        ? 'text-yellow-400 fill-yellow-400' 
                                        : 'text-gray-300 hover:text-yellow-200'
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {ratingForm.rating}/5 stars
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="feedback">Feedback (Optional)</Label>
                            <Textarea
                              id="feedback"
                              placeholder="Share your experience with other passengers..."
                              value={ratingForm.feedback}
                              onChange={(e) => setRatingForm(prev => ({ 
                                ...prev, 
                                feedback: e.target.value 
                              }))}
                            />
                          </div>
                          
                          <Button 
                            onClick={submitRating} 
                            disabled={submittingRating}
                            className="w-full"
                          >
                            {submittingRating ? 'Submitting...' : 'Submit Rating'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : null}

                {/* Action Buttons for Active/Upcoming Trips */}
                {trip.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact Driver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCancelBooking(trip.id)}
                    >
                      Cancel Booking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripHistory;