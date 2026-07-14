import { ImageResponse } from "next/og";

import { siteConfig } from "@/site";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Simplified radar-scope mark: ring + lime dot blip. Crosshairs are dropped —
// they turn to mush below ~48px.
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
          width: "24px",
          height: "24px",
          borderRadius: "9999px",
          border: `2px solid ${siteConfig.brand.colors.ring}`,
          display: "flex",
          position: "relative",
        }}>
        <div
          style={{
            position: "absolute",
            left: "11px",
            top: "3px",
            width: "6px",
            height: "6px",
            borderRadius: "9999px",
            backgroundColor: siteConfig.brand.colors.blip,
          }}
        />
      </div>
    </div>,
    size
  );
}
