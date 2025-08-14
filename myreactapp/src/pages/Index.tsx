import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Car, Users, Shield, Star, TrendingUp, ArrowRight, CheckCircle, Zap, Globe, Clock } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // Auto-redirect authenticated users to their respective apps
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'driver') {
        navigate('/driver', { replace: true });
      } else if (profile.role === 'passenger') {
        navigate('/passenger', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  const features = [
    {
      icon: Shield,
      title: "Safety First",
      description: "Verified drivers, real-time tracking, and emergency SOS features",
      color: "from-green-500 to-green-600"
    },
    {
      icon: TrendingUp,
      title: "Earn More",
      description: "Transparent pricing, instant payments, and performance bonuses",
      color: "from-purple-500 to-purple-600"
    }
  ];

  const stats = [
    { label: "Active Users", value: "50K+", icon: Users },
    { label: "Cities Covered", value: "25+", icon: Globe },
    { label: "Rides Completed", value: "1M+", icon: Car },
    { label: "Average Rating", value: "4.9★", icon: Star }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center space-y-8">
            {/* Main Hero Content */}
            <div className="space-y-6">
              <Badge 
                variant="outline" 
                className="bg-primary/10 text-primary border-primary/30 px-4 py-2 text-sm font-medium"
              >
                🚀 Welcome to the Future of Ride Sharing
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent leading-tight">
                Share Rides,
                <br />
                <span className="text-foreground">Save Money</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Connect with trusted travelers for safe, affordable, and eco-friendly intercity journeys. 
                Your next adventure is just a ride away.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Get Started Now clicked - navigating to auth');
                  navigate('/auth');
                }}
                type="button"
              >
                <Car className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-primary/30 hover:bg-primary/10 px-8 py-6 text-lg font-semibold cursor-pointer z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Join as Driver clicked - navigating to auth');
                  navigate('/auth');
                }}
                type="button"
              >
                <Users className="mr-2 h-5 w-5" />
                Join as Driver
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gradient-to-r from-primary/5 to-secondary/5 border-y">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="bg-gradient-to-br from-background to-muted/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">RideShare</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the perfect blend of technology, safety, and community in every journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple steps to your next journey</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Search & Book", description: "Find rides that match your travel plans", icon: Car },
              { step: "02", title: "Connect & Travel", description: "Meet verified drivers and co-passengers", icon: Users },
              { step: "03", title: "Rate & Review", description: "Share your experience to help others", icon: Star }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Travel?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of travelers who've already discovered a better way to travel. 
            Safe, affordable, and social.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => navigate('/auth')}
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Your Journey
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-primary/30 hover:bg-primary/10 px-8 py-6 text-lg font-semibold"
            >
              <Clock className="mr-2 h-5 w-5" />
              Learn More
            </Button>
          </div>

          <div className="mt-8 flex justify-center items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>No signup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>24/7 support</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Secure payments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;