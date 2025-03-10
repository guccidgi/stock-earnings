import React from 'react';
import { supabase } from '../supabase';
import { FileInfo } from '../types';
import { motion } from 'framer-motion';

type FileListProps = {
  files: FileInfo[];
  onRefresh: () => void;
  onChatWithFiles?: () => void;
};

export default function FileList({ files, onRefresh, onChatWithFiles }: FileListProps) {
  // 添加樣式
  const styles = `
    .glass-card {
      background-color: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(209, 213, 219, 0.5);
      position: relative;
      overflow: hidden;
    }
    
    .glass-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
      opacity: 0.05;
      z-index: -1;
      pointer-events: none;
    }
    
    .glass-file-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    
    @media (max-width: 768px) {
      .glass-file-list {
        grid-template-columns: 1fr;
      }
    }
    
    .glass-file-card {
      position: relative;
      border-radius: 0.75rem;
      overflow: hidden;
      transition: all 0.3s ease;
      border: 1px solid rgba(209, 213, 219, 0.5);
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      isolation: isolate;
    }
    
    .glass-file-card:hover {
      box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1), 0 0 15px rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.3);
      transform: translateY(-5px);
    }
    
    .file-card-inner {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      z-index: 1;
      position: relative;
    }
    
    .glass-effect {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        135deg,
        rgba(59, 130, 246, 0.15) 0%,
        rgba(79, 70, 229, 0.1) 100%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 1;
    }
    
    .glass-file-card:hover .glass-effect {
      opacity: 1;
    }
    
    .noise-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
      opacity: 0;
      mix-blend-mode: overlay;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 0;
    }
    
    .glass-file-card:hover .noise-pattern {
      opacity: 0.07;
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .file-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      background-color: rgba(219, 234, 254, 0.7);
      border-radius: 0.5rem;
      padding: 0.5rem;
    }
    
    .icon-md {
      width: 1.5rem;
      height: 1.5rem;
      color: rgba(59, 130, 246, 0.9);
    }
    
    .file-details {
      flex: 1;
    }
    
    .file-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
      color: rgba(0, 0, 0, 0.9);
    }
    
    .file-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: rgba(75, 85, 99, 0.8);
    }
    
    .file-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .btn-link {
      background: none;
      border: none;
      font-size: 0.875rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
    }
    
    .primary {
      color: #3b82f6;
    }
    
    .primary:hover {
      background-color: rgba(59, 130, 246, 0.1);
    }
    
    .danger {
      color: #ef4444;
    }
    
    .danger:hover {
      background-color: rgba(239, 68, 68, 0.1);
    }
    
    .btn-link:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: rgba(75, 85, 99, 0.8);
    }
  `;
  
  async function handleDeleteFile(id: string, filePath?: string) {
    console.log('Attempting to delete file:', { id, filePath });
    try {
      // Check if filePath exists
      if (!filePath) {
        throw new Error('File path is missing');
      }
      
      // Extract the actual path from the full URL if needed
      const actualPath = filePath.includes('public/') 
        ? filePath.split('public/')[1] 
        : filePath;

      // First delete from storage
      console.log('Removing file from storage bucket: files');
      const { data: storageData, error: storageError } = await supabase.storage
        .from('files')
        .remove([actualPath]);
        
      console.log('Storage delete response:', { success: !storageError, data: storageData });
      if (storageError) {
        console.error('Storage delete error:', storageError);
        throw storageError;
      }
      
      // Then delete from database
      console.log('Removing record from database table: files');
      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', id);
        
      console.log('Database delete response:', { success: !dbError, data: dbData });
      if (dbError) {
        console.error('Database delete error:', dbError);
        throw dbError;
      }
      
      console.log('File deleted successfully');
      // Refresh the file list
      onRefresh();
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file');
    }
  }

  // Format the file size
  function formatFileSize(size: number | string): string {
    // 確保有效的數字輸入
    if (size === null || size === undefined || size === '') return '0 B';
    
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(bytes) || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  // Format date
  function formatDate(dateString?: string): string {
    if (!dateString) {
      return '無日期資訊';
    }
    return new Date(dateString).toLocaleString();
  }

  function getFileUrl(fileUrl?: string) {
    console.log('Opening file URL in new tab:', fileUrl);
    try {
      // Make sure we have a valid URL
      if (!fileUrl) {
        throw new Error('File URL is missing');
      }
      // Since we now store the complete public URL, we can open it directly
      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error('Error getting file URL:', err);
      alert('Failed to access file');
    }
  }

  // 除錯函數，用於檢查檔案物件的內容
  function debugFileObject(file: FileInfo) {
    console.log('File object:', {
      id: file.id,
      name: file.name || 'No name',
      type: file.type || 'No type',
      size: file.size || '0',
      path: file.file_path || 'No path',
      storage: file.storage_path || 'No storage path',
      created: file.created_at || 'No date'
    });
    // 檢查所有可能的欄位名稱，以便找出正確的欄位
    console.log('Raw file object keys:', Object.keys(file));
    return file;
  }

  return (
    <>
      <style jsx>{styles}</style>
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="section-title" style={{ color: 'rgba(0, 0, 0, 0.9)' }}>您的檔案</h2>
          {onChatWithFiles && (
            <button
              onClick={onChatWithFiles}
              className="btn btn-primary"
              style={{ marginRight: '3px', marginTop: '-15px' }}
            >
              Chat with Files
            </button>
          )}
        </div>
      
      {files.length === 0 ? (
        <div className="empty-state">
          尚未上傳任何檔案。請上傳檔案開始使用。
        </div>
      ) : (
        <div className="glass-file-list">
          {files.map((file) => {
            // 在渲染前先檢查檔案物件
            debugFileObject(file);
            return (
              <motion.div 
                key={file.id} 
                className="glass-file-card group"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="file-card-inner relative z-10">
                  <div className="file-info">
                    <div className="file-icon">
                      {file.type && file.type.includes('pdf') ? (
                        <svg className="icon-md" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="icon-md" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="file-details">
                      <p className="file-name">{file.name || '未命名檔案'}</p>
                      <div className="file-meta">
                        <p className="file-date">{formatDate(file.created_at)}</p>
                        <p className="file-size">{formatFileSize(file.size || 0)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      onClick={() => getFileUrl(file.storage_path)}
                      className="btn-link primary"
                      disabled={!file.storage_path}
                    >
                      查看
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.file_path)}
                      className="btn-link danger"
                    >
                      刪除
                    </button>
                  </div>
                </div>
                <div className="glass-effect"></div>
                <div className="noise-pattern"></div>
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
    </>
  );
}
