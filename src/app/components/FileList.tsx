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

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Your Files</h3>
      </div>
      
      {files.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No files uploaded yet. Upload files to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{file.type ? (file.type.includes('/') ? file.type.split('/')[1] : file.type) : 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(file.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => getFileUrl(file.storage_path)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.file_path)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
