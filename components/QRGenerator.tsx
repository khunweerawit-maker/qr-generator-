"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  buildPayload,
  QRData,
  QRType,
} from "@/lib/qrPayload";

type ECL = "L" | "M" | "Q" | "H";

const PRESETS = [
  { name: "Sunset", fg: "#ffffff", bg: "#ff6b6b", grad: "from-orange-400 to-pink-500" },
  { name: "Ocean", fg: "#0c4a6e", bg: "#bae6fd", grad: "from-cyan-400 to-blue-500" },
  { name: "Forest", fg: "#064e3b", bg: "#bbf7d0", grad: "from-green-400 to-emerald-500" },
  { name: "Candy", fg: "#831843", bg: "#fbcfe8", grad: "from-pink-400 to-fuchsia-500" },
  { name: "Mono", fg: "#0f172a", bg: "#ffffff", grad: "from-slate-700 to-slate-900" },
  { name: "Neon", fg: "#facc15", bg: "#1e1b4b", grad: "from-purple-700 to-yellow-400" },
];

const TYPE_TABS: { id: QRType; label: string; icon: string }[] = [
  { id: "url", label: "URL", icon: "🔗" },
  { id: "text", label: "Text", icon: "📝" },
  { id: "wifi", label: "WiFi", icon: "📶" },
  { id: "vcard", label: "vCard", icon: "👤" },
];

const DEFAULT_DATA: QRData = {
  url: { url: "https://example.com" },
  text: { text: "Hello, world!" },
  wifi: { ssid: "MyWiFi", password: "password123", encryption: "WPA", hidden: false },
  vcard: {
    firstName: "Jane",
    lastName: "Doe",
    org: "Acme Co.",
    title: "Designer",
    phone: "+1 555 555 5555",
    email: "jane@example.com",
    url: "https://example.com",
    address: "",
  },
};

const QR_PX = 360; // logical render size for preview/PNG export base

export default function QRGenerator() {
  const [type, setType] = useState<QRType>("url");
  const [data, setData] = useState<QRData>(DEFAULT_DATA);
  const [fg, setFg] = useState("#0f172a");
  const [bg, setBg] = useState("#ffffff");
  const [ecl, setEcl] = useState<ECL>("M");
  const [frameText, setFrameText] = useState("SCAN ME");
  const [frameColor, setFrameColor] = useState("#ffffff");
  const [frameBg, setFrameBg] = useState("#a855f7");
  const [showFrame, setShowFrame] = useState(true);
  const [exportScale, setExportScale] = useState(4);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const payload = useMemo(() => buildPayload(type, data), [type, data]);

  // ---------------- Drawing ----------------
  const drawComposite = useCallback(
    async (targetCanvas: HTMLCanvasElement, scale = 1) => {
      const padding = 20 * scale;
      const frameH = showFrame && frameText.trim() ? 56 * scale : 0;
      const qrSize = QR_PX * scale;
      const W = qrSize + padding * 2;
      const H = qrSize + padding * 2 + frameH;

      targetCanvas.width = W;
      targetCanvas.height = H;
      const ctx = targetCanvas.getContext("2d");
      if (!ctx) return;

      // Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // QR onto offscreen
      if (payload) {
        const off = document.createElement("canvas");
        try {
          await QRCode.toCanvas(off, payload, {
            width: qrSize,
            margin: 0,
            errorCorrectionLevel: ecl,
            color: { dark: fg, light: bg },
          });
          ctx.drawImage(off, padding, padding);
        } catch {
          ctx.fillStyle = "#ef4444";
          ctx.font = `${16 * scale}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillText("Input too long", W / 2, H / 2);
        }
      } else {
        ctx.fillStyle = "#94a3b8";
        ctx.font = `${16 * scale}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Enter content to generate QR", W / 2, (qrSize + padding * 2) / 2);
      }

      // Frame text bar
      if (frameH > 0) {
        ctx.fillStyle = frameBg;
        const r = 14 * scale;
        roundRect(
          ctx,
          padding,
          qrSize + padding * 2 - r / 2,
          qrSize,
          frameH + r / 2,
          r,
        );
        ctx.fill();

        ctx.fillStyle = frameColor;
        ctx.font = `bold ${22 * scale}px system-ui, -apple-system, Segoe UI, Roboto`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          frameText.trim(),
          W / 2,
          qrSize + padding * 2 + frameH / 2,
        );
      }
    },
    [bg, fg, ecl, payload, showFrame, frameText, frameColor, frameBg],
  );

  // Re-render preview on changes
  useEffect(() => {
    if (canvasRef.current) {
      void drawComposite(canvasRef.current, 1);
    }
  }, [drawComposite]);

  // ---------------- Downloads ----------------
  const downloadPNG = useCallback(async () => {
    const off = document.createElement("canvas");
    await drawComposite(off, exportScale);
    const link = document.createElement("a");
    link.download = `qrcode-${Date.now()}.png`;
    link.href = off.toDataURL("image/png");
    link.click();
  }, [drawComposite, exportScale]);

  const downloadSVG = useCallback(async () => {
    if (!payload) return;
    const qrSvg = await QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: ecl,
      margin: 0,
      color: { dark: fg, light: bg },
    });

    // Extract inner of <svg ...>...</svg>
    const inner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "");
    // Try to capture viewBox size of original (qrcode emits viewBox="0 0 N N")
    const vbMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const qrVB = vbMatch ? parseInt(vbMatch[1], 10) : 33;

    const padding = 20;
    const frameH = showFrame && frameText.trim() ? 56 : 0;
    const qrSize = QR_PX;
    const W = qrSize + padding * 2;
    const H = qrSize + padding * 2 + frameH;
    const scale = qrSize / qrVB;

    const frameMarkup =
      frameH > 0
        ? `<rect x="${padding}" y="${qrSize + padding * 2 - 7}" width="${qrSize}" height="${frameH + 7}" rx="14" ry="14" fill="${frameBg}"/>
<text x="${W / 2}" y="${qrSize + padding * 2 + frameH / 2}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="700" font-size="22" fill="${frameColor}">${escapeXml(frameText.trim())}</text>`
        : "";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${bg}"/>
