import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ruyou — агрегатор чатов",
  description: "Единый центр входящих сообщений и простая CRM",
};

export const viewport: Viewport = {
  themeColor: "#081017",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" className="dark">
      <body className={`${inter.className} antialiased bg-bg text-ink`}>{children}</body>
    </html>
  );
}
