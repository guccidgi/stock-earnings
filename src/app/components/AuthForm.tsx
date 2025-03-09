import React, { useState, useEffect } from 'react';
import { supabase, ensureProfile, recoverSession } from '../supabase';

type AuthFormProps = {
  onSuccess: () => void;
};

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          // We have an existing session, verify it's still valid
          const { data: userResponse, error: userError } = await supabase.auth.getUser();
          if (!userError && userResponse?.user) {
            console.log('Found existing valid session');
            onSuccess();
          } else if (userError?.message.includes('Invalid Refresh Token')) {
            console.log('Invalid refresh token found, attempting recovery');
            await recoverSession();
          }
        }
      } catch (e) {
        console.error('Error checking existing session:', e);
      }
    };

    checkExistingSession();
  }, [onSuccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        try {
          console.log('Attempting to sign up with Supabase...'); 
          
          // Test Supabase connection first
          try {
            // Quick health check to see if Supabase is reachable
            const { data: healthCheck } = await supabase.from('_supabase_health').select('*').limit(1);
            console.log('Supabase connection health check:', healthCheck !== null ? 'OK' : 'Failed');
          } catch (healthError) {
            console.warn('Health check failed, proceeding anyway:', healthError);
          }
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
            }
          });

          if (error) throw error;
          
          if (data?.user) {
            console.log('Sign up successful, creating profile...');
            // Ensure profile is created
            await ensureProfile(data.user.id, data.user.email || '');
            onSuccess();
          } else {
            console.log('Sign up successful but no user returned', data);
            setError('Account created! Please check your email for verification.');
          }
        } catch (signUpError: any) {
          console.error('Sign up error details:', signUpError);
          if (signUpError.message?.includes('fetch') || signUpError.code === 'network_error') {
            throw new Error('Unable to connect to Supabase. Check your network connection and Supabase status at status.supabase.com');
          }
          throw signUpError;
        }
      } else {
        // Sign in flow
        try {
          console.log('Attempting to sign in with Supabase...');
          
          // Check network connectivity first
          const online = navigator.onLine;
          if (!online) {
            throw new Error('You appear to be offline. Please check your internet connection.');
          }
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;
          
          if (data?.user) {
            console.log('Sign in successful, verifying profile...');
            // Verify user exists in profiles table
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

              if (profileError || !profile) {
                console.log('Profile not found, creating one...');
                // Create profile if it doesn't exist (should be rare)
                await ensureProfile(data.user.id, data.user.email || '');
              }
              
              onSuccess();
            } catch (profileError: any) {
              console.error('Error checking profile:', profileError);
              // Still allow login even if profile check fails
              onSuccess();
            }
          }
        } catch (signInError: any) {
          console.error('Sign in error details:', signInError);
          
          // Improved error handling for connection issues
          if (signInError.message?.includes('fetch') || 
              signInError.code === 'network_error' || 
              signInError.message?.includes('NetworkError')) {
            throw new Error('Connection to Supabase failed. Please verify your network connection and try again in a few moments.');
          }
          throw signInError;
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      
      // Provide more user-friendly error messages
      let errorMessage = err.message || 'An error occurred during authentication';
      
      // Handle refresh token errors specifically
      if (errorMessage.includes('Invalid Refresh Token') || 
          errorMessage.includes('Refresh Token Not Found') || 
          errorMessage.includes('JWT expired')) {
        console.log('Attempting to recover session...');
        // Try to recover the session or force a new login
        const session = await recoverSession();
        if (session) {
          console.log('Session recovered successfully');
          onSuccess();
          return;
        } else {
          errorMessage = 'Your session has expired. Please sign in again.';
          // Clear any stale auth state
          await supabase.auth.signOut();
        }
      }
      // Handle common error messages more gracefully
      else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (errorMessage.includes('connect')) {
        errorMessage = 'Connection to authentication service failed. Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
  );
}
