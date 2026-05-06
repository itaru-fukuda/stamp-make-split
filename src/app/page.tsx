"use client";

import { useState, useRef, useEffect } from "react";
import styles from "@/styles/components.module.css";
import ImageUploader from "@/components/ImageUploader";
import CanvasPreview from "@/components/CanvasPreview";

export type GridSpec = {
  cols: Array<{ left: number; right: number }>;
  rows: Array<{ top: number; bottom: number }>;
};

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Grid config before uploading
  const [configCols, setConfigCols] = useState(4);
  const [configRows, setConfigRows] = useState(4);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [processedImageFile, setProcessedImageFile] = useState<File | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  
  const [removeBg, setRemoveBg] = useState(false);
  const [bgColor, setBgColor] = useState("#00ff00");
  const [bgTolerance, setBgTolerance] = useState(80);

  const [gridSpec, setGridSpec] = useState<GridSpec | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Array<{name: string, data: string}> | null>(null);

  useEffect(() => {
    // Basic mobile detection
    const ua = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      setIsMobile(true);
    }
  }, []);

  // Background removal effect (Chroma Key)
  useEffect(() => {
    if (!imageFile) {
      setProcessedImageFile(null);
      setProcessedImageUrl(null);
      return;
    }

    if (!removeBg) {
      setProcessedImageFile(imageFile);
      setProcessedImageUrl(URL.createObjectURL(imageFile));
      return;
    }

    const processImage = async () => {
      const img = new Image();
      const tempUrl = URL.createObjectURL(imageFile);
      img.src = tempUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Parse hex color
        const hex = bgColor.replace("#", "");
        const cr = parseInt(hex.substring(0, 2), 16) || 0;
        const cg = parseInt(hex.substring(2, 4), 16) || 0;
        const cb = parseInt(hex.substring(4, 6), 16) || 0;
        
        const softness = 30; // Soft edge for anti-aliasing

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Euclidean color distance
          const dist = Math.sqrt(Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2));
          
          if (dist < bgTolerance) {
            data[i + 3] = 0; // Fully transparent
          } else if (dist < bgTolerance + softness) {
            // Soft blending
            const alphaFactor = (dist - bgTolerance) / softness;
            data[i + 3] = data[i + 3] * alphaFactor;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], imageFile.name, { type: "image/png" });
            setProcessedImageFile(newFile);
            setProcessedImageUrl(URL.createObjectURL(newFile));
          }
        }, "image/png");
        
        URL.revokeObjectURL(tempUrl);
      };
    };

    processImage();
  }, [imageFile, removeBg, bgColor, bgTolerance]);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    setError(null);
    setRemoveBg(false);
    setGeneratedImages(null);

    // Auto-detect background color from top-left pixel
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const hex = "#" + [data[0], data[1], data[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        setBgColor(hex);
      }
      URL.revokeObjectURL(url);
    };
  };

  const handleDownload = async () => {
    if (!processedImageFile) return;
    setIsProcessing(true);
    setError(null);
    setGeneratedImages(null);

    try {
      const formData = new FormData();
      formData.append("image", processedImageFile);
      formData.append("gridSpec", JSON.stringify(gridSpec));
      formData.append("isMobile", isMobile.toString());
      
      const response = await fetch("/api/split", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "処理に失敗しました");
      }

      if (isMobile) {
        const data = await response.json();
        setGeneratedImages(data.images);
        // Scroll to the generated images
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      } else {
        // Download the ZIP file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `stickers_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>スタンプ画像 自動分割ツール</h1>
        <p className={styles.subtitle}>
          1枚の画像を指定したグリッド構成で自動分割し、スタンプ用画像（最大370x320px）として生成・ダウンロードします。
        </p>
      </header>

      {error && (
        <div className={styles.alert}>
          <span className={styles.alertIcon}>⚠️</span>
          <div className={styles.alertContent}>{error}</div>
        </div>
      )}

      <div className={styles.mainLayout}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>1. グリッド構成の指定</h2>
            <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>列数 (横方向)</label>
                <input 
                  type="number" 
                  min="1" max="10"
                  className={styles.input} 
                  value={configCols} 
                  onChange={(e) => setConfigCols(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={imageFile !== null}
                />
              </div>
              <div style={{ fontSize: "1.5rem", color: "var(--text-secondary)", marginTop: "1rem" }}>×</div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>行数 (縦方向)</label>
                <input 
                  type="number" 
                  min="1" max="10"
                  className={styles.input} 
                  value={configRows} 
                  onChange={(e) => setConfigRows(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={imageFile !== null}
                />
              </div>
            </div>
            {imageFile && <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>※画像のアップロード後は変更できません。「別の画像を選ぶ」でリセットしてください。</p>}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>2. 画像アップロード</h2>
            {!imageFile ? (
              <ImageUploader onUpload={handleImageUpload} />
            ) : (
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span style={{ flex: 1, wordBreak: "break-all" }}>{imageFile.name}</span>
                <button 
                  className={styles.button}
                  onClick={() => {
                    setImageFile(null);
                    setGridSpec(null);
                    setRemoveBg(false);
                    setGeneratedImages(null);
                  }}
                >
                  別の画像を選ぶ
                </button>
              </div>
            )}
          </section>

          {imageFile && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>3. クロマキー背景除去 (任意)</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={removeBg} 
                    onChange={(e) => setRemoveBg(e.target.checked)} 
                    style={{ width: "1.2rem", height: "1.2rem", accentColor: "var(--primary-color)" }}
                  />
                  <span>指定した色を背景として透過する</span>
                </label>
                
                {removeBg && (
                  <div className={styles.controlGroup} style={{ border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "8px", gap: "1rem" }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "bold" }}>
                        透過する色:
                        <input 
                          type="color" 
                          value={bgColor} 
                          onChange={(e) => setBgColor(e.target.value)} 
                          style={{ width: "40px", height: "40px", padding: "0", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        />
                      </label>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        ※画像の左上のピクセル色を自動取得しています。
                      </span>
                    </div>

                    <label className={styles.controlLabel}>
                      <span>許容誤差 (Tolerance)</span>
                      <span>{bgTolerance}</span>
                    </label>
                    <input 
                      type="range" 
                      className={styles.slider} 
                      min="0" 
                      max="200" 
                      value={bgTolerance} 
                      onChange={(e) => setBgTolerance(parseInt(e.target.value))} 
                    />
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                      値を上げると、指定色に近い色も透過されます。フチがきれいに抜けるようにスライダーを調整してください。
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {processedImageUrl && gridSpec && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>4. グリッド調整</h2>
              <CanvasPreview 
                imageUrl={processedImageUrl} 
                gridSpec={gridSpec} 
                onChangeGridSpec={setGridSpec} 
                configCols={configCols}
                configRows={configRows}
                isMobile={isMobile}
              />
            </section>
          )}
          {processedImageUrl && !gridSpec && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>4. グリッド調整</h2>
              <CanvasPreview 
                imageUrl={processedImageUrl} 
                gridSpec={null} 
                onChangeGridSpec={setGridSpec} 
                configCols={configCols}
                configRows={configRows}
                isMobile={isMobile}
              />
            </section>
          )}

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>5. エクスポート</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              スタンプ推奨仕様（透過PNG、最大370x320px、余白付き）に従い自動リサイズ変換します。<br />
              {isMobile ? "スマホ環境では生成後に一覧表示されます。画像を個別に保存してください。" : "ファイル名は連番（sticker_01.png〜）となり、ZIPファイルで一括ダウンロードされます。"}
            </p>
            <button 
              className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFull}`}
              onClick={handleDownload}
              disabled={!processedImageUrl || !gridSpec || isProcessing}
            >
              {isProcessing ? "処理中..." : isMobile ? "スタンプ画像を生成する（一覧表示）" : "ZIP一括ダウンロード"}
            </button>
          </section>
      </div>

      {generatedImages && (
        <section className={styles.panel} style={{ animation: "fadeIn 0.5s ease", marginTop: "2rem", border: "2px solid var(--primary-color)" }}>
          <h2 className={styles.panelTitle} style={{ borderBottom: "none", paddingBottom: 0, color: "var(--primary-color)" }}>✅ スタンプ画像が生成されました！</h2>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
            以下の画像を長押しして「写真に追加（保存）」するか、個別ボタンから保存してください。
          </p>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: `repeat(${Math.min(configCols, 4)}, 1fr)`, 
            gap: "1.5rem", 
            marginTop: "1rem" 
          }}>
            {generatedImages.map((img, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
                <div style={{ width: "100%", aspectRatio: "370/320", backgroundImage: "linear-gradient(45deg, #333 25%, transparent 25%, transparent 75%, #333 75%, #333), linear-gradient(45deg, #333 25%, transparent 25%, transparent 75%, #333 75%, #333)", backgroundSize: "10px 10px", backgroundPosition: "0 0, 5px 5px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                  <img src={img.data} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: "bold" }}>{img.name}</span>
                <a 
                  href={img.data} 
                  download={img.name}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  style={{ fontSize: "0.9rem", padding: "0.5rem 1rem", width: "100%" }}
                >
                  保存
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
