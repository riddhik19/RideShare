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
      basePrice: editData?.base_price || editData?.price_per_seat || 0, // Handle both fields
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

  const onSubmit = async (data: PostRideFormData) => {
  if (!user) return;
  
  setLoading(true);
  
  // Declare rideData outside try block so it's accessible in catch
  const rideData = {
    driver_id: user.id,
    vehicle_id: data.vehicleId,
    from_city: data.fromCity,
    to_city: data.toCity,
    departure_date: format(data.departureDate, 'yyyy-MM-dd'),
    departure_time: data.departureTime,
    pickup_point: data.pickupPoint,
    available_seats: data.availableSeats,
    total_seats: data.availableSeats,
    base_price: data.basePrice,
    price_per_seat: data.basePrice,
    notes: data.notes || null,
  };
  
  try {
    console.log('Attempting to insert ride data:', rideData);

    let result;
    
    if (editData) {
      result = await supabase
        .from('rides')
        .update(rideData)
        .eq('id', editData.id)
        .select();
    } else {
      result = await supabase
        .from('rides')
        .insert(rideData)
        .select();
    }

    console.log('Supabase result:', result);

    if (result.error) {
      console.error('Supabase error details:', result.error);
      throw result.error;
    }

    toast({
      title: 'Success',
      description: editData 
        ? 'Ride updated successfully!' 
        : 'Main ride posted successfully!',
    });
    
    if (!editData) {
      setRidePosted(true);
      setCurrentStep('return');
    } else {
      form.reset();
      onSuccess();
    }
  } catch (error: unknown) {
    console.error('Error posting ride:', error);
    console.error('Ride data that failed:', rideData);
    
    let errorMessage = 'Please try again.';
    
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMsg = (error as { message: string }).message;
      if (errorMsg.includes('duplicate key')) {
        errorMessage = 'A ride with these details already exists.';
      } else if (errorMsg.includes('foreign key')) {
        errorMessage = 'Please select a valid vehicle.';
      } else if (errorMsg.includes('check constraint')) {
        errorMessage = 'Please check your input values.';
      } else {
        errorMessage = errorMsg;
      }
    }
    
    toast({
      title: 'Error',
      description: editData 
        ? `Failed to update ride: ${errorMessage}` 
        : `Failed to post ride: ${errorMessage}`,
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
                  name="availableSeats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Seats</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="8" {...field} />
                      </FormControl>
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
                                {vehicle.car_model} ({vehicle.license_plate})
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
                <Button type="submit" disabled={loading}>
                  {loading ? (editData ? 'Updating...' : 'Posting...') : (editData ? 'Update Ride' : 'Post Ride')}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is how your seat layout will appear to passengers. Different seat types have different pricing.
            </AlertDescription>
          </Alert>
          
          {canShowPricing && (
            <EnhancedSeatVisualization
              totalSeats={watchedValues.availableSeats}
              availableSeats={watchedValues.availableSeats}
              basePrice={watchedValues.basePrice}
              vehicleType="car"
              isSelectable={false}
              isDriverView={true}
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
                availableSeats: watchedValues.availableSeats,
                pricePerSeat: watchedValues.basePrice, // Use basePrice for pricePerSeat
              }}
              onSuccess={handleReturnRideComplete}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};