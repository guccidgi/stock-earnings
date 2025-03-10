import React, { useState, useEffect } from 'react';
import { supabase, ensureProfile, recoverSession } from '../supabase';

// u4F7Fu7528u76F4u63A5u5F15u5165u800Cu4E0Du7D93u904Eu5143u4EF6u5EAB
import { AlertCircle, Loader2, Mail, Lock } from 'lucide-react';

// u4E0Du4F7Fu7528 shadcn u5143u4EF6uFF0Cu6539u7528u57FAu672C HTML u5143u7D20

type AuthFormProps = {
  onSuccess: (userRole?: string) => void;
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
            // 因為沒有檢查 profile 資訊，使用默認角色
            onSuccess('User');
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
            onSuccess('User'); // 設置默認角色為 User
          } else {
            console.log('Sign up successful but no user returned', data);
            setError('Account created! Please check your email for verification.');
          }
        } catch (signUpError: unknown) {
          console.error('Sign up error details:', signUpError);
          if (signUpError instanceof Error && (signUpError.message?.includes('fetch') || signUpError.code === 'network_error')) {
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
                onSuccess('User'); // 設置默認角色為 User
              } else {
                console.log('User profile found with role:', profile.role);
                onSuccess(profile.role || 'User'); // 如果有角色就傳入，否則默認為 User
              }
            } catch (profileError: unknown) {
              console.error('Error checking profile:', profileError);
              // Still allow login even if profile check fails
              // 因為沒有檢查 profile 資訊，使用默認角色
              onSuccess('User');
            }
          }
        } catch (signInError: unknown) {
          console.error('Sign in error details:', signInError);
          
          // Improved error handling for connection issues
          if (signInError instanceof Error && (signInError.message?.includes('fetch') || 
              signInError.code === 'network_error' || 
              signInError.message?.includes('NetworkError'))) {
            throw new Error('Connection to Supabase failed. Please verify your network connection and try again in a few moments.');
          }
          throw signInError;
        }
      }
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      
      // Provide more user-friendly error messages
      let errorMessage = err instanceof Error ? err.message : 'An error occurred during authentication';
      
      // Handle refresh token errors specifically
      if (errorMessage.includes('Invalid Refresh Token') || 
          errorMessage.includes('Refresh Token Not Found') || 
          errorMessage.includes('JWT expired')) {
        console.log('Attempting to recover session...');
        // Try to recover the session or force a new login
        const session = await recoverSession();
        if (session) {
          console.log('Session recovered successfully');
          
          // 從 recovered session 獲取用戶 ID 並查詢角色
          try {
            const userId = session.user.id;
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .single();
              
            onSuccess(profile?.role || 'User');
          } catch (err) {
            console.error('Error fetching role after session recovery:', err);
            onSuccess('User'); // 默認角色
          }
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
    <div className="auth-form">
      <h2>
        {isSignUp ? '註冊帳號' : '登入系統'}
      </h2>
      
      {error && (
        <div className="error-message">
          <AlertCircle className="input-icon" />
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="auth-form-group">
          <label htmlFor="email">電子郵件</label>
          <div className="input-wrapper">
            <Mail className="input-icon" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="auth-form-group">
          <label htmlFor="password">密碼</label>
          <div className="input-wrapper">
            <Lock className="input-icon" />
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••••"
              disabled={loading}
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-block mt-2"
        >
          {loading && <Loader2 className="loading-indicator" />}
          {loading ? '處理中...' : isSignUp ? '註冊' : '登入'}
        </button>
      </form>
      
      <div className="text-center mt-5">
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          className="btn-link"
          disabled={loading}
          type="button"
        >
          {isSignUp ? '已有帳號? 立即登入' : '需要新帳號? 立即註冊'}
        </button>
      </div>
    </div>
  );
}
