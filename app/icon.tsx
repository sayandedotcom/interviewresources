import { ImageResponse } from "next/og";

import { siteConfig } from "@/site";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Simplified radar-scope mark: ring + dot blip on the blue brand tile.
// Crosshairs are dropped — they turn to mush below ~48px. The tile (not the
// white page background) keeps the favicon visible against a light browser tab.
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: siteConfig.brand.colors.tile,
        // ~28% of the side, matching the `rounded-[28%]` tile on the web logo.
        borderRadius: "9px",
      }}>
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "9999px",
          border: `2px solid ${siteConfig.brand.colors.tileForeground}`,
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
            backgroundColor: siteConfig.brand.colors.tileForeground,
          }}
        />
      </div>
    </div>,
    size
  );
}
