export type QRType = "url" | "text" | "wifi" | "vcard";

export interface UrlData { url: string }
export interface TextData { text: string }
export interface WifiData {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}
export interface VCardData {
  firstName: string;
  lastName: string;
  org: string;
  title: string;
  phone: string;
  email: string;
  url: string;
  address: string;
}

export interface QRData {
  url: UrlData;
  text: TextData;
  wifi: WifiData;
  vcard: VCardData;
}

const escapeWifi = (s: string) =>
  s.replace(/([\\;,:"])/g, "\\$1");

const escapeVCard = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function buildPayload(type: QRType, data: QRData): string {
  switch (type) {
    case "url":
      return data.url.url.trim();
    case "text":
      return data.text.text;
    case "wifi": {
      const { ssid, password, encryption, hidden } = data.wifi;
      if (!ssid) return "";
      const pw = encryption === "nopass" ? "" : `P:${escapeWifi(password)};`;
      return `WIFI:T:${encryption};S:${escapeWifi(ssid)};${pw}H:${hidden ? "true" : "false"};;`;
    }
    case "vcard": {
      const v = data.vcard;
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(v.lastName)};${escapeVCard(v.firstName)}`,
        `FN:${escapeVCard(`${v.firstName} ${v.lastName}`.trim())}`,
        v.org && `ORG:${escapeVCard(v.org)}`,
        v.title && `TITLE:${escapeVCard(v.title)}`,
        v.phone && `TEL;TYPE=CELL:${escapeVCard(v.phone)}`,
        v.email && `EMAIL:${escapeVCard(v.email)}`,
        v.url && `URL:${escapeVCard(v.url)}`,
        v.address && `ADR;TYPE=HOME:;;${escapeVCard(v.address)};;;;`,
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\n");
    }
  }
}
