import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { cn } from '@/lib/utils';
import { AlertCircle, Upload, Loader2 } from 'lucide-react';

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
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive mb-4">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      
      <label className={cn(
        "relative flex flex-col items-center justify-center px-4 py-8 rounded-lg",
        "border-2 border-dashed border-primary/30 bg-background",
        "hover:bg-accent/20 hover:border-primary/50 transition-colors",
        "cursor-pointer",
        uploading && "opacity-70 cursor-not-allowed"
      )}>
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          {uploading ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : (
            <Upload className="h-10 w-10 text-primary" />
          )}
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-foreground">
              {uploading ? '正在上傳...' : '點擊或拖放檔案至此處'}
            </p>
            <p className="text-xs text-muted-foreground">
              支援各類文件格式
            </p>
          </div>
        </div>
        <input 
          type='file' 
          className="hidden" 
          onChange={handleFileUpload} 
          disabled={uploading}
        />
      </label>
      
      <div className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground text-center">
          上傳文件以便與之對話互動
        </p>
        {userRole === 'User' && (
          <p className="text-xs font-medium text-orange-500 text-center">
            注意：一般用戶僅能上傳小於 200KB 的檔案
          </p>
        )}
      </div>
    </div>
  );
}
