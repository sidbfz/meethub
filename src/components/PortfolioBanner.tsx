"use client";

import { useState } from "react";
import { X, Info, Code, Database, MessageSquare, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export default function PortfolioBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="border-blue-500 bg-blue-50 dark:bg-blue-900/20 border-b">
      <Alert className="border-transparent rounded-none relative">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200 pr-16">
          <div className="flex items-center justify-between">
            <div>
              <strong>Portfolio Demo:</strong> This is MeetHub - a full-stack event management platform 
              built with Next.js, TypeScript, and Supabase for my portfolio.
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 underline"
              >
                {isExpanded ? 'Show less' : 'Learn more'}
              </button>
            </div>
          </div>
          
          {isExpanded && (
            <Card className="mt-3 border-blue-200 bg-white/50 dark:bg-blue-950/30">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Code className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Frontend:</strong> Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, React Query
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Database className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Backend:</strong> Supabase (PostgreSQL, Auth, Real-time)
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Features:</strong> Real-time chat, event management, user authentication
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Demo:</strong> All data is mock/simulated - authentication disabled
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Why demo mode?</strong> I can't keep a live backend running with user registration 
                    for a portfolio site that nobody actually uses. Explore the interface to see all the features!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </AlertDescription>
        
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  );
}