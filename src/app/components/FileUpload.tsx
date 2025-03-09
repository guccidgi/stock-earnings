import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

type FileUploadProps = {
  userId: string;
  userRole?: string;
  onUploadComplete: () => void;
};

export default function FileUpload({ userId, userRole, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);



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



  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors">
        <div className="flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
          </svg>
          <span className="ml-3 text-base leading-normal">
            {uploading ? 'Uploading...' : 'Select a file'}
          </span>
        </div>
        <input 
          type='file' 
          className="hidden" 
          onChange={handleFileUpload} 
          disabled={uploading}
        />
      </label>
      <p className="text-sm text-gray-500 text-center mt-2">
        Upload documents, images, and other files to chat with
      </p>
      {userRole === 'User' && (
        <p className="text-xs text-orange-500 text-center mt-1">
          注意：一般用戶僅能上傳小於 200KB 的檔案
        </p>
      )}
    </div>
  );
}
