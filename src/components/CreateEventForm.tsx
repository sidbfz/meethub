"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { eventsService } from "@/lib/services/eventsService";
import { useUpdateEvent } from "@/lib/hooks/useEvents";
import { Event } from "@/lib/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Loader2, Upload, X, Calendar, MapPin, Users, Image as ImageIcon, Building2 } from "lucide-react";
import { format } from "date-fns";

// Zod schema for event validation
const eventSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  category: z
    .string()
    .min(1, "Please select a category"),
  address: z
    .string()
    .min(1, "Address is required")
    .min(3, "Address must be at least 3 characters"),
  city: z
    .string()
    .min(1, "City is required")
    .min(2, "City must be at least 2 characters"),
  date_time: z
    .string()
    .min(1, "Date and time is required")
    .refine((date) => {
      const selectedDate = new Date(date);
      const now = new Date();
      return selectedDate > now;
    }, "Event date must be in the future"),
  max_participants: z
    .number()
    .min(1, "Must have at least 1 participant")
    .max(1000, "Maximum 1000 participants allowed")
    .int("Must be a whole number"),
  image_url: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

const categories = [
  "Technology",
  "Business",
  "Arts & Culture",
  "Sports & Fitness",
  "Food & Drink",
  "Music",
  "Film",
  "Education",
  "Health & Wellness",
  "Social",
  "Outdoor & Adventure",
  "Gaming",
  "Other"
];

interface CreateEventFormProps {
  eventId?: string;
  initialData?: Event;
}

