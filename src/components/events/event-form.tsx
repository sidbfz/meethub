// src/components/events/event-form.tsx
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { eventFormSchema, EventFormValues } from '@/lib/validations';
import { toast } from 'sonner'; // Using sonner instead of deprecated toast
import { mockEvents, mockUsers } from '@/lib/mock-data'; // For preview
import { EventCard } from './event-card'; // For preview

export function EventForm() {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      date: '',
      time: '18:00',
      duration: 60,
      location: {
        address: '',
        venueName: '',
        lat: 0,
        lng: 0,
      },
      maxParticipants: 50,
      approvalRequired: false, // Removed explicit cast, schema should handle it
      tags: [],
      imageUrl: '',
    },
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [previewEvent, setPreviewEvent] = useState<any>(null); // Using any for now for simplicity

  const onSubmit = (data: EventFormValues) => {
    console.log("Form submitted:", data);
    toast.success("Event Created!", {
      description: `Your event "${data.title}" has been submitted.`,
    });
    // Simulate event creation
    const newEvent = {
      id: `event-${Date.now()}`,
      ...data,
      currentParticipants: 0,
      host: mockUsers[0], // Use a complete mock user object
      attendees: [],
      status: 'upcoming' as 'upcoming', // Explicitly cast to literal type
      createdAt: new Date().toISOString(),
    };
    mockEvents.push(newEvent); // Add to mock data for display
    setPreviewEvent(newEvent);
    form.reset();
    setCurrentStep(0);
  };

  const steps = [
    {
      id: 'basic-info',
      name: 'Basic Information',
      fields: ['title', 'description', 'category'],
      component: (
        <>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Tech Meetup, Yoga Class" {...field} />
                </FormControl>
                <FormDescription>
                  Give your event a clear and concise title.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about your event..."
                    className="resize-y min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide a detailed description of your event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Photography">Photography</SelectItem>
                    <SelectItem value="Wellness">Wellness</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the category that best fits your event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ),
    },
    {
      id: 'schedule-location',
      name: 'Schedule & Location',
      fields: ['date', 'time', 'duration', 'location.address', 'location.venueName', 'location.lat', 'location.lng'],
      component: (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <DatePicker
                    date={field.value ? new Date(field.value) : undefined}
                    setDate={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                  />
                  <FormDescription>
                    When will your event take place?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription>
                    At what time will your event start?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormDescription>
                  How long will your event last? (e.g., 60 for 1 hour)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 123 Main St, City, State" {...field} />
                </FormControl>
                <FormDescription>
                  The full address of your event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.venueName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue Name (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Innovation Hub, Central Park" {...field} />
                </FormControl>
                <FormDescription>
                  A specific name for the venue, if applicable.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Map Preview Placeholder */}
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Map Preview Placeholder</p>
          </div>
          {/* Hidden fields for lat/lng, will be updated by map/autocomplete */}
          <FormField
            control={form.control}
            name="location.lat"
            render={({ field }) => (
              <Input type="hidden" {...field} />
            )}
          />
          <FormField
            control={form.control}
            name="location.lng"
            render={({ field }) => (
              <Input type="hidden" {...field} />
            )}
          />
        </>
      ),
    },
    {
      id: 'settings-media',
      name: 'Settings & Media',
      fields: ['maxParticipants', 'approvalRequired', 'tags', 'imageUrl'],
      component: (
        <>
          <FormField
            control={form.control}
            name="maxParticipants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Participants</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormDescription>
                  Maximum number of attendees for your event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="approvalRequired"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Approval Required</FormLabel>
                  <FormDescription>
                    Require attendees to be approved by the host.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (comma-separated)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., networking, coding, outdoor"
                    value={field.value?.join(', ') || ''}
                    onChange={(e) => field.onChange(e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                  />
                </FormControl>
                <FormDescription>
                  Add keywords to help people find your event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Image URL (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., https://example.com/image.jpg" {...field} />
                </FormControl>
                <FormDescription>
                  Provide a URL for your event's main image.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Image Upload with Preview Placeholder */}
          <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Image Upload Placeholder</p>
          </div>
        </>
      ),
    },
    {
      id: 'preview-confirm',
      name: 'Preview & Confirm',
      fields: [], // No specific fields to validate on this step, just review
      component: (
        <>
          <h2 className="text-xl font-bold mb-4">Event Preview</h2>
          <div className="mb-8">
            {/* This will use the EventCard component to show a live preview */}
            {form.getValues().title && (
              <EventCard
                event={{
                  id: 'preview',
                  title: form.getValues().title,
                  description: form.getValues().description,
                  category: form.getValues().category,
                  date: form.getValues().date,
                  time: form.getValues().time,
                  duration: form.getValues().duration,
                  location: form.getValues().location,
                  maxParticipants: form.getValues().maxParticipants,
                  currentParticipants: 0, // Always 0 for preview
                  host: mockUsers[0], // Use a complete mock user object for preview
                  attendees: [],
                  imageUrl: form.getValues().imageUrl || undefined,
                  tags: form.getValues().tags || [],
                  approvalRequired: form.getValues().approvalRequired,
                  status: 'upcoming',
                  createdAt: new Date().toISOString(),
                }}
              />
            )}
            {!form.getValues().title && (
              <div className="text-muted-foreground text-center py-10">
                Fill out the form to see a preview of your event card.
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold mb-4">Confirmation</h2>
          <p className="text-muted-foreground">
            Please review all the details carefully before submitting your event.
          </p>
        </>
      ),
    },
  ];

  const currentFields = steps[currentStep].fields;
  const triggerValidation = async () => {
    const isValid = await form.trigger(currentFields as any, { shouldFocus: true });
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await triggerValidation();
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-card rounded-lg shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Step Indicators */}
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index < currentStep
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-sm mt-2 hidden sm:block">{step.name}</span>
              </div>
            ))}
          </div>

          {/* Current Step Component */}
          {steps[currentStep].component}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="button" onClick={handleNext} className="ml-auto">
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button type="submit" className="ml-auto">
                Create Event
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
