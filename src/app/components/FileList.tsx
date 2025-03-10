import React from 'react';
import { supabase } from '../supabase';
import { FileInfo } from '../types';

type FileListProps = {
  files: FileInfo[];
  onRefresh: () => void;
};

export default function FileList({ files, onRefresh }: FileListProps) {
  async function handleDeleteFile(id: string, filePath: string) {
    console.log('Attempting to delete file:', { id, filePath });
    try {
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
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  function getFileUrl(fileUrl: string) {
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
    <div className="card">
      <h2 className="section-title">您的檔案</h2>
      
      {files.length === 0 ? (
        <div className="empty-state">
          尚未上傳任何檔案。請上傳檔案開始使用。
        </div>
      ) : (
        <div className="file-list">
          {files.map((file) => {
            // 在渲染前先檢查檔案物件
            debugFileObject(file);
            return (
              <div key={file.id} className="file-card">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
