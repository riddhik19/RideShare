import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, TrendingUp, DollarSign, Users, BarChart3, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EarningsData {
  date: string;
  totalEarnings: number;
  totalBookings: number;
  completedRides: number;
  avgEarningsPerRide: number;
}

interface WeeklyStats {
  currentWeek: number;
  lastWeek: number;
  growth: number;
}

const DailyEarnings: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [dailyEarnings, setDailyEarnings] = useState<EarningsData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ currentWeek: 0, lastWeek: 0, growth: 0 });
  const [totalEarnings, setTotalEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    allTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchEarningsData();
    }
  }, [profile?.id]);

  const fetchEarningsData = async () => {
  if (!profile?.id) return; // Exit early if profile or profile.id is missing

  try {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all completed bookings for the driver
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rides!inner (
          driver_id,
          departure_date,
          from_city,
          to_city
        )
      `)
      .eq('rides.driver_id', profile.id) // safe because of the guard
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert dates to strings
    const todayStr = today.toISOString().split('T')[0];
    const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    const monthAgoStr = oneMonthAgo.toISOString().split('T')[0];
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

    // Calculate earnings safely
    const todayEarnings = bookings?.filter(b => b.rides?.departure_date === todayStr)
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

    const thisWeekEarnings = bookings?.filter(b => b.rides?.departure_date >= weekAgoStr)
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

    const thisMonthEarnings = bookings?.filter(b => b.rides?.departure_date >= monthAgoStr)
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

    const allTimeEarnings = bookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

    const lastWeekEarnings = bookings?.filter(
      b => b.rides?.departure_date >= twoWeeksAgoStr && b.rides?.departure_date < weekAgoStr
    ).reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

    const growth = lastWeekEarnings > 0 
      ? ((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100 
      : 0;

    setTotalEarnings({
      today: todayEarnings,
      thisWeek: thisWeekEarnings,
      thisMonth: thisMonthEarnings,
      allTime: allTimeEarnings
    });

    setWeeklyStats({
      currentWeek: thisWeekEarnings,
      lastWeek: lastWeekEarnings,
      growth: growth
    });

    // Generate last 7 days breakdown
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayBookings = bookings?.filter(b => b.rides?.departure_date === dateStr) || [];
      const dayEarnings = dayBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

      return {
        date: dateStr,
        totalEarnings: dayEarnings,
        totalBookings: dayBookings.length,
        completedRides: dayBookings.length,
        avgEarningsPerRide: dayBookings.length > 0 ? dayEarnings / dayBookings.length : 0
      };
    }).reverse();

    setDailyEarnings(last7Days);

  } catch (error) {
    console.error('Error fetching earnings data:', error);
    toast({
      title: "Error",
      description: "Failed to fetch earnings data",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const downloadEarningsReport = () => {
    const csvContent = [
      ['Date', 'Earnings', 'Bookings', 'Avg per Ride'],
      ...dailyEarnings.map(day => [
        day.date,
        day.totalEarnings.toString(),
        day.totalBookings.toString(),
        day.avgEarningsPerRide.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Daily Earnings Summary</h2>
          <p className="text-muted-foreground">
            Track your daily earnings and performance metrics
          </p>
        </div>
        <Button onClick={downloadEarningsReport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings.today)}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.round((totalEarnings.today / (totalEarnings.thisWeek || 1)) * 100)}% of week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings.thisWeek)}</div>
            <p className={`text-xs ${weeklyStats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {weeklyStats.growth >= 0 ? '+' : ''}{weeklyStats.growth.toFixed(1)}% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(totalEarnings.thisMonth / 30)}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings.allTime)}</div>
            <p className="text-xs text-muted-foreground">
              Total earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Last 7 Days Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyEarnings.map((day, index) => {
              const isToday = day.date === new Date().toISOString().split('T')[0];
              const maxEarnings = Math.max(...dailyEarnings.map(d => d.totalEarnings));
              const widthPercentage = maxEarnings > 0 ? (day.totalEarnings / maxEarnings) * 100 : 0;

              return (
                <div key={day.date} className={`p-4 rounded-lg border ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {formatDate(day.date)}
                        {isToday && <span className="ml-2 text-primary font-semibold">(Today)</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(day.totalEarnings)}</div>
                      <div className="text-xs text-muted-foreground">
                        {day.totalBookings} ride{day.totalBookings !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${widthPercentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avg per ride: {formatCurrency(day.avgEarningsPerRide)}</span>
                    <span>{day.totalBookings} bookings</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyEarnings;