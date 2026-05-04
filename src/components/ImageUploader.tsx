"use client";

import { useRef, useState } from "react";
import styles from "@/styles/components.module.css";

interface ImageUploaderProps {
  onUpload: (file: File) => void;
}

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File) => {
    setError(null);
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("PNG, JPEG, WebP形式の画像のみ対応しています。");
      return false;
    }
    // Simple max size check (e.g., 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError("ファイルサイズが大きすぎます (最大20MBまで)。");
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onUpload(file);
    }
  };

  return (
    <div className={styles.formGroup}>
      <div 
        className={`${styles.dropzone} ${isDragging ? styles.active : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
      >
        <div className={styles.dropzoneIcon}>📁</div>
        <div className={styles.dropzoneText}>画像ファイルをドラッグ＆ドロップ</div>
        <div className={styles.dropzoneSub}>またはクリックしてファイルを選択 (PNG, JPEG, WebP)</div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className={styles.hiddenInput} 
          accept="image/png, image/jpeg, image/webp" 
          onChange={handleFileChange}
        />
      </div>
      
      {error && <div className={styles.errorText}>{error}</div>}
    </div>
  );
}
