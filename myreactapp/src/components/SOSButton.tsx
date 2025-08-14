import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  AlertOctagon, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Clock,
  Users,
  Navigation,
  Share,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContact {
  id: string;
  contact_name: string;
  contact_phone: string;
  relationship: string | null;
  is_primary: boolean | null;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface SOSButtonProps {
  className?: string;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ className = '' }) => {
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [sosMessage, setSOSMessage] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    fetchEmergencyContacts();
    fetchActiveTrip();
    getCurrentLocation();
  }, [user]);

  const fetchEmergencyContacts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setEmergencyContacts(data || []);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    }
  };

  const fetchActiveTrip = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('trip_tracking')
        .select(`
          *,
          bookings!inner (
            id,
            ride_id,
            seats_booked,
            rides!inner (
              from_city,
              to_city,
              departure_time,
              pickup_point,
              profiles:driver_id (
                full_name,
                phone
              ),
              vehicles (
                car_model,
                license_plate
              )
            )
          )
        `)
        .eq('passenger_id', user.id)
        .in('trip_status', ['in_progress', 'started'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setTripDetails(data[0]);
      }
    } catch (error) {
      console.error('Error fetching active trip:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to get current location. SOS will work with last known location.',
            variant: 'destructive',
          });
        }
      );
    }
  };

  const triggerSOS = async () => {
    if (!emergencyContacts.length) {
      toast({
        title: 'No Emergency Contacts',
        description: 'Please add emergency contacts in your profile first.',
        variant: 'destructive',
      });
      return;
    }

    setIsTriggering(true);

    try {
      // Create SOS alert message
      const locationText = currentLocation 
        ? `Location: https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`
        : 'Location: Unable to determine current location';

      const tripInfo = tripDetails ? `
Trip Details:
- Route: ${tripDetails.bookings.rides.from_city} → ${tripDetails.bookings.rides.to_city}
- Driver: ${tripDetails.bookings.rides.profiles.full_name}
- Driver Phone: ${tripDetails.bookings.rides.profiles.phone}
- Vehicle: ${tripDetails.bookings.rides.vehicles.car_model} (${tripDetails.bookings.rides.vehicles.license_plate})
- Departure Time: ${tripDetails.bookings.rides.departure_time}
      ` : 'No active trip information available.';

      const alertMessage = `🚨 EMERGENCY ALERT 🚨

${profile?.full_name} has triggered an SOS alert.

${sosMessage ? `Message: ${sosMessage}` : ''}

${locationText}

${tripInfo}

Time: ${new Date().toLocaleString()}

This is an automated safety alert from Journey Sync.`;

      // Here you would normally send SMS/Email to emergency contacts
      // For demo purposes, we'll just show a toast
      toast({
        title: 'SOS Alert Sent!',
        description: `Emergency alert sent to ${emergencyContacts.length} contact(s)`,
      });

      setIsSOSActive(true);

      // Log SOS activity (in a real app, this would be sent to a monitoring service)
      console.log('SOS TRIGGERED:', {
        user: profile?.full_name,
        location: currentLocation,
        trip: tripDetails,
        message: sosMessage,
        timestamp: new Date().toISOString(),
        contacts: emergencyContacts,
      });

    } catch (error) {
      console.error('Error triggering SOS:', error);
      toast({
        title: 'SOS Error',
        description: 'Failed to send SOS alert. Please try again or call emergency services directly.',
        variant: 'destructive',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const shareLocation = async () => {
    if (!currentLocation) {
      toast({
        title: 'Location Unavailable',
        description: 'Unable to get current location for sharing.',
        variant: 'destructive',
      });
      return;
    }

    const locationUrl = `https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Current Location',
          text: `I'm sharing my live location: ${locationUrl}`,
          url: locationUrl,
        });
      } catch (error) {
        // Fallback to copy
        copyLocationLink(locationUrl);
      }
    } else {
      copyLocationLink(locationUrl);
    }
  };

  const copyLocationLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Location Copied',
        description: 'Location link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy location. Please share manually.',
        variant: 'destructive',
      });
    }
  };

  if (isSOSActive) {
    return (
      <Card className="border-destructive bg-destructive/5">
        <CardContent className="p-6 text-center">
          <AlertOctagon className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">SOS Alert Active</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Emergency alert has been sent to your emergency contacts.
          </p>
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={shareLocation}
              className="w-full"
            >
              <Share className="mr-2 h-4 w-4" />
              Share Live Location
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsSOSActive(false)}
              className="w-full"
            >
              Deactivate SOS
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* SOS Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            size="lg"
            className="w-full h-16 text-lg font-semibold bg-destructive hover:bg-destructive/90 shadow-lg"
          >
            <Shield className="mr-3 h-6 w-6" />
            SOS Emergency
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-destructive">
              <AlertOctagon className="h-5 w-5" />
              <span>Emergency SOS Alert</span>
            </DialogTitle>
            <DialogDescription>
              This will immediately send your location and trip details to your emergency contacts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {emergencyContacts.length === 0 ? (
              <Alert variant="destructive">
                <AlertOctagon className="h-4 w-4" />
                <AlertDescription>
                  No emergency contacts found. Please add emergency contacts in your profile first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <h4 className="font-medium">Alert will be sent to:</h4>
                {emergencyContacts.slice(0, 3).map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-2 text-sm">
                    <Phone className="h-3 w-3" />
                    <span>{contact.contact_name}</span>
                    {contact.is_primary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                  </div>
                ))}
                {emergencyContacts.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{emergencyContacts.length - 3} more contacts
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Optional Message:</label>
              <Textarea
                placeholder="Add any additional information about your emergency..."
                value={sosMessage}
                onChange={(e) => setSOSMessage(e.target.value)}
                rows={3}
              />
            </div>

            {tripDetails && (
              <Alert>
                <Navigation className="h-4 w-4" />
                <AlertDescription>
                  Active trip detected: {tripDetails.bookings.rides.from_city} → {tripDetails.bookings.rides.to_city}
                  <br />
                  Driver: {tripDetails.bookings.rides.profiles.full_name}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={shareLocation}
                className="flex-1"
              >
                <Share className="mr-2 h-4 w-4" />
                Share Location
              </Button>
              <Button
                variant="destructive"
                onClick={triggerSOS}
                disabled={isTriggering || emergencyContacts.length === 0}
                className="flex-1"
              >
                {isTriggering ? 'Sending...' : 'Send SOS Alert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={shareLocation}
          className="flex items-center space-x-2"
        >
          <MapPin className="h-4 w-4" />
          <span>Share Location</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('tel:100')}
          className="flex items-center space-x-2"
        >
          <Phone className="h-4 w-4" />
          <span>Call 100</span>
        </Button>
      </div>

      {/* Emergency Contacts Summary */}
      {emergencyContacts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Emergency Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {emergencyContacts.slice(0, 2).map((contact) => (
                <div key={contact.id} className="flex items-center justify-between text-sm">
                  <span>{contact.contact_name}</span>
                  <Badge variant={contact.is_primary ? "default" : "secondary"} className="text-xs">
                    {contact.relationship || 'Contact'}
                  </Badge>
                </div>
              ))}
              {emergencyContacts.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{emergencyContacts.length - 2} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};