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
    <div className="chat-content">
      {/* Header */}
      <div className="chat-header">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span>與您的文件對話</span>
        </h2>
        {selectedFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedFiles.map(file => (
              <span 
                key={file.id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
              >
                {file.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="chat-messages">
        <div className="space-y-4 pr-4">
          {/* 只有在完全沒有消息且不是加載狀態時才顯示空狀態 */}
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">詢問任何關於您檔案的問題</p>
              <p className="text-sm mt-1">輸入訊息以開始對話</p>
            </div>
          ) : (
            <>
              {/* 立即渲染所有消息，確保用戶輸入後立即顯示 */}
              {messages.map((message, index) => (
                <div 
                  key={`${message.id || message.session_id}_${index}`}
                  className={cn("chat-message", message.role === 'user' ? "chat-message-user" : "chat-message-system")}
                  data-testid={`message-${index}`}
                >
                  {message.role !== 'user' && (
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <Card className={cn(
                    "max-w-[75%]",
                    message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card"
                  )}>
                    <CardContent className="p-3 text-sm">
                      {message.content}
                      {message.file_reference && (
                        <div className="text-xs mt-1 opacity-70">
                          參考文件: {message.file_reference}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 ml-2">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">Me</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                  <Card className="max-w-[75%] bg-card">
                    <CardContent className="p-3 flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">思考中...</span>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="chat-input-container">
        {!sessionId ? (
          <div className="text-center py-2">
            <p className="text-muted-foreground mb-2">請先點擊「+ 新增會話」後才能發送消息</p>
            <Button
              disabled={true}
              variant="secondary"
              className="opacity-50"
            >
              輸入框已禁用
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="輸入您的訊息..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
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
              className="h-[40px] w-[40px]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
