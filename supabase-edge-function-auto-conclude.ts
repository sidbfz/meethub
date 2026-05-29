// Supabase Edge Function: auto-conclude-events
// File: supabase/functions/auto-conclude-events/index.ts
// 
// IMPORTANT: TypeScript errors shown in VS Code are EXPECTED and can be ignored!
// This code runs in Deno environment (Supabase Edge Functions) not Node.js
// The "errors" are because VS Code doesn't recognize Deno globals and ESM imports
//
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore - Deno global is available in Supabase Edge Functions
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Auto-conclude events function triggered')    // Create Supabase client
    // @ts-ignore - Deno env is available in Edge Functions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the database function
    const { data, error } = await supabase.rpc('auto_conclude_past_events')

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Function result:', data)

    // Return the result from the database function
    return new Response(
      JSON.stringify({
        ...data,
        edge_function_timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('Edge function error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
