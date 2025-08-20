// src/components/RateDriverSimple.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { submitDriverRating } from "@/integrations/supabase/ratingService";
import { useToast } from "@/hooks/use-toast";

interface RateDriverSimpleProps {
  driverId: string;
  bookingId: string;
  driverName?: string;
  onRatingSubmitted?: () => void;
  existingRating?: {
    rating: number;
    feedback: string;
  };
}

const RateDriverSimple: React.FC<RateDriverSimpleProps> = ({
  driverId,
  bookingId,
  driverName = "Driver",
  onRatingSubmitted,
  existingRating
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(existingRating?.rating || 5);
  const [feedback, setFeedback] = useState(existingRating?.feedback || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitDriverRating(driverId, bookingId, rating, feedback.trim());
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        });
        setIsOpen(false);
        onRatingSubmitted?.();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={interactive ? () => setRating(star) : undefined}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            disabled={!interactive}
          >
            <Star
              className={`h-8 w-8 ${
                star <= currentRating 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Star className="h-4 w-4 mr-2" />
          {existingRating ? 'Edit Rating' : 'Rate Driver'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existingRating ? 'Edit Your Rating' : `Rate ${driverName}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Rating</Label>
            <div className="flex items-center gap-2 mt-2">
              {renderStars(rating, true)}
              <span className="text-sm text-muted-foreground ml-2">
                {rating}/5 stars
              </span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="feedback">Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Share your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : (existingRating ? 'Update Rating' : 'Submit Rating')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RateDriverSimple;