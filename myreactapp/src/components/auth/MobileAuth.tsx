import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Phone, CheckCircle } from 'lucide-react';

interface MobileAuthProps {
  onSuccess: (userId: string) => void;
  onBack: () => void;
}

export const MobileAuth: React.FC<MobileAuthProps> = ({ onSuccess, onBack }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Format phone number with country code
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: formattedPhone }
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: "Please check your phone for the verification code",
      });
      setPhone(formattedPhone);
      setStep('otp');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, otp }
      });

      if (error) throw error;

      if (data.success) {
        // Store mobile auth info in localStorage for the auth context to pick up
        localStorage.setItem('mobile_auth_user', JSON.stringify({
          id: data.userId,
          phone: data.phone,
          authToken: data.authToken
        }));

        if (data.userExists) {
          toast({
            title: "Login Successful",
            description: "Welcome back!",
          });
        } else {
          toast({
            title: "Account Created",
            description: "Welcome to RideShare!",
          });
        }
        
        // Trigger a page reload to let the auth context pick up the mobile auth
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    await handleSendOTP();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Phone className="h-5 w-5" />
          Mobile Authentication
        </CardTitle>
        <CardDescription>
          {step === 'phone' 
            ? 'Enter your mobile number to receive an OTP'
            : `Enter the 6-digit code sent to ${phone}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mobile Number</label>
              <Input
                type="tel"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground">
                Format: 10-digit number (e.g., 9876543210)
              </p>
            </div>
            <Button 
              onClick={handleSendOTP} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code</label>
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={6}
                className="justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button 
              onClick={handleVerifyOTP} 
              disabled={loading || otp.length !== 6}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify OTP
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleResendOTP}
              disabled={loading}
              className="w-full"
            >
              Resend OTP
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setStep('phone')}
              className="w-full"
            >
              Change Number
            </Button>
          </>
        )}
        
        <Separator />
        
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="w-full"
        >
          Back to Email Login
        </Button>
      </CardContent>
    </Card>
  );
};