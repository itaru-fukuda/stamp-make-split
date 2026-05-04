"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/styles/components.module.css";
import { GridSpec } from "@/app/page";

interface CanvasPreviewProps {
  imageUrl: string;
  gridSpec: GridSpec | null;
  onChangeGridSpec: (spec: GridSpec) => void;
  configCols: number;
  configRows: number;
}

export default function CanvasPreview({ imageUrl, gridSpec, onChangeGridSpec, configCols, configRows }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setImageObj(img);
      
      if (!gridSpec) {
        // Initialize dynamic grid based on config
        const cols = [];
        const rows = [];
        const cellW = Math.floor(img.width / configCols);
        const cellH = Math.floor(img.height / configRows);
        
        for (let i = 0; i < configCols; i++) {
          cols.push({ left: i * cellW, right: (i + 1) * cellW });
        }
        for (let i = 0; i < configRows; i++) {
          rows.push({ top: i * cellH, bottom: (i + 1) * cellH });
        }
        
        // Ensure the last cell reaches the end exactly
        if (configCols > 0) cols[configCols - 1].right = img.width;
        if (configRows > 0) rows[configRows - 1].bottom = img.height;

        onChangeGridSpec({ cols, rows });
      }
    };
  }, [imageUrl, gridSpec, onChangeGridSpec, configCols, configRows]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj || imageSize.width === 0 || !gridSpec) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    // Draw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageObj, 0, 0);

    // Draw Grid Lines
    ctx.strokeStyle = "rgba(0, 255, 0, 0.9)";
    ctx.lineWidth = Math.max(2, imageSize.width / 500);
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    
    // Fill mask over everything
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, imageSize.width, imageSize.height);

    for (let row = 0; row < gridSpec.rows.length; row++) {
      for (let col = 0; col < gridSpec.cols.length; col++) {
        const c = gridSpec.cols[col];
        const r = gridSpec.rows[row];
        
        const w = c.right - c.left;
        const h = r.bottom - r.top;

        if (w > 0 && h > 0) {
          // Clear mask for valid cells
          ctx.clearRect(c.left, r.top, w, h);
          // Redraw image chunk to prevent black background if transparent
          ctx.drawImage(imageObj, c.left, r.top, w, h, c.left, r.top, w, h);
          // Draw rect boundary
          ctx.rect(c.left, r.top, w, h);
        }
      }
    }
    ctx.stroke();

  }, [imageObj, imageSize, gridSpec]);

  const handleColChange = (index: number, field: "left" | "right", value: number) => {
    if (!gridSpec) return;
    const newCols = [...gridSpec.cols];
    newCols[index] = { ...newCols[index], [field]: value };
    onChangeGridSpec({ ...gridSpec, cols: newCols });
  };

  const handleRowChange = (index: number, field: "top" | "bottom", value: number) => {
    if (!gridSpec) return;
    const newRows = [...gridSpec.rows];
    newRows[index] = { ...newRows[index], [field]: value };
    onChangeGridSpec({ ...gridSpec, rows: newRows });
  };

  if (!gridSpec) return <div>画像読み込み中...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
        すべての列・行の境界座標を個別に調整できます。（不規則なコラージュ対応）
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Columns Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>列の調整 (X座標)</h3>
          {gridSpec.cols.map((col, i) => (
            <div key={`col-${i}`} className={styles.controlGroup} style={{ border: "1px solid var(--border-color)", padding: "0.75rem", borderRadius: "8px" }}>
              <strong style={{ fontSize: "0.9rem" }}>列 {i + 1}</strong>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label className={styles.controlLabel}>
                    <span>左端 (Left)</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="range" className={styles.slider} min={0} max={imageSize.width} value={col.left} onChange={(e) => handleColChange(i, "left", parseInt(e.target.value) || 0)} style={{ flex: 1 }} />
                    <span style={{ fontSize: "0.8rem", width: "40px", textAlign: "right", fontFamily: "monospace" }}>{col.left}px</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className={styles.controlLabel}>
                    <span>右端 (Right)</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="range" className={styles.slider} min={0} max={imageSize.width} value={col.right} onChange={(e) => handleColChange(i, "right", parseInt(e.target.value) || 0)} style={{ flex: 1 }} />
                    <span style={{ fontSize: "0.8rem", width: "40px", textAlign: "right", fontFamily: "monospace" }}>{col.right}px</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rows Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>行の調整 (Y座標)</h3>
          {gridSpec.rows.map((row, i) => (
            <div key={`row-${i}`} className={styles.controlGroup} style={{ border: "1px solid var(--border-color)", padding: "0.75rem", borderRadius: "8px" }}>
              <strong style={{ fontSize: "0.9rem" }}>行 {i + 1}</strong>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label className={styles.controlLabel}>
                    <span>上端 (Top)</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="range" className={styles.slider} min={0} max={imageSize.height} value={row.top} onChange={(e) => handleRowChange(i, "top", parseInt(e.target.value) || 0)} style={{ flex: 1 }} />
                    <span style={{ fontSize: "0.8rem", width: "40px", textAlign: "right", fontFamily: "monospace" }}>{row.top}px</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className={styles.controlLabel}>
                    <span>下端 (Bottom)</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="range" className={styles.slider} min={0} max={imageSize.height} value={row.bottom} onChange={(e) => handleRowChange(i, "bottom", parseInt(e.target.value) || 0)} style={{ flex: 1 }} />
                    <span style={{ fontSize: "0.8rem", width: "40px", textAlign: "right", fontFamily: "monospace" }}>{row.bottom}px</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
