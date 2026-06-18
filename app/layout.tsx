import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Code Generator — Colorful & Customizable",
  description:
    "Create beautiful QR codes for URLs, text, WiFi, and vCards. Customize colors, add a frame, and export as PNG or SVG.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#a855f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans text-slate-800 antialiased">{children}</body>
    </html>
  );
}
