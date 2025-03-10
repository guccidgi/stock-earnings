// @ts-ignore: Deno imports are not recognized by TypeScript in a Node.js project
// Import directly from the Deno standard library
// Supabase Edge Functions use Deno and this specific import style is recommended
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// n8n webhook URL - we're using environment variable approach for better security
// In production, set this via Supabase Dashboard > Settings > API > Environment Variables
// @ts-ignore: Deno namespace is not recognized by TypeScript in a Node.js project
// In Deno, we use Deno.env.get() to access environment variables
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

// Check if the webhook URL is defined
if (!N8N_WEBHOOK_URL) {
  console.error('N8N_WEBHOOK_URL environment variable is not set');
  throw new Error('Missing required environment variable: N8N_WEBHOOK_URL');
}

// Define interfaces for request/response
interface ChatRequestPayload {
  session_id: string;
  user_id: string;
  question: string;
  context?: Record<string, unknown>; // Optional context data that might be useful
}

interface ChatResponse {
  response: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
}

// Helper function to create standardized error responses
function createErrorResponse(message: string, details?: string, status = 500): Response {
  const errorResponse: ErrorResponse = {
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    errorResponse.details = details;
  }
  
  return new Response(
    JSON.stringify(errorResponse),
    { 
      status, 
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' 
      } 
    }
  );
}

serve(async (req: Request) => {
  // Log incoming request (without sensitive data)
  console.log(`Processing request from ${req.headers.get('origin') || 'unknown origin'}`);
  
  // Check request method
  if (req.method !== 'POST') {
    return createErrorResponse(
      'Method not allowed', 
      'Only POST requests are supported',
      405
    );
  }
  
  try {
    // Parse the request body
    const requestData = await req.json() as Partial<ChatRequestPayload>;
    const { session_id, user_id, question, context } = requestData;
    
    // Validate required parameters
    if (!session_id || !user_id || !question) {
      return createErrorResponse(
        'Missing required parameters',
        'session_id, user_id, and question are required',
        400
      );
    }
    
    console.log(`Processing chat query for user ${user_id}, session ${session_id}`);
    
    // Prepare the payload for n8n webhook
    const n8nPayload = {
      session_id,
      user_id,
      question,
      context: context || {},
      timestamp: new Date().toISOString()
    };
    
    // Set timeout for webhook request (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Forward the request to n8n webhook with timeout
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from n8n webhook (${response.status}):`, errorText);
        return createErrorResponse(
          'Failed to process the request', 
          `n8n service returned status ${response.status}`,
          502
        );
      }
      
      // Parse and validate n8n response
      const n8nResponse = await response.json();
      
      // Create a standardized response
      const chatResponse: ChatResponse = {
        response: n8nResponse.response || n8nResponse.message || JSON.stringify(n8nResponse),
        metadata: n8nResponse.metadata || {},
        timestamp: new Date().toISOString()
      };
      
      console.log(`Successfully processed query, returning response`);
      
      return new Response(
        JSON.stringify(chatResponse),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          } 
        }
      );
      
    } catch (error: any) { // Type assertion for error object
      // Handle fetch errors (timeout, network issues, etc.)
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('Request to n8n webhook timed out');
        return createErrorResponse('Request timed out', 'n8n service did not respond in time', 504);
      }
      
      console.error('Error communicating with n8n webhook:', error);
      return createErrorResponse('Service communication error', error.message || 'Unknown error', 502);
    }
    
  } catch (error: any) { // Type assertion for error object
    console.error('Error processing request:', error);
    return createErrorResponse('Internal server error', error.message || 'Unknown error');
  }
});
