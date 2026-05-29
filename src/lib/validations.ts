// src/lib/validations.ts
import { z } from "zod";

export const eventFormSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters.",
  }).max(100, {
    message: "Title must not exceed 100 characters.",
  }),
  description: z.string().min(20, {
    message: "Description must be at least 20 characters.",
  }).max(1000, {
    message: "Description must not exceed 1000 characters.",
  }),
  category: z.string().min(1, {
    message: "Please select a category.",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in YYYY-MM-DD format.",
  }),
  time: z.string().regex(/^\d{2}:\d{2}$/, {
    message: "Time must be in HH:MM format.",
  }),
  duration: z.number().min(15, {
    message: "Duration must be at least 15 minutes.",
  }).max(480, {
    message: "Duration cannot exceed 8 hours (480 minutes).",
  }),
  location: z.object({
    address: z.string().min(10, {
      message: "Address is required and must be at least 10 characters.",
    }),
    venueName: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
  }),
  maxParticipants: z.number().min(2, {
    message: "Minimum 2 participants required.",
  }).max(500, {
    message: "Maximum 500 participants allowed.",
  }),
  approvalRequired: z.boolean().default(false),
  tags: z.array(z.string()).default([]), // Ensure tags is always an array
  imageUrl: z.string().url().or(z.literal('')).default(''), // Ensure imageUrl is always a string
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

// Add more schemas as needed for other forms (e.g., profile, login, register)
