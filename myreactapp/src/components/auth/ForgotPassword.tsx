import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: 'Reset link sent!',
        description: 'Please check your email for password reset instructions.',
      });
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = () => {
    const emailValue = form.getValues('email');
    if (emailValue) {
      onSubmit({ email: emailValue });
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <CardTitle className="text-2xl font-poppins">Check Your Email</CardTitle>
              <CardDescription className="text-base mt-2">
                We've sent password reset instructions to your email address.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                If you don't see the email in your inbox, please check your spam folder.
                The reset link will expire in 1 hour for security.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Resend Email'}
              </Button>

              <Button variant="ghost" className="w-full" asChild>
                <Link to="/auth">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-poppins">Reset Your Password</CardTitle>
            <CardDescription className="text-base mt-2">
              Enter your email address and we'll send you a secure link to reset your password.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter your email address"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure to use the same email address you used to create your account.
                  The reset link is valid for 1 hour and can only be used once.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </Button>

              <Button variant="ghost" className="w-full" asChild>
                <Link to="/auth">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};