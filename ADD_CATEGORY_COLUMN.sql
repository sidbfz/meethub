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
