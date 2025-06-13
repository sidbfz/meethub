-- Fix RLS Policies for Events Table
-- Run this in your Supabase SQL Editor

-- 1. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow public to read approved events" ON events;
DROP POLICY IF EXISTS "Hosts can insert pending events" ON events;
DROP POLICY IF EXISTS "Hosts can update their own events" ON events;
DROP POLICY IF EXISTS "Allow everyone to read events" ON events;
DROP POLICY IF EXISTS "Allow hosts to read own events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to create events" ON events;
DROP POLICY IF EXISTS "Allow hosts to update own events" ON events;
DROP POLICY IF EXISTS "Allow hosts to delete own events" ON events;

-- 2. Create secure policies with status-based access control

-- Allow public to read APPROVED events only
CREATE POLICY "Allow public to read approved events" ON events
FOR SELECT
TO public
USING (status = 'approved');

-- Allow hosts to read ALL their own events (including pending/cancelled)
CREATE POLICY "Allow hosts to read own events" ON events
FOR SELECT
TO authenticated
USING (auth.uid() = host_id);

-- Allow authenticated users to create events (they become the host) - FIXED
CREATE POLICY "Allow authenticated users to create events" ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

-- Allow hosts to update their own events - FIXED
CREATE POLICY "Allow hosts to update own events" ON events
FOR UPDATE
TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

-- Allow hosts to delete their own events (optional but recommended)
CREATE POLICY "Allow hosts to delete own events" ON events
FOR DELETE
TO authenticated
USING (auth.uid() = host_id);

-- Add category column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Set a default category for existing events (optional)
UPDATE events 
SET category = 'Other' 
WHERE category IS NULL;

-- Add a check constraint to ensure valid categories (optional)
ALTER TABLE events 
ADD CONSTRAINT events_category_check 
CHECK (category IN (
  'Technology',
  'Business',
  'Arts & Culture',
  'Sports & Fitness',
  'Food & Drink',
  'Music',
  'Film',
  'Education',
  'Health & Wellness',
  'Social',
  'Outdoor & Adventure',
  'Gaming',
  'Other'
));

-- Create an index on category for better performance when filtering
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
