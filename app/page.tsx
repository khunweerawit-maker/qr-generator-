import QRGenerator from "@/components/QRGenerator";

export default function Home() {
  return (
    <main className="min-h-screen w-full px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 text-center sm:mb-10">
          <h1 className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            ✨ QR Code Generator
          </h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            สร้าง QR Code สวยๆ สำหรับ URL · Text · WiFi · vCard — ปรับสี ใส่กรอบ ส่งออก PNG/SVG
          </p>
        </header>
        <QRGenerator />
        <footer className="mt-10 text-center text-xs text-slate-600 sm:text-sm">
          Built with Next.js · qrcode.js · Tailwind CSS
        </footer>
      </div>
    </main>
  );
}
