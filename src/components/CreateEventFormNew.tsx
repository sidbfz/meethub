"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { eventsService } from "@/lib/services/eventsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X, AlertCircle, Calendar, MapPin, Users, Image as ImageIcon } from "lucide-react";

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
  location: z
    .string()
    .min(1, "Location is required")
    .min(3, "Location must be at least 3 characters"),
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

export default function CreateEventForm() {
  // All hooks must be called first, before any conditional logic
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

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
    }

    // Set image preview immediately for better UX
    setUploadedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Upload to Supabase and save URL to form state (react-hook-form)
    const imageUrl = await uploadImageToSupabase(file);
    if (imageUrl) {
      setValue('image_url', imageUrl);
      console.log('Image URL saved to form state:', imageUrl);
    }
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
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const removeImage = () => {
    setUploadedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setValue('image_url', '');
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      setIsLoading(true);

      // The image_url is already set in the form state from the upload
      const imageUrl = data.image_url || null;

      // Insert event into database
      const { data: eventData, error } = await supabase
        .from('events')
        .insert([
          {
            title: data.title,
            description: data.description,
            category: data.category,
            location: data.location,
            date_time: data.date_time,
            max_participants: data.max_participants,
            image_url: imageUrl,
            host_id: user?.id,
          }
        ])
        .select()
        .single();      if (error) {
        console.error('Database error:', error);
        toast.error(`Failed to create event: ${error.message || 'Please try again.'}`);
        return;
      }

      console.log('Event created successfully:', eventData);

      // Automatically add the host as a participant
      if (user?.id) {
        try {
          await eventsService.addHostAsParticipant(eventData.id, user.id);
          console.log('Host added as participant successfully');
        } catch (participantError: any) {
          console.error('Error adding host as participant:', participantError);
          // Don't fail the entire operation, just log the error
          // The event was created successfully, so we still show success
        }
      }

      // Success with formatted date
      const formattedDate = format(new Date(data.date_time), "PPP 'at' p");
      toast.success(`Event "${data.title}" created successfully for ${formattedDate}!`);
      
      // Reset form and clean up
      reset();
      removeImage();
      
      // Redirect to home
      router.push('/');

    } catch (error) {
      console.error('Event creation error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render the form if user is not authenticated
  if (!user) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Checking authentication...</p>
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
          Event Details
        </CardTitle>
        <CardDescription>
          Provide information about your event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="Enter event title"
              {...register("title")}
              disabled={isLoading || isUploading}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your event..."
              rows={4}
              {...register("description")}
              disabled={isLoading || isUploading}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.description.message}
              </p>
            )}
          </div>          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select onValueChange={(value: string) => setValue("category", value)} disabled={isLoading || isUploading}>
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Location *
            </Label>
            <Input
              id="location"
              placeholder="Enter event location"
              {...register("location")}
              disabled={isLoading || isUploading}
              className={errors.location ? "border-red-500" : ""}
            />
            {errors.location && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <Label htmlFor="date_time">Date & Time *</Label>
            <Input
              id="date_time"
              type="datetime-local"
              {...register("date_time")}
              disabled={isLoading || isUploading}
              className={errors.date_time ? "border-red-500" : ""}
            />
            {errors.date_time && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.date_time.message}
              </p>
            )}
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="max_participants" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Max Participants *
            </Label>
            <Input
              id="max_participants"
              type="number"
              min="1"
              max="1000"
              placeholder="Enter maximum number of participants"
              {...register("max_participants", { valueAsNumber: true })}
              disabled={isLoading || isUploading}
              className={errors.max_participants ? "border-red-500" : ""}
            />
            {errors.max_participants && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.max_participants.message}
              </p>
            )}
          </div>

          {/* Image Upload with react-dropzone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              Event Image (Optional)
            </Label>
            
            {!imagePreview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input {...getInputProps()} disabled={isUploading} />
                {isUploading ? (
                  <Loader2 className="mx-auto h-8 w-8 text-blue-600 mb-2 animate-spin" />
                ) : (
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                )}
                <p className="text-sm text-gray-600">
                  {isUploading
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
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
                {/* Allow re-upload by dropping new image */}
                <div
                  {...getRootProps()}
                  className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"
                >
                  <input {...getInputProps()} disabled={isUploading} />
                  <p className="text-white text-sm font-medium">Drop new image to replace</p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isUploading}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Event...
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading Image...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
