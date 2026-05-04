"use client";

import { useState, useRef } from "react";
import styles from "@/styles/components.module.css";
import ImageUploader from "@/components/ImageUploader";
import CanvasPreview from "@/components/CanvasPreview";
import MetadataForm from "@/components/MetadataForm";

export type GridSpec = {
  cols: Array<{ left: number; right: number }>;
  rows: Array<{ top: number; bottom: number }>;
};

export type Metadata = {
  title: string;
  creator: string;
  description: string;
  copyright: string;
};

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gridSpec, setGridSpec] = useState<GridSpec | null>(null);
  const [metadata, setMetadata] = useState<Metadata>({
    title: "",
    creator: "",
    description: "",
    copyright: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setError(null);
  };

  const handleDownload = async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("gridSpec", JSON.stringify(gridSpec));
      // Metadata is validated on client, but we don't strictly need to send it if it doesn't go in ZIP
      // as per user's request. But we can send it for validation on server if needed.
      
      const response = await fetch("/api/split", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "処理に失敗しました");
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `line_stickers_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>LINEスタンプ 4x4 自動分割ツール</h1>
        <p className={styles.subtitle}>
          1枚の画像（4x4のグリッド配置）から16個のLINEスタンプ用画像を生成・プレビュー・ZIPダウンロードします。
        </p>
      </header>

      {error && (
        <div className={styles.alert}>
          <span className={styles.alertIcon}>⚠️</span>
          <div className={styles.alertContent}>{error}</div>
        </div>
      )}

      <div className={styles.mainLayout}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>1. 画像アップロード</h2>
            {!imageUrl ? (
              <ImageUploader onUpload={handleImageUpload} />
            ) : (
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span style={{ flex: 1, wordBreak: "break-all" }}>{imageFile?.name}</span>
                <button 
                  className={styles.button}
                  onClick={() => {
                    setImageFile(null);
                    setImageUrl(null);
                  }}
                >
                  別の画像を選ぶ
                </button>
              </div>
            )}
          </section>

          {imageUrl && gridSpec && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>2. グリッド調整</h2>
              <CanvasPreview 
                imageUrl={imageUrl} 
                gridSpec={gridSpec} 
                onChangeGridSpec={setGridSpec} 
              />
            </section>
          )}
          {imageUrl && !gridSpec && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>2. グリッド調整</h2>
              <CanvasPreview 
                imageUrl={imageUrl} 
                gridSpec={null} 
                onChangeGridSpec={setGridSpec} 
              />
            </section>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>3. メタデータ検証 (任意)</h2>
            <MetadataForm 
              metadata={metadata} 
              onChange={setMetadata} 
            />
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>4. エクスポート</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              LINE指定の仕様（透過PNG、最大370x320px等）に従い自動変換します。<br />
              ファイル名は連番（sticker_01.png〜）となります。
            </p>
            <button 
              className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFull}`}
              onClick={handleDownload}
              disabled={!imageUrl || !gridSpec || isProcessing}
            >
              {isProcessing ? "処理中..." : "ZIP一括ダウンロード"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
