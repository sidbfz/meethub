import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { eventId, action, userId } = await request.json();

    console.log('Moderator API called with:', { eventId, action, userId });

    // Validate input
    if (!eventId || !action || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Create client with anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing Authorization header');
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    // Extract the access token
    const token = authHeader.replace('Bearer ', '');
    console.log('Using token for authentication');
    
    // Verify the token by getting user info
    console.log('Verifying user with token...');
    const { data: { user }, error: userAuthError } = await supabase.auth.getUser(token);
    
    if (userAuthError || !user) {
      console.error('User auth error:', userAuthError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    console.log('Authenticated user:', user.id);

    // Verify this matches the userId provided
    if (user.id !== userId) {
      console.log('User ID mismatch');
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    }

    // Create a new client instance with the user's access token
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify user is a moderator
    console.log('Checking moderator role for user:', userId);
    const { data: userData, error: userError } = await authenticatedSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    console.log('User role query result:', { userData, userError });

    if (userError || !userData || userData.role !== 'moderator') {
      console.log('User is not a moderator or error occurred');
      return NextResponse.json({ error: 'Unauthorized - moderator access required' }, { status: 403 });
    }

    console.log('User is confirmed moderator, updating event');

    // Update event status with the authenticated client
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await authenticatedSupabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId)
      .eq('status', 'pending_approval') // Only update if currently pending
      .select()
      .single();

    console.log('Update result:', { data, error });

    if (error) {
      console.error('Error updating event status:', error);
      return NextResponse.json({ error: 'Failed to update event: ' + error.message }, { status: 500 });
    }

    if (!data) {
      console.log('No event found or not pending approval');
      return NextResponse.json({ error: 'Event not found or not pending approval' }, { status: 404 });
    }

    console.log('Event updated successfully:', data);

    return NextResponse.json({ 
      success: true, 
      event: data,
      message: `Event ${action}d successfully`
    });

  } catch (error) {
    console.error('Error in moderator action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
