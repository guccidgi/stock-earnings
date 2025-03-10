import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, FileInfo } from '../types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

type ChatInterfaceProps = {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  selectedFiles?: FileInfo[];
  error?: string | null;
  sessionId?: string | null;
};

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  selectedFiles = [],
  error = null,
  sessionId = null
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="interface-header">
        <h2 className="interface-title">
          <MessageSquare className="interface-icon" />
          <span>Chat with Your Files</span>
        </h2>
        <div className="interface-subtitle">
          Ask questions about your uploaded files
        </div>
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="selected-files">
            {selectedFiles.map(file => (
              <span 
                key={file.id}
                className="file-tag"
              >
                {file.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="message-container">
        <div className="message-list">
          {/* 空狀態顯示 */}
          {messages.length === 0 && !isLoading ? (
            <div className="empty-chat">
              <MessageSquare className="empty-icon" />
              <p className="empty-title">詢問任何關於您檔案的問題</p>
              <p className="empty-subtitle">輸入訊息以開始對話</p>
            </div>
          ) : (
            <>
              {/* 聊天消息 */}
              {messages.map((message, index) => (
                <div 
                  key={`${message.id || message.session_id}_${index}`}
                  className={cn("chat-message", message.role === 'user' ? "chat-message-user" : "chat-message-system")}
                  data-testid={`message-${index}`}
                >
                  {message.role === 'user' ? (
                    <>
                      <div className="message-content">{message.content}</div>
                      <div className="user-avatar">
                        <div className="avatar-label">Me</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ai-avatar">
                        <div className="avatar-label">AI</div>
                      </div>
                      <div className="message-content">
                        {message.content}
                        {message.file_reference && (
                          <div className="file-reference">
                            參考文件: {message.file_reference}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {/* 加載中顯示 */}
              {isLoading && (
                <div className="chat-message chat-message-system">
                  <div className="ai-avatar">
                    <div className="avatar-label">AI</div>
                  </div>
                  <div className="message-content loading-content">
                    <Loader2 className="loading-icon" />
                    <span>思考中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input 區域 */}
      <div className="input-container">
        {!sessionId ? (
          <div className="disabled-input">
            <p className="disabled-message">請先點擊「+ 新增會話」後才能發送消息</p>
            <Button
              disabled={true}
              variant="secondary"
              className="disabled-button"
            >
              輸入框已禁用
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="message-form">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="輸入您的訊息..."
              className="message-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isLoading) {
                    handleSubmit(e);
                  }
                }
              }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="send-button"
            >
              {isLoading ? <Loader2 className="send-icon spin" /> : <Send className="send-icon" />}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
