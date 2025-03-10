// Shared types for the application

export type ChatMessage = {
  id?: string;
  session_id?: string;
  role: 'user' | 'assistant';
  content: string;
  file_reference?: string;
  created_at?: string;
};

export type FileInfo = {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  file_path?: string;
  storage_path?: string;
  created_at?: string;
  user_id?: string;
};

export type SessionInfo = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  files?: FileInfo[];
};

export interface User {
  id: string;
  email: string;
  role?: string; // 'User' 或 'Admin'
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

export interface N8nChatHistory {
  id: string;
  user_id: string;
  chat_history: string; // JSON string containing the entire chat history
  created_at?: string;
  updated_at?: string;
}
