import type { Entry } from "har-format";
import type { ResourceType } from "./types";

export function classifyEntry(entry: Entry): ResourceType {
  const mime = entry.response?.content?.mimeType?.toLowerCase() ?? "";
  const url = entry.request.url.toLowerCase();

  if (mime.includes("html") || mime.includes("xhtml")) return "html";
  if (
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    /\.(mp4|webm|mov|m4v|mp3|wav|ogg)(\?|$)/i.test(url)
  ) {
    return "media";
  }
  if (
    mime.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)(\?|$)/i.test(url)
  ) {
    return "image";
  }
  if (
    mime.includes("font") ||
    mime.includes("woff") ||
    /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url)
  ) {
    return "font";
  }
  if (
    mime.includes("javascript") ||
    mime.includes("ecmascript") ||
    /\.m?js(\?|$)/i.test(url)
  ) {
    return "script";
  }
  if (mime.includes("css") || /\.css(\?|$)/i.test(url)) return "css";
  if (!mime) return "unknown";
  return "other";
}

export function typeLabel(type: ResourceType): string {
  switch (type) {
    case "html":
      return "HTML";
    case "media":
      return "미디어";
    case "image":
      return "이미지";
    case "font":
      return "웹폰트";
    case "script":
      return "JavaScript";
    case "css":
      return "CSS";
    case "other":
      return "기타";
    case "unknown":
      return "분류 불가";
  }
}
