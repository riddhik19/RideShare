import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Phone, Mail, Clock, User, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupportMessage {
  id: string;
  message: string;
  is_from_user: boolean;
  status: string | null;
  created_at: string;
  admin_id?: string | null;
  updated_at?: string;
  user_id?: string;
}

const SupportChat: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    fetchSupportMessages();
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('support_chat_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_chats',
          filter: `user_id=eq.${profile.id}`
        }, 
        () => {
          fetchSupportMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const fetchSupportMessages = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('support_chats')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching support messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch support messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile?.id) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('support_chats')
        .insert({
          user_id: profile.id,
          message: newMessage.trim(),
          is_from_user: true,
          status: 'open'
        });

      if (error) throw error;

      setNewMessage('');
      
      // Add a mock auto-response for demo purposes
      setTimeout(async () => {
        await supabase
          .from('support_chats')
          .insert({
            user_id: profile.id,
            message: `Thank you for contacting support! We've received your message and will respond within 24 hours. Your ticket number is #${Math.floor(Math.random() * 10000)}.`,
            is_from_user: false,
            status: 'pending'
          });
      }, 2000);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN');
    }
  };

  const groupMessagesByDate = (messages: SupportMessage[]) => {
    const groups: { [key: string]: SupportMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Support Chat</h2>
        <p className="text-muted-foreground">
          Get help from our support team. We're here to assist you 24/7.
        </p>
      </div>

      {/* Support Contact Options */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Chat with our support team in real-time
            </p>
            <Badge variant="default">Active</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="mx-auto h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Phone Support</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Call us at +91 1800-123-456
            </p>
            <Badge variant="secondary">24/7</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Mail className="mx-auto h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-3">
              support@journeysync.com
            </p>
            <Badge variant="outline">24-48 hrs</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card className="h-96 flex flex-col">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Support Team</CardTitle>
              <p className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Online - Average response time: 5 mins
                </span>
              </p>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.keys(messageGroups).length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground text-sm">
                Send a message below to get help from our support team.
              </p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([date, dayMessages]) => (
              <div key={date} className="space-y-4">
                {/* Date Separator */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-muted"></div>
                  <span className="text-xs text-muted-foreground bg-background px-3">
                    {formatDate(date)}
                  </span>
                  <div className="flex-1 border-t border-muted"></div>
                </div>

                {/* Messages for this date */}
                {dayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_from_user ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.is_from_user
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!message.is_from_user && (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{message.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs opacity-70 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(message.created_at)}
                            </span>
                            {message.is_from_user && message.status && (
                              <Badge variant="secondary" className="text-xs h-4">
                                {message.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={sending}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={sending || !newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Our support team typically responds within 5-10 minutes during business hours.
          </p>
        </div>
      </Card>

      {/* Common Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
              <h4 className="font-semibold text-sm mb-1">How do I cancel a booking?</h4>
              <p className="text-xs text-muted-foreground">
                You can cancel your booking from the Trip History section before the departure time.
              </p>
            </div>
            
            <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
              <h4 className="font-semibold text-sm mb-1">What if my driver is late?</h4>
              <p className="text-xs text-muted-foreground">
                You can contact the driver directly or use our live chat for immediate assistance.
              </p>
            </div>
            
            <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
              <h4 className="font-semibold text-sm mb-1">How do I get a refund?</h4>
              <p className="text-xs text-muted-foreground">
                Refunds are processed automatically for cancelled trips based on our refund policy.
              </p>
            </div>
            
            <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
              <h4 className="font-semibold text-sm mb-1">Is my trip data safe?</h4>
              <p className="text-xs text-muted-foreground">
                We use enterprise-grade security to protect your personal and trip information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportChat;