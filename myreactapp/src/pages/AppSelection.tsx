import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { Car, Users, LogOut } from 'lucide-react';

export const AppSelection = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleDriverApp = () => {
    navigate('/driver');
  };

  const handlePassengerApp = () => {
    navigate('/passenger');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
            <p className="text-muted-foreground">Choose how you'd like to use RideShare today</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {profile?.role === 'passenger' && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handlePassengerApp}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Find a Ride</CardTitle>
                <CardDescription>
                  Search for available rides and book your journey
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Search rides by route and date</li>
                  <li>• Book seats with instant confirmation</li>
                  <li>• View driver details and vehicle info</li>
                  <li>• Manage your bookings</li>
                </ul>
                <Button className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Passenger App
                </Button>
              </CardContent>
            </Card>
          )}

          {profile?.role === 'driver' && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleDriverApp}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Offer a Ride</CardTitle>
                <CardDescription>
                  Post your rides and earn money while traveling
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Post rides with flexible timing</li>
                  <li>• Set your own prices</li>
                  <li>• Manage passenger bookings</li>
                  <li>• Track your earnings</li>
                </ul>
                <Button className="w-full">
                  <Car className="mr-2 h-4 w-4" />
                  Driver App
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {profile?.role && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your default role: <span className="font-medium capitalize">{profile.role}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};