// Shared types for the application

export interface FileInfo {
  id: string;
  name: string;
  file_path: string;
  size: string;
  type: string;
  storage_path: string;
  created_at: string;
  user_id: string;
}

export interface User {
  id: string;
  email: string;
}

// Chat related types
export interface ChatSession {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  file_ids?: string[];
  messages?: ChatMessage[]; // 添加消息陣列屬性
}

export interface ChatMessage {
  id: string;
  session_id: string;
  content: string;
  role: 'user' | 'system';
  created_at: string;
  file_reference?: string;
}

// N8n chat history for direct use with existing table
export interface N8nChatHistory {
  id: string;
  user_id: string;
  chat_history: string; // JSON string containing the entire chat history
  created_at?: string;
  updated_at?: string;
}
