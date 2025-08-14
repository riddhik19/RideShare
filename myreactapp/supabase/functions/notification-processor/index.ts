import { createServer } from "http";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client (using `any` to avoid deep type issues)
const supabase: SupabaseClient<any, "public", any> = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Types ---
interface BookingWithRideDetails {
  id: string;
  passenger_id: string;
  status: string;
  notif_1hr_sent: boolean;
  notif_30min_sent: boolean;
  notif_15min_sent: boolean;
  ride: {
    id: string;
    driver_id: string;
    departure_date: string;
    departure_time: string;
    from_city: string;
    to_city: string;
    pickup_point: string;
    vehicle: {
      brand: string;
      car_model: string;
      license_plate: string;
      color: string;
    };
    driver_profile: {
      full_name: string;
      phone: string;
    };
  };
  passenger_profile: {
    full_name: string;
    phone: string;
  };
}

interface NotificationContent {
  title: string;
  message: string;
}

// --- Utilities ---
const calculateEstimatedArrival = (departureTime: string, departureDate: string): string => {
  const departure = new Date(`${departureDate}T${departureTime}`);
  const arrival = new Date(departure.getTime() + 2 * 60 * 60 * 1000);
  return arrival.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

// --- Notification Generators ---
const generatePassengerNotification = (
  booking: BookingWithRideDetails,
  type: "1_hour" | "30_minutes" | "15_minutes"
): NotificationContent => {
  const { ride, passenger_profile } = booking;
  const driverName = ride.driver_profile.full_name;
  const driverPhone = ride.driver_profile.phone;
  const carModel = `${ride.vehicle.brand} ${ride.vehicle.car_model}`;
  const licensePlate = ride.vehicle.license_plate;
  const carColor = ride.vehicle.color;
  const departureDate = formatDate(ride.departure_date);
  const departureTime = formatTime(ride.departure_time);
  const estimatedArrival = calculateEstimatedArrival(ride.departure_time, ride.departure_date);
  const boardingPoint = ride.pickup_point;

  switch (type) {
    case "1_hour":
      return {
        title: `Your Upcoming Ride Details (Booking ID: ${booking.id.slice(0, 8)})`,
        message: `Hi ${passenger_profile.full_name},

Here are the details for your upcoming ride from ${ride.from_city} to ${ride.to_city}:

Driver Information:
• Driver Name: ${driverName}
• Phone Number: ${driverPhone}

Vehicle Information:
• Car Model: ${carModel}
• License Plate: ${licensePlate}
• Color: ${carColor}

Journey Details:
• Date: ${departureDate}
• Departure Time: ${departureTime}
• Estimated Arrival Time: ${estimatedArrival}
• Boarding Point: ${boardingPoint}

Important Notes:
• Please arrive at the boarding point at least 10 minutes before the departure time.
• You can contact your driver directly at the phone number provided above.
• You can track your ride in real-time through the app.

We wish you a safe and pleasant journey!`,
      };
    case "30_minutes":
      return {
        title: `Your ride is 30 minutes away! (${booking.id.slice(0, 8)})`,
        message: `${passenger_profile.full_name}, your ride with ${driverName} is now 30 minutes away. Please ensure you are ready for pickup at ${boardingPoint}. Driver contact: ${driverPhone}`,
      };
    case "15_minutes":
      return {
        title: `Driver arriving soon! (${booking.id.slice(0, 8)})`,
        message: `Your driver, ${driverName}, is approximately 15 minutes away from ${boardingPoint}. Please be at the pickup point. Contact driver: ${driverPhone}`,
      };
  }
};

const generateDriverNotification = (
  booking: BookingWithRideDetails,
  type: "1_hour" | "30_minutes" | "15_minutes"
): NotificationContent => {
  const { ride, passenger_profile } = booking;
  const passengerName = passenger_profile.full_name;
  const pickupLocation = ride.pickup_point;
  const dropoffLocation = ride.to_city;
  const passengerPhone = passenger_profile.phone;

  switch (type) {
    case "1_hour":
      return {
        title: `Upcoming Trip in 1 Hour (${booking.id.slice(0, 8)})`,
        message: `Hi, you have an upcoming trip with ${passengerName} in approximately 1 hour. Pickup at ${pickupLocation}, Drop-off at ${dropoffLocation}. Please ensure your vehicle is ready.`,
      };
    case "30_minutes":
      return {
        title: `Trip Reminder: 30 Minutes to Pickup (${booking.id.slice(0, 8)})`,
        message: `Your trip with ${passengerName} is 30 minutes away. Head towards ${pickupLocation}. Passenger contact: ${passengerPhone}`,
      };
    case "15_minutes":
      return {
        title: `Passenger Pickup Soon! (${booking.id.slice(0, 8)})`,
        message: `You are approximately 15 minutes from ${passengerName}'s pickup location at ${pickupLocation}. Please confirm your arrival once you reach the pickup point.`,
      };
  }
};

// --- Send Notification ---
const sendNotification = async (
  userId: string,
  userType: "passenger" | "driver",
  bookingId: string,
  notificationType: "1_hour" | "30_minutes" | "15_minutes",
  content: NotificationContent
) => {
  const { error } = await supabase.from("notifications").insert({
    booking_id: bookingId,
    user_id: userId,
    user_type: userType,
    notification_type: notificationType,
    title: content.title,
    message: content.message,
  });

  if (error) {
    console.error(`Error storing notification for ${userType} ${userId}:`, error);
    return false;
  }

  console.log(`📱 ${userType.toUpperCase()} Notification:`, { userId, title: content.title, message: content.message });
  return true;
};

// --- Process Notifications ---
const processNotifications = async () => {
  console.log("🔄 Starting notification processing...");
  const now = new Date();

  const { data: bookings, error } = await supabase
  .from("bookings")
  .select(`
      id,
      passenger_id,
      status,
      notif_1hr_sent,
      notif_30min_sent,
      notif_15min_sent,
      ride:rides (
        id,
        driver_id,
        departure_date,
        departure_time,
        from_city,
        to_city,
        pickup_point,
        vehicle:vehicles (
          brand,
          car_model,
          license_plate,
          color
        ),
        driver_profile:profiles!rides_driver_id_fkey (
          full_name,
          phone
        )
      ),
      passenger_profile:profiles!bookings_passenger_id_fkey (
        full_name,
        phone
      )
    `) as { data: BookingWithRideDetails[] | null; error: any };


  if (error || !bookings) {
    console.error("Error fetching bookings:", error);
    return;
  }

  for (const booking of bookings) {
    if (!booking.ride) continue;

    const scheduledPickupTime = new Date(`${booking.ride.departure_date}T${booking.ride.departure_time}`);
    const timeDiffMinutes = Math.floor((scheduledPickupTime.getTime() - now.getTime()) / (1000 * 60));

    if (timeDiffMinutes >= 55 && timeDiffMinutes <= 65 && !booking.notif_1hr_sent) {
      await sendNotification(booking.passenger_id, "passenger", booking.id, "1_hour", generatePassengerNotification(booking, "1_hour"));
      await sendNotification(booking.ride.driver_id, "driver", booking.id, "1_hour", generateDriverNotification(booking, "1_hour"));
      await supabase.from("bookings").update({ notif_1hr_sent: true, notif_1hr_sent_at: now.toISOString() }).eq("id", booking.id);
    } else if (timeDiffMinutes >= 25 && timeDiffMinutes <= 35 && !booking.notif_30min_sent) {
      await sendNotification(booking.passenger_id, "passenger", booking.id, "30_minutes", generatePassengerNotification(booking, "30_minutes"));
      await sendNotification(booking.ride.driver_id, "driver", booking.id, "30_minutes", generateDriverNotification(booking, "30_minutes"));
      await supabase.from("bookings").update({ notif_30min_sent: true, notif_30min_sent_at: now.toISOString() }).eq("id", booking.id);
    } else if (timeDiffMinutes >= 10 && timeDiffMinutes <= 20 && !booking.notif_15min_sent) {
      await sendNotification(booking.passenger_id, "passenger", booking.id, "15_minutes", generatePassengerNotification(booking, "15_minutes"));
      await sendNotification(booking.ride.driver_id, "driver", booking.id, "15_minutes", generateDriverNotification(booking, "15_minutes"));
      await supabase.from("bookings").update({ notif_15min_sent: true, notif_15min_sent_at: now.toISOString() }).eq("id", booking.id);
    }
  }

  console.log("✅ Notification processing completed");
};

// --- HTTP Server ---
const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  try {
    await processNotifications();
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ success: true, message: "Notifications processed successfully" }));
  } catch (error: any) {
    console.error("Error in notification processor:", error);
    res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Start server on port 3000
server.listen(3000, () => console.log("🚀 Notification server running on http://localhost:3000"));
