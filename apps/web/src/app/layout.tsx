import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CiiHu - Video Streaming Platform",
  description: "A self-hosted video distribution and streaming platform for creators and viewers",
  keywords: "video, streaming, platform, HLS, self-hosted",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}