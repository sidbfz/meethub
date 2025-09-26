"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

// Zod schema for login validation
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // Portfolio Demo: Simulate successful login with demo credentials
    setIsLoading(true);
    setAuthError("");

    // Check if demo credentials are used
    const isDemoLogin = data.email === "demo@meethub.com" && data.password === "demo123";
    
    if (isDemoLogin) {
      // Simulate loading for realistic experience
      setTimeout(() => {
        setIsLoading(false);
        // Create demo user session
        const demoUser = {
          id: 'demo-user-1',
          email: 'demo@meethub.com',
          user_metadata: { 
            full_name: 'Demo User',
            avatar_url: 'https://i.pravatar.cc/150?img=0'
          },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        };
        
        // Store demo user in localStorage for persistence across pages
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        localStorage.setItem('demo_authenticated', 'true');
        
        // Trigger a custom event to notify other components
        window.dispatchEvent(new CustomEvent('demo-auth-change', { detail: { user: demoUser } }));
        
        // Redirect to homepage
        router.push("/");
      }, 1500);
    } else {
      // Show demo credentials message for any other login attempt
      setTimeout(() => {
        setIsLoading(false);
        setAuthError("Portfolio Demo: Please use the demo credentials provided below to explore the authenticated features!");
      }, 1500);
    }

    return;

    // Original Supabase authentication code (commented out for portfolio demo)
    /*
    try {
      setIsLoading(true);
      setAuthError("");

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (authData.user) {
        // Redirect to dashboard or home page after successful login
        router.push("/");
      }
    } catch (error) {
      setAuthError("An unexpected error occurred. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
    */
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
        <CardDescription className="text-center">
          Welcome back! Please sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
              disabled={isLoading}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register("password")}
              disabled={isLoading}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Error Alert */}
          {authError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Demo Credentials Card */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 dark:bg-green-800 rounded-full p-1">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                🎯 Demo Login Credentials
              </h3>
              <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Email:</span>
                  <code className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-green-800 dark:text-green-200">
                    demo@meethub.com
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Password:</span>
                  <code className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-green-800 dark:text-green-200">
                    demo123
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Fill the form with demo credentials
                    setValue("email", "demo@meethub.com");
                    setValue("password", "demo123");
                  }}
                  className="w-full mt-3 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                  disabled={isLoading}
                >
                  Fill Demo Credentials
                </button>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Click "Fill Demo Credentials" then "Sign In" to explore all authenticated features!
              </p>
            </div>
          </div>
        </div>

        {/* Additional Links */}
        <div className="mt-6 space-y-2 text-center text-sm text-gray-600">
          <p>
            Don't have an account?{" "}
            <button
              type="button"
              className="text-blue-600 hover:underline font-medium"
              onClick={() => router.push("/signup")}
            >
              Sign up here
            </button>
          </p>
          <p>
            <button
              type="button"
              className="text-blue-600 hover:underline font-medium"
              onClick={() => {
                // You can implement forgot password functionality here
                console.log("Forgot password clicked");
              }}
            >
              Forgot your password?
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
