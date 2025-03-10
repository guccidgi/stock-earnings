import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ChatSession, ChatMessage, N8nChatHistory } from '../types';
import ChatSidebar from './ChatSidebar';
import ChatInterface from './ChatInterface';
import { FileInfo } from '../types';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';

interface ChatContainerProps {
  userId?: string; // 可選，如果未提供則從 supabase auth 獲取
  initialSessionId?: string; // 可選，初始聊天會話 ID
  files?: FileInfo[]; // 可選，用戶上傳的檔案列表
}

export default function ChatContainer({ userId, initialSessionId, files }: ChatContainerProps) {
  // 用戶相關狀態
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);
  
  // 聊天會話相關狀態
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // UI 狀態
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 添加調試日誌狀態
  const enableLogs = process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true';
  const [logs, setLogs] = useState<{message: string, type: string}[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  // 添加自定義日誌函數
  const log = (message: string, type: 'info' | 'warn' | 'error' = 'info') => {
    if (enableLogs) {
      console.log(`[${type}] ${message}`); // 保留控制台輸出
      setLogs(prev => [...prev, {message, type}].slice(-50)); // 保留最新的50條日誌
    }
  };

  // 獲取當前用戶 ID
  useEffect(() => {
    if (!currentUserId) {
      const fetchCurrentUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setCurrentUserId(data.user.id);
        }
      };
      
      fetchCurrentUser();
    }
  }, [currentUserId]);

  // 當用戶 ID 可用時，獲取聊天會話列表
  useEffect(() => {
    if (currentUserId) {
      fetchChatSessions();
    }
  }, [currentUserId]);

  // 當選擇會話變更時，獲取該會話的消息
  useEffect(() => {
    if (activeSessionId) {
      log(`切換到會話 ID: ${activeSessionId}`, 'info');
      setIsLoading(true);
      setMessages([]);  // 切換會話時先清空消息
      fetchSessionMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // 從 n8n_chat_histories 獲取用戶的聊天會話列表
  const fetchChatSessions = async () => {
    try {
      setError(null);
      log('Fetching chat sessions for user ID:', 'info');
      
      if (!currentUserId) {
        log('No user ID available', 'warn');
        return;
      }
      
      // 首先檢查表結構
      log('Checking n8n_chat_histories table structure...');
      const { data: tableInfo, error: tableError } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .limit(1);
        
      if (tableError) {
        log('Error checking table structure:', 'error');
      } else {
        log('Table structure sample:', 'info');
        if (tableInfo && tableInfo.length > 0) {
          log('Available columns:', 'info');
        } else {
          log('No records found in n8n_chat_histories table', 'warn');
        }
      }
      
      // 獲取所有聊天記錄，然後在程式碼中篩選屬於當前用戶的記錄
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        log('Error fetching chat sessions:', 'error');
        throw error;
      }
      
      // 篩選出屬於當前用戶的聊天會話
      // 通過拆分 session_id（格式為：時間戳_用戶ID）來提取用戶 ID
      log('Raw data from database:', 'info');
      
      // 在過濾前先對數據進行分組，確保每個 session_id 只取一次
      const sessionGroups: Record<string, any[]> = {};
      
      // 將數據按 session_id 分組
      data.forEach((item: any) => {
        if (!item || !item.session_id) {
          log('Skipping item with no session_id:', 'warn');
          return;
        }
        
        // 檢查 session_id 是否存在並且是字符串
        if (typeof item.session_id !== 'string') {
          log(`Item session_id is not a string: ${typeof item.session_id}`, 'warn');
          return;
        }
        
        // 把相同 session_id 的記錄分到同一組
        if (!sessionGroups[item.session_id]) {
          sessionGroups[item.session_id] = [];
        }
        sessionGroups[item.session_id].push(item);
      });
      
      log(`Total unique session_ids: ${Object.keys(sessionGroups).length}`, 'info');
      
      // 從每個分組中選擇一條記錄（每個 session_id 只取一次）
      const uniqueRecords = Object.values(sessionGroups).map(group => {
        // 從每組中選擇最新的記錄（如果有多條）
        return group.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })[0];
      });
      
      log(`After grouping, unique records count: ${uniqueRecords.length}`, 'info');
      
      // 按用戶 ID 過濾
      const filteredData = uniqueRecords.filter((item: any) => {
        try {
          const parts = item.session_id.split('_');
          if (parts.length < 2) {
            log(`Session ID does not contain underscore: ${item.session_id}`, 'warn');
            return false;
          }
          const sessionUserId = parts[parts.length - 1]; // 取最後一部分作為用戶 ID
          log(`Session ID: ${item.session_id}`, 'info');
          log(`Extracted User ID: ${sessionUserId}`, 'info');
          log(`Current User ID: ${currentUserId}`, 'info');
          return sessionUserId === currentUserId;
        } catch (error) {
          log('Error processing item:', 'error');
          return false;
        }
      });
      
      log('Filtered sessions count:', 'info');

      // 將過濾Data轉換為 ChatSession 格式
      const sessions = filteredData.map((item: any) => {
        try {
          // 安全解析 chat_history JSON
          let chatHistory = [];
          try {
            chatHistory = JSON.parse(item.chat_history || '[]');
          } catch (parseError) {
            log('Error parsing chat_history:', 'error');
          }
          
          const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
          
          // 安全地從 session_id 中提取用戶 ID
          let extractedUserId = '';
          if (typeof item.session_id === 'string') {
            const parts = item.session_id.split('_');
            extractedUserId = parts.length >= 2 ? parts[parts.length - 1] : '';
          } else {
            log('Item session_id is not a string in map function:', 'warn');
          }
          
          // 確保日期欄位存在
          const createdAt = item.created_at ? new Date(item.created_at) : new Date();
          const updatedAt = item.updated_at ? new Date(item.updated_at) : createdAt;
          
          // 先從 item.message 中提取初始消息用於標題顯示
          let initialMessages: ChatMessage[] = [];
          
          if (item.message) {
            try {
              let msgContent = '';
              let msgRole: 'system' | 'user' = 'system';
              
              if (typeof item.message === 'object') {
                const msgObj = item.message;
                msgContent = msgObj.content || '';
                msgRole = msgObj.type === 'human' ? 'user' : 'system';
              } else if (typeof item.message === 'string') {
                try {
                  const parsedMsg = JSON.parse(item.message);
                  msgContent = parsedMsg.content || '';
                  msgRole = parsedMsg.type === 'human' ? 'user' : 'system';
                } catch (e) {
                  msgContent = item.message;
                }
              }
              
              if (msgContent) {
                initialMessages.push({
                  id: `${item.session_id}_initial`,
                  session_id: item.session_id,
                  content: msgContent,
                  role: msgRole,
                  created_at: item.created_at || new Date().toISOString(),
                });
              }
            } catch (e) {
              log(`Error formatting initial message: ${e}`, 'error');
            }
          }
          
          return {
            id: item.session_id || '',
            name: `Chat ${createdAt.toLocaleDateString()}`,
            user_id: extractedUserId,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || item.created_at || new Date().toISOString(),
            messages: initialMessages, // 添加消息數組
          };
        } catch (error) {
          log('Error creating chat session object:', 'error');
          // 返回一個默認的安全對象
          return {
            id: `error_${Date.now()}`,
            name: 'Error Chat',
            user_id: currentUserId || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: [], // 確保錯誤情況下也有空消息數組
          };
        }
      });

      setChatSessions(sessions);

      // 如果沒有活動會話但有會話列表，選擇第一個會話
      if (!activeSessionId && sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      }
    } catch (error: any) {
      log('Error fetching chat sessions:', 'error');
      setError('Failed to load chat sessions. ' + error.message);
    }
  };

  // 獲取特定會話的消息 
  // 注意：n8n_chat_history 會為每次對話儲存兩筆記錄（用戶訊息和 AI 回覆）
  // 新增: 可選參數 preserveMessages 允許保存用戶的最新消息
  const fetchSessionMessages = async (sessionId: string, preserveMessages: ChatMessage[] = []) => {
    try {
      log('==========================================', 'info');
      log('開始獲取會話記錄', 'info');
      if (preserveMessages.length > 0) {
        log(`將保存 ${preserveMessages.length} 條用戶消息`, 'info');
      }
      log('==========================================', 'info');
      setError(null);
      log(`Fetching messages for session ID: ${sessionId}`, 'info');
      log(`Current user ID: ${currentUserId}`, 'info');
      setIsLoading(true);
      
      // 檢查指定的 session_id 記錄是否存在
      log('檢查指定 session_id 是否存在...', 'info');
      log(`查詢 session_id: ${sessionId}`, 'info');
      
      // 查詢指定 session_id 的所有記錄，並按創建時間排序
      const { data: specificRecords, error: specificError } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
        
      if (specificError) {
        log(`Error checking specific record: ${specificError.message}`, 'error');
      } else {
        const hasRecords = specificRecords && specificRecords.length > 0;
        log(`Specific records found: ${hasRecords ? specificRecords.length : 0}`, 'info');
        
        if (hasRecords) {
          // 使用最新的記錄
          const specificRecord = specificRecords[0];
          log(`Record ID: ${specificRecord.id}`, 'info');
          log(`Record created_at: ${specificRecord.created_at}`, 'info');
          
          // 檢查 message 欄位並處理消息
          if (specificRecord.message) {
            log(`Record message type: ${typeof specificRecord.message}`, 'info');
            let messageContent = '';
            let messageRole: 'system' | 'user' = 'system';
            
            if (typeof specificRecord.message === 'object') {
              log(`Message content (object): ${JSON.stringify(specificRecord.message)}`, 'info');
              // 從對象中提取內容
              const messageObj = specificRecord.message;
              messageContent = messageObj.content || '';
              messageRole = messageObj.type === 'human' ? 'user' : 'system';
            } else if (typeof specificRecord.message === 'string') {
              try {
                const parsedMessage = JSON.parse(specificRecord.message);
                log(`Message content (parsed): ${JSON.stringify(parsedMessage)}`, 'info');
                messageContent = parsedMessage.content || '';
                messageRole = parsedMessage.type === 'human' ? 'user' : 'system';
              } catch (e) {
                log(`Error parsing message: ${e instanceof Error ? e.message : String(e)}`, 'error');
                log(`Raw message content: ${specificRecord.message}`, 'info');
                messageContent = specificRecord.message;
              }
            }
            
            // 創建消息對象 - 僅用於日誌記錄，實際操作使用allMessages
            const formattedMessage: ChatMessage = {
              id: `${sessionId}_${specificRecord.id}`,
              session_id: sessionId,
              content: messageContent,
              role: messageRole,
              created_at: specificRecord.created_at || new Date().toISOString(),
            };
            
            log(`Formatted message: ${JSON.stringify(formattedMessage)}`, 'info');
          }
            
          // 處理所有記錄，並確保消息的顯示順序正確
          // n8n_chat_history 會為每次對話儲存兩筆數據（一個是 human 發送的數據，一個是 AI 回覆的數據）
          log(`Processing ${specificRecords.length} records into messages...`, 'info');
          
          const allMessages = specificRecords.map((record, index) => {
            try {
              let msgContent = '';
              let msgRole: 'system' | 'user' = 'system';
              let uniqueId = `${sessionId}_${record.id}_${index}`;
              
              // 嘗試解析並提取消息內容
              if (record.message) {
                if (typeof record.message === 'object') {
                  const msgObj = record.message;
                  msgContent = msgObj.content || '';
                  // 根據 n8n 的診斷記錄，將 'human' 類型轉換為 'user' 角色
                  msgRole = msgObj.type === 'human' ? 'user' : 'system';
                  log(`Object message type: ${msgObj.type}, converted role: ${msgRole}`, 'info');
                } else if (typeof record.message === 'string') {
                  try {
                    const parsedMsg = JSON.parse(record.message);
                    msgContent = parsedMsg.content || '';
                    // 同樣將 'human' 類型轉換為 'user' 角色
                    msgRole = parsedMsg.type === 'human' ? 'user' : 'system';
                    log(`String message type: ${parsedMsg.type}, converted role: ${msgRole}`, 'info');
                  } catch (e) {
                    msgContent = record.message;
                    log(`Failed to parse message as JSON, using raw string`, 'warn');
                  }
                }
              }
              
              // 確保 ID 在同一個會話中是唯一的，即使有多條相同 session_id 的記錄
              // 如果是系統消息，則添加時間戳以確保是唯一的
              if (msgRole === 'system') {
                uniqueId = `${uniqueId}_system_${Date.now()}`;
              }
              
              return {
                id: uniqueId,
                session_id: sessionId,
                content: msgContent,
                role: msgRole,
                created_at: record.created_at || new Date().toISOString(),
              };
            } catch (err) {
              log(`Error processing record at index ${index}: ${err}`, 'error');
              return null;
            }
          }).filter((msg): msg is ChatMessage => msg !== null); // 移除 null 項並確保類型正確
          
          if (allMessages.length > 0) {
            log(`成功處理 ${allMessages.length} 條消息`, 'info');
            setMessages(allMessages);
            setIsLoading(false);
            return; // 處理完成後返回
          }
        }
               if (specificRecords && specificRecords.length > 0) {
            try {
              const currentRecord = specificRecords[0]; // 使用第一條記錄
              const chatHistory = JSON.parse(currentRecord.chat_history || '[]');
              log(`Chat history length: ${chatHistory.length}`, 'info');
              if (chatHistory.length > 0) {
                log(`Chat history sample: ${JSON.stringify(chatHistory[0])}`, 'info');
                
                // 將聊天歷史轉換為消息格式
                const formattedMessages = chatHistory.map((msg: any, index: number) => {
                  // 確保每個消息都有必要的屬性
                  if (!msg) {
                    log(`Empty message at index ${index}`, 'warn');
                    return {
                      id: `${sessionId}_${currentRecord.id}_${index}`,
                      session_id: sessionId,
                      content: '',
                      role: 'user' as 'user' | 'system',  // 確保類型正確
                      created_at: new Date().toISOString(),
                    };
                  }
                  
                  // 添加更多日誌情況
                  log(`Processing chat history item ${index}: ${JSON.stringify(msg).substring(0, 100)}...`, 'info');
                  
                  return {
                    id: `${sessionId}_${currentRecord.id}_${index}`,
                    session_id: sessionId,
                    content: msg.content || msg.message || '',
                    role: (msg.role || (msg.isUser ? 'user' : 'system')) as 'user' | 'system',  // 確保類型正確
                    created_at: msg.timestamp || new Date().toISOString(),
                  };
                });
                
                log(`Formatted ${formattedMessages.length} messages from chat history`, 'info');
                setMessages(formattedMessages);
                setIsLoading(false);
                return; // 處理成功後立即返回
              }
          } catch (e) {
            log(`Error parsing chat history: ${e instanceof Error ? e.message : String(e)}`, 'error');
          }
        }
      }
      
      // 如果沒有條目或記錄不存在，嘗試從所有記錄中尋找
      // 獲取所有記錄，然後在前端週物過濾
      log('獲取所有記錄...', 'info');
      const { data: allRecords, error: fetchError } = await supabase
        .from('n8n_chat_histories')
        .select('*');
        
      if (fetchError) {
        log('Error fetching all records:', 'error');
        throw fetchError;
      }
      
      log(`Total records fetched: ${allRecords ? allRecords.length : 0}`, 'info');
      if (allRecords && allRecords.length > 0) {
        log(`Records session_ids sample: ${allRecords.slice(0, 3).map(r => r.session_id).join(', ')}`, 'info');
      }
      log(`Looking for session ID: ${sessionId}`, 'info');
      
      // 在 JavaScript 端過濾出目標記錄 - 使用 session_id 而非 id 進行比較
      const targetRecord = allRecords.find(record => {
        log(`Comparing with record.session_id: ${record.session_id} vs ${sessionId}`, 'info');
        return String(record.session_id) === String(sessionId);
      });
      
      log(`Target record found: ${targetRecord ? 'yes' : 'no'}`, 'info');
      
      if (!targetRecord) {
        log('==========================================', 'info');
        log(`No exact match found for session ID: ${sessionId}`, 'info');
        log('==========================================', 'info');
        
        // 嘗試找到部分匹配 - 基於 session_id 格式是 timestamp_userId
        log('嘗試尋找部分匹配...', 'info');
        const sessionParts = String(sessionId).split('_');
        if (sessionParts.length > 1) {
          const userId = sessionParts[1];
          log(`提取的 user ID: ${userId}`, 'info');
          
          // 尋找相同用戶的最新記錄
          const userRecords = allRecords.filter(record => {
            // 使用 session_id 而非 id
            const recordParts = String(record.session_id).split('_');
            return recordParts.length > 1 && recordParts[1] === userId;
          });
          
          log(`同一用戶的記錄數量: ${userRecords.length}`, 'info');
          if (userRecords.length > 0) {
            // 按時間戳排序，獲取最新記錄
            const sortedRecords = userRecords.sort((a, b) => {
              const aTime = Number(String(a.session_id).split('_')[0]) || 0;
              const bTime = Number(String(b.session_id).split('_')[0]) || 0;
              return bTime - aTime; // 降序排列，最新的在前
            });
            
            const mostRecentRecord = sortedRecords[0];
            log(`使用最新的記錄: ${mostRecentRecord.id}`, 'info');
            
            // 使用找到的記錄來處理聊天歷史
            try {
              const altChatHistory = JSON.parse(mostRecentRecord.chat_history || '[]');
              log(`替代記錄的聊天歷史長度: ${altChatHistory.length}`, 'info');
              
              if (altChatHistory.length > 0) {
                log(`使用替代記錄的聊天歷史...(session_id: ${mostRecentRecord.session_id})`, 'info');
                
                // 直接處理聊天歷史，將替代記錄的數據格式化為我們需要的消息格式
                const formattedAltMessages = altChatHistory.map((msg: any, index: number) => {
                  // 確保每個消息都有必要的屬性
                  if (!msg) {
                    log(`Empty message at index ${index}`, 'warn');
                    return {
                      id: `${mostRecentRecord.session_id}_${index}`,
                      session_id: String(mostRecentRecord.session_id),
                      content: '',
                      role: 'user',
                      created_at: new Date().toISOString(),
                    };
                  }
                  
                  return {
                    id: `${mostRecentRecord.session_id}_${index}`,
                    session_id: String(mostRecentRecord.session_id),
                    content: msg.content || msg.message || '',
                    role: msg.role || (msg.isUser ? 'user' : 'system'),
                    created_at: msg.timestamp || new Date().toISOString(),
                  };
                });

                log(`已從替代記錄格式化消息，數量: ${formattedAltMessages.length}`, 'info');
                if (formattedAltMessages.length > 0) {
                  log(`第一條格式化消息: ${JSON.stringify(formattedAltMessages[0])}`, 'info');
                }
                
                // 更新發送消息時使用的 sessionId
                setActiveSessionId(String(mostRecentRecord.id));
                
                // 如果有需要保留的消息，就將它們添加到替代記錄中的消息中
                if (preserveMessages.length > 0) {
                  // 創建一個現有消息的集合來監測重複
                  const existingMessageContents = new Set(formattedAltMessages.map((msg: ChatMessage) => 
                    `${msg.content}_${msg.role}`
                  ));
                  
                  // 只保留不重複的消息
                  const uniquePreservedMessages = preserveMessages.filter(msg => 
                    !existingMessageContents.has(`${msg.content}_${msg.role}`)
                  );
                  
                  log(`添加 ${uniquePreservedMessages.length} 條不重複的用戶消息到替代記錄`, 'info');
                  
                  // 合併消息列表
                  setMessages([...formattedAltMessages, ...uniquePreservedMessages]);
                } else {
                  setMessages(formattedAltMessages);
                }
                
                setIsLoading(false);
                return;
              }
            } catch (altParseError) {
              log(`解析替代聊天歷史時出錯: ${altParseError instanceof Error ? altParseError.message : String(altParseError)}`, 'error');
            }
          }
        }
        
        log('沒有找到合適的替代記錄', 'info');
        
        // 如果有需要保留的消息，就使用它不返回空消息列表
        if (preserveMessages.length > 0) {
          log(`保留 ${preserveMessages.length} 條用戶消息，不返回空列表`, 'info');
          setMessages(preserveMessages);
        } else {
          log('返回空消息列表', 'info');
          setMessages([]);
        }
        
        setIsLoading(false);
        return;
      }

      // 安全解析 chat_history JSON
      let chatHistory = [];
      try {
        log('解析目標記錄的聊天歷史...', 'info');
        chatHistory = JSON.parse(targetRecord.chat_history || '[]');
        log(`Chat history parsed successfully, length: ${chatHistory.length}`, 'info');
        if (chatHistory.length > 0) {
          log(`第一條消息內容: ${JSON.stringify(chatHistory[0])}`, 'info');
        }
      } catch (parseError) {
        log('Error parsing chat_history:', 'error');
      }
      
      // 確保聊天歷史是數組
      if (!Array.isArray(chatHistory)) {
        log(`Chat history is not an array: ${typeof chatHistory}`, 'warn');
        chatHistory = [];
      }
      
      const formattedMessages = chatHistory.map((msg: any, index: number) => {
        // 確保每個消息都有必要的屬性
        if (!msg) {
          log(`Empty message at index ${index}`, 'warn');
          return {
            id: `${sessionId}_${index}`,
            session_id: sessionId,
            content: '',
            role: 'user',
            created_at: new Date().toISOString(),
          };
        }
        
        return {
          id: `${sessionId}_${index}`,
          session_id: sessionId,
          content: msg.content || msg.message || '',
          role: msg.role || (msg.isUser ? 'user' : 'system'),
          created_at: msg.timestamp || new Date().toISOString(),
        };
      });

      log(`Formatted messages: ${formattedMessages.length}`, 'info');
      
      // 如果有需要保存的消息，就將它們添加到結果中
      if (preserveMessages.length > 0) {
        // 創建一個正常消息的集合來監測重複
        const existingMessageContents = new Set(formattedMessages.map(msg => 
          `${msg.content}_${msg.role}`
        ));
        
        // 只保留不重複的消息
        const uniquePreservedMessages = preserveMessages.filter(msg => 
          !existingMessageContents.has(`${msg.content}_${msg.role}`)
        );
        
        log(`添加 ${uniquePreservedMessages.length} 條不重複的用戶消息`, 'info');
        
        // 合併消息列表
        const combinedMessages = [...formattedMessages, ...uniquePreservedMessages];
        setMessages(combinedMessages);
      } else {
        setMessages(formattedMessages);
      }
      
      setIsLoading(false);
    } catch (error: any) {
      log(`Error fetching session messages: ${error.message}`, 'error');
      setError('Failed to load chat messages. ' + error.message);
      setIsLoading(false);
    }
  };

  // 建立一個新的聊天會話
  const createNewSession = async () => {
    if (!currentUserId) return;
    
    const sessionId = `${Date.now()}_${currentUserId}`;
    
    // 我們不直接寫入數據庫，而是等 webhook 處理第一條消息時創建
    // 但我們需要在 UI 上立即顯示新會話
    const newSession: ChatSession = {
      id: sessionId,
      name: `New Chat ${new Date().toLocaleDateString()}`,
      user_id: currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setChatSessions([newSession, ...chatSessions]);
    setActiveSessionId(sessionId);
    setMessages([]);
  };

  // 刪除聊天會話
  const deleteSession = async (sessionId: string) => {
    try {
      log(`Attempting to delete session with ID: ${sessionId}`, 'info');
      setIsLoading(true);
      
      // 獲取所有記錄，然後在前端找到要刪除的記錄
      const { data: allRecords, error: fetchError } = await supabase
        .from('n8n_chat_histories')
        .select('*');
        
      if (fetchError) {
        log(`Error fetching records for deletion: ${fetchError.message}`, 'error');
        throw fetchError;
      }
      
      // 找到匹配的記錄 - 使用 session_id 欄位而非 id 欄位進行比較
      const recordToDelete = allRecords.find(record => String(record.session_id) === String(sessionId));
      
      if (!recordToDelete) {
        log(`Record not found for deletion, ID: ${sessionId}`, 'warn');
        // 即使記錄不存在於 DB，我們也要從 UI 中刪除它
        setChatSessions(chatSessions.filter(session => session.id !== sessionId));
        setIsLoading(false);
        return;
      }
      
      log(`Found record to delete: ${recordToDelete.id}`, 'info');
      
      // 使用 filter 而非 eq 來刪除記錄
      const { error } = await supabase
        .from('n8n_chat_histories')
        .delete()
        .filter('session_id', 'eq', sessionId);

      if (error) {
        log(`Error when deleting record: ${error.message}`, 'error');
        throw error;
      }

      // 更新會話列表
      setChatSessions(chatSessions.filter(session => session.id !== sessionId));
      
      // 如果刪除的是當前活動會話，則切換到其他會話或清空
      if (activeSessionId === sessionId) {
        const remainingSessions = chatSessions.filter(session => session.id !== sessionId);
        if (remainingSessions.length > 0) {
          setActiveSessionId(remainingSessions[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
      
      log(`Session successfully deleted: ${sessionId}`, 'info');
      setIsLoading(false);
    } catch (error: any) {
      log(`Error deleting session: ${error.message}`, 'error');
      setError('Failed to delete chat session. ' + error.message);
      setIsLoading(false);
    }
  };

  // 發送消息到 n8n webhook
  // 注意：每次對話會產生兩筆記錄，但具有相同的 session_id
  const sendMessage = async (content: string) => {
    if (!currentUserId || !content.trim() || isLoading) return;
    
    try {
      // 生成 session_id，無論是否有活動會話
      const sessionId = activeSessionId || `${Date.now()}_${currentUserId}`;
      
      // 先創建用戶消息對象
      const userMessage: ChatMessage = {
        id: `temp_${Date.now()}`,
        session_id: sessionId,
        content: content,
        role: 'user',
        created_at: new Date().toISOString(),
      };
      
      // 如果沒有活動會話，創建一個新的並直接包含用戶消息
      if (!activeSessionId) {
        log('沒有活動會話，創建一個新的', 'info');
        
        // 在 UI 上立即進行推送創建新會話
        const newSession: ChatSession = {
          id: sessionId,
          name: `New Chat ${new Date().toLocaleDateString()}`,
          user_id: currentUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // 設置新的會話列表
        setChatSessions(prev => [newSession, ...prev]);
        
        // 設置活動會話 ID
        setActiveSessionId(sessionId);
        
        // 直接設置包含用戶消息的消息列表，而不是先清空
        log('直接設置包含用戶消息的消息列表', 'info');
        setMessages([userMessage]);
      } else {
        // 如果已經有活動會話，只需添加新消息
        log('添加用戶消息到界面', 'info');
        setMessages(prev => [...prev, userMessage]);
      }
      
      // 強制等待一幅 React 渲染周期，確保消息顯示後才設置加載狀態
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 在確保消息顯示後才設置加載狀態
      setIsLoading(true);
      setError(null);
      
      // 發送到 n8n webhook
      log('正在發送消息到 n8n webhook...', 'info');
      log(`請求數據: session_id=${sessionId}, question=${content}`, 'info');
      
      const response = await fetch('https://n8n.guccidgi.com/webhook/f8fd19bb-50cb-4d96-ac06-0f4d7b5221a2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.NEXT_PUBLIC_N8N_AUTH_TOKEN || '',
        },
        body: JSON.stringify({
          session_id: sessionId,
          question: content,
        }),
      });
      
      log(`響應狀態碼: ${response.status}`, 'info');
      if (!response.ok) {
        log(`HTTP 錯誤! 狀態碼: ${response.status}`, 'error');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 嘗試解析響應，但處理可能的非 JSON 格式響應
      let data;
      try {
        // 先檢查響應的 Content-Type
        const contentType = response.headers.get('Content-Type') || '';
        log(`響應 Content-Type: ${contentType}`, 'info');
        
        // 輸出所有響應頭信息
        const headers: Record<string, string> = {};
        response.headers.forEach((value, name) => {
          headers[name] = value;
          log(`響應頭: ${name} = ${value}`, 'info');
        });
        
        if (contentType.includes('application/json')) {
          // 如果是 JSON 格式，用 json() 解析
          data = await response.json();
          log(`響應數據 (JSON): ${JSON.stringify(data)}`, 'info');
        } else {
          // 如果不是 JSON，只讀取文本
          const text = await response.text();
          log(`響應數據 (Text): ${text}`, 'info');
          // 希望 n8n 已經處理了請求，即使這不是 JSON
          data = { text }; // 將文本轉換為簡單的對象
        }
      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        log(`解析響應錯誤: ${errorMessage}`, 'error');
        // 即使解析失敗，我們仍然假設 n8n 處理了請求
      }
      
      // n8n webhook 處理了消息存儲，所以我們需要重新獲取這個會話的消息
      // 添加延遲，確保 n8n 有足夠時間處理消息
      log('==========================================', 'info');
      log('等待 n8n 處理消息...', 'info');
      log('session_id: ' + sessionId, 'info');
      log('==========================================', 'info');
      
      // 增加延遲時間並添加多次偵測
      const attemptCount = { value: 0 };
      const maxAttempts = 5;
      const delayBetweenAttempts = 1000; // 1 秒
      
      const checkForMessages = () => {
        attemptCount.value++;
        log(`嘗試第 ${attemptCount.value}/${maxAttempts} 次獲取消息`, 'info');
        
        // 先直接檢查指定的 session_id 是否存在
        log(`正在查詢數據庫，查找 session_id: ${sessionId}`, 'info');
        
        // 先列出所有記錄，以便調試
        supabase
          .from('n8n_chat_histories')
          .select('*')
          .then(({ data: allRecords, error: listError }) => {
            if (listError) {
              log(`列出所有記錄錯誤: ${listError.message}`, 'error');
              return;
            }
            
            log(`數據庫中共有 ${allRecords ? allRecords.length : 0} 條記錄`, 'info');
            
            if (allRecords && allRecords.length > 0) {
              // 列出前幾條記錄的 session_id 供參考
              const sampleSize = Math.min(allRecords.length, 5);
              log('數據庫記錄樣本:', 'info');
              for (let i = 0; i < sampleSize; i++) {
                const record = allRecords[i];
                log(`記錄 ${i+1}: session_id=${record.session_id}, id=${record.id}`, 'info');
              }
              
              // 檢查表結構
              log('檢查 n8n_chat_histories 表結構...', 'info');
              const firstRecord = allRecords[0];
              log('表結構樣本:', 'info');
              Object.keys(firstRecord).forEach(key => {
                log(`欄位: ${key} = ${typeof firstRecord[key]}`, 'info');
              });
            }
            
            // 現在嘗試使用精確的 session_id 查詢，但不使用 maybeSingle()
            supabase
              .from('n8n_chat_histories')
              .select('*')
              .filter('session_id', 'eq', sessionId)
              .then(({ data: directCheckResults, error: directError }) => {
                if (directError) {
                  log(`直接查詢錯誤: ${directError.message}`, 'error');
                }
                
                // 檢查是否有結果
                const hasResults = directCheckResults && directCheckResults.length > 0;
                log(`直接檢查 - 記錄存在: ${hasResults ? '是' : '否'}`, 'info');
                
                // 如果有多條記錄，記錄一下
                if (hasResults && directCheckResults.length > 1) {
                  log(`找到多條記錄: ${directCheckResults.length} 條`, 'info');
                }
                
                // 獲取最新的一條記錄
                const directCheck = hasResults ? directCheckResults[0] : null;
                
                if (directCheck) {
                  log(`成功! 直接找到匹配的記錄 ID: ${directCheck.id}`, 'info');
                  
                  // 檢查 message 欄位
                  if (directCheck.message) {
                    log(`記錄包含 message 欄位，類型: ${typeof directCheck.message}`, 'info');
                    
                    // 如果 message 已經是對象，直接使用
                    if (typeof directCheck.message === 'object') {
                      log(`message 是對象: ${JSON.stringify(directCheck.message)}`, 'info');
                    } 
                    // 如果是字符串，嘗試解析
                    else if (typeof directCheck.message === 'string') {
                      try {
                        const parsedMessage = JSON.parse(directCheck.message);
                        log(`解析 message 成功: ${JSON.stringify(parsedMessage)}`, 'info');
                      } catch (e) {
                        log(`解析 message 錯誤: ${e instanceof Error ? e.message : String(e)}`, 'error');
                      }
                    }
                  }
                  
                  // 檢查 chat_history 欄位
                  try {
                    const history = JSON.parse(directCheck.chat_history || '[]');
                    log(`已找到聊天歷史記錄，長度: ${history.length}`, 'info');
                    if (history.length > 0) {
                      log(`最新消息: ${JSON.stringify(history[history.length - 1])}`, 'info');
                    }
                  } catch (e) {
                    log(`解析歷史記錄錯誤: ${e instanceof Error ? e.message : String(e)}`, 'error');
                  }
                  
                  // 如果找到了記錄，就正常刷新
                  log('已找到記錄，正在刷新消息和會話列表...', 'info');
                  
                  // 在刷新消息之前先保存當前的用戶消息對象
                  const currentMessages = [...messages];
                  
                  // 只保存最新的用戶消息，這就是剛剛發送的那一條
                  const recentUserMessages = currentMessages.filter(msg => 
                    msg.role === 'user' && msg.id && msg.id.startsWith('temp_')
                  );
                  
                  log(`保存最新發送的用戶消息，數量: ${recentUserMessages.length}`, 'info');
                  
                  // 正常獲取数据库消息，但保留用戶已發送的消息
                  fetchSessionMessages(sessionId, recentUserMessages);
                  fetchChatSessions();
                  setIsLoading(false);
                } else if (attemptCount.value < maxAttempts) {
                  // 如果沒有找到記錄且還有剩餘嘗試次數，繼續嘗試
                  log(`未找到記錄，${delayBetweenAttempts}ms 後嘗試再次獲取`, 'info');
                  
                  // 保留用戶消息，不清空
                  log('保留用戶消息，不進行清空操作', 'info');
                  setTimeout(checkForMessages, delayBetweenAttempts);
                  return;
                } else {
                  // 如果已經嘗試多次但仍然沒有找到記錄
                  log('已達到最大嘗試次數，使用替代方式查找', 'info');
                  
                  // 嘗試查找用戶的最新記錄
                  const sessionParts = String(sessionId).split('_');
                  if (sessionParts.length > 1) {
                    const userId = sessionParts[1];
                    log(`嘗試查找用戶 ID 為 ${userId}`, 'info');
                    
                    supabase
                      .from('n8n_chat_histories')
                      .select('*')
                      .filter('user_id', 'eq', userId)
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .then(({ data: userRecords, error: userError }) => {
                        if (userError) {
                          log(`查詢用戶記錄錯誤: ${userError.message}`, 'error');
                          fetchChatSessions();
                          setIsLoading(false);
                          return;
                        }
                        
                        if (userRecords && userRecords.length > 0) {
                          log(`找到用戶的最新記錄: ${userRecords[0].session_id}`, 'info');
                          // 使用這個記錄
                          fetchSessionMessages(String(userRecords[0].session_id));
                          fetchChatSessions();
                          return;
                        } else {
                          log('沒有找到用戶的任何記錄', 'info');
                          log('保留用戶已發送的消息', 'info');
                          
                          // 保留用戶消息，只更新會話列表
                          fetchChatSessions();
                          setIsLoading(false);
                        }
                      });
                  } else {
                    log('無法從 session_id 提取用戶 ID', 'info');
                    log('保留用戶已發送的消息，即使無法提取用戶ID', 'info');
                    
                    // 即使無法提取用戶ID，也保留用戶消息，只更新會話列表
                    fetchChatSessions();
                    setIsLoading(false);
                  }
                }
              });
          });
      };
      
      // 首次延遲後啟動檢查循環
      setTimeout(checkForMessages, 2000); // 第一次等待 2 秒

      
    } catch (error: any) {
      log('Error sending message:', 'error');
      setError('Failed to send message. ' + error.message);
      setIsLoading(false);
    }
  };

  // 如果用戶 ID 不可用，顯示加載狀態
  if (!userId) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>正在加載用戶資訊...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* 調試面板控制 */}
      {enableLogs && (
        <div className="debug-panel">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            className="debug-panel-button"
          >
            {showLogs ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="text-xs">{showLogs ? '隱藏日誌' : '顯示日誌'}</span>
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setLogs([])} 
            className="debug-panel-button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-xs">清空日誌</span>
          </Button>
        </div>
      )}
      
      {/* 調試日誌顯示區域 */}
      {enableLogs && showLogs && (
        <ScrollArea className="log-container">
          <div className="p-2 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">無日誌記錄</div>
            ) : (
              logs.map((item, i) => (
                <div 
                  key={i} 
                  className={`mb-1 ${item.type === 'error' ? 'text-destructive' : item.type === 'warn' ? 'text-amber-500' : 'text-emerald-500'}`}
                >
                  [{new Date().toLocaleTimeString()}] {item.message}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
      
      <div className="chat-main">
        {/* 左側聊天會話列表 */}
        <ChatSidebar
          sessions={chatSessions}
          activeSessionId={activeSessionId}
          onSessionSelect={setActiveSessionId}
          onNewSession={createNewSession}
          onDeleteSession={deleteSession}
          isLoading={isLoading}
        />

        {/* 右側聊天界面 */}
        <div className="chat-content">
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            error={error}
            sessionId={activeSessionId}
          />
        </div>
      </div>
    </div>
  );
}