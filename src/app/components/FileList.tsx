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
    <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">您的檔案</h3>
      </div>
      
      {files.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          尚未上傳任何檔案。請上傳檔案開始使用。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  檔案名稱
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  類型
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  上傳時間
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => {
                // 在渲染前先檢查檔案物件
                debugFileObject(file);
                return (
                  <tr key={file.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {/* 根據檔案類型顯示不同圖示 */}
                          {file.type && file.type.includes('image') ? (
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : file.type && file.type.includes('pdf') ? (
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{file.name || '未命名檔案'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {file.type 
                          ? (file.type.includes('/') 
                              ? file.type.split('/')[1] 
                              : file.type) 
                          : '未知類型'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatFileSize(file.size || 0)}</div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(file.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => getFileUrl(file.storage_path)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                      disabled={!file.storage_path}
                    >
                      查看
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.file_path)}
                      className="text-red-600 hover:text-red-900"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
