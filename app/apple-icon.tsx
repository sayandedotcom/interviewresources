import { ImageResponse } from "next/og";

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
        backgroundColor: "#171717",
      }}>
      <div
        style={{
          width: "76px",
          height: "76px",
          transform: "rotate(45deg)",
          backgroundColor: "#eaeaea",
        }}
      />
    </div>,
    size
  );
}
