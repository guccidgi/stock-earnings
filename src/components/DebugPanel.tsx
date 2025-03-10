import React from 'react';
import { useLogger } from '../hooks/useLogger';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

export function DebugPanel() {
  const { logs, showLogs, setShowLogs, clearLogs, isEnabled } = useLogger();
  
  if (!isEnabled) return null;
  
  return (
    <>
      {/* 控制按鈕 */}
      <div className="debug-controls">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setShowLogs(!showLogs)}
          className="debug-btn"
        >
          {showLogs ? <EyeOff className="debug-icon" /> : <Eye className="debug-icon" />}
          <span className="debug-text">{showLogs ? '隱藏日誌' : '顯示日誌'}</span>
        </Button>
        <Button 
          variant="outline"
          size="sm"
          onClick={clearLogs} 
          className="debug-btn"
        >
          <Trash2 className="debug-icon" />
          <span className="debug-text">清空日誌</span>
        </Button>
      </div>
      
      {/* 日誌顯示區域 */}
      {showLogs && (
        <ScrollArea className="logs-panel">
          <div className="logs-content">
            {logs.length === 0 ? (
              <div className="empty-logs">無日誌記錄</div>
            ) : (
              logs.map((item, i) => (
                <div 
                  key={i} 
                  className={`log-entry ${item.type === 'error' ? 'log-error' : item.type === 'warn' ? 'log-warning' : 'log-info'}`}
                >
                  [{new Date(item.timestamp).toLocaleTimeString()}] {item.message}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </>
  );
} 