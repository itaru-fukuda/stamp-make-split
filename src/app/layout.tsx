import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "スタンプ画像 自動分割ツール",
  description: "整列した一枚絵から、スタンプ用の画像に分割しダウンロードできるWebツールです。",
  openGraph: {
    title: "スタンプ画像 自動分割ツール",
    description: "整列した一枚絵から、スタンプ用の画像に分割しダウンロードできるWebツールです。",
    siteName: "スタンプ画像 自動分割ツール",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "スタンプ画像 自動分割ツール",
    description: "整列した一枚絵から、スタンプ用の画像に分割しダウンロードできるWebツールです。",
  },
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
