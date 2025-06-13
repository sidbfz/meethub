-- SQL Script to Add Missing Hosts as Participants
-- This script will add hosts to the event_participants table for events where they're missing

-- First, let's see which events have hosts that are not in the participants table
SELECT 
  e.id as event_id,
  e.title,
  e.host_id,
  e.status as event_status,
  CASE 
    WHEN ep.user_id IS NOT NULL THEN 'Host is participant'
    ELSE 'Host NOT in participants'
  END as host_participation_status
FROM events e
LEFT JOIN event_participants ep ON (e.host_id = ep.user_id AND e.id = ep.event_id AND ep.status = 'joined')
ORDER BY e.created_at DESC;

-- Now, let's add hosts as participants for events where they're missing
-- This will only insert if the host is not already a participant
INSERT INTO event_participants (event_id, user_id, status, joined_at)
SELECT 
  e.id as event_id,
  e.host_id as user_id,
  'joined' as status,
  COALESCE(e.created_at, NOW()) as joined_at
FROM events e
WHERE e.host_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM event_participants ep 
    WHERE ep.event_id = e.id 
      AND ep.user_id = e.host_id 
      AND ep.status = 'joined'
  );

-- Verify the results - check how many hosts were added
SELECT 
  'Hosts added as participants' as action,
  COUNT(*) as count
FROM events e
WHERE e.host_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM event_participants ep 
    WHERE ep.event_id = e.id 
      AND ep.user_id = e.host_id 
      AND ep.status = 'joined'
  );

-- Final verification - show events with their host participation status
SELECT 
  e.id as event_id,
  e.title,
  e.host_id,
  e.status as event_status,
  CASE 
    WHEN ep.user_id IS NOT NULL THEN 'Host is participant ✓'
    ELSE 'Host NOT in participants ✗'
  END as host_participation_status
FROM events e
LEFT JOIN event_participants ep ON (e.host_id = ep.user_id AND e.id = ep.event_id AND ep.status = 'joined')
ORDER BY e.created_at DESC;
