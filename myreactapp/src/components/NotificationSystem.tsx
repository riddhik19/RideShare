import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: '1_hour' | '30_minutes' | '15_minutes' | 'booking';
  sent_at: string;
  read_at: string | null;
  user_type: 'passenger' | 'driver';
}

export const NotificationSystem = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      // Fetch all notifications for the current user
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Cast the data to our interface type
      const typedNotifications = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        message: item.message,
        notification_type: item.notification_type as '1_hour' | '30_minutes' | '15_minutes' | 'booking',
        sent_at: item.sent_at,
        read_at: item.read_at,
        user_type: item.user_type as 'passenger' | 'driver'
      }));
      
      setNotifications(typedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read_at)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          !notif.read_at
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case '1_hour': return 'bg-blue-500';
      case '30_minutes': return 'bg-yellow-500';
      case '15_minutes': return 'bg-red-500';
      case 'booking': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      
      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          },
          (payload) => {
            const newNotification: Notification = {
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.message,
              notification_type: payload.new.notification_type as '1_hour' | '30_minutes' | '15_minutes' | 'booking',
              sent_at: payload.new.sent_at,
              read_at: payload.new.read_at,
              user_type: payload.new.user_type as 'passenger' | 'driver'
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            
            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message.substring(0, 100) + (newNotification.message.length > 100 ? '...' : ''),
            });
          }
        );

      // Also listen for new bookings for drivers
      if (profile.role === 'driver') {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings',
          },
          async (payload) => {
            // Check if this booking is for one of the driver's rides
            const { data: ride } = await supabase
              .from('rides')
              .select('*')
              .eq('id', payload.new.ride_id)
              .eq('driver_id', profile.id)
              .single();

            if (ride) {
              // Create a booking notification
              const bookingNotification: Notification = {
                id: `booking-${payload.new.id}`,
                title: 'New Booking!',
                message: `Someone booked ${payload.new.seats_booked} seat(s) on your ride from ${ride.from_city} to ${ride.to_city}. Remaining seats: ${ride.available_seats - payload.new.seats_booked}`,
                notification_type: 'booking',
                sent_at: new Date().toISOString(),
                read_at: null,
                user_type: 'driver'
              };

              setNotifications(prev => [bookingNotification, ...prev]);
              
              toast({
                title: "New Booking!",
                description: bookingNotification.message,
              });
            }
          }
        );
      }

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile, toast]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          <Card className="border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-80">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          !notification.read_at ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getNotificationColor(
                              notification.notification_type
                            )}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.sent_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.read_at && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};