<g transform="translate(${padding}, ${padding}) scale(${scale})">${inner}</g>
${frameMarkup}
</svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qrcode-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [payload, ecl, fg, bg, showFrame, frameText, frameBg, frameColor]);

  // ---------------- UI ----------------
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Left: Controls */}
      <section className="glass order-2 rounded-3xl p-5 shadow-xl sm:p-6 lg:order-1 lg:col-span-3">
        {/* Type tabs */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                type === t.id
                  ? "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-purple-500/40"
                  : "bg-white/70 text-slate-700 hover:bg-white"
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Type-specific inputs */}
        <div className="mb-6">{renderInputs(type, data, setData)}</div>

        {/* Color presets */}
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
          🎨 Color Presets
        </h3>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setFg(p.fg);
                setBg(p.bg);
              }}
              className={`group rounded-xl bg-gradient-to-br ${p.grad} p-0.5 transition-transform hover:scale-105`}
              title={p.name}
            >
              <div className="rounded-[10px] bg-white/95 px-2 py-1.5 text-center text-[11px] font-bold text-slate-700">
                {p.name}
              </div>
            </button>
          ))}
        </div>

        {/* Color pickers */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <ColorField label="QR Color" value={fg} onChange={setFg} />
          <ColorField label="Background" value={bg} onChange={setBg} />
        </div>

        {/* Frame */}
        <div className="mb-4 rounded-2xl bg-white/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              🖼 Frame Text
            </h3>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={showFrame}
                onChange={(e) => setShowFrame(e.target.checked)}
              />
              <span className="relative h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-gradient-to-r peer-checked:from-fuchsia-500 peer-checked:to-purple-600 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
              {showFrame ? "On" : "Off"}
            </label>
          </div>
          <input
            type="text"
            value={frameText}
            onChange={(e) => setFrameText(e.target.value)}
            disabled={!showFrame}
            maxLength={40}
            placeholder="SCAN ME"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300 disabled:opacity-50"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ColorField label="Frame BG" value={frameBg} onChange={setFrameBg} disabled={!showFrame} />
            <ColorField label="Frame Text" value={frameColor} onChange={setFrameColor} disabled={!showFrame} />
          </div>
        </div>

        {/* Advanced */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Error Correction
            </span>
            <select
              value={ecl}
              onChange={(e) => setEcl(e.target.value as ECL)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
            >
              <option value="L">L · 7%</option>
              <option value="M">M · 15%</option>
              <option value="Q">Q · 25%</option>
              <option value="H">H · 30%</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
              PNG Export Scale
            </span>
            <select
              value={exportScale}
              onChange={(e) => setExportScale(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
            >
              <option value={2}>2× (small)</option>
              <option value={4}>4× (HD)</option>
              <option value={6}>6× (print)</option>
              <option value={8}>8× (huge)</option>
            </select>
          </label>
        </div>
      </section>

      {/* Right: Preview & Export */}
      <section className="order-1 flex flex-col gap-4 lg:order-2 lg:col-span-2">
        <div className="glass flex items-center justify-center rounded-3xl p-4 shadow-xl sm:p-6">
          <canvas
            ref={canvasRef}
            className="h-auto w-full max-w-[360px] rounded-2xl shadow-md"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div className="glass rounded-3xl p-4 shadow-xl sm:p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
            ⬇️ Export
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void downloadPNG()}
              disabled={!payload}
              className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              PNG
            </button>
            <button
              onClick={() => void downloadSVG()}
              disabled={!payload}
              className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              SVG
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-600">
            PNG ใช้ขนาดที่เลือก · SVG เป็นเวกเตอร์ ขยายได้ไม่แตก
          </p>
        </div>
      </section>
    </div>
  );
}

// ============== Sub-components ==============

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-9 rounded-lg"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-transparent text-sm font-mono uppercase outline-none"
          maxLength={9}
        />
      </div>
    </label>
  );
}

