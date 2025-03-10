import React from 'react';
import { ChatSession, ChatMessage } from '../types';
import { MessageCircle, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  return (
    <div className="chat-sidebar">
      <div className="chat-header">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <span>您的對話</span>
        </h2>
        <Button 
          variant="ghost"
          size="icon"
          onClick={onNewSession}
          className="h-8 w-8"
          aria-label="新增對話"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            尚無對話，點擊「+」新增對話
          </div>
        ) : (
          <div className="py-2">
            {sessions.map((session, index) => (
              <React.Fragment key={`${session.id}_${index}`}>
                <div 
                  className={cn(
                    "group px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors",
                    activeSessionId === session.id ? "bg-accent text-accent-foreground" : "text-foreground"
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getSessionTitle(session)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.updated_at)}
                      </p>
                    </div>
                    {onDeleteSession && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();  // 防止觸發會話選擇
                          if (window.confirm(`確定要刪除對話 "${getSessionTitle(session)}" 嗎？`)) {
                            onDeleteSession(session.id);
                          }
                        }}
                        aria-label="刪除對話"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {index < sessions.length - 1 && (
                  <Separator className="my-1 mx-3" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {isLoading && (
        <div className="p-3 border-t border-border text-xs text-muted-foreground flex items-center justify-center">
          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
          加載中...
        </div>
      )}
    </div>
  );
}
