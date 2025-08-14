import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Clock, Share2, Users, Route, AlertCircle, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TripTracking {
  id: string;
  booking_id: string;
  trip_status: string;
  current_latitude: number | null;
  current_longitude: number | null;
  estimated_arrival: string | null;
  shared_with_emergency_contacts: boolean;
  last_updated: string;
  bookings: {
    rides: {
      from_city: string;
      to_city: string;
      departure_date: string;
      departure_time: string;
      profiles: {
        full_name: string;
        phone: string;
      };
    };
  } | null;
}

const LiveLocationSharing: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTrip, setActiveTrip] = useState<TripTracking | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.id) fetchActiveTrip();
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [profile?.id]);

  const fetchActiveTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_tracking')
        .select(`
          *,
          bookings (
            rides (
              from_city,
              to_city,
              departure_date,
              departure_time,
              profiles:driver_id (
                full_name,
                phone
              )
            )
          )
        `)
        .eq('passenger_id', profile?.id || '')
        .in('trip_status', ['started', 'in_progress'])
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Safely cast bookings or null if join failed
        const trip: TripTracking = {
          id: data.id,
          booking_id: data.booking_id,
          trip_status: data.trip_status || 'started',
          current_latitude: data.current_latitude,
          current_longitude: data.current_longitude,
          estimated_arrival: data.estimated_arrival,
          shared_with_emergency_contacts: data.shared_with_emergency_contacts ?? false,
          last_updated: data.last_updated || new Date().toISOString(),
          bookings: (data.bookings && 'rides' in data.bookings ? data.bookings : null) as TripTracking['bookings'],
        };

        setActiveTrip(trip);
        setLocationSharing(trip.shared_with_emergency_contacts);

        if (trip.trip_status === 'started' || trip.trip_status === 'in_progress') startLocationTracking();
      }
    } catch (error) {
      console.error('Error fetching active trip:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trip information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location Not Supported", description: "Your device doesn't support location tracking", variant: "destructive" });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        if (activeTrip && locationSharing) updateTripLocation(latitude, longitude);
      },
      (error) => {
        console.error('Location error:', error);
        toast({ title: "Location Error", description: "Unable to track your location", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    setWatchId(id);
  };

  const updateTripLocation = async (latitude: number, longitude: number) => {
    if (!activeTrip) return;

    try {
      const { error } = await supabase
        .from('trip_tracking')
        .update({ current_latitude: latitude, current_longitude: longitude, last_updated: new Date().toISOString() })
        .eq('id', activeTrip.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const toggleLocationSharing = async (enabled: boolean) => {
    if (!activeTrip) return;

    try {
      const { error } = await supabase.from('trip_tracking').update({ shared_with_emergency_contacts: enabled }).eq('id', activeTrip.id);
      if (error) throw error;

      setLocationSharing(enabled);

      if (enabled && !watchId) startLocationTracking();
      else if (!enabled && watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      toast({
        title: enabled ? "Location Sharing Enabled" : "Location Sharing Disabled",
        description: enabled ? "Your location is now being shared with emergency contacts" : "Location sharing has been stopped",
      });
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      toast({ title: "Error", description: "Failed to update location sharing settings", variant: "destructive" });
    }
  };

  const shareLocationLink = () => {
    if (!currentLocation) {
      toast({ title: "Location Not Available", description: "Current location is not available", variant: "destructive" });
      return;
    }

    const locationUrl = `https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;

    if (navigator.share) navigator.share({ title: 'My Current Location', text: 'Here is my current location', url: locationUrl });
    else {
      navigator.clipboard.writeText(locationUrl);
      toast({ title: "Location Copied", description: "Location link copied to clipboard" });
    }
  };

  const getTripStatusBadge = (status: string) => {
    switch (status) {
      case 'started': return <Badge className="bg-blue-100 text-blue-800">Started</Badge>;
      case 'in_progress': return <Badge className="bg-green-100 text-green-800">In Progress</Badge>;
      case 'completed': return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      {!activeTrip ? (
        <Card>
          <CardContent className="text-center py-12">
            <Navigation className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Trip</h3>
            <p className="text-muted-foreground">Start a trip to enable live location tracking and sharing</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5" /> Active Trip</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTrip.bookings?.rides ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3>{activeTrip.bookings.rides.from_city} → {activeTrip.bookings.rides.to_city}</h3>
                      <p className="text-sm text-muted-foreground">Driver: {activeTrip.bookings.rides.profiles.full_name}</p>
                    </div>
                    {getTripStatusBadge(activeTrip.trip_status)}
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <div><Clock className="h-4 w-4 inline" /> {activeTrip.bookings.rides.departure_time}</div>
                    {activeTrip.estimated_arrival && <div><Navigation className="h-4 w-4 inline" /> {activeTrip.estimated_arrival}</div>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Trip details not available</p>
              )}
            </CardContent>
          </Card>

          {/* Location Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Emergency Contact Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <Label htmlFor="location-sharing">Share location with emergency contacts</Label>
                <Switch id="location-sharing" checked={locationSharing} onCheckedChange={toggleLocationSharing} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LiveLocationSharing;
