'use client'

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase, recoverSession } from './supabase';
import { FileInfo, User } from './types';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import ChatContainer from './components/ChatContainer';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<boolean>(false);

  // Check if user is authenticated
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setFiles([]);
        setLoading(false);
      } 
      else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
        // No need to update user state here as the session is still valid
      }
      else if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
        fetchFiles(session.user.id);
        setLoading(false);
      } else {
        // No session but not explicitly signed out
        setLoading(false);
      }
    });

    // Initial check
    checkUser();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      // First check session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        
        if (sessionError.message?.includes('Invalid Refresh Token') || 
            sessionError.message?.includes('JWT expired')) {
          console.log('Session token error detected, attempting recovery...');
          const recoveredSession = await recoverSession();
          
          if (recoveredSession) {
            console.log('Session recovered successfully');
            setUser({
              id: recoveredSession.user.id,
              email: recoveredSession.user.email || '',
            });
            fetchFiles(recoveredSession.user.id);
            setLoading(false);
            return;
          }
        }
      }
      
      // If we have a session, check the user
      if (sessionData?.session) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User fetch error:', userError);
          
          if (userError.message?.includes('Invalid Refresh Token')) {
            console.log('Invalid refresh token detected, attempting recovery...');
            const recoveredSession = await recoverSession();
            
            if (!recoveredSession) {
              console.log('Could not recover session, signing out');
              await supabase.auth.signOut();
              setUser(null);
              setLoading(false);
              return;
            }
          }
        }
        
        // If we have user data, set the user
        if (userData?.user) {
          setUser({
            id: userData.user.id,
            email: userData.user.email || '',
          });
          fetchFiles(userData.user.id);
        }
      } else {
        // No session found
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
    }
    
    setLoading(false);
  }

  async function fetchFiles(userId: string) {
    try {
      setError(null); // 重置錯誤狀態
      console.log('Fetching files for user:', userId);
      
      // First check if we're still authenticated before fetching
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        if (userError.message?.includes('Invalid Refresh Token')) {
          console.log('Token error during file fetch, attempting recovery...');
          const recoveredSession = await recoverSession();
          if (!recoveredSession) {
            console.log('Session recovery failed during file fetch');
            setUser(null);
            throw new Error('Your session has expired. Please sign in again.');
          }
        } else {
          throw userError;
        }
      }
      
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      console.log('Files fetch response:', { success: !error, count: data?.length, data });
        
      if (error) {
        console.error('Database query error:', error);
        throw error;
      }
      
      // Transform the data to match the FileInfo interface
      const transformedFiles: FileInfo[] = (data || []).map(file => ({
        id: file.id,
        name: file.file_name || '',
        file_path: file.file_path || '',
        size: file.file_size !== undefined && file.file_size !== null ? file.file_size.toString() : '0',
        type: file.file_type || '',
        storage_path: file.file_path || '', // Assuming storage_path is the same as file_path
        created_at: file.created_at || '',
        user_id: file.user_id || ''
      }));
      
      setFiles(transformedFiles);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      setError(error.message || '獲取文件時發生錯誤');
      setFiles([]);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setFiles([]);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clean state even if signOut fails
      setUser(null);
      setFiles([]);
    }
  }

  function handleAuthSuccess() {
    // Re-check user after successful auth
    checkUser();
  }

  function handleUploadComplete() {
    if (user) {
      fetchFiles(user.id);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? (
        <>
          <Header 
            userEmail={user.email} 
            onSignOut={handleSignOut} 
            onChatWithFiles={() => setShowChat(!showChat)}
            showingChat={showChat}
          />
          
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold text-gray-900">Transform the Way You Interact with Your Files</h2>
                <p className="mt-4 text-lg text-gray-600">
                  Upload, manage, and chat with your files in a seamless, intuitive environment.
                </p>
                

              </div>
              
              {!showChat ? (
                <>
                  <FileUpload userId={user.id} onUploadComplete={handleUploadComplete} />
                  
                  {error ? (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600">{error}</p>
                      <button 
                        onClick={() => user && fetchFiles(user.id)}
                        className="mt-2 text-sm text-red-700 hover:text-red-900 font-medium"
                      >
                        重試
                      </button>
                    </div>
                  ) : (
                    <FileList files={files} onRefresh={() => user && fetchFiles(user.id)} />
                  )}
                </>
              ) : (
                <ChatContainer userId={user.id} files={files} />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col min-h-screen">
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">FileChat</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Transform the Way You <span className="text-indigo-600">Interact</span> with Your Files
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Upload, manage, and chat with your files in a seamless, intuitive environment.
              </p>
            </div>
            
            <AuthForm onSuccess={handleAuthSuccess} />

            <div className="mt-10">
              <a
                className="text-indigo-600 hover:text-indigo-800 font-medium"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Add functionality for learning more
                }}
              >
                Learn more about FileChat →
              </a>
            </div>
          </div>
          
          <footer className="py-4 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} FileChat. All rights reserved.
          </footer>
        </div>
      )}
    </div>
  );
}
