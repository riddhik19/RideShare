import RateDriver from "../components/RateDriver";

export default function RideSummaryPage() {
  // For now, hardcode IDs. Later you can pass real driver/ride IDs from your backend
  const driverId = "uuid-of-driver";
  const rideId = "uuid-of-ride";
  const passengerId = "uuid-of-passenger"; // Add this so rating links to passenger

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ride Summary</h1>
      <RateDriver driverId={driverId} rideId={rideId} passengerId={passengerId} />
    </div>
  );
}
