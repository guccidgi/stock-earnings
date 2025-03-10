import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { cn } from '@/lib/utils';
import { AlertCircle, Upload, Loader2, FileText, Download, Trash } from 'lucide-react';

type FileUploadProps = {
  userId: string;
  userRole?: string;
  onUploadComplete: () => void;
};

export default function FileUpload({ userId, userRole, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    fetchUserFiles();
  }, [userId]);

  async function fetchUserFiles() {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      console.error('Error fetching files:', err);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    console.log('File selected for upload:', { name: file.name, size: file.size, type: file.type });
    console.log('User role for file upload:', userRole);
    setUploading(true);
    setError(null);
    
    // 檢查文件大小限制
    const fileSizeKB = file.size / 1024;
    console.log('File size in KB:', fileSizeKB);
    
    // 如果用戶角色是 User，則限制文件大小為 200KB
    if (userRole === 'User' && fileSizeKB > 200) {
      setError('檔案大小超過限制。一般用戶僅能上傳小於 200KB 的檔案。');
      setUploading(false);
      e.target.value = '';
      return;
    }
    
    try {
      // Check if Supabase is properly initialized
      console.log('Supabase client status:', !!supabase);
      
      // Upload file to Supabase Storage
      const filePath = `Earnings/${userId}/${Date.now()}_${file.name}`;
      console.log('Attempting to upload file to path:', filePath);
      
      const { data: storageData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);
      
      console.log('Storage upload response:', { success: !uploadError, data: storageData });
        
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      // Construct the public URL for the file
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const bucketName = 'files';
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
      
      // Add file entry to the database
      console.log('Attempting to insert record into database table: files');
      const fileRecord = {
        user_id: userId,
        name: file.name,  // 確保使用與資料庫一致的欄位名稱 file_name
        file_path: filePath,
        size: file.size,  // 確保使用與資料庫一致的欄位名稱 file_size
        type: file.type,  // 確保使用與資料庫一致的欄位名稱 file_type
        storage_path: publicUrl,
        created_at: new Date().toISOString()
      };
      console.log('File record to insert:', fileRecord);
      
      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert([fileRecord]);
      
      console.log('Database insert response:', { success: !dbError, data: dbData });
        
      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }
      
      console.log('File upload completed successfully');
      fetchUserFiles(); // 重新获取文件列表
      onUploadComplete();
    } catch (err: any) {
      console.error('File upload failed with error:', err);
      setError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  }

  async function handleDeleteFile(fileId: string, filePath: string) {
    try {
      // 1. 從存儲中刪除文件
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath]);
        
      if (storageError) throw storageError;
      
      // 2. 從數據庫中刪除記錄
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);
        
      if (dbError) throw dbError;
      
      // 3. 更新狀態
      fetchUserFiles();
    } catch (err: any) {
      console.error('Error deleting file:', err);
      setError(err.message || '刪除檔案時發生錯誤');
    }
  }

  async function handleDownloadFile(fileUrl: string, fileName: string) {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError(err.message || '下載檔案時發生錯誤');
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  return (
    <div className="card">
      <h2 className="section-title">上傳檔案</h2>
      
      {error && (
        <div className="error-message">
          <AlertCircle className="icon-sm" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="upload-container">
        <label className={`upload-area ${uploading ? 'disabled' : ''}`}>
          <div className="upload-content">
            {uploading ? (
              <Loader2 className="loading-indicator icon-lg" />
            ) : (
              <Upload className="icon-lg primary-icon" />
            )}
            <div className="upload-text">
              <p className="upload-title">
                Upload PDF Files
              </p>
              <p className="upload-subtitle">
                Only PDF files are allowed
              </p>
            </div>
          </div>
        <input 
          type='file' 
          className="hidden-input" 
          onChange={handleFileUpload} 
          accept=".pdf"
          disabled={uploading}
        />
      </label>
      
      {userRole === 'User' && (
        <p className="note warning text-center">
          注意：一般用戶僅能上傳小於 200KB 的檔案
        </p>
      )}
      </div>
    </div>
  );
}
