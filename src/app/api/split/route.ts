import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import JSZip from "jszip";

// Optional: you can export config if you need larger payload size, but Vercel free tier limit is 4.5MB
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;
    const gridSpecStr = formData.get("gridSpec") as string;
    const isMobile = formData.get("isMobile") === "true";

    if (!imageFile || !gridSpecStr) {
      return NextResponse.json({ error: "必要なデータが不足しています。" }, { status: 400 });
    }

    const gridSpec = JSON.parse(gridSpecStr);
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Get metadata from original image
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "画像の読み込みに失敗しました。" }, { status: 400 });
    }

    // Calculatable area check not needed as strictly defined coordinates are given
    const zip = new JSZip();
    const images: Array<{ name: string; data: string }> = [];

    // Max LINE Sticker dimensions
    const LINE_MAX_W = 370;
    const LINE_MAX_H = 320;

    for (let row = 0; row < gridSpec.rows.length; row++) {
      for (let col = 0; col < gridSpec.cols.length; col++) {
        const c = gridSpec.cols[col];
        const r = gridSpec.rows[row];

        const x = c.left;
        const y = r.top;
        const cellWidth = c.right - c.left;
        const cellHeight = r.bottom - r.top;

        if (cellWidth <= 0 || cellHeight <= 0) continue;

        // Ensure we don't go out of bounds due to rounding
        const safeWidth = Math.min(cellWidth, metadata.width - x);
        const safeHeight = Math.min(cellHeight, metadata.height - y);

        if (safeWidth <= 0 || safeHeight <= 0) continue;

        const cellImage = image.clone().extract({
          left: Math.floor(x),
          top: Math.floor(y),
          width: safeWidth,
          height: safeHeight,
        });

        // Resize to fit within 370x320 while keeping aspect ratio and transparent background
        // Sharp's `fit: 'contain'` with `background: { r: 0, g: 0, b: 0, alpha: 0 }` will pad to exact size.
        // But for LINE, it just needs to be *within* 370x320, usually even numbers are recommended.
        // We will resize so that the longest side touches the max dimension, padding is transparent.
        
        // Wait, LINE requirement: up to 370x320, recommended to have 10px transparent padding.
        // We'll resize the extracted part to fit within 350x300 (leaving 10px pad on all sides)
        // and then put it inside a 370x320 canvas.
        const paddedBuffer = await cellImage
          .ensureAlpha()
          .resize(LINE_MAX_W - 20, LINE_MAX_H - 20, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .extend({
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png({ compressionLevel: 9 })
          .toBuffer();

        // Validate size < 1MB
        if (paddedBuffer.length > 1024 * 1024) {
          console.warn(`Cell at [${row}, ${col}] exceeds 1MB limit.`);
        }

        const index = row * gridSpec.cols.length + col + 1;
        const fileName = `${index.toString().padStart(2, "0")}.png`;
        
        if (isMobile) {
          images.push({
            name: fileName,
            data: `data:image/png;base64,${paddedBuffer.toString("base64")}`
          });
        } else {
          zip.file(fileName, paddedBuffer);
        }
      }
    }

    if (isMobile) {
      return NextResponse.json({ images }, { status: 200 });
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });

    if (zipBuffer.length > 60 * 1024 * 1024) {
      return NextResponse.json({ error: "ZIPのサイズが60MBを超過しました。" }, { status: 400 });
    }

    // Return the zip file stream
    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="line_stickers.zip"`,
      },
    });

  } catch (error: any) {
    console.error("Split error:", error);
    return NextResponse.json({ error: "画像処理中にエラーが発生しました。" }, { status: 500 });
  }
}
