import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { AlertCircle, Upload, Loader2 } from 'lucide-react';

type FileUploadProps = {
  userId: string;
  userRole?: string;
  onUploadComplete: () => void;
};

// 處理文件上傳的文件記錄的類型
type FileRecord = {
  id?: string; // 可選的，因為在插入新記錄時 ID 由數據庫自動生成
  user_id: string;
  name: string;
  file_path: string;
  size: number;
  type: string;
  storage_path: string;
  created_at: string;
};

export default function FileUpload({ userId, userRole, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFiles(data || []);
    } catch (err: unknown) {
      console.error('Error fetching files:', err instanceof Error ? err.message : String(err));
    }
  }, [userId]);

  useEffect(() => {
    fetchUserFiles();
  }, [fetchUserFiles]);

  // fetchUserFiles 已經使用 useCallback 移至上方

  // 處理文件上傳，可以接受來自 input 或拖放的文件
  async function handleFileUpload(file: File) {
    if (!file) {
      return;
    }
    
    // 檢查文件類型是否為 PDF
    if (file.type !== 'application/pdf') {
      setError('只允許上傳 PDF 檔案。');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
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
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      const fileRecord: FileRecord = {
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
    } catch (err: unknown) {
      console.error('File upload failed with error:', err);
      setError(err instanceof Error ? err.message : 'Error uploading file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // 用於刪除文件的函數 - 在UI中使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    } catch (err: unknown) {
      console.error('Error deleting file:', err);
      setError(err instanceof Error ? err.message : '刪除檔案時發生錯誤');
    }
  }

  // 用於下載文件的函數 - 在UI中使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    } catch (err: unknown) {
      console.error('Error downloading file:', err);
      setError(err instanceof Error ? err.message : '下載檔案時發生錯誤');
    }
  }

  // 用於格式化日期的函數 - 在UI中使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  // 處理文件輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    handleFileUpload(e.target.files[0]);
  };

  // 處理拖放事件
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

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
        <div 
          className={`upload-area ${isDragging ? 'dragging' : ''} ${uploading ? 'disabled' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            {uploading ? (
              <Loader2 className="loading-indicator icon-lg" />
            ) : (
              <Upload className="icon-lg primary-icon" />
            )}
            <div className="upload-text">
              <p className="upload-title">
                上傳 PDF 檔案
              </p>
              <p className="upload-subtitle">
                {isDragging ? '拖放檔案至此處' : '點擊或拖放檔案至此處'}
              </p>
            </div>
          </div>
        </div>
        <input 
          ref={fileInputRef}
          type='file' 
          className="hidden-input" 
          onChange={handleInputChange} 
          accept=".pdf"
          disabled={uploading}
        />
      
      {userRole === 'User' && (
        <p className="note warning text-center">
          注意：一般用戶僅能上傳小於 200KB 的檔案
        </p>
      )}
      </div>
    </div>
  );
}
