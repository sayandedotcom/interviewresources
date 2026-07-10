import { ImageResponse } from "next/og";

import { siteConfig } from "@/site";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: siteConfig.brand.colors.background,
      }}>
      <div
        style={{
          width: "76px",
          height: "76px",
          transform: "rotate(45deg)",
          backgroundColor: siteConfig.brand.colors.mark,
        }}
      />
    </div>,
    size
  );
}
