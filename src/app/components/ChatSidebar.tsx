import React from 'react';
import { ChatSession, ChatMessage } from '../types';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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
    <div className="h-full flex flex-col bg-white border-r border-gray-200 w-64">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">您的對話</h2>
        <button 
          onClick={onNewSession}
          className="text-gray-600 hover:text-gray-900"
          aria-label="New Chat"
        >
          <Plus size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No chat sessions yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sessions.map((session, index) => (
              <li 
                key={`${session.id}_${index}`}
                className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${activeSessionId === session.id ? 'bg-gray-100' : ''}`}
              >
                <div 
                  className="p-4 flex items-start gap-3"
                  onClick={() => onSessionSelect(session.id)}
                >
                  <MessageCircle className="text-gray-500 mt-1" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{getSessionTitle(session)}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(session.updated_at)}
                    </p>
                    <p className="text-xs text-gray-400 truncate">ID: {session.id.substring(0, 8)}...</p>
                  </div>
                  {onDeleteSession && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();  // Prevent triggering session selection
                        if (window.confirm(`確定要刪除對話 "${getSessionTitle(session)}" 嗎？`)) {
                          onDeleteSession(session.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete chat"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* 移除底部的新建對話按鈕，因為我們已經在頂部添加了一個 */}
    </div>
  );
}
