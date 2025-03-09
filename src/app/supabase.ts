import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Options for more robust connection
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'supabase_auth_token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  // Use default fetch behavior for auth-related requests to avoid timeout issues with token refresh
  // Only use custom fetch with timeout for data operations
  global: {
    fetch: (...args: [RequestInfo | URL, RequestInit?]) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].toString();
      
      // Don't apply timeout to auth-related requests to avoid refresh token issues
      if (url.includes('/auth/') || url.includes('/token')) {
        return fetch(...args);
      }
      
      // For non-auth requests, use a reasonable timeout
      const fetchOptions = {
        signal: AbortSignal.timeout(30000), // 30-second timeout for regular operations
      };
      
      // Merge with the original options
      if (args[1]) {
        args[1] = { ...args[1], ...fetchOptions };
      } else {
        args[1] = fetchOptions;
      }
      
      return fetch(...args);
    }
  }
};

// Log connection attempt for debugging
console.log(`Connecting to Supabase: ${SUPABASE_URL.substring(0, 15)}... with key length: ${SUPABASE_ANON_KEY.length}`);

// Declare supabase variable with proper type
let supabase: SupabaseClient;

// Create the Supabase client with enhanced options
try {
  // Create the Supabase client
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Fallback to basic client without custom options
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.warn('Using fallback Supabase client');
}

// Function to handle session recovery on token refresh errors
export async function recoverSession() {
  try {
    // 檢查 localStorage 中的 token 存儲狀態
    if (typeof window !== 'undefined') {
      const storageKey = 'supabase_auth_token';
      const storedToken = localStorage.getItem(storageKey);
      console.log('Stored token exists in localStorage:', !!storedToken);
      
      if (storedToken) {
        try {
          const parsedToken = JSON.parse(storedToken);
          console.log('Token structure valid:', !!parsedToken);
          console.log('Token contains refresh_token:', !!parsedToken?.refresh_token);
          console.log('Token expiry time:', parsedToken?.expires_at ? new Date(parsedToken.expires_at * 1000).toISOString() : 'Not found');
        } catch (parseError) {
          console.error('Error parsing stored token:', parseError);
        }
      }
    }

    console.log('Attempting to recover session...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Session recovery failed with error:', error);
      console.log('Error message:', error.message);
      console.log('Error status:', error.status);
      
      // 如果是 Refresh Token Not Found 錯誤，嘗試強制登出後重新登入
      if (error.message?.includes('Refresh Token Not Found')) {
        console.log('Detected specific "Refresh Token Not Found" error, forcing sign out');
        await supabase.auth.signOut();
        return null;
      }
      
      console.log('Forcing sign out due to session error');
      await supabase.auth.signOut();
      return null;
    }
    
    if (data?.session) {
      console.log('Session recovered successfully with valid session object');
      console.log('Session expires at:', data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown');
      return data.session;
    } else {
      console.log('No valid session found during recovery attempt');
    }
    
    return null;
  } catch (e) {
    console.error('Unexpected error during session recovery:', e);
    return null;
  }
}

// Set up auth state change listener to handle refresh token issues
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, 'Session exists:', !!session);
    
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully');
      if (session) {
        console.log('New token expires at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown');
      }
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('User signed out, clearing local storage data');
      // Clear any cached data or state when signed out
      localStorage.removeItem('user_data');
      
      // 檢查 localStorage 中的 token 是否已清除
      const storageKey = 'supabase_auth_token';
      const tokenStillExists = localStorage.getItem(storageKey);
      console.log('Token still exists after sign out:', !!tokenStillExists);
      
      if (tokenStillExists) {
        console.log('Manually removing auth token from localStorage');
        localStorage.removeItem(storageKey);
      }
    }
  });
}

// Export the supabase client
// Export a function to check database schema and health
export async function checkDatabaseSchema() {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1);
      
    if (error) {
      // Table might not exist - provide detailed error info
      console.warn('Database schema check failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code === '42P01') {
        console.warn('Tables do not exist in the database yet. This is normal during initial setup.', {
          requiredTables: ['chat_sessions', 'chat_messages']
        });
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to check database schema:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

export { supabase };

// Function to check if user exists in profiles table and create if not
export async function ensureProfile(userId: string, email: string) {
  // First check if profile exists
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError && !profile) {
    // Profile doesn't exist, create one
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: userId, 
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      console.error('Error creating profile:', insertError);
      return false;
    }
  }

  return true;
}
