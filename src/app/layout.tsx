import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://easy-stamp.rasu.jp";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "スタンプ画像 自動分割ツール",
  description: "整列した一枚絵から、スタンプ用の画像に分割しダウンロードできるWebツールです。",
  openGraph: {
    title: "スタンプ画像 自動分割ツール",
    description: "整列した一枚絵から、スタンプ用の画像に分割しダウンロードできるWebツールです。",
    url: siteUrl,
    siteName: "スタンプ画像 自動分割ツール",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "スタンプ画像 自動分割ツール",
    description: "整列した一枚絵から、スタンプ用の画像に分割しダウンロードできるWebツールです。",
  },
  alternates: {
    canonical: siteUrl,
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
