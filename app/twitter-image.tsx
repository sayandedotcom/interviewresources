import { ImageResponse } from "next/og";

import { siteConfig } from "@/site";

import { OgImageContent, ogImageSize } from "@/lib/seo/og-image";

export const alt = `${siteConfig.name} — Interview Question Guesser`;
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgImageContent />, size);
}
