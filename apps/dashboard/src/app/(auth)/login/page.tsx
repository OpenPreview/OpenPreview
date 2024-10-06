'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseBrowser } from '@openpreview/db/client';
import { Button } from '@openpreview/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openpreview/ui/components/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@openpreview/ui/components/form';
import { Input } from '@openpreview/ui/components/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@openpreview/ui/components/input-otp';
import { PasswordInput } from '@openpreview/ui/components/password-input';
import { Skeleton } from '@openpreview/ui/components/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openpreview/ui/components/tabs';
import { useToast } from '@openpreview/ui/hooks/use-toast';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
});

const otpRequestSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

const otpVerifySchema = z.object({
  pin: z.string().length(6, { message: 'OTP must be 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type OtpRequestFormValues = z.infer<typeof otpRequestSchema>;
type OtpVerifyFormValues = z.infer<typeof otpVerifySchema>;

function OtpRequestForm({
  onOtpRequest,
  isLoading,
}: {
  onOtpRequest: (data: OtpRequestFormValues) => Promise<void>;
  isLoading: boolean;
}) {
  const form = useForm<OtpRequestFormValues>({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: { email: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onOtpRequest)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Requesting OTP...' : 'Request OTP'}
        </Button>
      </form>
    </Form>
  );
}

function OtpVerifyForm({
  onOtpVerify,
  otpEmail,
}: {
  onOtpVerify: (data: OtpVerifyFormValues) => void;
  otpEmail: string;
}) {
  const form = useForm<OtpVerifyFormValues>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { pin: '' },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onOtpVerify)}
        className="w-full space-y-6"
      >
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <FormLabel>One-Time Password</FormLabel>
              <FormControl>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} {...field}>
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
              </FormControl>
              <FormDescription>
                Please enter the one-time password sent to {otpEmail}.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </Form>
  );
}

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>(
    'password',
  );
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const supabase = useSupabaseBrowser();
  const { toast } = useToast();
  const params = useSearchParams();
  const router = useRouter();

  const passwordForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onPasswordSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast({
        title: 'Login successful',
        description: 'You have been successfully logged in.',
      });
      if (params.get('next')) {
        router.push(params.get('next') as string);
      } else {
        router.push('/'); // Redirect to dashboard after successful login
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Login failed',
          description:
            error.message ||
            'An error occurred during login. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login failed',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpRequest(data: OtpRequestFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
      });
      if (error) throw error;
      setOtpEmail(data.email);
      setOtpRequested(true);
      toast({
        title: 'OTP Sent',
        description: 'A one-time password has been sent to your email.',
      });
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'OTP Request Failed',
          description: error.message || 'Failed to send OTP. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'OTP Request Failed',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpVerify(data: OtpVerifyFormValues) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: data.pin,
        type: 'magiclink',
      });
      if (error) throw error;
      toast({
        title: 'OTP Verified',
        description: 'Your one-time password has been verified successfully.',
      });
      router.push('/'); // Redirect to dashboard after successful verification
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'OTP Verification Failed',
          description:
            error.message || 'Failed to verify OTP. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'OTP Verification Failed',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
        <CardDescription>Choose your preferred login method</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={loginMethod}
          onValueChange={value => setLoginMethod(value as 'password' | 'otp')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="otp">OTP</TabsTrigger>
          </TabsList>
          <TabsContent value="password">
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="w-full">Password</FormLabel>
                      </div>
                      <FormControl>
                        <PasswordInput
                          type="password"
                          placeholder="Enter password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="otp">
            {!otpRequested ? (
              <OtpRequestForm
                onOtpRequest={onOtpRequest}
                isLoading={isLoading}
              />
            ) : (
              <OtpVerifyForm onOtpVerify={onOtpVerify} otpEmail={otpEmail} />
            )}
          </TabsContent>
        </Tabs>
        <div className="mt-4 text-sm">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const loadingSkeleton = (
    <div className="flex h-full w-full items-center justify-center">
      <Skeleton className="w-full max-w-md" />
    </div>
  );

  return (
    <Suspense fallback={loadingSkeleton}>
      <LoginPageContent />
    </Suspense>
  );
}
