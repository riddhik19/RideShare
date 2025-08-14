import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const addVehicleSchema = z.object({
  carType: z.string().min(1, 'Car type is required'),
  carModel: z.string().min(1, 'Car model is required'),
  licensePlate: z.string().min(1, 'License plate is required'),
  seatCapacity: z.coerce.number().min(1, 'Must have at least 1 seat').max(8, 'Maximum 8 seats'),
  color: z.string().optional(),
});

type AddVehicleFormData = z.infer<typeof addVehicleSchema>;

interface AddVehicleFormProps {
  onSuccess: () => void;
}

export const AddVehicleForm: React.FC<AddVehicleFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<AddVehicleFormData>({
    resolver: zodResolver(addVehicleSchema),
    defaultValues: {
      carType: '',
      carModel: '',
      licensePlate: '',
      seatCapacity: 4,
      color: '',
    },
  });

  const onSubmit = async (data: AddVehicleFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .insert({
          driver_id: user.id,
          car_type: data.carType,
          car_model: data.carModel,
          license_plate: data.licensePlate,
          seat_capacity: data.seatCapacity,
          color: data.color || null,
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Vehicle added successfully!',
      });
      
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        title: 'Error',
        description: 'Failed to add vehicle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="carType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Car Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Sedan, SUV, Hatchback" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="carModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Car Model</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Toyota Camry, Honda Civic" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate</FormLabel>
                <FormControl>
                  <Input placeholder="ABC-123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seatCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seat Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min="1" max="8" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. White, Black, Red" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Vehicle'}
          </Button>
        </div>
      </form>
    </Form>
  );
};