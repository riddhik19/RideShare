import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Star, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Rating {
  id: string;
  rating: number;
  feedback: string;
  created_at: string;
  passenger_id: string;
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
  recentRatings: Rating[];
}

const DriverRatingFeedback: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    averageRating: 0,
    totalRatings: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    recentRatings: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchRatingData();
    }
  }, [profile?.id]);

  const fetchRatingData = async () => {
    if (!profile?.id) return;

    try {
      const { data: ratings, error } = await supabase
        .from('driver_ratings')
        .select(`id, rating, feedback, created_at, passenger_id`)
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map null feedback to empty string to match Rating type
      const safeRatings: Rating[] = (ratings || []).map(r => ({
        id: r.id,
        rating: r.rating,
        feedback: r.feedback || '',
        created_at: r.created_at,
        passenger_id: r.passenger_id
      }));

      const totalRatings = safeRatings.length;
      const averageRating = totalRatings > 0
        ? safeRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      safeRatings.forEach(r => {
        distribution[r.rating as keyof typeof distribution]++;
      });

      setRatingStats({
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        ratingDistribution: distribution,
        recentRatings: safeRatings.slice(0, 10)
      });

    } catch (error) {
      console.error('Error fetching rating data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rating data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Driver Rating & Feedback</h2>
        <p className="text-muted-foreground">
          Your passenger ratings and feedback to improve your service
        </p>
      </div>

      {/* Rating Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${getRatingColor(ratingStats.averageRating)}`}>
                {ratingStats.averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(ratingStats.averageRating), 'lg')}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on {ratingStats.totalRatings} rating{ratingStats.totalRatings !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ratingStats.totalRatings}</div>
            <p className="text-xs text-muted-foreground">
              {ratingStats.recentRatings.filter(r => r.feedback).length} with feedback
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {ratingStats.averageRating >= 4.0 ? '↗' : ratingStats.averageRating >= 3.0 ? '→' : '↘'}
            </div>
            <p className="text-xs text-muted-foreground">
              {ratingStats.averageRating >= 4.0 ? 'Excellent' : 
               ratingStats.averageRating >= 3.0 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingStats.ratingDistribution[rating];
              const percentage = ratingStats.totalRatings > 0 
                ? (count / ratingStats.totalRatings) * 100 
                : 0;

              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {ratingStats.recentRatings.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground">
                Complete more rides to start receiving passenger feedback.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratingStats.recentRatings.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Passenger Review</h4>
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          <span className="text-sm text-muted-foreground">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {review.rating}/5 Stars
                    </Badge>
                  </div>
                  
                  {review.feedback && (
                    <div className="bg-muted/50 rounded-md p-3 mt-3">
                      <p className="text-sm italic">"{review.feedback}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverRatingFeedback;
