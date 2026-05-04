import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINEスタンプ 4x4 自動分割ツール",
  description: "4x4で整列した一枚絵から、LINEスタンプ用の16画像を自動分割しZIPダウンロードできるWebツールです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
