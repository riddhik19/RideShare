import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RateDriverProps = {
  driverId: string;
  rideId: string;
};

export default function RateDriver({ driverId, rideId }: RateDriverProps) {
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState<string>("");

  const submitRating = async () => {
    if (rating < 1 || rating > 5) {
      alert("Please give a rating between 1 and 5");
      return;
    }

    // get logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to rate.");
      return;
    }

    // insert into database
    const { error } = await supabase.from("driver_ratings").insert([
      {
        driver_id: driverId,
        passenger_id: user.id,
        ride_id: rideId,
        rating,
        review,
      },
    ]);

    if (error) {
      console.error("Error submitting rating:", error.message);
      alert("Error: " + error.message);
    } else {
      alert("Rating submitted!");
      setRating(0);
      setReview("");
    }
  };

  return (
    <div className="p-4 border rounded max-w-sm">
      <h2 className="text-lg font-bold">Rate Driver</h2>
      <input
        type="number"
        min={1}
        max={5}
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="border p-1 w-full"
      />
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write a review..."
        className="border p-1 w-full"
      />
      <button
        onClick={submitRating}
        className="mt-3 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Submit
      </button>
    </div>
  );
}
