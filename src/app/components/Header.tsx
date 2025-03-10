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
    <header className="app-header">
      <div className="header-container">
        <div className="header-logo">
          <h1 className="app-title">FileChat(RAG)</h1>
        </div>
        
        {userEmail && (
          <div className="header-actions">
            <span className="user-email">{userEmail}</span>
            
            {onChatWithFiles && (
              <button
                onClick={onChatWithFiles}
                className="btn btn-primary"
              >
                {showingChat ? 'Manage Files' : 'Chat with Files'}
              </button>
            )}
            
            <button
              onClick={handleSignOut}
              className="btn btn-link"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
