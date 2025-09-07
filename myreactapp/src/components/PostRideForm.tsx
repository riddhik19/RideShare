// Fixed PostRideForm.tsx - Key fixes:
// 1. Ensure available_seats <= total_seats
// 2. Add proper validation before submission
// 3. Handle all required fields correctly

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Route, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AddVehicleForm } from './AddVehicleForm';
import { ReturnRideForm } from './ReturnRideForm';
import { RouteVisualization } from './RouteVisualization';
import { CitySearch } from '@/components/ui/city-search';
import { EnhancedSeatVisualization } from './EnhancedSeatVisualization';

const postRideSchema = z.object({
  fromCity: z.string().min(1, 'From city is required'),
  toCity: z.string().min(1, 'To city is required'),
  departureDate: z.date({
    required_error: 'Departure date is required',
  }),
  departureTime: z.string().min(1, 'Departure time is required'),
  pickupPoint: z.string().min(1, 'Pickup point is required'),
  availableSeats: z.coerce.number().min(1, 'Must have at least 1 seat').max(8, 'Maximum 8 seats'),
  basePrice: z.coerce.number().min(0.01, 'Base price must be greater than 0'),
  vehicleId: z.string().min(1, 'Please select a vehicle'),
  notes: z.string().optional(),
});

type PostRideFormData = z.infer<typeof postRideSchema>;

interface PostRideFormProps {
  onSuccess: () => void;
  editData?: any;
}

