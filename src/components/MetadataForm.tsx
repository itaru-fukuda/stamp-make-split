"use client";

import { Metadata } from "@/app/page";
import styles from "@/styles/components.module.css";
import { useMemo } from "react";

interface MetadataFormProps {
  metadata: Metadata;
  onChange: (meta: Metadata) => void;
}

export default function MetadataForm({ metadata, onChange }: MetadataFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ ...metadata, [e.target.name]: e.target.value });
  };

  const getCharCount = (str: string) => {
    // 全角は2文字換算
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      count += str.charCodeAt(i) > 255 ? 2 : 1;
    }
    return count;
  };

  const hasUrl = (str: string) => /https?:\/\//i.test(str);

  const titleCount = getCharCount(metadata.title);
  const descCount = getCharCount(metadata.description);
  const creatorCount = getCharCount(metadata.creator);
  const isCopyrightAlphanumeric = /^[a-zA-Z0-9 ]*$/.test(metadata.copyright);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className={styles.formGroup}>
        <label className={styles.label}>スタンプタイトル (40文字以内)</label>
        <input 
          type="text" 
          name="title" 
          className={styles.input} 
          value={metadata.title} 
          onChange={handleChange} 
          placeholder="日本語優先のタイトルを入力"
        />
        <div className={`${styles.characterCount} ${titleCount > 40 ? styles.error : ""}`}>
          {titleCount} / 40
        </div>
        {hasUrl(metadata.title) && <div className={styles.errorText}>URLは含められません。</div>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>クリエイター名 (50文字以内)</label>
        <input 
          type="text" 
          name="creator" 
          className={styles.input} 
          value={metadata.creator} 
          onChange={handleChange} 
        />
        <div className={`${styles.characterCount} ${creatorCount > 50 ? styles.error : ""}`}>
          {creatorCount} / 50
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>スタンプ説明文 (160文字以内)</label>
        <textarea 
          name="description" 
          className={styles.textarea} 
          value={metadata.description} 
          onChange={handleChange} 
        />
        <div className={`${styles.characterCount} ${descCount > 160 ? styles.error : ""}`}>
          {descCount} / 160
        </div>
        {hasUrl(metadata.description) && <div className={styles.errorText}>URLは含められません。</div>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>コピーライト (英数字のみ 50文字以内)</label>
        <input 
          type="text" 
          name="copyright" 
          className={styles.input} 
          value={metadata.copyright} 
          onChange={handleChange} 
          placeholder="© 2026 Your Name"
        />
        {!isCopyrightAlphanumeric && metadata.copyright.length > 0 && (
          <div className={styles.errorText}>英数字のみ使用可能です（全角不可）。</div>
        )}
      </div>
    </div>
  );
}
