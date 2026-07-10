import { ImageResponse } from "next/og";

import { siteConfig } from "@/site";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
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
          width: "14px",
          height: "14px",
          transform: "rotate(45deg)",
          backgroundColor: siteConfig.brand.colors.mark,
        }}
      />
    </div>,
    size
  );
}
