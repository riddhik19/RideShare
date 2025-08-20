import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { submitDriverRating, getExistingRating, canRateBooking } from '@/integrations/supabase/ratingService';

interface TripHistory {
  id: string;
  seats_booked: number;
  total_price: number;
  status: string;
  passenger_notes: string;
  created_at: string;
  rides: {
    id: string;
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
  existing_rating?: {
    id: string;
    rating: number;
    feedback: string;
  } | null;
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
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    fetchTripHistory();
  }, [profile?.id]);

  const fetchTripHistory = async () => {
    if (!profile?.id) {
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
          ride_id,
          rides (
            id,
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
          )
        `)
        .eq('passenger_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch existing ratings for each trip
      const tripsWithRatings = await Promise.all(
        (data || []).map(async (trip) => {
          if (trip.rides && trip.status === 'confirmed') {
            const existingRating = await getExistingRating(trip.id);
            return {
              ...trip,
              existing_rating: existingRating
            };
          }
          return {
            ...trip,
            existing_rating: null
          };
        })
      );

      setTrips(tripsWithRatings.filter(trip => trip.rides) as TripHistory[]);
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

  const handleRatingSubmit = async () => {
    if (!selectedTrip || !profile?.id) return;

    setSubmittingRating(true);
    try {
      const result = await submitDriverRating(
        selectedTrip.rides.driver_id,
        selectedTrip.id,
        ratingForm.rating,
        ratingForm.feedback.trim()
      );

      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        });

        setIsRatingDialogOpen(false);
        setSelectedTrip(null);
        setRatingForm({ rating: 5, feedback: '' });
        fetchTripHistory(); // Refresh to show the rating
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
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

  const openRatingDialog = (trip: TripHistory) => {
    setSelectedTrip(trip);
    
    // Pre-populate form if rating exists
    if (trip.existing_rating) {
      setRatingForm({
        rating: trip.existing_rating.rating,
        feedback: trip.existing_rating.feedback || ''
      });
    } else {
      setRatingForm({ rating: 5, feedback: '' });
    }
    
    setIsRatingDialogOpen(true);
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

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm', interactive: boolean = false) => {
    const sizeClass = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';
    
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={interactive ? () => setRatingForm(prev => ({ ...prev, rating: star })) : undefined}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} focus:outline-none`}
            disabled={!interactive}
          >
            <Star
              className={`${sizeClass} ${
                star <= rating 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-gray-300'
              } ${interactive ? 'hover:text-yellow-200' : ''}`}
            />
          </button>
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
        
        <Button variant="outline" size="sm">
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
                {trip.existing_rating ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Your Rating</h4>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(trip.existing_rating.rating)}
                      <span className="text-sm text-green-700">
                        {trip.existing_rating.rating}/5 stars
                      </span>
                    </div>
                    {trip.existing_rating.feedback && (
                      <p className="text-sm text-green-700 italic">
                        "{trip.existing_rating.feedback}"
                      </p>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="mt-2"
                      onClick={() => openRatingDialog(trip)}
                    >
                      Edit Rating
                    </Button>
                  </div>
                ) : trip.status === 'confirmed' ? (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      How was your trip experience?
                    </p>
                    
                    <Button 
                      size="sm" 
                      onClick={() => openRatingDialog(trip)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Rate Driver
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTrip?.existing_rating ? 'Edit Your Rating' : 'Rate Your Driver'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTrip && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Trip Details</h4>
                <p className="text-sm">{selectedTrip.rides.from_city} → {selectedTrip.rides.to_city}</p>
                <p className="text-sm text-muted-foreground">
                  Driver: {selectedTrip.rides.profiles?.full_name || 'Unknown Driver'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Date: {formatDate(selectedTrip.rides.departure_date)}
                </p>
              </div>
              
              <div>
                <Label>Rating</Label>
                <div className="flex items-center gap-2 mt-2">
                  {renderStars(ratingForm.rating, 'lg', true)}
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
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsRatingDialogOpen(false)}
                  disabled={submittingRating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRatingSubmit} 
                  disabled={submittingRating}
                  className="flex-1"
                >
                  {submittingRating ? 'Submitting...' : (selectedTrip.existing_rating ? 'Update Rating' : 'Submit Rating')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripHistory;