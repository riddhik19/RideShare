import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

const passwordRequirements = [
  { regex: /.{8,}/, text: "At least 8 characters long" },
  { regex: /[A-Z]/, text: "Contains uppercase letter" },
  { regex: /[a-z]/, text: "Contains lowercase letter" },
  { regex: /\d/, text: "Contains a number" },
  { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, text: "Contains special character" }
];

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccessful, setResetSuccessful] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
      } else {
        // If no session but we have access_token in URL, it means user clicked the reset link
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        
        if (accessToken && refreshToken && type === 'recovery') {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (!error) {
              setHasValidSession(true);
            } else {
              toast({
                title: "Invalid reset link",
                description: "This reset link is invalid or has expired",
                variant: "destructive"
              });
              navigate('/forgot-password');
            }
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to validate reset link",
              variant: "destructive"
            });
            navigate('/forgot-password');
          }
        } else {
          toast({
            title: "Access denied",
            description: "You need a valid reset link to access this page",
            variant: "destructive"
          });
          navigate('/forgot-password');
        }
      }
    };

    checkSession();
  }, [searchParams, navigate, toast]);

  const checkPasswordStrength = (password: string) => {
    const passed = passwordRequirements.filter(req => req.regex.test(password));
    return (passed.length / passwordRequirements.length) * 100;
  };

  const isPasswordValid = (password: string) => {
    return passwordRequirements.every(req => req.regex.test(password));
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "All fields required",
        description: "Please enter and confirm your new password",
        variant: "destructive"
      });
      return;
    }

    if (!isPasswordValid(password)) {
      toast({
        title: "Password too weak",
        description: "Please meet all password requirements",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setResetSuccessful(true);
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated",
      });

      // Sign out and redirect to login after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, 3000);

    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update password",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSuccessful) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Password updated!</CardTitle>
            <CardDescription>
              Your password has been successfully changed. You'll be redirected to sign in shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const passwordStrength = checkPasswordStrength(password);
  const strengthColor = passwordStrength < 40 ? 'bg-red-500' : 
                       passwordStrength < 80 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            Choose a strong password to secure your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              
              {password && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Password strength</span>
                    <span className={`font-medium ${passwordStrength < 40 ? 'text-red-500' : passwordStrength < 80 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {passwordStrength < 40 ? 'Weak' : passwordStrength < 80 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-2" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              
              {confirmPassword && password !== confirmPassword && (
                <div className="flex items-center text-sm text-red-500">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Passwords don't match
                </div>
              )}
            </div>

            {password && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Password requirements:</Label>
                <ul className="space-y-1">
                  {passwordRequirements.map((req, index) => {
                    const isMet = req.regex.test(password);
                    return (
                      <li key={index} className={`flex items-center text-xs ${isMet ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <CheckCircle className={`w-3 h-3 mr-2 ${isMet ? 'text-green-600' : 'text-gray-300'}`} />
                        {req.text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isPasswordValid(password) || password !== confirmPassword}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Lock className="mr-2 h-4 w-4" />
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};