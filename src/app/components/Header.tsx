import React from 'react';
import { supabase } from '../supabase';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
                className="btn btn-primary whitespace-nowrap"
                style={{ minWidth: 'fit-content' }}
              >
                {showingChat ? 'Manage Files' : 'Chat with Files'}
              </button>
            )}
            
            <Button 
              variant="outline" 
              className="sign-out-btn whitespace-nowrap"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span style={{ position: 'relative', top: '-7px' }}>Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
