// Fixed ReturnRideForm.tsx - corrected database field mapping and constraint validation
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Clock, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const returnRideSchema = z.object({
  enableReturnRide: z.boolean().default(false),
  returnDate: z.date().optional(),
  returnTime: z.string().optional(),
  returnPickupPoint: z.string().optional(),
  returnAvailableSeats: z.coerce.number().min(1).max(8).optional(),
  returnPricePerSeat: z.coerce.number().min(0.01).optional(),
  returnNotes: z.string().optional(),
}).refine((data) => {
  if (data.enableReturnRide) {
    return data.returnDate && data.returnTime && data.returnPickupPoint && 
           data.returnAvailableSeats && data.returnPricePerSeat;
  }
  return true;
}, {
  message: "All return ride fields are required when return ride is enabled",
  path: ["enableReturnRide"]
});

type ReturnRideFormData = z.infer<typeof returnRideSchema>;

interface ReturnRideFormProps {
  originalRide: {
    fromCity: string;
    toCity: string;
    departureDate: Date;
    vehicleId: string;
    availableSeats: number;
    pricePerSeat: number;
  };
  onSuccess: (returnRideData?: any) => void;
}

export const ReturnRideForm: React.FC<ReturnRideFormProps> = ({ 
  originalRide, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [vehicleInfo, setVehicleInfo] = React.useState<any>(null);

  const form = useForm<ReturnRideFormData>({
    resolver: zodResolver(returnRideSchema),
    defaultValues: {
      enableReturnRide: false,
      returnAvailableSeats: originalRide.availableSeats,
      returnPricePerSeat: originalRide.pricePerSeat,
      returnDate: addDays(originalRide.departureDate, 1),
    },
  });

  const watchEnableReturn = form.watch('enableReturnRide');

  // ✅ ADDED: Fetch vehicle information to get seat capacity
  React.useEffect(() => {
    const fetchVehicleInfo = async () => {
      if (!originalRide.vehicleId) return;
      
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', originalRide.vehicleId)
          .single();

        if (error) {
          console.error('Error fetching vehicle info:', error);
          return;
        }

        setVehicleInfo(data);
        
        // ✅ FIXED: Update form with correct max seats based on vehicle capacity
        if (data && data.seat_capacity) {
          const maxSeats = Math.min(originalRide.availableSeats, data.seat_capacity);
          form.setValue('returnAvailableSeats', maxSeats);
        }
      } catch (error) {
        console.error('Error fetching vehicle info:', error);
      }
    };

    fetchVehicleInfo();
  }, [originalRide.vehicleId, originalRide.availableSeats, form]);

  // ✅ COMPLETELY FIXED: onSubmit function with proper validation
  const onSubmit = async (data: ReturnRideFormData) => {
    if (!user || !data.enableReturnRide) {
      onSuccess();
      return;
    }
    
    setLoading(true);
    
    try {
      // ✅ VALIDATION: Ensure we have vehicle info
      if (!vehicleInfo) {
        throw new Error('Vehicle information not available. Please try again.');
      }

      // ✅ CRITICAL FIX: Validate available seats against vehicle capacity
      const vehicleSeatCapacity = vehicleInfo.seat_capacity;
      const requestedSeats = data.returnAvailableSeats!;
      const validatedSeats = Math.min(requestedSeats, vehicleSeatCapacity);

      if (validatedSeats <= 0) {
        throw new Error('Available seats must be greater than 0');
      }

      if (requestedSeats > vehicleSeatCapacity) {
        console.warn(`Requested seats (${requestedSeats}) exceeds vehicle capacity (${vehicleSeatCapacity}). Using ${validatedSeats} seats.`);
      }

      // ✅ FIXED: Properly format departure timestamp
      const departureTimestamp = new Date(
        `${format(data.returnDate!, 'yyyy-MM-dd')}T${data.returnTime!}`
      ).toISOString();

      // ✅ VALIDATION: Check departure time is in the future
      if (new Date(departureTimestamp) <= new Date()) {
        throw new Error('Return departure time must be in the future');
      }

      // ✅ FIXED: Prepare return ride data with all required fields and proper validation
      const returnRideData = {
        driver_id: user.id,
        vehicle_id: originalRide.vehicleId,
        from_city: originalRide.toCity.trim(),
        to_city: originalRide.fromCity.trim(),
        departure_date: format(data.returnDate!, 'yyyy-MM-dd'),
        departure_time: data.returnTime!,
        departure_timestamp: departureTimestamp, // ✅ Required field
        pickup_point: data.returnPickupPoint!.trim(),
        available_seats: validatedSeats, // ✅ FIXED: Use validated seats
        total_seats: vehicleSeatCapacity, // ✅ FIXED: Set to vehicle capacity
        price_per_seat: data.returnPricePerSeat!,
        base_price: data.returnPricePerSeat!, // ✅ FIXED: Set base_price
        notes: data.returnNotes?.trim() || null,
        status: 'active', // ✅ FIXED: Use correct status field
        vehicle_type: vehicleInfo.car_type || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // ✅ ADDITIONAL VALIDATION: Client-side checks
      if (returnRideData.from_city === returnRideData.to_city) {
        throw new Error('From and To cities cannot be the same');
      }

      console.log('📝 Validated return ride data:', returnRideData);

      const { data: insertedRide, error } = await supabase
        .from('rides')
        .insert(returnRideData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error details:', error);
        
        // ✅ IMPROVED: Better error handling with specific messages
        let errorMessage = error.message;
        
        if (error.code === '23514') {
          if (error.message.includes('check_available_seats_valid')) {
            errorMessage = `Available seats (${returnRideData.available_seats}) cannot exceed vehicle capacity (${vehicleSeatCapacity}). Please reduce the number of available seats.`;
          } else if (error.message.includes('check_base_price_positive')) {
            errorMessage = 'Return ride price must be greater than 0';
          } else if (error.message.includes('check_total_seats_range')) {
            errorMessage = 'Total seats must be between 1 and 8';
          } else {
            errorMessage = 'The return ride data violates database constraints. Please check your input values.';
          }
        } else if (error.code === '23505') {
          errorMessage = 'A similar return ride already exists. Please modify your return ride details.';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'A return ride with these details already exists.';
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid vehicle or user reference.';
        } else if (error.message.includes('not-null constraint')) {
          errorMessage = 'Missing required fields for return ride.';
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Return ride created successfully:', insertedRide);

      toast({
        title: 'Success',
        description: 'Return ride posted successfully!',
      });
      
      onSuccess(insertedRide);
    } catch (error: unknown) {
      console.error('❌ Error posting return ride:', error);
      
      let errorMessage = 'Please try again.';
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      toast({
        title: 'Error',
        description: `Failed to post return ride: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADDED: Get max seats for validation
  const maxSeats = vehicleInfo?.seat_capacity || 8;
  const watchedSeats = form.watch('returnAvailableSeats');

  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RotateCcw className="h-5 w-5 text-primary" />
          <span>Return Journey</span>
          <Badge variant="secondary" className="ml-auto">
            <ArrowLeftRight className="h-3 w-3 mr-1" />
            Optional
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Enable Return Ride Toggle */}
            <FormField
              control={form.control}
              name="enableReturnRide"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Post Return Ride
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Automatically create a return journey from {originalRide.toCity} to {originalRide.fromCity}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchEnableReturn && (
              <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                {/* Return Route Preview */}
                <div className="flex items-center justify-center p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="font-medium">{originalRide.toCity}</span>
                    <ArrowLeftRight className="h-4 w-4 text-primary" />
                    <span className="font-medium">{originalRide.fromCity}</span>
                  </div>
                </div>

                {/* ✅ ADDED: Vehicle Information Display */}
                {vehicleInfo && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Vehicle Information</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Model:</span> {vehicleInfo.car_model}</p>
                      <p><span className="font-medium">Type:</span> {vehicleInfo.car_type}</p>
                      <p><span className="font-medium">Capacity:</span> {vehicleInfo.seat_capacity} seats</p>
                      <p><span className="font-medium">License:</span> {vehicleInfo.license_plate}</p>
                    </div>
                  </div>
                )}

                {/* Return Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="returnDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Return Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick return date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="returnTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Time</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="time" {...field} />
                            <Clock className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Return Pickup Point */}
                <FormField
                  control={form.control}
                  name="returnPickupPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Pickup Point</FormLabel>
                      <FormControl>
                        <Input placeholder={`Enter pickup location in ${originalRide.toCity}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Return Seats and Price */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="returnAvailableSeats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Seats</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max={maxSeats}
                            {...field} 
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground">
                          {vehicleInfo ? 
                            `Max: ${vehicleInfo.seat_capacity} seats (${vehicleInfo.car_model})` : 
                            'Loading vehicle info...'
                          }
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="returnPricePerSeat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Seat</FormLabel>
                        <FormControl>
                          <Input type="number" min="0.01" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* ✅ ADDED: Validation warning for seat capacity */}
                {vehicleInfo && watchedSeats && watchedSeats > vehicleInfo.seat_capacity && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Available seats ({watchedSeats}) cannot exceed vehicle capacity ({vehicleInfo.seat_capacity}). 
                      It will be automatically adjusted to {vehicleInfo.seat_capacity}.
                    </p>
                  </div>
                )}

                {/* Return Notes */}
                <FormField
                  control={form.control}
                  name="returnNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Journey Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional information for return passengers..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={loading || (watchEnableReturn && !vehicleInfo)}>
                {loading ? 'Processing...' : watchEnableReturn ? 'Post Both Rides' : 'Continue'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};