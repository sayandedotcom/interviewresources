import { ImageResponse } from "next/og";

import { siteConfig } from "@/site";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Full radar-scope mark: ring, faint crosshairs, lime dot blip upper-right.
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
          width: "120px",
          height: "120px",
          borderRadius: "9999px",
          border: `6px solid ${siteConfig.brand.colors.ring}`,
          display: "flex",
          position: "relative",
        }}>
        <div
          style={{
            position: "absolute",
            left: "53px",
            top: "0px",
            width: "2px",
            height: "108px",
            opacity: 0.4,
            backgroundColor: siteConfig.brand.colors.ring,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "0px",
            top: "53px",
            width: "108px",
            height: "2px",
            opacity: 0.4,
            backgroundColor: siteConfig.brand.colors.ring,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "61px",
            top: "21px",
            width: "26px",
            height: "26px",
            borderRadius: "9999px",
            backgroundColor: siteConfig.brand.colors.blip,
          }}
        />
      </div>
    </div>,
    size
  );
}