export default function CreateEventForm({ eventId, initialData }: CreateEventFormProps = {}) {
  // All hooks must be called first, before any conditional logic
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingOldImage, setIsDeletingOldImage] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Determine if we're in edit mode
  const isEditMode = !!eventId && !!initialData;
  
  // Use the update event mutation for edit mode
  const updateEventMutation = useUpdateEvent();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      address: "",
      city: "",
      date_time: "",
      max_participants: 1,
      image_url: "",
    },
  });
  // Initialize form with existing data in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      // The DateTimePicker component now handles its own formatting.
      // We pass the raw ISO string directly to the form.
      form.reset({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category,
        address: (initialData as any).location || (initialData as any).address || "", // Support both old and new field names during transition
        city: (initialData as any).city || "",
        date_time: initialData.date_time || "",
        max_participants: initialData.max_participants,
        image_url: initialData.image_url || "",
      });
      
      // Set image preview if exists
      if (initialData.image_url) {
        setImagePreview(initialData.image_url);
      }
    }
  }, [isEditMode, initialData, form]);
  
  // Ensure category is set properly in edit mode
  useEffect(() => {
    if (isEditMode && initialData?.category) {
      // Force set the category value with a slight delay to ensure form is ready
      const timer = setTimeout(() => {
        form.setValue("category", initialData.category);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isEditMode, initialData?.category, form]);

  // Upload image to Supabase Storage
  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      // Create filename with timestamp as specified: public/{timestamp}-{filename}
      const timestamp = Date.now();
      const originalName = file.name;
      const fileName = `${timestamp}-${originalName}`;
      const filePath = `public/${fileName}`;

      console.log('Uploading file to bucket: events, path:', filePath);

      const { data, error } = await supabase.storage
        .from('events')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
        return null;
      }

      // Get public URL using getPublicUrl
      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(data.path);

      toast.success('Image uploaded successfully!');
      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file drop with validation and upload
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type - only .jpg, .png, .jpeg as specified
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only JPG, JPEG, or PNG files');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Clean up previous image preview if re-uploading
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }    // Set image preview immediately for better UX
    setUploadedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Note: We don't upload the image here anymore to avoid double uploads
    // The image will be uploaded during form submission
    console.log('Image selected for upload:', file.name);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false
  });
  // Handle authentication redirect after all hooks are called
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);  const removeImage = () => {
    setUploadedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    form.setValue('image_url', '');
  };

  // Helper function to extract the file path from Supabase Storage URL
  const extractImagePath = (imageUrl: string): string | null => {
    try {
      // Supabase storage URLs typically follow this pattern:
      // https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[path]
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      
      // Find the index where 'public' appears, then get everything after the bucket name
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex !== -1 && pathParts.length > publicIndex + 2) {
        // Skip 'public' and bucket name, get the rest of the path
        return pathParts.slice(publicIndex + 2).join('/');
      }
      
      // Fallback: if URL doesn't match expected pattern, try to extract filename
      const segments = url.pathname.split('/');
      const filename = segments[segments.length - 1];
      if (filename && filename.includes('-')) {
        return `public/${filename}`;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to parse image URL:', error);
      return null;
    }
  };

  // Helper function to delete old image from Supabase Storage
  const deleteOldImage = async (oldImageUrl: string): Promise<boolean> => {
    try {
      const imagePath = extractImagePath(oldImageUrl);
      if (!imagePath) {
        console.warn('Could not extract image path from URL:', oldImageUrl);
        return false;
      }

      console.log('Attempting to delete old image:', imagePath);
      
      const { error } = await supabase.storage
        .from('events')
        .remove([imagePath]);

      if (error) {
        console.warn('Failed to delete old image:', error);
        return false;
      }

      console.log('Successfully deleted old image:', imagePath);
      return true;
    } catch (error) {
      console.warn('Error deleting old image:', error);
      return false;
    }
  };  const onSubmit = async (data: EventFormData) => {
    try {
      setIsLoading(true);

      if (!user) {
        toast.error('User not authenticated');
        return;
      }      // Handle image upload and replacement logic
      let imageUrl = data.image_url || (isEditMode ? initialData?.image_url : undefined);
      let oldImageDeleted = false;

      if (uploadedImage) {
        // In edit mode, delete the old image if it exists and we're uploading a new one
        if (isEditMode && initialData?.image_url) {
          try {
            setIsDeletingOldImage(true);
            console.log('Deleting old image before uploading new one...');
            oldImageDeleted = await deleteOldImage(initialData.image_url);
            if (!oldImageDeleted) {
              toast.error('Warning: Could not delete old image, but will proceed with upload', {
                duration: 3000,
              });
            }
          } catch (error) {
            console.warn('Error during old image deletion:', error);
            toast.error('Warning: Old image deletion failed, proceeding with upload', {
              duration: 3000,
            });
          } finally {
            setIsDeletingOldImage(false);
          }
        }

        // Upload the new image
        console.log('Uploading new image...');
        const uploadedImageUrl = await uploadImageToSupabase(uploadedImage);
        if (!uploadedImageUrl) {
          toast.error('Failed to upload new image');
          return;
        }
        imageUrl = uploadedImageUrl;
        console.log('New image uploaded successfully:', imageUrl);
      }if (isEditMode && eventId) {
        // Update existing event
        console.log('Updating event with ID:', eventId);
        
        // Ensure we have a valid session for updates too
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('Session error during update:', sessionError);
          toast.error('Authentication session expired. Please log in again.');
          router.push('/login');
          return;
        }        const updates = {
          title: data.title,
          description: data.description,
          category: data.category,
          address: data.address,
          city: data.city,
          date_time: data.date_time,
          max_participants: data.max_participants,
          image_url: imageUrl,
        };

        console.log('Updates to apply:', updates);

        try {
          await updateEventMutation.mutateAsync({ eventId, updates });
            // Success message with image replacement info
          let successMessage = `Event "${data.title}" updated successfully! It's now pending approval.`;
          if (uploadedImage && oldImageDeleted) {
            successMessage += ' Image replaced successfully.';
          } else if (uploadedImage && !oldImageDeleted) {
            successMessage += ' New image uploaded (old image cleanup may be incomplete).';
          }
          
          toast.success(successMessage);
          
          // Redirect to event details
          router.push(`/event/${eventId}`);
        } catch (updateError) {
          console.error('Event update error:', updateError);
          throw updateError; // Re-throw to be caught by outer catch block
        }
      } else {// Create new event
        // First, ensure we have a valid session and refresh if needed
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('Session error:', sessionError);
          toast.error('Authentication session expired. Please log in again.');
          router.push('/login');
          return;
        }

        // Refresh the session to ensure it's valid
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Session refresh error:', refreshError);
          toast.error('Authentication session expired. Please log in again.');
          router.push('/login');
          return;
        }

        console.log('Session verified and refreshed:', refreshedSession.user.id);        // Ensure the user exists in the users table
        console.log('Checking if user exists in users table:', refreshedSession.user.id);
        
        const { error: upsertError } = await supabase
          .from('users')
          .upsert([
            {
              id: refreshedSession.user.id,
              email: refreshedSession.user.email || '',
              full_name: refreshedSession.user.user_metadata?.full_name || refreshedSession.user.user_metadata?.name || refreshedSession.user.email?.split('@')[0] || 'Unknown User',
            }
          ], {
            onConflict: 'id'
          });

        if (upsertError) {
          console.error('Error upserting user:', upsertError);
          toast.error(`Failed to verify user: ${upsertError.message}`);
          return;
        }        console.log('User verified/created in users table');        // Insert the new event with explicit session context
        const { data: eventData, error } = await supabase
          .from('events')
          .insert([
            {
              title: data.title,
              description: data.description,
              category: data.category,
              address: data.address,
              city: data.city,
              date_time: data.date_time,
              max_participants: data.max_participants,
              image_url: imageUrl,
              host_id: refreshedSession.user.id, // Use the session user ID for RLS compliance
              status: 'pending', // Set to pending for review
            }
          ])
          .select()
          .single();if (error) {
          console.error('Database error:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          
          // Provide more specific error messages
          let errorMessage = 'Failed to create event. ';
          if (error.message) {
            errorMessage += error.message;
          } else if (error.code === '42501') {
            errorMessage += 'Permission denied. Please make sure you are logged in.';
          } else if (error.code === 'PGRST301') {
            errorMessage += 'Database policy violation. Please contact support.';
          } else {
            errorMessage += 'Please try again or contact support.';
          }
          
          toast.error(errorMessage);
          return;
        }

        console.log('Event created successfully:', eventData);        // Automatically add the host as a participant
        try {
          await eventsService.addHostAsParticipant(eventData.id, refreshedSession.user.id);
          console.log('Host added as participant successfully');        } catch (participantError: unknown) {
          console.error('Error adding host as participant:', participantError);
          // Don't fail the entire operation, just log the error
        }        // Success message
        const formattedDate = format(new Date(data.date_time), "PPP 'at' p");
        toast.success(`Event "${data.title}" created successfully for ${formattedDate}! It's now pending approval.`);
        
        // Reset form and clean up
        form.reset();
        removeImage();
        
        // Redirect to home
        router.push('/');
      }

    } catch (error) {
      console.error('Event submission error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }  };

  // Don't render the form if user is not authenticated
  if (authLoading || !user) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />            <p className="text-gray-600">
              {authLoading ? 'Checking authentication...' : 'Redirecting to login...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isEditMode ? 'Edit Event' : 'Event Details'}
        </CardTitle>
        <CardDescription>
          {isEditMode 
            ? 'Update your event information below.'
            : 'Provide information about your event'
          }
        </CardDescription>
      </CardHeader>      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event title"
                      {...field}
                      disabled={isLoading || isUploading || isDeletingOldImage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your event..."
                      rows={4}
                      {...field}
                      disabled={isLoading || isUploading || isDeletingOldImage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || isUploading || isDeletingOldImage}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Address *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event address"
                      {...field}
                      disabled={isLoading || isUploading || isDeletingOldImage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    City *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter city"
                      {...field}
                      disabled={isLoading || isUploading || isDeletingOldImage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />            {/* Date & Time */}
            <FormField
              control={form.control}
              name="date_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date & Time *
                  </FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading || isUploading || isDeletingOldImage}
                      placeholder="Select event date and time"
                    />
                  </FormControl>
                  <FormDescription>
                    Choose when your event will take place. Must be in the future.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Participants */}
            <FormField
              control={form.control}
              name="max_participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Max Participants *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      placeholder="Enter maximum number of participants"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      disabled={isLoading || isUploading || isDeletingOldImage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Event Image (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!imagePreview ? (
                        <div
                          {...getRootProps()}
                          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                            isDragActive
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-300 hover:border-gray-400"
                          } ${isUploading || isDeletingOldImage ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          <input {...getInputProps()} disabled={isUploading || isDeletingOldImage} />
                          {isUploading || isDeletingOldImage ? (
                            <Loader2 className="mx-auto h-8 w-8 text-blue-600 mb-2 animate-spin" />
                          ) : (
                            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          )}
                          <p className="text-sm text-gray-600">
                            {isDeletingOldImage
                              ? "Deleting old image..."
                              : isUploading
                              ? "Uploading image..."
                              : isDragActive
                              ? "Drop the image here..."
                              : "Drag & drop an image here, or click to select"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            JPG, JPEG, PNG up to 5MB
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Event preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={removeImage}
                            disabled={isUploading || isDeletingOldImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div
                            {...getRootProps()}
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"
                          >
                            <input {...getInputProps()} disabled={isUploading || isDeletingOldImage} />
                            <p className="text-white text-sm font-medium">Drop new image to replace</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload an image to make your event more attractive to participants.
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isUploading || isDeletingOldImage}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating Event...' : 'Creating Event...'}
                </>
              ) : isDeletingOldImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting Old Image...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Image...
                </>
              ) : (
                isEditMode ? 'Update Event' : 'Create Event'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