function renderInputs(
  type: QRType,
  data: QRData,
  setData: React.Dispatch<React.SetStateAction<QRData>>,
) {
  const cls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300";

  switch (type) {
    case "url":
      return (
        <Field label="URL">
          <input
            type="url"
            className={cls}
            placeholder="https://example.com"
            value={data.url.url}
            onChange={(e) =>
              setData((d) => ({ ...d, url: { url: e.target.value } }))
            }
          />
        </Field>
      );
    case "text":
      return (
        <Field label="Text">
          <textarea
            rows={4}
            className={cls}
            placeholder="Type anything..."
            value={data.text.text}
            onChange={(e) =>
              setData((d) => ({ ...d, text: { text: e.target.value } }))
            }
          />
        </Field>
      );
    case "wifi":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Network (SSID)">
            <input
              className={cls}
              value={data.wifi.ssid}
              onChange={(e) =>
                setData((d) => ({ ...d, wifi: { ...d.wifi, ssid: e.target.value } }))
              }
            />
          </Field>
          <Field label="Password">
            <input
              className={cls}
              type="text"
              value={data.wifi.password}
              onChange={(e) =>
                setData((d) => ({ ...d, wifi: { ...d.wifi, password: e.target.value } }))
              }
            />
          </Field>
          <Field label="Encryption">
            <select
              className={cls}
              value={data.wifi.encryption}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  wifi: { ...d.wifi, encryption: e.target.value as "WPA" | "WEP" | "nopass" },
                }))
              }
            >
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None</option>
            </select>
          </Field>
          <Field label="Hidden network">
            <label className="flex h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <input
                type="checkbox"
                checked={data.wifi.hidden}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    wifi: { ...d.wifi, hidden: e.target.checked },
                  }))
                }
              />
              Yes, this network is hidden
            </label>
          </Field>
        </div>
      );
    case "vcard":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First name">
            <input className={cls} value={data.vcard.firstName} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, firstName: e.target.value } }))} />
          </Field>
          <Field label="Last name">
            <input className={cls} value={data.vcard.lastName} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, lastName: e.target.value } }))} />
          </Field>
          <Field label="Organization">
            <input className={cls} value={data.vcard.org} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, org: e.target.value } }))} />
          </Field>
          <Field label="Title">
            <input className={cls} value={data.vcard.title} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, title: e.target.value } }))} />
          </Field>
          <Field label="Phone">
            <input className={cls} value={data.vcard.phone} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, phone: e.target.value } }))} />
          </Field>
          <Field label="Email">
            <input className={cls} type="email" value={data.vcard.email} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, email: e.target.value } }))} />
          </Field>
          <Field label="Website">
            <input className={cls} type="url" value={data.vcard.url} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, url: e.target.value } }))} />
          </Field>
          <Field label="Address">
            <input className={cls} value={data.vcard.address} onChange={(e) => setData((d) => ({ ...d, vcard: { ...d.vcard, address: e.target.value } }))} />
          </Field>
        </div>
      );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

// ============== Utils ==============

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
