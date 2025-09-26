"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock } from "lucide-react";

export default function VerificationComplete() {
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();
  useEffect(() => {
    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Use setTimeout to avoid updating component during render
          setTimeout(() => {
            router.push("/login");
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup timer on component unmount
    return () => clearInterval(timer);
  }, [router]);

  const handleGoToSignIn = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">
            Email Verified Successfully!
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Your email address has been verified. You can now sign in to your account.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Success Message */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome to MeetHub! Your account is now active and ready to use.
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Redirecting to sign in page in {countdown} second{countdown !== 1 ? 's' : ''}...
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleGoToSignIn}
              className="w-full"
              size="lg"
            >
              Sign In Now
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => router.push("/")}
              className="w-full"
            >
              Go to Home Page
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If you're having trouble signing in, please contact our support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
