import React from 'react';
import { supabase } from '../supabase';

type HeaderProps = {
  userEmail: string | null;
  onSignOut: () => void;
  onChatWithFiles?: () => void;
  showingChat?: boolean;
};

export default function Header({ userEmail, onSignOut, onChatWithFiles, showingChat = false }: HeaderProps) {
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      onSignOut();
    } else {
      console.error('Error signing out:', error);
    }
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">FileChat</h1>
        </div>
        
        {userEmail && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{userEmail}</span>
            
            {onChatWithFiles && (
              <button
                onClick={onChatWithFiles}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${showingChat 
                  ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                  : 'text-blue-600 bg-white border-blue-600 hover:bg-blue-50 focus:ring-blue-500'}`}
              >
                {showingChat ? 'Manage Files' : 'Chat with Files'}
              </button>
            )}
            
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
