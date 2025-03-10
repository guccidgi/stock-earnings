import { useState, useEffect } from 'react';
import { logger, LogEntry } from '../utils/logger';

export function useLogger() {
  const [logs, setLogs] = useState<LogEntry[]>(logger.getLogs());
  const [showLogs, setShowLogs] = useState<boolean>(false);
  
  useEffect(() => {
    // 訂閱日誌更新
    const unsubscribe = logger.subscribe(setLogs);
    return unsubscribe; // 取消訂閱
  }, []);
  
  return {
    logs,
    showLogs,
    setShowLogs,
    clearLogs: logger.clearLogs.bind(logger),
    log: logger.log.bind(logger),
    isEnabled: logger.isEnabled()
  };
} 