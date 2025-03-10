import React from 'react';
import { ChatSession, ChatMessage } from '../types';
import { MessageCircle, Plus, Trash2, MoreHorizontal, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

type ChatSidebarProps = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
  isLoading?: boolean;
};

// 格式化日期為更友好的形式
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'yyyy/MM/dd HH:mm');
  } catch (error) {
    return '無效日期';
  }
};

// 從第一條用戶消息提取會話標題
const getSessionTitle = (session: ChatSession) => {
  if (session.messages && session.messages.length > 0) {
    // 尋找第一條用戶消息
    const firstUserMessage = session.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.content;
      // 截斷長標題並添加省略號
      return title.length > 25 ? title.substring(0, 25) + '...' : title;
    }
  }
  // 如果沒有找到用戶消息，則使用預設名稱或會話名稱
  return session.name || "新對話";
};

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  isLoading
}: ChatSidebarProps) {
  const router = useRouter();
  
  // 處理登出功能
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('登出錯誤:', error.message);
        alert(`登出失敗: ${error.message}`);
      } else {
        // 登出成功後導向首頁
        window.location.href = '/';
      }
    } catch (err) {
      console.error('登出時發生錯誤:', err);
      alert('登出時發生錯誤，請稍後再試');
    }
  };
  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          Your Chats
        </h2>
        <Button 
          variant="outline"
          size="sm"
          onClick={onNewSession}
          className="new-chat-btn"
          aria-label="新增對話"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="sidebar-content">
        {sessions.length === 0 ? (
          <div className="empty-chats">
            <Plus className="empty-icon" />
            <p>尚無對話，點擊「+」新增對話</p>
          </div>
        ) : (
          <div className="chat-list">
            {sessions.map((session, index) => (
              <React.Fragment key={`${session.id}_${index}`}>
                <div 
                  className={cn(
                    "chat-item",
                    activeSessionId === session.id ? "active" : ""
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="chat-item-content">
                    <div className="chat-item-icon">
                      <MessageCircle className="chat-icon" />
                    </div>
                    <div className="chat-info">
                      <p className="chat-title">{getSessionTitle(session)}</p>
                      <div className="chat-meta">
                        <p className="chat-date">
                          {formatDate(session.updated_at)}
                        </p>
                        <p className="chat-id">
                          {session.id.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                    {onDeleteSession && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();  // 防止觸發會話選擇
                          if (window.confirm(`確定要刪除對話 "${getSessionTitle(session)}" 嗎？`)) {
                            onDeleteSession(session.id);
                          }
                        }}
                        aria-label="刪除對話"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {index < sessions.length - 1 && (
                  <Separator className="chat-separator" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {isLoading && (
        <div className="sidebar-loading">
          <div className="loading-spinner"></div>
          加載中...
        </div>
      )}
      <div className="sidebar-footer p-4">
        <Button 
          variant="outline" 
          className={cn(
            "sign-out-btn w-full",
            "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
            "relative overflow-hidden group transition-all duration-300"
          )}
          onClick={handleSignOut}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-300 to-slate-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
          <div className="relative flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
