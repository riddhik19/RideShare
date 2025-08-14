import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Shield, Users, Car, Star, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TransferRequest {
  id: string;
  targetRide: {
    id: string;
    driverName: string;
    driverRating: number;
    vehicle: string;
    vehicleColor: string;
    licensePlate: string;
    departureTime: string;
    pickupPoint: string;
  };
  priority: 'PRIMARY' | 'SECONDARY';
  reason: string;
  benefits: string[];
  expiresAt: string;
}

interface SafetyTransferNotificationProps {
  transferRequest: TransferRequest;
  onResponse: (response: 'accepted' | 'declined') => void;
  onExpire: () => void;
}

export const SafetyTransferNotification: React.FC<SafetyTransferNotificationProps> = ({
  transferRequest,
  onResponse,
  onExpire
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(transferRequest.expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);
      
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [transferRequest.expiresAt, onExpire]);

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleResponse = async (response: 'accepted' | 'declined') => {
    if (isResponding) return;
    
    setIsResponding(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('respond-transfer', {
        body: {
          transferRequestId: transferRequest.id,
          response,
          passengerId: userData.user.id
        }
      });

      if (error) throw error;

      toast({
        title: response === 'accepted' ? 'Transfer Accepted' : 'Transfer Declined',
        description: response === 'accepted' 
          ? 'Your booking has been successfully transferred to the safer cab.' 
          : 'You have chosen to keep your original booking.',
      });

      onResponse(response);
    } catch (error: any) {
      console.error('Error responding to transfer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process your response',
        variant: 'destructive'
      });
    } finally {
      setIsResponding(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-orange-200 bg-orange-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-orange-600" />
          <Badge variant={transferRequest.priority === 'PRIMARY' ? 'default' : 'secondary'}>
            {transferRequest.priority === 'PRIMARY' ? 'Priority Transfer' : 'Safe Transfer Available'}
          </Badge>
        </div>
        
        <CardTitle className="text-xl text-orange-900">
          Safer Cab Available for Your Journey
        </CardTitle>
        
        <CardDescription className="text-orange-700">
          We found a more suitable cab that enhances your safety and comfort. This transfer is optional.
        </CardDescription>

        <div className="flex items-center gap-2 mt-2">
          <Clock className="h-4 w-4 text-orange-600" />
          <span className="text-sm text-orange-700 font-medium">
            Expires in: {formatTime(timeLeft)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transfer Reason */}
        <Alert className="border-green-200 bg-green-50">
          <Users className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Why this transfer?</strong> {transferRequest.reason}
          </AlertDescription>
        </Alert>

        {/* New Cab Details */}
        <div className="bg-white p-4 rounded-lg border border-orange-200">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Car className="h-4 w-4" />
            New Cab Details
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Driver:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-medium">{transferRequest.targetRide.driverName}</span>
                <div className="flex items-center gap-1">
                  {renderStars(transferRequest.targetRide.driverRating)}
                  <span className="text-xs text-gray-500">
                    ({transferRequest.targetRide.driverRating || 'New'})
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">Vehicle:</span>
              <p className="font-medium">
                {transferRequest.targetRide.vehicle}
                {transferRequest.targetRide.vehicleColor && ` (${transferRequest.targetRide.vehicleColor})`}
              </p>
              <p className="text-xs text-gray-500">{transferRequest.targetRide.licensePlate}</p>
            </div>
            
            <div>
              <span className="text-gray-600">Departure Time:</span>
              <p className="font-medium">{transferRequest.targetRide.departureTime}</p>
            </div>
            
            <div>
              <span className="text-gray-600">Pickup Point:</span>
              <p className="font-medium">{transferRequest.targetRide.pickupPoint}</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Benefits of This Transfer:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            {transferRequest.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3 pt-4">
        <Button
          onClick={() => handleResponse('accepted')}
          disabled={isResponding || timeLeft === 0}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Accept Transfer
        </Button>
        
        <Button
          onClick={() => handleResponse('declined')}
          disabled={isResponding || timeLeft === 0}
          variant="outline"
          className="flex-1 border-gray-300 hover:bg-gray-50"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Keep Original Booking
        </Button>
      </CardFooter>
    </Card>
  );
};