export const PostRideForm: React.FC<PostRideFormProps> = ({ onSuccess, editData }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<'details' | 'pricing' | 'route' | 'return'>('details');
  const [ridePosted, setRidePosted] = React.useState(false);

  const form = useForm<PostRideFormData>({
    resolver: zodResolver(postRideSchema),
    defaultValues: {
      fromCity: editData?.from_city || '',
      toCity: editData?.to_city || '',
      departureDate: editData?.departure_date ? new Date(editData.departure_date) : undefined,
      departureTime: editData?.departure_time || '',
      pickupPoint: editData?.pickup_point || '',
      availableSeats: editData?.available_seats || 1,
      basePrice: editData?.base_price || editData?.price_per_seat || 0,
      vehicleId: editData?.vehicle_id || '',
      notes: editData?.notes || '',
    },
  });

  React.useEffect(() => {
    const fetchVehicles = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', user.id);
      
      if (error) {
        console.error('Error fetching vehicles:', error);
        toast({
          title: 'Error',
          description: 'Failed to load vehicles',
          variant: 'destructive',
        });
        return;
      }
      
      setVehicles(data || []);
    };

    fetchVehicles();
  }, [user, toast]);

  const handleVehicleAdded = () => {
    setIsAddVehicleOpen(false);
    // Refetch vehicles
    if (user) {
      supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', user.id)
        .then(({ data }) => {
          setVehicles(data || []);
        });
    }
  };

  // ✅ FIXED: Completely rewritten onSubmit with proper validation
  const onSubmit = async (data: PostRideFormData) => {
    if (!user) return;
    
    setLoading(true);

    try {
      // ✅ CRITICAL FIX: Get vehicle seat capacity to validate available_seats
      const selectedVehicle = vehicles.find(v => v.id === data.vehicleId);
      if (!selectedVehicle) {
        throw new Error('Please select a valid vehicle');
      }

      const vehicleSeatCapacity = selectedVehicle.seat_capacity;
      
      // ✅ CRITICAL FIX: Ensure available_seats doesn't exceed vehicle capacity
      const availableSeats = Math.min(data.availableSeats, vehicleSeatCapacity);
      
      // ✅ FIXED: Properly format departure timestamp
      const departureTimestamp = new Date(
        `${format(data.departureDate, 'yyyy-MM-dd')}T${data.departureTime}`
      ).toISOString();
      
      // ✅ FIXED: Prepare ride data with all required fields and constraints
      const rideData = {
        driver_id: user.id,
        vehicle_id: data.vehicleId,
        from_city: data.fromCity.trim(),
        to_city: data.toCity.trim(),
        departure_date: format(data.departureDate, 'yyyy-MM-dd'),
        departure_time: data.departureTime,
        departure_timestamp: departureTimestamp,
        pickup_point: data.pickupPoint.trim(),
        available_seats: availableSeats, // ✅ FIXED: Use validated available seats
        total_seats: vehicleSeatCapacity, // ✅ FIXED: Set to vehicle capacity
        base_price: data.basePrice,
        price_per_seat: data.basePrice,
        notes: data.notes?.trim() || null,
        status: 'active',
        vehicle_type: selectedVehicle.car_type || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // ✅ VALIDATION: Additional client-side checks before sending to database
      if (rideData.available_seats <= 0) {
        throw new Error('Available seats must be greater than 0');
      }
      
      if (rideData.available_seats > vehicleSeatCapacity) {
        throw new Error(`Available seats cannot exceed vehicle capacity (${vehicleSeatCapacity})`);
      }

      if (rideData.from_city === rideData.to_city) {
        throw new Error('From and To cities cannot be the same');
      }

      if (new Date(departureTimestamp) <= new Date()) {
        throw new Error('Departure time must be in the future');
      }

      console.log('🚗 Validated ride data:', rideData);
      
      let result;
      
      if (editData) {
        result = await supabase
          .from('rides')
          .update({
            ...rideData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editData.id)
          .select();
      } else {
        result = await supabase
          .from('rides')
          .insert(rideData)
          .select();
      }
      
      console.log('🚗 Database operation result:', result);
      
      if (result.error) {
        console.error('❌ Database error details:', result.error);
        
        // ✅ IMPROVED: Better error handling with specific messages
        let errorMessage = result.error.message;
        
        if (result.error.code === '23514') {
          if (result.error.message.includes('check_available_seats_valid')) {
            errorMessage = `Available seats (${rideData.available_seats}) cannot exceed vehicle capacity (${vehicleSeatCapacity}). Please reduce the number of available seats.`;
          } else if (result.error.message.includes('check_base_price_positive')) {
            errorMessage = 'Price must be greater than 0';
          } else if (result.error.message.includes('check_total_seats_range')) {
            errorMessage = 'Total seats must be between 1 and 8';
          } else {
            errorMessage = 'The ride data violates database constraints. Please check your input values.';
          }
        } else if (result.error.code === '23505') {
          errorMessage = 'A similar ride already exists. Please modify your ride details.';
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('✅ Ride operation successful:', result.data);
      
      toast({
        title: 'Success',
        description: editData ? 'Ride updated successfully!' : 'Ride posted successfully!',
      });
      
      if (!editData) {
        setRidePosted(true);
        setCurrentStep('return');
      } else {
        form.reset();
        onSuccess();
      }
    } catch (error: any) {
      console.error('❌ Error in ride operation:', error);
      
      toast({
        title: 'Error',
        description: error.message || (editData ? 'Failed to update ride' : 'Failed to post ride'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReturnRideComplete = (returnRideData?: any) => {
    if (returnRideData) {
      toast({
        title: 'All Set!',
        description: 'Both rides have been posted successfully.',
      });
    }
    form.reset();
    onSuccess();
  };

  const handleNextStep = () => {
    if (currentStep === 'details') {
      const isValid = form.formState.isValid;
      if (isValid) {
        setCurrentStep('pricing');
      } else {
        form.trigger();
      }
    } else if (currentStep === 'pricing') {
      setCurrentStep('route');
    } else if (currentStep === 'route') {
      setCurrentStep('return');
    }
  };

  const watchedValues = form.watch();
  const canShowRoute = watchedValues.fromCity && watchedValues.toCity;
  const canShowPricing = watchedValues.availableSeats && watchedValues.basePrice;

  // ✅ FIXED: Get selected vehicle for validation display
  const selectedVehicle = vehicles.find(v => v.id === watchedValues.vehicleId);
  const maxSeats = selectedVehicle?.seat_capacity || 8;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="details" className="flex items-center space-x-2">
            <Route className="h-4 w-4" />
            <span>Details</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" disabled={!watchedValues.availableSeats} className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="route" disabled={!canShowRoute} className="flex items-center space-x-2">
            <Route className="h-4 w-4" />
            <span>Preview</span>
          </TabsTrigger>
          <TabsTrigger value="return" disabled={!ridePosted || editData} className="flex items-center space-x-2">
            <ArrowRight className="h-4 w-4" />
            <span>Return</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From City</FormLabel>
                      <FormControl>
                        <CitySearch 
                          placeholder="Search departure city..."
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="toCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To City</FormLabel>
                      <FormControl>
                        <CitySearch 
                          placeholder="Search destination city..."
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departureDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Departure Date</FormLabel>
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
                                <span>Pick a date</span>
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
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Time</FormLabel>
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

              <FormField
                control={form.control}
                name="pickupPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Point</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter pickup location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle</FormLabel>
                      <div className="space-y-2">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.car_model} ({vehicle.license_plate}) - {vehicle.seat_capacity} seats
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {vehicles.length === 0 && (
                          <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="sm" className="w-full">
                                Add Vehicle First
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Vehicle</DialogTitle>
                                <DialogDescription>
                                  Add a vehicle to post rides
                                </DialogDescription>
                              </DialogHeader>
                              <AddVehicleForm onSuccess={handleVehicleAdded} />
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availableSeats"
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
                      <FormDescription>
                        {selectedVehicle ? 
                          `Max: ${selectedVehicle.seat_capacity} seats (${selectedVehicle.car_model})` : 
                          'Select vehicle first'
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (Middle Seat)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0.01" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>
                        Front seat: +₹100, Window seat: +₹50
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information for passengers..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ✅ ADDED: Validation warning */}
              {selectedVehicle && watchedValues.availableSeats > selectedVehicle.seat_capacity && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Available seats ({watchedValues.availableSeats}) cannot exceed your vehicle capacity ({selectedVehicle.seat_capacity}). 
                    It will be automatically adjusted to {selectedVehicle.seat_capacity}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleNextStep}
                  disabled={!watchedValues.availableSeats}
                >
                  Preview Pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button type="submit" disabled={loading || !selectedVehicle}>
                  {loading ? (editData ? 'Updating...' : 'Posting...') : (editData ? 'Update Ride' : 'Post Ride')}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Other tabs remain the same... */}
        <TabsContent value="pricing" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is how your seat layout will appear to passengers. Different seat types have different pricing.
            </AlertDescription>
          </Alert>
          
          {canShowPricing && selectedVehicle && (
            <EnhancedSeatVisualization
              totalSeats={Math.min(watchedValues.availableSeats, selectedVehicle.seat_capacity)}
              availableSeats={Math.min(watchedValues.availableSeats, selectedVehicle.seat_capacity)}
              basePrice={watchedValues.basePrice}
              vehicleType="car"
              isSelectable={false}
              isDriverView={true}
              showPricing={true}
            />
          )}
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Pricing Breakdown</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="font-medium text-purple-700">Front Seat</div>
                <div className="text-lg font-bold text-purple-800">₹{watchedValues.basePrice + 100}</div>
                <div className="text-xs text-purple-600">Base + ₹100</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="font-medium text-green-700">Window Seat</div>
                <div className="text-lg font-bold text-green-800">₹{watchedValues.basePrice + 50}</div>
                <div className="text-xs text-green-600">Base + ₹50</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">Middle Seat</div>
                <div className="text-lg font-bold text-gray-800">₹{watchedValues.basePrice}</div>
                <div className="text-xs text-gray-600">Base Price</div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCurrentStep('details')}
            >
              <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Details
            </Button>
            <Button 
              type="button" 
              onClick={handleNextStep}
              disabled={!canShowRoute}
            >
              Preview Route
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="route" className="space-y-6">
          {canShowRoute && (
            <RouteVisualization
              fromCity={watchedValues.fromCity}
              toCity={watchedValues.toCity}
              departure_time={watchedValues.departureTime}
              pickup_point={watchedValues.pickupPoint}
            />
          )}
          
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCurrentStep('pricing')}
            >
              <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Pricing
            </Button>
            <Button 
              type="button" 
              onClick={() => form.handleSubmit(onSubmit)()}
              disabled={loading}
            >
              {loading ? 'Posting...' : 'Confirm & Post Ride'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="return" className="space-y-6">
          {ridePosted && watchedValues.departureDate && (
            <ReturnRideForm
              originalRide={{
                fromCity: watchedValues.fromCity,
                toCity: watchedValues.toCity,
                departureDate: watchedValues.departureDate,
                vehicleId: watchedValues.vehicleId,
                availableSeats: Math.min(watchedValues.availableSeats, selectedVehicle?.seat_capacity || 8),
                pricePerSeat: watchedValues.basePrice,
              }}
              onSuccess={handleReturnRideComplete}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};