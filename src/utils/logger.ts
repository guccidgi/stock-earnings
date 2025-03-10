export type LogLevel = 'info' | 'warn' | 'error';
export type LogEntry = { message: string; type: LogLevel; timestamp: string };

class LoggerService {
  private logs: LogEntry[] = [];
  private subscribers: Set<(logs: LogEntry[]) => void> = new Set();
  private enabled = process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true';
  
  // 記錄日誌
  log(message: string, type: LogLevel = 'info'): void {
    if (!this.enabled) return;
    
    console.log(`[${type}] ${message}`); // 保留控制台輸出
    
    const newEntry = { 
      message, 
      type, 
      timestamp: new Date().toISOString() 
    };
    
    this.logs = [...this.logs, newEntry].slice(-50); // 保留最新的50條日誌
    this.notifySubscribers();
  }
  
  // 清空日誌
  clearLogs(): void {
    this.logs = [];
    this.notifySubscribers();
  }
  
  // 獲取所有日誌
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  // 訂閱日誌更新
  subscribe(callback: (logs: LogEntry[]) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getLogs()); // 立即提供當前日誌
    
    // 返回取消訂閱函數
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  // 通知所有訂閱者
  private notifySubscribers(): void {
    const currentLogs = this.getLogs();
    for (const callback of this.subscribers) {
      callback(currentLogs);
    }
  }
  
  // 檢查是否啟用日誌
  isEnabled(): boolean {
    return !!this.enabled;
  }
}

// 導出單例實例
export const logger = new LoggerService(); 