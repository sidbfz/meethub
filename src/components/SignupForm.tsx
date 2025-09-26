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
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

// Zod schema for form validation
const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    // Portfolio Demo: Simulate successful signup and redirect to login
    setIsLoading(true);
    setAuthError("");
    setSuccessMessage("");

    // Simulate loading for demo
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage("Portfolio Demo: Account creation is simulated. You can now use the demo login credentials to explore the authenticated features!");
      reset();
    }, 2000);

    return;

    // Original Supabase authentication code (commented out for portfolio demo)
    /*
    try {
      setIsLoading(true);
      setAuthError("");
      setSuccessMessage("");

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            display_name: data.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (authData.user) {
        setSuccessMessage(
          `Welcome ${data.name}! Account created successfully. Please check your email to verify your account.`
        );
        reset();
        // User can now see the success message and click "Sign in here" to navigate to login
      }
    } catch (error) {
      setAuthError("An unexpected error occurred. Please try again.");
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
    */
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Sign Up</CardTitle>
        <CardDescription className="text-center">
          Create your account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              {...register("name")}
              disabled={isLoading}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.name.message}
              </p>
            )}
          </div>

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

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              {...register("confirmPassword")}
              disabled={isLoading}
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.confirmPassword.message}
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

          {/* Success Alert */}
          {successMessage && (
            <Alert className="border-green-500 text-green-700 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {/* Demo Credentials Card */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-800 rounded-full p-1">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                🎯 Skip Signup - Use Demo Login
              </h3>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <p className="mb-3">Instead of signing up, use these demo credentials to explore all features:</p>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Email:</span>
                  <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                    demo@meethub.com
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Password:</span>
                  <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                    demo123
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Go to Login Page
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Already have an account?{" "}
            <button
              type="button"
              className="text-blue-600 hover:underline font-medium"              onClick={() => {
                router.push("/login");
              }}
            >
              Sign in here
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
