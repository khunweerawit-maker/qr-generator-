# QR Code Generator

A colorful, customizable QR code generator built with **Next.js**, **qrcode.js**, and **Tailwind CSS**.

## Features

- 🎨 Vibrant color presets + custom foreground/background colors
- 🔗 Supports URL, plain Text, WiFi credentials, and vCard contacts
- 🖼 Optional frame text below the QR (e.g., "SCAN ME")
- ⬇️ Export as PNG (multiple resolutions) or SVG (vector)
- 📱 Fully responsive — desktop, tablet, smartphone
- ⚙️ Adjustable error-correction level (L / M / Q / H)

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for production

```bash
npm run build
npm start
```

## Tech stack

- Next.js 15 (App Router)
- React 18
- TypeScript
- Tailwind CSS 3
- [qrcode](https://www.npmjs.com/package/qrcode) for QR generation
